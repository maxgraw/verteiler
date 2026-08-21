import loadHighs from "highs";
import wasmUrl from "highs/runtime?url";
import type { Group, Slot } from "../parser";
import type {
	Displacement,
	Guarantee,
	Optimality,
	SolveResult,
	Solution,
} from "./types";
import { allowedTimeSlots, rankOf } from "../distribution";
import { lotteryPriorities } from "../lottery";
import { COSTS } from "./costs";
import { validateSolution } from "./validate";

const TIME_LIMIT_SECONDS = 30;

/**
 * The certificate only has to fail, which is far cheaper than optimising. Measured at
 * 1.1 s on a real 46 group export, so this is a wide margin. Running out of it costs
 * the proof, never the distribution.
 */
const CERTIFICATE_TIME_LIMIT_SECONDS = 15;

const highsInstance = loadHighs({ locateFile: () => wasmUrl });

interface Entry {
	coef: number;
	name: string;
}

export interface SolveOptions {
	onProgress?: (message: string) => void;
	/**
	 * Seed for the tie-break lottery. The same seed and the same input always
	 * produce the same distribution. An empty seed still breaks ties
	 * deterministically, but without a publicly committed draw.
	 */
	lotterySeed?: string;
	/**
	 * Groups the organizer pinned to a rank. Every one of them is paid for by somebody
	 * else, which is why solve also reports what it cost.
	 */
	guarantees?: Guarantee[];
}

function varName(g: number, s: number): string {
	return `x_${g}_${s}`;
}

/** Render entries as an LP objective or constraint body. */
function sumExpression(entries: Entry[]): string {
	// LP format needs at least one term even when every coefficient is zero
	if (entries.length === 0) return `0 ${varName(0, 0)}`;
	return entries
		.map((e) => `${e.coef < 0 ? "-" : "+"} ${Math.abs(e.coef)} ${e.name}`)
		.join(" ")
		.replace(/^\+ /, "");
}

/**
 * Total disappointment, counted per student rather than per group. Coefficients
 * are the group size times the rank cost, so displacing a six-person group weighs
 * six times as much as displacing a single applicant. The capacity constraints
 * always used sizes; the objective used to ignore them.
 */
function fairnessEntries(groups: Group[], slots: Slot[]): Entry[] {
	const entries: Entry[] = [];
	for (let g = 0; g < groups.length; g++) {
		for (let s = 0; s < slots.length; s++) {
			const cost = COSTS[rankOf(groups[g].choices, slots[s].timeSlot)];
			if (cost === 0) continue;
			entries.push({ coef: cost * groups[g].size, name: varName(g, s) });
		}
	}
	return entries;
}

/**
 * Tie-break objective. A group that drew a lucky number is expensive to push down
 * a rank, an unlucky one is cheap, so the lottery decides who absorbs whatever
 * disappointment the main objective could not remove.
 */
function lotteryEntries(groups: Group[], slots: Slot[], seed: string): Entry[] {
	const priorities = lotteryPriorities(
		seed,
		groups.map((g) => g.members),
	);
	const entries: Entry[] = [];
	for (let g = 0; g < groups.length; g++) {
		const weight = groups.length - priorities[g];
		for (let s = 0; s < slots.length; s++) {
			const rank = rankOf(groups[g].choices, slots[s].timeSlot);
			if (rank === 0) continue;
			entries.push({ coef: weight * rank, name: varName(g, s) });
		}
	}
	return entries;
}

/**
 * One constraint per guarantee, pinning the group to the time slots that satisfy it.
 * Goes into every solve including the certificate: a proof about the unconstrained
 * problem would say nothing about the one that was actually answered.
 */
function guaranteeRows(
	groups: Group[],
	slots: Slot[],
	guarantees: Guarantee[],
): string[] {
	const rows: string[] = [];
	for (const { groupId, maxRank } of guarantees) {
		const group = groups[groupId];
		if (!group) continue;
		const allowed = allowedTimeSlots(group.choices, maxRank);
		if (allowed === null) continue;
		const vars = slots
			.filter((s) => allowed.includes(s.timeSlot))
			.map((s) => varName(groupId, s.id));
		// An empty set means the guarantee cannot be met at all. checkGuarantees rejects
		// that before solving, and validateSolution catches it after, so skipping here
		// never lets a broken promise through silently.
		if (vars.length > 0) rows.push(`  keep_${groupId}: ${vars.join(" + ")} = 1`);
	}
	return rows;
}

function buildLP(
	groups: Group[],
	slots: Slot[],
	objective: Entry[],
	frozen: string[],
): string {
	const lines: string[] = [
		"Minimize",
		`  obj: ${sumExpression(objective)}`,
		"Subject To",
	];

	// Each group takes exactly one slot, so a group is never split up
	for (let g = 0; g < groups.length; g++) {
		lines.push(
			`  assign_${g}: ${slots.map((_, s) => varName(g, s)).join(" + ")} = 1`,
		);
	}

	// Students in a slot must fit its capacity
	for (let s = 0; s < slots.length; s++) {
		const terms = groups
			.map((grp, g) => `${grp.size} ${varName(g, s)}`)
			.join(" + ");
		lines.push(`  cap_${s}: ${terms} <= ${slots[s].capacity}`);
	}

	lines.push(...frozen);

	const allVars = groups.flatMap((_, g) => slots.map((__, s) => varName(g, s)));
	lines.push("Binary", `  ${allVars.join(" ")}`, "End");

	return lines.join("\n");
}

type Highs = Awaited<typeof highsInstance>;

interface StageResult {
	assignment: number[];
	/** True when HiGHS ran out of time and returned whatever it had. */
	timedOut: boolean;
}

function runStage(highs: Highs, lp: string, groupCount: number): StageResult {
	const result = highs.solve(lp, { time_limit: TIME_LIMIT_SECONDS });

	if (result.Status !== "Optimal" && result.Status !== "Time limit reached") {
		throw new Error(`No feasible solution found (status: ${result.Status}).`);
	}

	const columns = result.Columns as Record<string, { Primal: number }>;
	const assignment = new Array<number>(groupCount).fill(-1);
	for (const [name, col] of Object.entries(columns)) {
		if (col.Primal > 0.5) {
			const parts = name.split("_");
			assignment[parseInt(parts[1], 10)] = parseInt(parts[2], 10);
		}
	}

	// Reached on a time limit that expired before any incumbent was found. Naming the
	// status keeps that apart from genuine infeasibility, which needs a different answer.
	if (assignment.some((s) => s < 0)) {
		throw new Error(`No assignment returned (status: ${result.Status}).`);
	}
	return { assignment, timedOut: result.Status === "Time limit reached" };
}

/**
 * Try to disprove that `value` is the minimum of the fairness objective.
 *
 * Every coefficient is an integer, so any better solution costs at most value - 1. If no
 * such solution exists, value is the minimum, and that is a real proof rather than a
 * status string from the solver. HiGHS itself reports no dual bound and no gap through
 * this binding, so without the cut a timed-out solve would be indistinguishable from an
 * optimal one.
 *
 * The objective is left empty on purpose: this asks whether any point exists below the
 * cut, not which of them is best.
 */
function certify(
	highs: Highs,
	groups: Group[],
	slots: Slot[],
	fairness: Entry[],
	value: number,
	fixed: string[],
): Optimality {
	// An empty objective means every group is on its first choice wherever it lands, so
	// zero is trivially the minimum and there is nothing left to disprove.
	if (fairness.length === 0) return "proven";

	const cut = [...fixed, `  cert: ${sumExpression(fairness)} <= ${value - 1}`];
	const result = highs.solve(buildLP(groups, slots, [], cut), {
		time_limit: CERTIFICATE_TIME_LIMIT_SECONDS,
	});

	if (result.Status === "Infeasible") return "proven";
	if (result.Status === "Optimal") return "suboptimal";
	return "unproven";
}

/**
 * Value of an objective under a given assignment. Recomputed from the assignment
 * rather than read off ObjectiveValue, which comes back as a float and would need
 * a tolerance when it is frozen into the tie-break stage as an integer bound.
 */
function valueOf(entries: Entry[], assignment: number[]): number {
	const chosen = new Set(assignment.map((s, g) => varName(g, s)));
	let total = 0;
	for (const entry of entries) {
		if (chosen.has(entry.name)) total += entry.coef;
	}
	return total;
}

/** Everything about the distribution itself. The claims about it are added by solve. */
type Distribution = Omit<
	SolveResult,
	| "optimality"
	| "fairnessValue"
	| "lotteryComplete"
	| "guaranteeCost"
	| "displaced"
>;

function buildResult(
	groups: Group[],
	slots: Slot[],
	assignment: number[],
): Distribution {
	const solution: Solution = {
		occupancy: slots.map((s) => ({ ...s, amount: 0 })),
		groups: groups.map((g, i) => ({ ...g, currentSelection: assignment[i] })),
		invAllocation: {},
	};

	let score = 0;
	const spread = [0, 0, 0, 0];
	const studentSpread = [0, 0, 0, 0];

	for (let gi = 0; gi < groups.length; gi++) {
		const s = assignment[gi];
		if (s < 0) continue;
		solution.occupancy[s].amount += groups[gi].size;
		if (!solution.invAllocation[s]) solution.invAllocation[s] = [];
		solution.invAllocation[s].push(gi);
		const rank = rankOf(groups[gi].choices, slots[s].timeSlot);
		score -= COSTS[rank];
		spread[rank]++;
		studentSpread[rank] += groups[gi].size;
	}

	return { solution, score, spread, studentSpread };
}

interface PipelineResult {
	assignment: number[];
	fairnessValue: number;
	optimality: Optimality;
	lotteryComplete: boolean;
}

/**
 * The three solves that produce one distribution: minimise, prove, break ties.
 *
 * Split out because a guarantee has to be priced against the distribution that would
 * have happened without it, and that comparison is only honest if both go through
 * exactly the same steps.
 */
function runPipeline(
	highs: Highs,
	groups: Group[],
	slots: Slot[],
	lotterySeed: string,
	fixed: string[],
	onProgress?: (message: string) => void,
): PipelineResult {
	const fairness = fairnessEntries(groups, slots);
	let assignment = runStage(
		highs,
		buildLP(groups, slots, fairness, fixed),
		groups.length,
	).assignment;
	const fairnessValue = valueOf(fairness, assignment);

	onProgress?.("Prüfe Optimalität…");
	const optimality = certify(highs, groups, slots, fairness, fairnessValue, fixed);

	// Nothing to freeze when every group is happy wherever it lands
	let lotteryComplete = true;
	if (fairness.length > 0) {
		onProgress?.("Löse Gleichstände auf…");
		const frozen = [
			...fixed,
			`  fair: ${sumExpression(fairness)} <= ${fairnessValue}`,
		];
		const tieBreak = lotteryEntries(groups, slots, lotterySeed);
		if (tieBreak.length > 0) {
			const stage = runStage(
				highs,
				buildLP(groups, slots, tieBreak, frozen),
				groups.length,
			);
			assignment = stage.assignment;
			lotteryComplete = !stage.timedOut;
		}
	}

	return { assignment, fairnessValue, optimality, lotteryComplete };
}

/** Groups that came off worse with the guarantees than without, worst hit first. */
function displacements(
	groups: Group[],
	slots: Slot[],
	before: number[],
	after: number[],
): Displacement[] {
	const out: Displacement[] = [];
	for (let g = 0; g < groups.length; g++) {
		const from = rankOf(groups[g].choices, slots[before[g]].timeSlot);
		const to = rankOf(groups[g].choices, slots[after[g]].timeSlot);
		if (to > from) {
			out.push({ members: groups[g].members, size: groups[g].size, from, to });
		}
	}
	return out.sort((a, b) => b.to - b.from - (a.to - a.from) || b.size - a.size);
}

/**
 * Assign every group to exactly one slot, as fairly as possible.
 *
 * Three solves. The first minimises total disappointment counted per student. The second
 * tries to disprove that the first reached the minimum. The third keeps the minimum fixed
 * and picks between the equally good solutions by lottery, because otherwise which group
 * loses out is decided by branch-and-bound internals and cannot be justified to anyone.
 *
 * With guarantees set it runs all of that twice, once without them, so the result can say
 * what the override cost and who paid for it. Measured on a real export, guaranteeing one
 * four person group its first choice cost nine other students theirs, and the price is not
 * guessable from the group size, so it has to be computed rather than estimated.
 *
 * The result carries how far each stage got, so the caller can say what was proven
 * instead of implying it.
 *
 * @throws {Error} If no feasible assignment exists, or if the distribution it produced
 *   breaks its own constraints
 */
export async function solve(
	groups: Group[],
	slots: Slot[],
	options: SolveOptions = {},
): Promise<SolveResult> {
	const { onProgress, lotterySeed = "", guarantees = [] } = options;

	onProgress?.("Initialisiere Solver…");
	const highs = await highsInstance;
	const fixed = guaranteeRows(groups, slots, guarantees);

	onProgress?.("Optimiere Verteilung…");
	const run = runPipeline(highs, groups, slots, lotterySeed, fixed, onProgress);

	let guaranteeCost: number | null = null;
	let displaced: Displacement[] = [];
	if (fixed.length > 0) {
		onProgress?.("Ermittle Preis der Zusagen…");
		const free = runPipeline(highs, groups, slots, lotterySeed, []);
		guaranteeCost = run.fairnessValue - free.fairnessValue;
		displaced = displacements(groups, slots, free.assignment, run.assignment);
	}

	onProgress?.("Verarbeite Ergebnis…");
	const result: SolveResult = {
		...buildResult(groups, slots, run.assignment),
		optimality: run.optimality,
		fairnessValue: run.fairnessValue,
		lotteryComplete: run.lotteryComplete,
		guaranteeCost,
		displaced,
	};

	// A distribution that breaks its own constraints must never reach the organizer.
	// HiGHS would not report it: it reports on the LP it was given, not on this one.
	const violations = validateSolution(groups, slots, result, guarantees);
	if (violations.length > 0) {
		throw new Error(`Ungültige Verteilung: ${violations[0].message}`);
	}

	return result;
}
