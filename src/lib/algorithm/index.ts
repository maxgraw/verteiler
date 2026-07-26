import loadHighs from "highs";
import wasmUrl from "highs/runtime?url";
import type { Group, Slot } from "../parser";
import type { SolveResult, Solution } from "./types";
import { rankOf } from "../distribution";
import { lotteryPriorities } from "../lottery";

/**
 * Cost of placing one student at each rank: 1st choice, 2nd, 3rd, no match.
 * The jump to 100 means a group that gets none of its wishes is avoided at
 * almost any cost; 1 against 5 is the only real judgement call in here.
 */
const COSTS = [0, 1, 5, 100] as const;

const TIME_LIMIT_SECONDS = 30;

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

function runStage(highs: Highs, lp: string, groupCount: number): number[] {
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

	if (assignment.some((s) => s < 0)) {
		throw new Error("No feasible solution found.");
	}
	return assignment;
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

function buildResult(
	groups: Group[],
	slots: Slot[],
	assignment: number[],
): SolveResult {
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

/**
 * Assign every group to exactly one slot, as fairly as possible.
 *
 * Two solves. The first minimises total disappointment counted per student. The
 * second keeps that result fixed and picks between the equally good solutions by
 * lottery, because otherwise which group loses out is decided by branch-and-bound
 * internals and cannot be justified to anyone.
 *
 * @throws {Error} If no feasible assignment exists
 */
export async function solve(
	groups: Group[],
	slots: Slot[],
	options: SolveOptions = {},
): Promise<SolveResult> {
	const { onProgress, lotterySeed = "" } = options;

	onProgress?.("Initialisiere Solver…");
	const highs = await highsInstance;

	onProgress?.("Optimiere Verteilung…");
	const fairness = fairnessEntries(groups, slots);
	let assignment = runStage(
		highs,
		buildLP(groups, slots, fairness, []),
		groups.length,
	);

	// Nothing to freeze when every group is happy wherever it lands
	if (fairness.length > 0) {
		onProgress?.("Löse Gleichstände auf…");
		const frozen = [
			`  fair: ${sumExpression(fairness)} <= ${valueOf(fairness, assignment)}`,
		];
		const tieBreak = lotteryEntries(groups, slots, lotterySeed);
		if (tieBreak.length > 0) {
			assignment = runStage(
				highs,
				buildLP(groups, slots, tieBreak, frozen),
				groups.length,
			);
		}
	}

	onProgress?.("Verarbeite Ergebnis…");
	return buildResult(groups, slots, assignment);
}
