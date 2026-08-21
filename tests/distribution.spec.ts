import { describe, it, expect } from "vitest";
import {
	allowedTimeSlots,
	checkCapacity,
	checkGuarantees,
	findGroups,
	formatDistribution,
	guaranteeSummary,
	groupByTimeSlot,
	groupRows,
	rankOf,
	sanitizeCapacities,
	solveCaveat,
	toUserMessage,
} from "$lib/distribution";
import { buildSlots } from "$lib/parser";
import type { Group } from "$lib/parser";
import type { Solution, SolveResult } from "$lib/algorithm/types";

function makeGroup(
	id: number,
	size: number,
	choices: number[],
	currentSelection: number,
): Group {
	// Named Team, so member names stay apart from the "Gruppe N" a row is assigned to
	return { id, size, members: `Team ${id}`, choices, currentSelection };
}

/** Solution over 2 time slots of 2 slots each, so slot 0-1 are ts0 and slot 2-3 are ts1. */
function makeSolution(groups: Group[]): Solution {
	const occupancy = buildSlots(2, 2, [6, 6, 6, 6]);
	const invAllocation: Record<number, number[]> = {};
	for (const g of groups) {
		occupancy[g.currentSelection].amount += g.size;
		(invAllocation[g.currentSelection] ??= []).push(g.id);
	}
	return { occupancy, groups, invAllocation };
}

describe("rankOf", () => {
	it("returns the position of an exact time slot match", () => {
		expect(rankOf([3, 5, 7], 3)).toBe(0);
		expect(rankOf([3, 5, 7], 5)).toBe(1);
		expect(rankOf([3, 5, 7], 7)).toBe(2);
	});

	it("returns 3 when no choice matches", () => {
		expect(rankOf([3, 5, 7], 1)).toBe(3);
	});

	it("treats Egal as a match at that position", () => {
		expect(rankOf([-1, 5, 7], 1)).toBe(0);
		expect(rankOf([3, -1, 7], 1)).toBe(1);
		expect(rankOf([3, 5, -1], 1)).toBe(2);
	});

	it("prefers an earlier exact match over a later Egal", () => {
		expect(rankOf([1, -1, 7], 1)).toBe(0);
	});
});

describe("sanitizeCapacities", () => {
	it("keeps valid capacities unchanged", () => {
		expect(sanitizeCapacities([6, 5, 1])).toEqual([6, 5, 1]);
	});

	it("replaces zero and negative values with 1", () => {
		expect(sanitizeCapacities([0, -3])).toEqual([1, 1]);
	});

	it("replaces NaN and Infinity with 1", () => {
		expect(sanitizeCapacities([NaN, Infinity, -Infinity])).toEqual([1, 1, 1]);
	});

	it("replaces a cleared number input, which arrives as null, with 1", () => {
		expect(sanitizeCapacities([null as unknown as number, 4])).toEqual([1, 4]);
	});
});

describe("checkCapacity", () => {
	const groups = [
		makeGroup(0, 6, [0, 1, 2], -1),
		makeGroup(1, 5, [0, 1, 2], -1),
	];

	it("returns null when capacity exceeds the cohort", () => {
		expect(checkCapacity(groups, [6, 6])).toBeNull();
	});

	it("returns null when capacity matches the cohort exactly", () => {
		expect(checkCapacity(groups, [6, 5])).toBeNull();
	});

	it("returns a German message naming both totals when capacity is short", () => {
		const message = checkCapacity(groups, [5, 5]);
		expect(message).toContain("11 Studierende");
		expect(message).toContain("nur 10 Plätze");
	});

	it("returns null for an empty cohort", () => {
		expect(checkCapacity([], [1])).toBeNull();
	});
});

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
		expect(view[0].rotationGroups.flatMap((rg) => rg.groups.map((g) => g.id))).toEqual([0]);
		expect(view[1].rotationGroups.flatMap((rg) => rg.groups.map((g) => g.id))).toEqual([1]);
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
		const solution: Solution = {
			occupancy: buildSlots(2, 2, [6, 6, 6, 6]),
			groups: [makeGroup(0, 3, [0, 1, -1], -1)],
			invAllocation: {},
		};
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view.flatMap((v) => v.rotationGroups.flatMap((rg) => rg.groups))).toEqual([]);
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

/** A proven, fully decided result. Each case below weakens exactly one claim. */
function makeResult(overrides: Partial<SolveResult> = {}): SolveResult {
	return {
		solution: makeSolution([]),
		score: 0,
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

describe("allowedTimeSlots", () => {
	it("allows only the first choice at rank 0", () => {
		expect(allowedTimeSlots([3, 5, 7], 0)).toEqual([3]);
	});

	it("allows the first two choices at rank 1", () => {
		expect(allowedTimeSlots([3, 5, 7], 1)).toEqual([3, 5]);
	});

	it("collapses a repeated choice instead of listing it twice", () => {
		expect(allowedTimeSlots([3, 3, 7], 1)).toEqual([3]);
	});

	it("returns null for Egal, which any time slot already satisfies", () => {
		expect(allowedTimeSlots([-1, 5, 7], 0)).toBeNull();
		expect(allowedTimeSlots([3, -1, 7], 1)).toBeNull();
	});

	it("ignores an Egal that sits below the guaranteed rank", () => {
		expect(allowedTimeSlots([3, -1, 7], 0)).toEqual([3]);
	});
});

describe("checkGuarantees", () => {
	it("passes when every guarantee fits", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1], -1)];
		const slots = buildSlots(2, 2, [6, 6, 6, 6]);
		expect(checkGuarantees(groups, slots, [{ groupId: 0, maxRank: 0 }])).toBeNull();
	});

	it("passes an empty list", () => {
		expect(checkGuarantees([], buildSlots(2, 2, [6, 6, 6, 6]), [])).toBeNull();
	});

	it("rejects a group too large for any rotation group it may take", () => {
		const groups = [makeGroup(0, 5, [0, 1, -1], -1)];
		const slots = buildSlots(2, 2, [3, 3, 6, 6]);
		const message = checkGuarantees(groups, slots, [{ groupId: 0, maxRank: 0 }]);
		expect(message).toContain("5 Mitglieder");
	});

	it("rejects more guaranteed students than a time slot can hold", () => {
		// Each group fits a single slot, so only the time slot total is short
		const groups = [
			makeGroup(0, 3, [0, 1, -1], -1),
			makeGroup(1, 3, [0, 1, -1], -1),
			makeGroup(2, 3, [0, 1, -1], -1),
		];
		const slots = buildSlots(2, 2, [4, 4, 6, 6]);
		const message = checkGuarantees(groups, slots, [
			{ groupId: 0, maxRank: 0 },
			{ groupId: 1, maxRank: 0 },
			{ groupId: 2, maxRank: 0 },
		]);
		expect(message).toContain("Zeitslot 1");
	});

	it("does not count a guarantee that two time slots could absorb", () => {
		const groups = [
			makeGroup(0, 4, [0, 1, -1], -1),
			makeGroup(1, 4, [0, 1, -1], -1),
		];
		const slots = buildSlots(2, 2, [3, 3, 6, 6]);
		expect(
			checkGuarantees(groups, slots, [
				{ groupId: 0, maxRank: 1 },
				{ groupId: 1, maxRank: 1 },
			]),
		).toBeNull();
	});

	it("rejects a guarantee pointing at a group that is gone", () => {
		const slots = buildSlots(2, 2, [6, 6, 6, 6]);
		expect(checkGuarantees([], slots, [{ groupId: 4, maxRank: 0 }])).toContain(
			"nicht mehr gibt",
		);
	});
});

describe("findGroups", () => {
	const groups = [
		{ id: 0, size: 2, members: "Anna Müller, Ben Schmidt", choices: [0], currentSelection: -1 },
		{ id: 1, size: 1, members: "Clara Weiß", choices: [0], currentSelection: -1 },
	];

	it("finds a group by part of a member name", () => {
		expect(findGroups(groups, "schmidt").map((g) => g.id)).toEqual([0]);
	});

	it("ignores umlauts, so a plain keyboard still finds the name", () => {
		expect(findGroups(groups, "muller").map((g) => g.id)).toEqual([0]);
		expect(findGroups(groups, "weiss").map((g) => g.id)).toEqual([1]);
	});

	it("stays quiet below two characters, which would match everything", () => {
		expect(findGroups(groups, "a")).toEqual([]);
	});

	it("caps the result list", () => {
		expect(findGroups(groups, "e", 1).length).toBeLessThanOrEqual(1);
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

describe("toUserMessage", () => {
	it("maps solver infeasibility to a capacity hint", () => {
		const message = toUserMessage(
			new Error("No feasible solution found (status: Infeasible)."),
		);
		expect(message).toBe(
			"Keine gültige Verteilung möglich. Prüf, ob die Kapazitäten ausreichen.",
		);
	});

	it("passes the timeout message through unchanged", () => {
		const original = "Zeitüberschreitung: Berechnung dauerte zu lange.";
		expect(toUserMessage(new Error(original))).toBe(original);
	});

	it("calls a timed out solve a timeout, not a capacity problem", () => {
		const message = toUserMessage(
			new Error("No assignment returned (status: Time limit reached)."),
		);
		expect(message).toBe("Die Berechnung hat zu lange gedauert. Versuch es nochmal.");
	});

	it("passes a validation failure through, it already names what broke", () => {
		const original = "Ungültige Verteilung: Gruppe 3 ist mit 9 von 6 Plätzen überbelegt.";
		expect(toUserMessage(new Error(original))).toBe(original);
	});

	it("wraps an unknown error and keeps the original text for debugging", () => {
		expect(toUserMessage(new Error("boom"))).toBe(
			"Unbekannter Fehler. Bitte Seite neu laden und nochmal versuchen. (boom)",
		);
	});

	it("handles a thrown non-Error value", () => {
		expect(toUserMessage("kaputt")).toContain("kaputt");
	});
});
