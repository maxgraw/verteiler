import { varName } from "./utils";

export function buildConstraints(
  groups: any[],
  slots: any[],
  varMap: Map<string, any>,
  glpk: any,
) {
  // 1. Group Assignment: Each group must be in exactly 1 slot
  const assign = groups.map((_, i) => ({
    name: `assign_${i}`,
    vars: slots
      .map((_, j) => ({ name: varName(i, j), coef: 1 }))
      .filter((v) => varMap.has(v.name)), // ONLY existing sparse variables
    bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 },
  }));

  // 2. Capacity: Each slot has a max size
  const capacity = slots.map((slot, j) => ({
    name: `cap_${j}`,
    vars: groups
      .map((g, i) => ({ name: varName(i, j), coef: g.size }))
      .filter((v) => varMap.has(v.name)), // ONLY existing sparse variables
    bnds: { type: glpk.GLP_UP, lb: 0, ub: slot.capacity },
  }));

  return [...assign, ...capacity];
}
