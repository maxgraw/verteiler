import GLPK from "glpk.js";
import { generateSparseVariables } from "./variables";
import { buildConstraints } from "./constraints";
import { PENALTIES, getPenalty } from "./utils";
import type { SolveResult, Solution } from "./types";
import type { Group, Slot } from "../parser";

let glpk: any;

/**
 * Solves the group-to-slot assignment problem using GLPK MIP.
 * @param groups - Parsed student groups with preferences
 * @param slots - Available rotation slots with capacities
 * @param onProgress - Optional callback fired at each stage of solving
 */
export async function solve(
  groups: Group[],
  slots: Slot[],
  onProgress?: (message: string) => void,
): Promise<SolveResult> {
  if (!glpk) {
    onProgress?.("Initialisiere Solver…");
    glpk = await GLPK();
  }

  onProgress?.("Erstelle Modell…");
  const { objVars, binaries, varMap } = generateSparseVariables(groups, slots);
  const constraints = buildConstraints(groups, slots, varMap, glpk);

  onProgress?.("Optimiere…");
  const result = await glpk.solve(
    {
      name: "distribution",
      objective: { direction: glpk.GLP_MAX, name: "obj", vars: objVars },
      subjectTo: constraints,
      binaries,
    },
    {
      msglev: glpk.GLP_MSG_OFF,
      presol: true,
    },
  );

  if (
    result.result.status !== glpk.GLP_OPT &&
    result.result.status !== glpk.GLP_FEAS
  ) {
    throw new Error("No feasible solution found.");
  }

  onProgress?.("Verarbeite Ergebnis…");
  return reconstruct(result.result.vars, groups, slots, varMap);
}

function reconstruct(
  vars: any,
  groups: any[],
  slots: any[],
  varMap: Map<string, any>,
): SolveResult {
  const solution: Solution = {
    occupancy: slots.map((s) => ({ ...s, amount: 0 })),
    groups: groups.map((g) => ({ ...g, currentSelection: -1 })),
    invAllocation: {},
  };

  let score = 0;
  const spread = [0, 0, 0, 0];

  for (const [name, val] of Object.entries(vars)) {
    if (Math.round(val as number) === 1) {
      const entry = varMap.get(name);
      if (!entry) continue;

      const { i, j } = entry;
      solution.groups[i].currentSelection = j;
      solution.occupancy[j].amount += groups[i].size;

      if (!solution.invAllocation[j]) solution.invAllocation[j] = [];
      solution.invAllocation[j].push(i);

      const penalty = getPenalty(groups[i], slots[j]);
      score += penalty;
      const rankIndex = (PENALTIES as readonly number[]).indexOf(penalty);
      spread[rankIndex >= 0 ? rankIndex : 3]++;
    }
  }

  return { solution, score, spread };
}
