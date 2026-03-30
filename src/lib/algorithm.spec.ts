import { describe, it, expect, vi } from 'vitest';
import { solve } from './algorithm';
import { buildSlots } from './parser';
import type { Group, Slot } from './parser';

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
 * Slots per timeslot = 4, timeslot indices 0–7.
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

describe('solve — structural guarantees', () => {
    it('assigns every group to a slot', () => {
        const groups = [
            makeGroup(0, 4, [0, 1, 2]),
            makeGroup(1, 3, [1, 2, 3]),
            makeGroup(2, 2, [2, 3, 4]),
        ];
        const { solution } = solve(groups, fullSlots(), { seed: 1, episodes: 10 });
        for (const g of solution.groups) {
            expect(g.currentSelection).toBeGreaterThanOrEqual(0);
        }
    });

    it('never exceeds slot capacity', () => {
        const groups = Array.from({ length: 20 }, (_, i) =>
            makeGroup(i, 5, [i % 8, (i + 1) % 8, (i + 2) % 8]),
        );
        const { solution } = solve(groups, fullSlots(6), { seed: 42, episodes: 100 });
        for (const slot of solution.occupancy) {
            expect(slot.amount).toBeLessThanOrEqual(slot.capacity);
        }
    });

    it('spread entries sum to the number of groups', () => {
        const groups = [
            makeGroup(0, 4, [0, 1, 2]),
            makeGroup(1, 3, [1, 2, 3]),
            makeGroup(2, 2, [3, 4, 5]),
        ];
        const { spread } = solve(groups, fullSlots(), { seed: 1, episodes: 10 });
        expect(spread.reduce((a, b) => a + b, 0)).toBe(groups.length);
    });

    it('spread has exactly 4 buckets: [1st, 2nd, 3rd, noMatch]', () => {
        const { spread } = solve([makeGroup(0, 1, [0, 1, 2])], fullSlots(), {
            seed: 1,
            episodes: 0,
        });
        expect(spread).toHaveLength(4);
    });

    it('invAllocation mirrors group currentSelection', () => {
        const groups = [makeGroup(0, 3, [0, 1, 2]), makeGroup(1, 2, [1, 2, 3])];
        const { solution } = solve(groups, fullSlots(), { seed: 5, episodes: 50 });
        for (const g of solution.groups) {
            expect(solution.invAllocation[g.currentSelection]).toContain(g.id);
        }
    });

    it('occupancy amount matches sum of group sizes assigned to that slot', () => {
        const groups = [makeGroup(0, 4, [0, 1, 2]), makeGroup(1, 3, [1, 2, 3])];
        const { solution } = solve(groups, fullSlots(), { seed: 7, episodes: 50 });
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

describe('solve — scoring', () => {
    it('score is 0 when a single group is forced to its 1st choice timeslot', () => {
        // Only timeslot 2 has capacity → group with choices [2,1,0] must go there
        const group = makeGroup(0, 5, [2, 1, 0]);
        const { score, spread } = solve([group], onlyTimeslot(2, 6), {
            seed: 1,
            episodes: 0,
        });
        expect(score).toBe(0);
        expect(spread[0]).toBe(1); // 1 group on 1st choice
    });

    it('score is -1 when a single group is forced to its 2nd choice timeslot', () => {
        // Only timeslot 1 has capacity; choices = [2, 1, 0] → 2nd choice matches
        const group = makeGroup(0, 5, [2, 1, 0]);
        const { score, spread } = solve([group], onlyTimeslot(1, 6), {
            seed: 1,
            episodes: 0,
        });
        expect(score).toBe(-1);
        expect(spread[1]).toBe(1);
    });

    it('score is -5 when a single group is forced to its 3rd choice timeslot', () => {
        // Only timeslot 0 has capacity; choices = [2, 1, 0] → 3rd choice matches
        const group = makeGroup(0, 5, [2, 1, 0]);
        const { score, spread } = solve([group], onlyTimeslot(0, 6), {
            seed: 1,
            episodes: 0,
        });
        expect(score).toBe(-5);
        expect(spread[2]).toBe(1);
    });

    it('score is -100 when a group gets none of its choices', () => {
        // Only timeslot 7 has capacity; choices = [0, 1, 2] → no match
        const group = makeGroup(0, 5, [0, 1, 2]);
        const { score, spread } = solve([group], onlyTimeslot(7, 6), {
            seed: 1,
            episodes: 0,
        });
        expect(score).toBe(-100);
        expect(spread[3]).toBe(1);
    });

    it('score accumulates correctly across multiple groups', () => {
        // 1 slot per timeslot removes ambiguity: each group has exactly one valid slot.
        // Group 0 (size 6): only slot 0 (timeslot 0, cap 6) fits → 1st choice → 0
        // Group 1 (size 5): only slot 1 (timeslot 1, cap 5) fits → 2nd choice → -1
        const slots = buildSlots(8, 1, [6, 5, 0, 0, 0, 0, 0, 0]);
        const groups = [
            makeGroup(0, 6, [0, 1, 2]), // timeslot 0 → 1st choice → 0
            makeGroup(1, 5, [3, 1, 0]), // timeslot 1 → 2nd choice → -1
        ];
        const { score } = solve(groups, slots, { seed: 1, episodes: 0 });
        expect(score).toBe(-1); // 0 + (-1)
    });
});

// ─── solve — Egal handling ────────────────────────────────────────────────────

describe('solve — Egal choices', () => {
    it('Egal as 1st choice counts as 1st-choice match regardless of assigned slot', () => {
        const group = makeGroup(0, 4, [-1, -1, -1]);
        const { score, spread } = solve([group], fullSlots(), { seed: 1, episodes: 0 });
        expect(score).toBe(0);
        expect(spread[0]).toBe(1);
    });

    it('Egal as 2nd choice counts as 2nd-choice match when 1st is not satisfied', () => {
        // Only timeslot 7 has capacity; choices = [0, -1, 2] → 1st fails, 2nd is Egal → match at rank 1
        const group = makeGroup(0, 4, [0, -1, 2]);
        const { score, spread } = solve([group], onlyTimeslot(7, 6), {
            seed: 1,
            episodes: 0,
        });
        expect(score).toBe(-1);
        expect(spread[1]).toBe(1);
    });

    it('three Egal choices all produce score 0', () => {
        const groups = Array.from({ length: 5 }, (_, i) =>
            makeGroup(i, 3, [-1, -1, -1]),
        );
        const { score } = solve(groups, fullSlots(), { seed: 42, episodes: 0 });
        expect(score).toBe(0);
    });
});

// ─── solve — determinism ─────────────────────────────────────────────────────

describe('solve — determinism', () => {
    it('produces identical results with the same seed', () => {
        const groups = Array.from({ length: 8 }, (_, i) =>
            makeGroup(i, 4, [i % 8, (i + 2) % 8, (i + 4) % 8]),
        );
        const slots = fullSlots();
        const r1 = solve(groups, slots, { seed: 12345, episodes: 200 });
        const r2 = solve(groups, slots, { seed: 12345, episodes: 200 });
        expect(r1.score).toBe(r2.score);
        expect(r1.spread).toEqual(r2.spread);
        expect(r1.solution.groups.map((g) => g.currentSelection)).toEqual(
            r2.solution.groups.map((g) => g.currentSelection),
        );
    });

    it('returns the seed that was used', () => {
        const { seed } = solve([makeGroup(0, 1, [0, 1, 2])], fullSlots(), {
            seed: 9999,
            episodes: 0,
        });
        expect(seed).toBe(9999);
    });

    it('uses a random seed when none is provided', () => {
        const { seed } = solve([makeGroup(0, 1, [0, 1, 2])], fullSlots(), { episodes: 0 });
        expect(typeof seed).toBe('number');
        expect(seed).toBeGreaterThanOrEqual(0);
    });

    it('different seeds generally produce different results on a contested input', () => {
        // 8 groups all want timeslot 0 — only 4 can get it, so assignment varies with seed
        const groups = Array.from({ length: 8 }, (_, i) =>
            makeGroup(i, 3, [0, 1, 2]),
        );
        const r1 = solve(groups, fullSlots(), { seed: 1, episodes: 500 });
        const r2 = solve(groups, fullSlots(), { seed: 999999, episodes: 500 });
        const alloc1 = r1.solution.groups.map((g) => g.currentSelection);
        const alloc2 = r2.solution.groups.map((g) => g.currentSelection);
        expect(alloc1).not.toEqual(alloc2);
    });
});

// ─── solve — optimizer improves score ────────────────────────────────────────

describe('solve — optimizer', () => {
    it('score with many episodes is >= score with zero episodes', () => {
        // Contested: 16 groups all wanting timeslot 0 first
        const groups = Array.from({ length: 16 }, (_, i) =>
            makeGroup(i, 4, [0, 1, 2]),
        );
        const { score: scoreNoOpt } = solve(groups, fullSlots(), { seed: 42, episodes: 0 });
        const { score: scoreWithOpt } = solve(groups, fullSlots(), {
            seed: 42,
            episodes: 2000,
        });
        expect(scoreWithOpt).toBeGreaterThanOrEqual(scoreNoOpt);
    });

    it('calls onProgress during optimization', () => {
        const groups = Array.from({ length: 4 }, (_, i) =>
            makeGroup(i, 3, [i % 8, (i + 1) % 8, (i + 2) % 8]),
        );
        const onProgress = vi.fn();
        solve(groups, fullSlots(), { seed: 1, episodes: 100, onProgress });
        expect(onProgress).toHaveBeenCalled();
    });

    it('onProgress receives progress value between 0 and 1', () => {
        const onProgress = vi.fn();
        solve([makeGroup(0, 1, [0, 1, 2])], fullSlots(), {
            seed: 1,
            episodes: 100,
            onProgress,
        });
        for (const [progress] of onProgress.mock.calls) {
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(1);
        }
    });
});

// ─── solve — integration with real-size data ─────────────────────────────────

describe('solve — integration', () => {
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

    it('solves a full 32-group semester without error', () => {
        expect(() => solve(groups, fullSlots(), { seed: 42, episodes: 1000 })).not.toThrow();
    });

    it('all 32 groups are assigned', () => {
        const { solution } = solve(groups, fullSlots(), { seed: 42, episodes: 1000 });
        expect(solution.groups.every((g) => g.currentSelection >= 0)).toBe(true);
    });

    it('no slot is over capacity', () => {
        const { solution } = solve(groups, fullSlots(), { seed: 42, episodes: 1000 });
        for (const slot of solution.occupancy) {
            expect(slot.amount).toBeLessThanOrEqual(slot.capacity);
        }
    });

    it('score is deterministic with fixed seed', () => {
        const r1 = solve(groups, fullSlots(), { seed: 42, episodes: 1000 });
        const r2 = solve(groups, fullSlots(), { seed: 42, episodes: 1000 });
        expect(r1.score).toBe(r2.score);
    });

    it('achieves a better score than random initial assignment on contested input', () => {
        // All 32 groups want timeslot 2 first (engpass scenario)
        const contested = groups.map((g) => ({ ...g, choices: [2, 1, 0] as number[] }));
        const { score: noOpt } = solve(contested, fullSlots(), { seed: 42, episodes: 0 });
        const { score: withOpt } = solve(contested, fullSlots(), {
            seed: 42,
            episodes: 5000,
        });
        expect(withOpt).toBeGreaterThanOrEqual(noOpt);
    });
});
