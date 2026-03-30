import { describe, it, expect } from "vitest";
import { solve } from "../algorithm";
import { buildSlots } from "../parser";
import type { Group, Slot } from "../parser";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeGroup(id: number, size: number, choices: number[]): Group {
  return { id, size, members: `Group ${id}`, choices, currentSelection: -1 };
}

/** 8 timeslots × 4 slots = 32 slots, uniform capacity */
function fullSlots(capacity = 6): Slot[] {
  return buildSlots(8, 4, Array(32).fill(capacity));
}

/**
 * Slots where only one timeslot has capacity — forces all groups into that timeslot.
 */
function onlyTimeslot(t: number, capacity = 6): Slot[] {
  return buildSlots(
    8,
    4,
    Array(32)
      .fill(0)
      .map((_, i) => (Math.floor(i / 4) === t ? capacity : 0)),
  );
}

// ─── solve — structural guarantees ───────────────────────────────────────────

describe("solve — structural guarantees", () => {
  it("assigns every group to a slot", async () => {
    const groups = [
      makeGroup(0, 4, [0, 1, 2]),
      makeGroup(1, 3, [1, 2, 3]),
      makeGroup(2, 2, [2, 3, 4]),
    ];
    const { solution } = await solve(groups, fullSlots());
    for (const g of solution.groups) {
      expect(g.currentSelection).toBeGreaterThanOrEqual(0);
    }
  });

  it("never exceeds slot capacity", async () => {
    const groups = Array.from({ length: 20 }, (_, i) =>
      makeGroup(i, 5, [i % 8, (i + 1) % 8, (i + 2) % 8]),
    );
    const { solution } = await solve(groups, fullSlots(6));
    for (const slot of solution.occupancy) {
      expect(slot.amount).toBeLessThanOrEqual(slot.capacity);
    }
  });

  it("spread entries sum to the number of groups", async () => {
    const groups = [
      makeGroup(0, 4, [0, 1, 2]),
      makeGroup(1, 3, [1, 2, 3]),
      makeGroup(2, 2, [3, 4, 5]),
    ];
    const { spread } = await solve(groups, fullSlots());
    expect(spread.reduce((a, b) => a + b, 0)).toBe(groups.length);
  });

  it("spread has exactly 4 buckets: [1st, 2nd, 3rd, noMatch]", async () => {
    const { spread } = await solve([makeGroup(0, 1, [0, 1, 2])], fullSlots());
    expect(spread).toHaveLength(4);
  });

  it("invAllocation mirrors group currentSelection", async () => {
    const groups = [makeGroup(0, 3, [0, 1, 2]), makeGroup(1, 2, [1, 2, 3])];
    const { solution } = await solve(groups, fullSlots());
    for (const g of solution.groups) {
      expect(solution.invAllocation[g.currentSelection]).toContain(g.id);
    }
  });

  it("occupancy amount matches sum of group sizes assigned to that slot", async () => {
    const groups = [makeGroup(0, 4, [0, 1, 2]), makeGroup(1, 3, [1, 2, 3])];
    const { solution } = await solve(groups, fullSlots());
    for (const [slotId, groupIds] of Object.entries(solution.invAllocation)) {
      const expectedAmount = groupIds.reduce(
        (sum, gId) => sum + solution.groups[gId].size,
        0,
      );
      expect(solution.occupancy[Number(slotId)].amount).toBe(expectedAmount);
    }
  });
});

// ─── solve — scoring ──────────────────────────────────────────────────────────

describe("solve — scoring", () => {
  it("score is 0 when a single group is forced to its 1st choice timeslot", async () => {
    const group = makeGroup(0, 5, [2, 1, 0]);
    const { score, spread } = await solve([group], onlyTimeslot(2, 6));
    expect(score).toBe(0);
    expect(spread[0]).toBe(1);
  });

  it("score is -1 when a single group is forced to its 2nd choice timeslot", async () => {
    const group = makeGroup(0, 5, [2, 1, 0]);
    const { score, spread } = await solve([group], onlyTimeslot(1, 6));
    expect(score).toBe(-1);
    expect(spread[1]).toBe(1);
  });

  it("score is -5 when a single group is forced to its 3rd choice timeslot", async () => {
    const group = makeGroup(0, 5, [2, 1, 0]);
    const { score, spread } = await solve([group], onlyTimeslot(0, 6));
    expect(score).toBe(-5);
    expect(spread[2]).toBe(1);
  });

  it("score is -100 when a group gets none of its choices", async () => {
    const group = makeGroup(0, 5, [0, 1, 2]);
    const { score, spread } = await solve([group], onlyTimeslot(7, 6));
    expect(score).toBe(-100);
    expect(spread[3]).toBe(1);
  });

  it("score accumulates correctly across multiple groups", async () => {
    const slots = buildSlots(8, 1, [6, 5, 0, 0, 0, 0, 0, 0]);
    const groups = [
      makeGroup(0, 6, [0, 1, 2]), // timeslot 0 → 1st choice → 0
      makeGroup(1, 5, [3, 1, 0]), // timeslot 1 → 2nd choice → -1
    ];
    const { score } = await solve(groups, slots);
    expect(score).toBe(-1);
  });
});

// ─── solve — Egal handling ────────────────────────────────────────────────────

describe("solve — Egal choices", () => {
  it("Egal as 1st choice counts as 1st-choice match regardless of assigned slot", async () => {
    const group = makeGroup(0, 4, [-1, -1, -1]);
    const { score, spread } = await solve([group], fullSlots());
    expect(score).toBe(0);
    expect(spread[0]).toBe(1);
  });

  it("Egal as 2nd choice counts as 2nd-choice match when 1st is not satisfied", async () => {
    // Only timeslot 7 has capacity; choices = [0, -1, 2] → 1st fails, 2nd is Egal → rank 1
    const group = makeGroup(0, 4, [0, -1, 2]);
    const { score, spread } = await solve([group], onlyTimeslot(7, 6));
    expect(score).toBe(-1);
    expect(spread[1]).toBe(1);
  });

  it("three Egal choices all produce score 0", async () => {
    const groups = Array.from({ length: 5 }, (_, i) =>
      makeGroup(i, 3, [-1, -1, -1]),
    );
    const { score } = await solve(groups, fullSlots());
    expect(score).toBe(0);
  });
});

// ─── solve — determinism ─────────────────────────────────────────────────────

describe("solve — determinism", () => {
  it("produces identical results on repeated calls", async () => {
    const groups = Array.from({ length: 8 }, (_, i) =>
      makeGroup(i, 4, [i % 8, (i + 2) % 8, (i + 4) % 8]),
    );
    const slots = fullSlots();
    const r1 = await solve(groups, slots);
    const r2 = await solve(groups, slots);
    expect(r1.score).toBe(r2.score);
    expect(r1.spread).toEqual(r2.spread);
    expect(r1.solution.groups.map((g) => g.currentSelection)).toEqual(
      r2.solution.groups.map((g) => g.currentSelection),
    );
  });
});

// ─── solve — optimality ───────────────────────────────────────────────────────

describe("solve — optimality", () => {
  it("achieves perfect score when all groups can get their 1st choice", async () => {
    // 8 groups, each exclusively wants a different timeslot — trivially satisfiable
    const groups = Array.from({ length: 8 }, (_, i) =>
      makeGroup(i, 1, [i, (i + 1) % 8, (i + 2) % 8]),
    );
    const { score, spread } = await solve(groups, fullSlots());
    expect(score).toBe(0);
    expect(spread[0]).toBe(8);
  });

  it("finds the globally optimal assignment on a contested input", async () => {
    // Two groups both prefer ts 0, but only one fits (1 slot, capacity = group size).
    // Optimal: one gets 1st choice (score 0), one gets 2nd choice (score -1). Total = -1.
    const slots = buildSlots(2, 1, [3, 3]);
    const groups = [makeGroup(0, 3, [0, 1, -1]), makeGroup(1, 3, [0, 1, -1])];
    const { score } = await solve(groups, slots);
    expect(score).toBe(-1);
  });

  it("throws when there is no feasible assignment", async () => {
    // Group size exceeds all available capacities
    const slots = buildSlots(8, 1, [3, 0, 0, 0, 0, 0, 0, 0]);
    const groups = [makeGroup(0, 4, [0, 1, 2])];
    await expect(solve(groups, slots)).rejects.toThrow();
  });
});

// ─── solve — integration with real-size data ─────────────────────────────────

describe("solve — integration", () => {
  // 32 student groups, 168 people, matching realistisch.csv
  const groups: Group[] = [
    makeGroup(0, 6, [2, 1, 3]),
    makeGroup(1, 6, [2, 3, 4]),
    makeGroup(2, 6, [2, 1, 5]),
    makeGroup(3, 6, [1, 2, 0]),
    makeGroup(4, 6, [1, 3, 2]),
    makeGroup(5, 6, [3, 2, 4]),
    makeGroup(6, 6, [3, 1, 5]),
    makeGroup(7, 6, [4, 3, 2]),
    makeGroup(8, 6, [4, 5, 1]),
    makeGroup(9, 6, [0, 1, 2]),
    makeGroup(10, 6, [0, 2, 3]),
    makeGroup(11, 6, [5, 4, 3]),
    makeGroup(12, 6, [5, 6, 2]),
    makeGroup(13, 6, [6, 5, 4]),
    makeGroup(14, 6, [2, 6, 1]),
    makeGroup(15, 6, [3, 2, 1]),
    makeGroup(16, 5, [1, 0, 2]),
    makeGroup(17, 5, [2, 3, 1]),
    makeGroup(18, 5, [3, 4, 1]),
    makeGroup(19, 5, [4, 2, 3]),
    makeGroup(20, 5, [5, 3, 4]),
    makeGroup(21, 5, [6, 7, 5]),
    makeGroup(22, 5, [7, 6, 5]),
    makeGroup(23, 5, [0, 1, 4]),
    makeGroup(24, 5, [-1, -1, -1]),
    makeGroup(25, 5, [2, -1, 1]),
    makeGroup(26, 5, [1, 2, -1]),
    makeGroup(27, 5, [6, 5, 4]),
    makeGroup(28, 3, [0, 7, 1]),
    makeGroup(29, 3, [7, 0, 6]),
    makeGroup(30, 3, [4, 5, 6]),
    makeGroup(31, 3, [3, 2, 5]),
  ];

  it("solves a full 32-group semester without error", async () => {
    await expect(solve(groups, fullSlots())).resolves.toBeDefined();
  });

  it("all 32 groups are assigned", async () => {
    const { solution } = await solve(groups, fullSlots());
    expect(solution.groups.every((g) => g.currentSelection >= 0)).toBe(true);
  });

  it("no slot is over capacity", async () => {
    const { solution } = await solve(groups, fullSlots());
    for (const slot of solution.occupancy) {
      expect(slot.amount).toBeLessThanOrEqual(slot.capacity);
    }
  });

  it("score is deterministic", async () => {
    const r1 = await solve(groups, fullSlots());
    const r2 = await solve(groups, fullSlots());
    expect(r1.score).toBe(r2.score);
  });

  it("achieves a perfect or near-perfect score on this well-distributed input", async () => {
    // With 32 groups spread across 8 timeslots, the ILP should satisfy nearly all 1st choices
    const { spread } = await solve(groups, fullSlots());
    // At least 28 of 32 groups should get their 1st or 2nd choice
    expect(spread[0] + spread[1]).toBeGreaterThanOrEqual(28);
  });
});
