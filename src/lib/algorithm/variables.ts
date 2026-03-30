import { varName, getPenalty } from './utils';
import type { Group, Slot } from '../parser';

/**
 * Generates one binary variable per (group, slot) pair.
 * Each variable x[g][s] = 1 means group g is assigned to slot s.
 */
export function generateVariables(groups: Group[], slots: Slot[]) {
  const objVars: { name: string; coef: number }[] = [];
  const binaries: string[] = [];
  const varMap = new Map<string, { g: number; s: number }>();

  groups.forEach((group, g) => {
    slots.forEach((slot, s) => {
      const name = varName(g, s);
      objVars.push({ name, coef: getPenalty(group, slot.timeSlot) });
      binaries.push(name);
      varMap.set(name, { g, s });
    });
  });

  return { objVars, binaries, varMap };
}
