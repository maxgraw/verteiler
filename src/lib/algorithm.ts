import type { Slot, Group } from './parser.js';

export type { Slot, Group };

export interface Solution {
    occupancy: Slot[];
    groups: Group[];
    /** slot id → list of group ids */
    invAllocation: Record<number, number[]>;
}

export interface SolveResult {
    solution: Solution;
    score: number;
    /** [#1stChoice, #2ndChoice, #3rdChoice, #noMatch] */
    spread: number[];
    seed: number;
}

export interface SolveOptions {
    episodes?: number;
    seed?: number;
    onProgress?: (progress: number, bestScore: number) => void;
}

/** Penalties indexed by preference rank: [1st, 2nd, 3rd, no match] */
const PENALTIES = [0, -1, -5, -100] as const;

function copySolution(s: Solution): Solution {
    const occupancy = s.occupancy.map((slot) => ({ ...slot }));
    const groups = s.groups.map((g) => ({ ...g, choices: [...g.choices] }));
    const invAllocation: Record<number, number[]> = {};
    for (const [k, v] of Object.entries(s.invAllocation)) {
        invAllocation[Number(k)] = [...v];
    }
    return { occupancy, groups, invAllocation };
}

function removeElement(arr: number[], elem: number): number[] {
    const i = arr.indexOf(elem);
    if (i === -1) throw new Error(`Tried to remove non-existent element: ${elem}`);
    arr[i] = arr[arr.length - 1];
    arr.pop();
    return arr;
}

function solveSubsetSum(
    solution: Solution,
    targetSize: number,
    groupIds: number[]
): { solved: boolean; set: number[] } {
    for (let i = 0; i < groupIds.length; i++) {
        const gId = groupIds[i];
        const summand = solution.groups[gId].size;
        if (summand === targetSize) return { solved: true, set: [gId] };
        const sub = solveSubsetSum(solution, targetSize - summand, groupIds.slice(i + 1));
        if (sub.solved) return { solved: true, set: [gId, ...sub.set] };
    }
    return { solved: false, set: [] };
}

function randSwap(s: Solution, random: () => number): void {
    const randGroup = s.groups[Math.floor(random() * s.groups.length)];
    const possibleSwaps: Array<{ slot: number; swapPartners: number[] }> = [];

    for (let i = 0; i < s.occupancy.length; i++) {
        if (i === randGroup.currentSelection) continue;
        const slot = s.occupancy[i];

        if (slot.capacity - slot.amount >= randGroup.size) {
            possibleSwaps.push({ slot: i, swapPartners: [] });
            continue;
        }

        const { solved, set } = solveSubsetSum(s, randGroup.size, s.invAllocation[i] ?? []);
        if (!solved) continue;
        possibleSwaps.push({ slot: s.groups[set[0]].currentSelection, swapPartners: set });
    }

    if (possibleSwaps.length === 0) return;

    const chosen = possibleSwaps[Math.floor(random() * possibleSwaps.length)];
    const prevSlot = randGroup.currentSelection;

    s.groups[randGroup.id].currentSelection = chosen.slot;
    removeElement(s.invAllocation[prevSlot], randGroup.id);
    if (!s.invAllocation[chosen.slot]) s.invAllocation[chosen.slot] = [];
    s.invAllocation[chosen.slot].push(randGroup.id);
    s.occupancy[prevSlot].amount -= randGroup.size;
    s.occupancy[chosen.slot].amount += randGroup.size;

    for (const partnerId of chosen.swapPartners) {
        const partner = s.groups[partnerId];
        s.groups[partnerId].currentSelection = prevSlot;
        s.occupancy[prevSlot].amount += partner.size;
        s.occupancy[chosen.slot].amount -= partner.size;
        removeElement(s.invAllocation[chosen.slot], partnerId);
        if (!s.invAllocation[prevSlot]) s.invAllocation[prevSlot] = [];
        s.invAllocation[prevSlot].push(partnerId);
    }
}

function calcScore(solution: Solution): { score: number; spread: number[] } {
    let score = 0;
    const spread = [0, 0, 0, 0];

    for (const group of solution.groups) {
        const currentTimeSlot = solution.occupancy[group.currentSelection].timeSlot;
        let penaltyIndex = PENALTIES.length - 1;

        for (let k = 0; k < group.choices.length; k++) {
            const choice = group.choices[k];
            if (choice === -1 || currentTimeSlot === choice) {
                penaltyIndex = k;
                break;
            }
        }

        score += PENALTIES[penaltyIndex];
        spread[penaltyIndex]++;
    }

    return { score, spread };
}

function findPossibleSlot(size: number, slots: Slot[], random: () => number): number {
    const candidates = slots.map((_, i) => i);
    while (candidates.length > 0) {
        const ri = Math.floor(random() * candidates.length);
        const slotId = candidates[ri];
        if (size <= slots[slotId].capacity - slots[slotId].amount) return slotId;
        candidates.splice(ri, 1);
    }
    throw new Error('Keine freien Slots verfügbar');
}

function buildInitialSolution(groups: Group[], slots: Slot[], random: () => number): Solution {
    const solution: Solution = {
        occupancy: slots.map((s) => ({ ...s })),
        groups: groups.map((g) => ({ ...g, choices: [...g.choices] })),
        invAllocation: {},
    };

    const sorted = [...solution.groups].sort((a, b) => b.size - a.size);

    for (const group of sorted) {
        const slotId = findPossibleSlot(group.size, solution.occupancy, random);
        solution.occupancy[slotId].amount += group.size;
        solution.groups[group.id].currentSelection = slotId;
        if (!solution.invAllocation[slotId]) solution.invAllocation[slotId] = [];
        solution.invAllocation[slotId].push(group.id);
    }

    return solution;
}

/**
 * Run the hill-climbing optimizer.
 * Calls onProgress periodically so the UI can show live updates.
 */
export function solve(groups: Group[], slots: Slot[], opts: SolveOptions = {}): SolveResult {
    const { episodes = 100_000, onProgress } = opts;

    // Seeded LCG PRNG for reproducibility (parameters from Numerical Recipes)
    const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 32);
    let state = seed >>> 0;
    function random() {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
    }

    let best = buildInitialSolution(groups, slots, random);
    let { score: bestScore } = calcScore(best);

    const progressInterval = Math.max(1, Math.floor(episodes / 100));

    for (let i = 0; i < episodes; i++) {
        const candidate = copySolution(best);
        randSwap(candidate, random);
        randSwap(candidate, random);
        randSwap(candidate, random);
        const { score } = calcScore(candidate);
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
        if (onProgress && i % progressInterval === 0) {
            onProgress(i / episodes, bestScore);
        }
    }

    const { score, spread } = calcScore(best);
    return { solution: best, score, spread, seed };
}
