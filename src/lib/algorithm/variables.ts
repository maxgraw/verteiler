import { varName, getPenalty } from "./utils";

export function generateSparseVariables(groups: any[], slots: any[]) {
  const objVars = [];
  const binaries = [];
  const varMap = new Map<string, { i: number; j: number }>();

  groups.forEach((group, i) => {
    const choices = new Set(group.choices);

    slots.forEach((slot, j) => {
      // Only create variable if it's a choice or "Egal"
      if (choices.has(slot.timeSlot) || choices.has(-1)) {
        const name = varName(i, j);
        objVars.push({ name, coef: getPenalty(group, slot) });
        binaries.push(name);
        varMap.set(name, { i, j });
      }
    });
  });

  return { objVars, binaries, varMap };
}
