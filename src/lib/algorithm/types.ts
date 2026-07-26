import type { Slot, Group } from "../parser";

export interface Solution {
	occupancy: Slot[];
	groups: Group[];
	invAllocation: Record<number, number[]>;
}

export interface SolveResult {
	solution: Solution;
	/**
	 * Penalty sum counted per group (0/-1/-5/-100), reported only so runs stay
	 * comparable. The solver minimises the same costs weighted by group size.
	 */
	score: number;
	/** Groups per rank: [1st choice, 2nd, 3rd, no match]. */
	spread: number[];
	/** Students per rank, same four buckets. This is the unit the solver optimises. */
	studentSpread: number[];
}
