import type { Slot, Group } from "../parser";

export interface Solution {
	occupancy: Slot[];
	groups: Group[];
	invAllocation: Record<number, number[]>;
}

/** How sure we are that the fairness objective actually reached its minimum. */
export type Optimality =
	/** Proven: a solution one unit better was shown to be impossible. */
	| "proven"
	/** The proof ran out of time. The result may still be optimal, nobody knows. */
	| "unproven"
	/** A strictly better solution exists, so the first stage stopped short. */
	| "suboptimal";

/**
 * A group the organizer pinned to a rank, overriding what the lottery would have done.
 * It is an override of a published fairness mechanism, so it costs someone else and has
 * to be declared, not hidden.
 */
export interface Guarantee {
	/** Index into the groups array */
	groupId: number;
	/** Worst rank the group may end up on. 0 = first choice only, 1 = first or second. */
	maxRank: number;
}

/** A group that pays for a guarantee: it landed worse than it would have without one. */
export interface Displacement {
	members: string;
	size: number;
	/** Rank it would have had without the guarantees */
	from: number;
	/** Rank it has with them */
	to: number;
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
	/** Whether the minimum was proven, not just reported by HiGHS. */
	optimality: Optimality;
	/** Total fairness cost of the distribution, counted per student. Lower is better. */
	fairnessValue: number;
	/**
	 * False when the tie-break solve hit its time limit. The distribution is still valid
	 * and still optimal, but the seed then did not fully decide who absorbs the
	 * remaining disappointment, so the run is not reproducible from it.
	 */
	lotteryComplete: boolean;
	/**
	 * Extra fairness cost the guarantees caused, measured against the distribution that
	 * would have happened without them. null when none were set.
	 */
	guaranteeCost: number | null;
	/** Groups that ended up worse than without the guarantees, worst hit first. */
	displaced: Displacement[];
}
