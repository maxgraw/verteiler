import { describe, expect, it } from "vitest";
import type { Solution, SolveResult } from "#lib/algorithm/types.ts";
import { buildSlots, type Group } from "#lib/parser.ts";
import {
	formatDistribution,
	groupByTimeSlot,
	groupRows,
	guaranteeSummary,
	solveCaveat,
} from "#lib/result.ts";

/** A group plus the slot a test puts it in. Only the test helpers read slot. */
type PlacedGroup = Group & { slot: number };

// Named Team, so member names stay apart from the "Gruppe N" a row is assigned to
function makeGroup(
	id: number,
	size: number,
	choices: number[],
	slot: number,
): PlacedGroup {
	return { id, size, members: `Team ${id}`, choices, slot };
}

const unplaced = ({ slot, ...group }: PlacedGroup): Group => group;

/** Solution over 2 time slots of 2 slots each, so slot 0-1 are ts0 and slot 2-3 are ts1. */
function makeSolution(groups: PlacedGroup[]): Solution {
	return {
		groups: groups.map(unplaced),
		slots: buildSlots(2, 2, [6, 6, 6, 6]),
		assignment: groups.map((g) => g.slot),
	};
}

/** A proven, fully decided result. Each case below weakens exactly one claim. */
function makeResult(overrides: Partial<SolveResult> = {}): SolveResult {
	return {
		solution: makeSolution([]),
		spread: [0, 0, 0, 0],
		studentSpread: [0, 0, 0, 0],
		optimality: "proven",
		fairnessValue: 0,
		lotteryComplete: true,
		guaranteeCost: null,
		displaced: [],
		...overrides,
	};
}

describe("groupByTimeSlot", () => {
	it("returns one entry per time slot, even when empty", () => {
		const solution = makeSolution([makeGroup(0, 3, [0, 1, -1], 0)]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view).toHaveLength(2);
		expect(view[1].rotationGroups.flatMap((rg) => rg.groups)).toEqual([]);
		expect(view[1].studentCount).toBe(0);
	});

	it("places each group under the time slot of its assigned slot", () => {
		const solution = makeSolution([
			makeGroup(0, 3, [0, 1, -1], 1), // slot 1 is time slot 0
			makeGroup(1, 4, [1, 0, -1], 2), // slot 2 is time slot 1
		]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(
			view[0].rotationGroups.flatMap((rg) => rg.groups.map((g) => g.id)),
		).toEqual([0]);
		expect(
			view[1].rotationGroups.flatMap((rg) => rg.groups.map((g) => g.id)),
		).toEqual([1]);
	});

	it("sums student counts per time slot", () => {
		const solution = makeSolution([
			makeGroup(0, 3, [0, 1, -1], 0),
			makeGroup(1, 4, [0, 1, -1], 1),
		]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view[0].studentCount).toBe(7);
	});

	it("annotates each group with the rank it actually received", () => {
		const solution = makeSolution([
			makeGroup(0, 3, [0, 1, -1], 0), // got time slot 0, its 1st choice
			makeGroup(1, 4, [0, 1, -1], 2), // got time slot 1, its 2nd choice
		]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view[0].rotationGroups[0].groups[0].rank).toBe(0);
		expect(view[1].rotationGroups[0].groups[0].rank).toBe(1);
	});

	it("numbers time slots from 1 and labels their rotation group range", () => {
		const view = groupByTimeSlot(makeSolution([]), 2, 4);
		expect(view.map((v) => v.num)).toEqual([1, 2]);
		expect(view.map((v) => v.label)).toEqual(["Gruppe 1–4", "Gruppe 5–8"]);
	});

	it("numbers rotation groups continuously across time slots", () => {
		const view = groupByTimeSlot(makeSolution([]), 2, 2);
		const nums = view.flatMap((v) => v.rotationGroups.map((rg) => rg.num));
		expect(nums).toEqual([1, 2, 3, 4]);
	});

	it("keeps an unused rotation group, so its free places stay visible", () => {
		const solution = makeSolution([makeGroup(0, 3, [0, 1, -1], 0)]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view[0].rotationGroups[1].groups).toEqual([]);
		expect(view[0].rotationGroups[1].studentCount).toBe(0);
		expect(view[0].rotationGroups[1].capacity).toBe(6);
	});

	it("collects groups that share one rotation group under it", () => {
		const solution = makeSolution([
			makeGroup(0, 5, [0, 1, -1], 0),
			makeGroup(1, 1, [0, 1, -1], 0),
		]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view[0].rotationGroups[0].groups.map((g) => g.id)).toEqual([0, 1]);
		expect(view[0].rotationGroups[0].studentCount).toBe(6);
	});

	it("leaves out a group that was never assigned", () => {
		const solution = makeSolution([makeGroup(0, 3, [0, 1, -1], -1)]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(
			view.flatMap((v) => v.rotationGroups.flatMap((rg) => rg.groups)),
		).toEqual([]);
	});
});

describe("groupRows", () => {
	it("names the single rotation group, ordered by its number", () => {
		const solution = makeSolution([
			makeGroup(0, 2, [1, 0, -1], 2), // slot 2, so Gruppe 3
			makeGroup(1, 2, [0, 1, -1], 0), // slot 0, so Gruppe 1
		]);
		const rows = groupRows(groupByTimeSlot(solution, 2, 2));
		expect(rows.map((r) => r.members)).toEqual(["Team 1", "Team 0"]);
		expect(rows.map((r) => r.label)).toEqual(["Gruppe 1", "Gruppe 3"]);
	});

	it("carries the rank each group received", () => {
		const solution = makeSolution([
			makeGroup(0, 2, [0, 1, -1], 0),
			makeGroup(1, 2, [0, 1, -1], 2),
		]);
		const rows = groupRows(groupByTimeSlot(solution, 2, 2));
		expect(rows.map((r) => r.rank)).toEqual([0, 1]);
	});

	it("gives both groups of a shared rotation group the same number", () => {
		const solution = makeSolution([
			makeGroup(0, 5, [0, 1, -1], 0),
			makeGroup(1, 1, [0, 1, -1], 0),
		]);
		const rows = groupRows(groupByTimeSlot(solution, 2, 2));
		expect(rows.map((r) => r.label)).toEqual(["Gruppe 1", "Gruppe 1"]);
	});

	it("skips empty time slots", () => {
		expect(groupRows(groupByTimeSlot(makeSolution([]), 2, 2))).toEqual([]);
	});
});

describe("formatDistribution", () => {
	it("writes one line per group with assignment and rank", () => {
		const solution = makeSolution([
			makeGroup(0, 2, [0, 1, -1], 0),
			makeGroup(1, 2, [0, 1, -1], 2),
		]);
		const text = formatDistribution(groupRows(groupByTimeSlot(solution, 2, 2)));
		expect(text).toBe("Team 0: Gruppe 1 (1. Wahl)\nTeam 1: Gruppe 3 (2. Wahl)");
	});

	it("names the missed preference instead of leaving the rank blank", () => {
		const solution = makeSolution([makeGroup(0, 2, [0, 0, 0], 2)]);
		const text = formatDistribution(groupRows(groupByTimeSlot(solution, 2, 2)));
		expect(text).toBe("Team 0: Gruppe 3 (Kein Wunsch)");
	});
});

describe("guaranteeSummary", () => {
	it("stays quiet when no guarantee was set", () => {
		expect(guaranteeSummary(makeResult())).toBeNull();
	});

	it("says so when a guarantee cost nobody anything", () => {
		const message = guaranteeSummary(makeResult({ guaranteeCost: 0 }));
		expect(message).toContain("kosten nichts");
	});

	it("counts the groups and students that paid", () => {
		const message = guaranteeSummary(
			makeResult({
				guaranteeCost: 9,
				displaced: [
					{ members: "Team A", size: 6, from: 0, to: 2 },
					{ members: "Team B", size: 1, from: 0, to: 1 },
				],
			}),
		);
		expect(message).toContain("2 Gruppen");
		expect(message).toContain("7 Studierenden");
		expect(message).toContain("1 davon fällt um zwei Ränge");
	});
});

describe("solveCaveat", () => {
	it("stays quiet when the optimum was proven and the lottery ran through", () => {
		expect(solveCaveat(makeResult())).toBeNull();
	});

	it("says a better distribution exists when the solver stopped short", () => {
		expect(solveCaveat(makeResult({ optimality: "suboptimal" }))).toContain(
			"bessere Verteilung",
		);
	});

	it("separates unproven from wrong, since the result may still be optimal", () => {
		const message = solveCaveat(makeResult({ optimality: "unproven" }));
		expect(message).toContain("nicht als beste bewiesen");
	});

	it("reports an incomplete lottery even when the optimum was proven", () => {
		expect(solveCaveat(makeResult({ lotteryComplete: false }))).toContain(
			"Auslosung",
		);
	});

	it("leads with the worse news when both went wrong", () => {
		const message = solveCaveat(
			makeResult({ optimality: "suboptimal", lotteryComplete: false }),
		);
		expect(message).toContain("bessere Verteilung");
	});
});
