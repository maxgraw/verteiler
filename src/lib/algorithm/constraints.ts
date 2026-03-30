import { varName } from './utils';
import type { Group, Slot } from '../parser';

/**
 * Builds all ILP constraints for the assignment problem:
 * 1. Each group assigned to exactly one slot.
 * 2. Each slot's student capacity not exceeded.
 * 3. Symmetry-breaking: within each timeslot, equal-capacity slots are ordered
 *    by load (slot[k] ≥ slot[k+1]). This eliminates the M! equivalent
 *    permutations within each timeslot, drastically reducing the B&B search space.
 */
export function buildConstraints(groups: Group[], slots: Slot[], glpk: any) {
  const assign = groups.map((_, g) => ({
    name: `assign_${g}`,
    vars: slots.map((_, s) => ({ name: varName(g, s), coef: 1 })),
    bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 },
  }));

  const capacity = slots.map((slot, s) => ({
    name: `cap_${s}`,
    vars: groups.map((g, gi) => ({ name: varName(gi, s), coef: g.size })),
    bnds: { type: glpk.GLP_UP, lb: 0, ub: slot.capacity },
  }));

  // Group slots by timeslot, then add ordering constraints between adjacent
  // equal-capacity slots. Only applies when capacities are identical (symmetric).
  const byTimeslot = new Map<number, Slot[]>();
  for (const slot of slots) {
    if (!byTimeslot.has(slot.timeSlot)) byTimeslot.set(slot.timeSlot, []);
    byTimeslot.get(slot.timeSlot)!.push(slot);
  }

  const symBreak: object[] = [];
  for (const tsSlots of byTimeslot.values()) {
    const ordered = tsSlots.slice().sort((a, b) => a.id - b.id);
    for (let k = 0; k + 1 < ordered.length; k++) {
      if (ordered[k].capacity !== ordered[k + 1].capacity) continue;
      const s0 = ordered[k].id;
      const s1 = ordered[k + 1].id;
      // load(s1) - load(s0) ≤ 0  →  load(s0) ≥ load(s1)
      symBreak.push({
        name: `sym_${s0}_${s1}`,
        vars: [
          ...groups.map((g, gi) => ({ name: varName(gi, s1), coef: g.size })),
          ...groups.map((g, gi) => ({ name: varName(gi, s0), coef: -g.size })),
        ],
        bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 },
      });
    }
  }

  return [...assign, ...capacity, ...symBreak];
}
