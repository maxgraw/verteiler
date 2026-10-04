import { describe, expect, it } from "vitest";
import { DEFAULT_CAPACITY, TOTAL_SLOTS } from "#lib/config.ts";
import { buildSlots, type Group } from "#lib/parser.ts";
import {
	checkCapacity,
	checkGuarantees,
	prepareSolve,
	type SolveInput,
	sanitizeCapacities,
} from "#lib/presolve.ts";

function makeGroup(id: number, size: number, choices: number[]): Group {
	return { id, size, members: `Team ${id}`, choices };
}

function input(overrides: Partial<SolveInput> = {}): SolveInput {
	return {
		groups: [makeGroup(0, 2, [0, 1, 2]), makeGroup(1, 3, [0, 1, 2])],
		capacities: Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY),
		guarantees: [],
		lotterySeed: "ABC234",
		...overrides,
	};
}

describe("prepareSolve", () => {
	it("builds one slot per capacity and passes the rest through", () => {
		const prepared = prepareSolve(
			input({ guarantees: [{ groupId: 0, maxRank: 0 }] }),
		);
		if (!("request" in prepared)) throw new Error(prepared.error);
		expect(prepared.request.slots).toHaveLength(TOTAL_SLOTS);
		expect(prepared.request.groups).toHaveLength(2);
		expect(prepared.request.lotterySeed).toBe("ABC234");
		expect(prepared.request.guarantees).toEqual([{ groupId: 0, maxRank: 0 }]);
	});

	it("clamps cleared capacity fields to 1 instead of passing NaN on", () => {
		const capacities = Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY);
		capacities[0] = Number.NaN;
		const prepared = prepareSolve(input({ capacities }));
		if (!("request" in prepared)) throw new Error(prepared.error);
		expect(prepared.request.slots[0].capacity).toBe(1);
	});

	it("rejects a cohort larger than the total capacity", () => {
		// Capacities are clamped to at least 1, so the cohort has to outgrow that floor
		const groups = Array.from({ length: TOTAL_SLOTS }, (_, i) =>
			makeGroup(i, 2, [0, 1, 2]),
		);
		const prepared = prepareSolve(
			input({ groups, capacities: Array(TOTAL_SLOTS).fill(1) }),
		);
		expect(prepared).toHaveProperty("error");
		expect("error" in prepared && prepared.error).toMatch(/Kapazität/);
	});

	it("names a guarantee that points at a missing group", () => {
		const prepared = prepareSolve(
			input({ guarantees: [{ groupId: 7, maxRank: 0 }] }),
		);
		expect("error" in prepared && prepared.error).toMatch(/Zusage/);
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
	const groups = [makeGroup(0, 6, [0, 1, 2]), makeGroup(1, 5, [0, 1, 2])];

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

describe("checkGuarantees", () => {
	it("passes when every guarantee fits", () => {
		const groups = [makeGroup(0, 3, [0, 1, -1])];
		const slots = buildSlots(2, 2, [6, 6, 6, 6]);
		expect(
			checkGuarantees(groups, slots, [{ groupId: 0, maxRank: 0 }]),
		).toBeNull();
	});

	it("passes an empty list", () => {
		expect(checkGuarantees([], buildSlots(2, 2, [6, 6, 6, 6]), [])).toBeNull();
	});

	it("rejects a group too large for any rotation group it may take", () => {
		const groups = [makeGroup(0, 5, [0, 1, -1])];
		const slots = buildSlots(2, 2, [3, 3, 6, 6]);
		const message = checkGuarantees(groups, slots, [
			{ groupId: 0, maxRank: 0 },
		]);
		expect(message).toContain("5 Mitglieder");
	});

	it("rejects more guaranteed students than a time slot can hold", () => {
		// Each group fits a single slot, so only the time slot total is short
		const groups = [
			makeGroup(0, 3, [0, 1, -1]),
			makeGroup(1, 3, [0, 1, -1]),
			makeGroup(2, 3, [0, 1, -1]),
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
		const groups = [makeGroup(0, 4, [0, 1, -1]), makeGroup(1, 4, [0, 1, -1])];
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
