import { describe, expect, it } from "vitest";
import { DEFAULT_CAPACITY, TOTAL_SLOTS } from "#lib/config.ts";
import type { Group } from "#lib/parser.ts";
import { prepareSolve, type SolveInput } from "#lib/presolve.ts";

function makeGroup(id: number, size: number): Group {
	return {
		id,
		size,
		members: `Team ${id}`,
		choices: [0, 1, 2],
		currentSelection: -1,
	};
}

function input(overrides: Partial<SolveInput> = {}): SolveInput {
	return {
		groups: [makeGroup(0, 2), makeGroup(1, 3)],
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
			makeGroup(i, 2),
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
