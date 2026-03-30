import type { Group } from '../parser';

export const PENALTIES = [0, -1, -5, -100] as const;

/**
 * Returns the penalty coefficient for assigning group to a given timeslot.
 * @param group - Student group with ranked choices
 * @param timeslot - Timeslot index (0-based)
 */
export function getPenalty(group: Group, timeslot: number): number {
  for (let k = 0; k < group.choices.length; k++) {
    if (group.choices[k] === -1 || group.choices[k] === timeslot) return PENALTIES[k];
  }
  return PENALTIES[3];
}

export const varName = (g: number, s: number) => `x_${g}_${s}`;
