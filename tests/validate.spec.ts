import { describe, it, expect } from "vitest";
import { validateSolution } from "$lib/algorithm/validate";
import { COSTS } from "$lib/algorithm/costs";
import { rankOf } from "$lib/distribution";
import { buildSlots } from "$lib/parser";
import type { Group, Slot } from "$lib/parser";
import type { SolveResult } from "$lib/algorithm/types";

// Named Team, so member names stay apart from the "Gruppe N" a row is assigned to
function makeGroup(
	id: number,
	size: number,
	choices: number[],
	currentSelection: number,
): Group {
	return { id, size, members: `Team ${id}`, choices, currentSelection };
}

/** Two time slots of two slots each, so slot 0-1 are ts0 and slot 2-3 are ts1. */
function makeSlots(): Slot[] {
	return buildSlots(2, 2, [6, 6, 6, 6]);
}

/**
 * A result that is correct by construction, built independently of buildResult so a
 * shared mistake in the solver cannot make these tests agree with it. Every case below
 * takes one of these and breaks exactly one thing.
 */
function makeResult(groups: Group[], slots: Slot[]): SolveResult {
	const occupancy = slots.map((s) => ({ ...s, amount: 0 }));
	const invAllocation: Record<number, number[]> = {};
	const spread = [0, 0, 0, 0];
	const studentSpread = [0, 0, 0, 0];
	let score = 0;
	const placed = groups.map((g) => ({ ...g }));

	for (let g = 0; g < placed.length; g++) {
		const slot = placed[g].currentSelection;
		occupancy[slot].amount += placed[g].size;
		(invAllocation[slot] ??= []).push(g);
		const rank = rankOf(placed[g].choices, slots[slot].timeSlot);
		spread[rank]++;
		studentSpread[rank] += placed[g].size;
		score -= COSTS[rank];
	}

	return {
		solution: { occupancy, groups: placed, invAllocation },
		score,
		spread,
		studentSpread,
		optimality: "proven",
		fairnessValue: studentSpread.reduce((sum, n, rank) => sum + n * COSTS[rank], 0),
		lotteryComplete: true,
		guaranteeCost: null,
		displaced: [],
	};
}

const codes = (v: { code: string }[]) => v.map((x) => x.code);

describe("validateSolution", () => {
	it("passes a sound result", () => {
		const groups = [
			makeGroup(0, 5, [0, 1, -1], 0),
			makeGroup(1, 1, [0, 1, -1], 0),
			makeGroup(2, 4, [1, 0, -1], 2),
		];
		const slots = makeSlots();
		expect(validateSolution(groups, slots, makeResult(groups, slots))).toEqual([]);
	});

	it("passes an empty cohort", () => {
		const slots = makeSlots();
		expect(validateSolution([], slots, makeResult([], slots))).toEqual([]);
	});

	it("reports a slot filled past its capacity", () => {
		const groups = [
			makeGroup(0, 6, [0, 1, -1], 0),
			makeGroup(1, 3, [0, 1, -1], 0),
		];
		const slots = makeSlots();
		const violations = validateSolution(groups, slots, makeResult(groups, slots));
		expect(codes(violations)).toContain("capacity");
		expect(violations.find((v) => v.code === "capacity")?.message).toContain(
			"9 von 6",
		);
	});

	it("reports a group that never got a slot", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.groups[0].currentSelection = -1;
		expect(codes(validateSolution(groups, slots, result))).toContain("unassigned");
	});

	it("reports a slot index past the end of the slot array", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.groups[0].currentSelection = 99;
		expect(codes(validateSolution(groups, slots, result))).toContain("unassigned");
	});

	it("reports a group size that changed on the way through", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.groups[0].size = 4;
		expect(codes(validateSolution(groups, slots, result))).toContain("size-changed");
	});

	it("reports occupancy that disagrees with the assignment", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.occupancy[0].amount = 2;
		expect(codes(validateSolution(groups, slots, result))).toContain("occupancy");
	});

	it("reports a reverse index that lost a group", () => {
		const groups = [
			makeGroup(0, 2, [0, 1, -1], 0),
			makeGroup(1, 2, [0, 1, -1], 0),
		];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.invAllocation[0] = [0];
		expect(codes(validateSolution(groups, slots, result))).toContain(
			"inv-allocation",
		);
	});

	it("reports a reverse index listing a slot nobody got", () => {
		const groups = [makeGroup(0, 2, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.invAllocation[3] = [0];
		expect(codes(validateSolution(groups, slots, result))).toContain(
			"inv-allocation",
		);
	});

	it("reports a spread that does not match the ranks actually handed out", () => {
		const groups = [makeGroup(0, 2, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.spread = [0, 1, 0, 0];
		expect(codes(validateSolution(groups, slots, result))).toContain("spread");
	});

	it("reports a student spread that does not match the group sizes", () => {
		const groups = [makeGroup(0, 2, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.studentSpread = [7, 0, 0, 0];
		expect(codes(validateSolution(groups, slots, result))).toContain(
			"student-spread",
		);
	});

	it("reports a fairness value that does not match the assignment", () => {
		const groups = [makeGroup(0, 2, [1, 0, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.fairnessValue = 0;
		expect(codes(validateSolution(groups, slots, result))).toContain(
			"fairness-value",
		);
	});

	it("reports a score that drifted from the assignment", () => {
		const groups = [makeGroup(0, 2, [1, 0, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.score = 0;
		expect(codes(validateSolution(groups, slots, result))).toContain("score");
	});

	it("reports a guarantee the distribution did not keep", () => {
		// slot 2 is time slot 1, so this group got its 2nd choice, not its 1st
		const groups = [makeGroup(0, 3, [0, 1, -1], 2)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		const violations = validateSolution(groups, slots, result, [
			{ groupId: 0, maxRank: 0 },
		]);
		expect(codes(violations)).toContain("guarantee");
	});

	it("accepts a guarantee that was kept", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], 0)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		expect(
			validateSolution(groups, slots, result, [{ groupId: 0, maxRank: 0 }]),
		).toEqual([]);
	});

	it("accepts a second choice when that is what was promised", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], 2)];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		expect(
			validateSolution(groups, slots, result, [{ groupId: 0, maxRank: 1 }]),
		).toEqual([]);
	});

	it("stops at a group count mismatch, since nothing else lines up after that", () => {
		const groups = [
			makeGroup(0, 2, [0, 1, -1], 0),
			makeGroup(1, 2, [0, 1, -1], 1),
		];
		const slots = makeSlots();
		const result = makeResult(groups, slots);
		result.solution.groups = [result.solution.groups[0]];
		expect(codes(validateSolution(groups, slots, result))).toEqual(["group-count"]);
	});
});
