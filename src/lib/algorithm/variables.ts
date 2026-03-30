import { varName, getPenalty } from "./utils";

export function generateSparseVariables(groups: any[], slots: any[]) {
  const objVars = [];
  const binaries = [];
  const varMap = new Map<string, { i: number; j: number }>();

  groups.forEach((group, i) => {
    slots.forEach((slot, j) => {
      const name = varName(i, j);
      objVars.push({ name, coef: getPenalty(group, slot) });
      binaries.push(name);
      varMap.set(name, { i, j });
    });
  });

  return { objVars, binaries, varMap };
}
