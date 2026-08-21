import type { Group, Slot } from "../parser";
import type { Guarantee, SolveResult } from "./types";
import { rankOf, SPREAD_LABELS } from "../distribution";
import { COSTS } from "./costs";

/** One broken invariant, phrased so it can be put in front of the organizer. */
export interface Violation {
	code: string;
	message: string;
}

/**
 * Check a solve result against the input it came from.
 *
 * This does not judge whether the distribution is good, only whether it is legal and
 * whether the reported numbers describe the assignment that was actually made. HiGHS
 * reports neither: a malformed LP, a misread solver column or a drifted counter would
 * all come back as "Optimal".
 *
 * Applicant groups are named by their members, because "Gruppe N" already means a
 * rotation group everywhere else in the app.
 *
 * @param guarantees - Pinned groups, checked to have actually got what they were promised
 * @returns Empty when the result is sound, one entry per broken invariant otherwise
 */
export function validateSolution(
	groups: Group[],
	slots: Slot[],
	result: SolveResult,
	guarantees: Guarantee[] = [],
): Violation[] {
	const violations: Violation[] = [];
	const { solution } = result;

	if (solution.groups.length !== groups.length) {
		return [
			{
				code: "group-count",
				message: `${groups.length} Gruppen gingen hinein, ${solution.groups.length} kamen zurück.`,
			},
		];
	}

	const load = new Array<number>(slots.length).fill(0);
	const spread = [0, 0, 0, 0];
	const studentSpread = [0, 0, 0, 0];
	let score = 0;

	for (let g = 0; g < groups.length; g++) {
		const placed = solution.groups[g];
		const slot = placed.currentSelection;

		if (!Number.isInteger(slot) || slot < 0 || slot >= slots.length) {
			violations.push({
				code: "unassigned",
				message: `"${groups[g].members}" hat keinen gültigen Platz bekommen.`,
			});
			continue;
		}
		if (placed.size !== groups[g].size) {
			violations.push({
				code: "size-changed",
				message: `"${groups[g].members}" ist von ${groups[g].size} auf ${placed.size} Plätze gesprungen.`,
			});
		}

		load[slot] += groups[g].size;
		const rank = rankOf(groups[g].choices, slots[slot].timeSlot);
		spread[rank]++;
		studentSpread[rank] += groups[g].size;
		score -= COSTS[rank];
	}

	for (let s = 0; s < slots.length; s++) {
		if (load[s] > slots[s].capacity) {
			violations.push({
				code: "capacity",
				message: `Gruppe ${s + 1} ist mit ${load[s]} von ${slots[s].capacity} Plätzen überbelegt.`,
			});
		}
		if (solution.occupancy[s]?.amount !== load[s]) {
			violations.push({
				code: "occupancy",
				message: `Gruppe ${s + 1} meldet ${solution.occupancy[s]?.amount} Studierende, belegt sind ${load[s]}.`,
			});
		}
	}

	violations.push(...checkInvAllocation(solution.invAllocation, solution.groups));

	// The one thing a guarantee is: a promise. Nothing else in the chain would notice a
	// dropped constraint, the distribution would just look like a normal optimum.
	for (const { groupId, maxRank } of guarantees) {
		const slot = solution.groups[groupId]?.currentSelection;
		if (slot === undefined || slot < 0 || slot >= slots.length) continue;
		const rank = rankOf(groups[groupId].choices, slots[slot].timeSlot);
		if (rank > maxRank) {
			violations.push({
				code: "guarantee",
				message: `Zusage gebrochen: "${groups[groupId].members}" sollte höchstens ${SPREAD_LABELS[maxRank]} bekommen, hat aber ${SPREAD_LABELS[rank]}.`,
			});
		}
	}

	if (!sameCounts(spread, result.spread)) {
		violations.push({
			code: "spread",
			message: `Verteilung nach Wahl passt nicht zur Zuteilung: ${result.spread.join("/")} gemeldet, ${spread.join("/")} gezählt.`,
		});
	}
	if (!sameCounts(studentSpread, result.studentSpread)) {
		violations.push({
			code: "student-spread",
			message: `Studierende nach Wahl passen nicht zur Zuteilung: ${result.studentSpread.join("/")} gemeldet, ${studentSpread.join("/")} gezählt.`,
		});
	}
	// fairnessValue is what the solver minimised and what the certificate cut against. It
	// has to be exactly the cost of the assignment, or the proof proved something else.
	const fairnessCost = studentSpread.reduce(
		(sum, students, rank) => sum + students * COSTS[rank],
		0,
	);
	if (result.fairnessValue !== fairnessCost) {
		violations.push({
			code: "fairness-value",
			message: `Zielwert ${result.fairnessValue} gemeldet, ${fairnessCost} gerechnet.`,
		});
	}
	if (result.score !== score) {
		violations.push({
			code: "score",
			message: `Punktzahl ${result.score} gemeldet, ${score} gerechnet.`,
		});
	}

	return violations;
}

/** invAllocation is a reverse index, so it has to agree with the assignment both ways. */
function checkInvAllocation(
	invAllocation: Record<number, number[]>,
	placed: Group[],
): Violation[] {
	const violations: Violation[] = [];
	const expected = new Map<number, number[]>();
	for (let g = 0; g < placed.length; g++) {
		const slot = placed[g].currentSelection;
		if (slot < 0) continue;
		expected.set(slot, [...(expected.get(slot) ?? []), g]);
	}

	for (const [slot, ids] of expected) {
		const listed = invAllocation[slot] ?? [];
		if (listed.length !== ids.length || ids.some((id, i) => listed[i] !== id)) {
			violations.push({
				code: "inv-allocation",
				message: `Gruppe ${slot + 1} listet [${listed.join(", ")}], zugewiesen sind [${ids.join(", ")}].`,
			});
		}
	}
	for (const key of Object.keys(invAllocation)) {
		const slot = Number(key);
		if (!expected.has(slot) && (invAllocation[slot] ?? []).length > 0) {
			violations.push({
				code: "inv-allocation",
				message: `Gruppe ${slot + 1} listet Einträge, hat aber keine Zuteilung.`,
			});
		}
	}
	return violations;
}

function sameCounts(a: number[], b: number[]): boolean {
	return a.length === b.length && a.every((n, i) => n === b[i]);
}
