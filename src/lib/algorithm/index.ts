import type { Group, Slot } from "../parser";
import type { SolveResult, Solution } from "./types";

// Penalty for each preference rank: [1st choice, 2nd, 3rd, no match]
const PENALTIES = [0, -1, -5, -100] as const;

// SA parameters
const ITERATIONS = 30_000; // iterations per restart
const RESTARTS = 10; // independent restarts (different seeds, same greedy start)
const T_START = 5; // initial temperature — accepts ~37% of 5-point worsenings
const T_END = 0.01; // final temperature — accepts essentially nothing
const COOLING = Math.pow(T_END / T_START, 1 / ITERATIONS);

// Seeded LCG PRNG for reproducible results
function makeLCG(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

// Returns 0/1/2/3 for 1st/2nd/3rd/no-match. Egal (-1) matches at that rank.
function rankOf(group: Group, timeslot: number): number {
  for (let k = 0; k < group.choices.length; k++) {
    if (group.choices[k] === -1 || group.choices[k] === timeslot) return k;
  }
  return 3;
}

function penaltyOf(group: Group, timeslot: number): number {
  return PENALTIES[rankOf(group, timeslot)];
}

/**
 * Greedy initialization: assigns groups largest-first to the highest-preference
 * slot with remaining capacity. Ties in preference rank broken by remaining capacity
 * (prefer emptier slots to leave room for others).
 */
function greedyInit(groups: Group[], slots: Slot[]): number[] {
  const remaining = slots.map((s) => s.capacity);
  const assignment = new Array<number>(groups.length).fill(-1);

  // Largest groups first — harder to place, should get first pick
  const order = [...groups.keys()].sort((a, b) =>
    groups[b].size !== groups[a].size ? groups[b].size - groups[a].size : a - b,
  );

  for (const gi of order) {
    const g = groups[gi];
    let bestSlot = -1;
    let bestRank = 4;
    let bestRemaining = -1;

    for (let s = 0; s < slots.length; s++) {
      if (remaining[s] < g.size) continue;
      const rank = rankOf(g, slots[s].timeSlot);
      if (
        rank < bestRank ||
        (rank === bestRank && remaining[s] > bestRemaining)
      ) {
        bestSlot = s;
        bestRank = rank;
        bestRemaining = remaining[s];
      }
    }

    if (bestSlot !== -1) {
      assignment[gi] = bestSlot;
      remaining[bestSlot] -= g.size;
    }
  }

  return assignment;
}

/**
 * One simulated annealing run starting from the given assignment.
 * Mixes swap moves (exchange two groups' slots) and move moves (relocate one group).
 * Returns the best assignment seen during this run.
 */
function runSA(
  groups: Group[],
  slots: Slot[],
  initial: number[],
  seed: number,
): { assignment: number[]; score: number } {
  const rng = makeLCG(seed);
  const current = [...initial];

  // Remaining capacity per slot derived from the initial assignment
  const remaining = slots.map((s) => s.capacity);
  for (let gi = 0; gi < groups.length; gi++) {
    if (current[gi] >= 0) remaining[current[gi]] -= groups[gi].size;
  }

  // Running score (maximise — closer to 0 is better)
  let score = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    if (current[gi] >= 0)
      score += penaltyOf(groups[gi], slots[current[gi]].timeSlot);
  }

  let best = [...current];
  let bestScore = score;
  const N = groups.length;
  const S = slots.length;
  let T = T_START;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    T *= COOLING;

    let delta: number;

    if (rng() < 0.5) {
      // Swap: exchange the slots of two randomly chosen groups
      const g1 = Math.floor(rng() * N);
      const g2 = Math.floor(rng() * N);
      if (g1 === g2) continue;
      const s1 = current[g1];
      const s2 = current[g2];
      if (s1 < 0 || s2 < 0 || s1 === s2) continue;

      // Both groups must fit in each other's slot after swapping
      if (remaining[s1] + groups[g1].size < groups[g2].size) continue;
      if (remaining[s2] + groups[g2].size < groups[g1].size) continue;

      delta =
        penaltyOf(groups[g1], slots[s2].timeSlot) +
        penaltyOf(groups[g2], slots[s1].timeSlot) -
        penaltyOf(groups[g1], slots[s1].timeSlot) -
        penaltyOf(groups[g2], slots[s2].timeSlot);

      if (delta > 0 || rng() < Math.exp(delta / T)) {
        current[g1] = s2;
        current[g2] = s1;
        remaining[s1] += groups[g1].size - groups[g2].size;
        remaining[s2] += groups[g2].size - groups[g1].size;
        score += delta;
        if (score > bestScore) {
          bestScore = score;
          best = [...current];
        }
      }
    } else {
      // Move: relocate one group to a random different slot
      const gi = Math.floor(rng() * N);
      const sOld = current[gi];
      if (sOld < 0) continue;
      const sNew = Math.floor(rng() * S);
      if (sNew === sOld || remaining[sNew] < groups[gi].size) continue;

      delta =
        penaltyOf(groups[gi], slots[sNew].timeSlot) -
        penaltyOf(groups[gi], slots[sOld].timeSlot);

      if (delta > 0 || rng() < Math.exp(delta / T)) {
        current[gi] = sNew;
        remaining[sOld] += groups[gi].size;
        remaining[sNew] -= groups[gi].size;
        score += delta;
        if (score > bestScore) {
          bestScore = score;
          best = [...current];
        }
      }
    }
  }

  return { assignment: best, score: bestScore };
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

  for (let gi = 0; gi < groups.length; gi++) {
    const s = assignment[gi];
    if (s < 0) continue;
    solution.occupancy[s].amount += groups[gi].size;
    if (!solution.invAllocation[s]) solution.invAllocation[s] = [];
    solution.invAllocation[s].push(gi);
    const rank = rankOf(groups[gi], slots[s].timeSlot);
    score += PENALTIES[rank];
    spread[rank]++;
  }

  return { solution, score, spread };
}

/**
 * Solves the group-to-slot assignment problem using greedy initialisation
 * followed by simulated annealing.
 *
 * Phase 1 — greedy assigns groups largest-first to their highest-preference slot.
 * Phase 2 — SA runs RESTARTS independent searches from that starting point,
 *            each with a different PRNG seed, keeping the globally best result.
 *
 * @param groups - Parsed student groups with preferences
 * @param slots - Available rotation slots with individual capacities
 * @param onProgress - Optional callback fired after each SA restart
 */
export async function solve(
  groups: Group[],
  slots: Slot[],
  onProgress?: (message: string) => void,
): Promise<SolveResult> {
  onProgress?.("Greedy-Initialisierung…");
  const initial = greedyInit(groups, slots);

  let best = initial;
  let bestScore = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    if (initial[gi] >= 0)
      bestScore += penaltyOf(groups[gi], slots[initial[gi]].timeSlot);
  }

  for (let r = 0; r < RESTARTS; r++) {
    onProgress?.(`Optimiere… (Score ${bestScore}, Lauf ${r + 1}/${RESTARTS})`);
    // Yield so the worker flushes the progress message before the next SA run
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    const result = runSA(groups, slots, initial, 42 + r);
    if (result.score > bestScore) {
      bestScore = result.score;
      best = result.assignment;
    }
  }

  if (best.some((s) => s < 0)) {
    throw new Error("No feasible solution found.");
  }

  return buildResult(groups, slots, best);
}
