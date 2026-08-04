import { describe, it, expect } from "vitest";
import {
	checkCapacity,
	formatDistribution,
	groupByTimeSlot,
	groupRows,
	rankOf,
	sanitizeCapacities,
	toUserMessage,
} from "$lib/distribution";
import { buildSlots } from "$lib/parser";
import type { Group } from "$lib/parser";
import type { Solution } from "$lib/algorithm/types";

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
		expect(view[1].groups).toEqual([]);
		expect(view[1].studentCount).toBe(0);
	});

	it("places each group under the time slot of its assigned slot", () => {
		const solution = makeSolution([
			makeGroup(0, 3, [0, 1, -1], 1), // slot 1 is time slot 0
			makeGroup(1, 4, [1, 0, -1], 2), // slot 2 is time slot 1
		]);
		const view = groupByTimeSlot(solution, 2, 2);
		expect(view[0].groups.map((g) => g.id)).toEqual([0]);
		expect(view[1].groups.map((g) => g.id)).toEqual([1]);
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
		expect(view[0].groups[0].rank).toBe(0);
		expect(view[1].groups[0].rank).toBe(1);
	});

	it("numbers time slots from 1 and labels their rotation group range", () => {
		const view = groupByTimeSlot(makeSolution([]), 2, 4);
		expect(view.map((v) => v.num)).toEqual([1, 2]);
		expect(view.map((v) => v.label)).toEqual(["Gruppe 1–4", "Gruppe 5–8"]);
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

	it("wraps an unknown error and keeps the original text for debugging", () => {
		expect(toUserMessage(new Error("boom"))).toBe(
			"Unbekannter Fehler. Bitte Seite neu laden und nochmal versuchen. (boom)",
		);
	});

	it("handles a thrown non-Error value", () => {
		expect(toUserMessage("kaputt")).toContain("kaputt");
	});
});
