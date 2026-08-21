/**
 * Cost of placing one student at each rank: 1st choice, 2nd, 3rd, no match.
 * The jump to 100 means a group that gets none of its wishes is avoided at
 * almost any cost; 1 against 5 is the only real judgement call in here.
 *
 * Values must stay integers. The optimality certificate in index.ts cuts the
 * objective at V - 1, which only proves anything if no value between V - 1 and
 * V can exist.
 */
export const COSTS = [0, 1, 5, 100] as const;
