/** Labels for the four preference ranks, indexed the same way as SolveResult.spread. */
export const SPREAD_LABELS = ["1. Wahl", "2. Wahl", "3. Wahl", "Kein Wunsch"];

/** Rank of a placement that matches none of the group's choices. */
export const NO_MATCH = 3;

/**
 * Rank of a time slot within a group's preferences: 0, 1 or 2, and NO_MATCH otherwise.
 * A choice of -1 ("Egal") matches any time slot at that position.
 *
 * Shared by the solver, the validation and the views, so all three agree on what a rank
 * means.
 */
export function rankOf(choices: number[], timeSlot: number): number {
	for (let k = 0; k < choices.length; k++) {
		if (choices[k] === -1 || choices[k] === timeSlot) return k;
	}
	return NO_MATCH;
}

/**
 * Time slots a group may take without breaking a guarantee, or null when every slot
 * qualifies anyway. The inverse of rankOf.
 *
 * An "Egal" among the choices up to maxRank matches any time slot at that position, so
 * such a group meets its guarantee wherever it lands and needs no constraint at all.
 */
export function allowedTimeSlots(
	choices: number[],
	maxRank: number,
): number[] | null {
	const reachable = choices.slice(0, maxRank + 1);
	if (reachable.includes(-1)) return null;
	return [...new Set(reachable)];
}
