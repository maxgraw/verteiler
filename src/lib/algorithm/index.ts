import GLPK from "glpk.js";
import { generateSparseVariables } from "./variables";
import { buildConstraints } from "./constraints";
import { PENALTIES } from "./utils";
import type { SolveResult, Solution } from "./types";

let glpk: any;

export async function solve(groups: any[], slots: any[]): Promise<SolveResult> {
  if (!glpk) glpk = await GLPK();

  const { objVars, binaries, varMap } = generateSparseVariables(groups, slots);
  const constraints = buildConstraints(groups, slots, varMap, glpk);

  const result = await glpk.solve(
    {
      name: "distribution",
      objective: { direction: glpk.GLP_MAX, name: "obj", vars: objVars },
      subjectTo: constraints,
      binaries,
    },
    {
      msglev: glpk.GLP_MSG_OFF,
      tmlim: 10,
      presol: true,
    },
  );

  if (
    result.result.status !== glpk.GLP_OPT &&
    result.result.status !== glpk.GLP_FEAS
  ) {
    throw new Error("No feasible solution found.");
  }

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

      // Calculate score/spread logic here...
      // (Omitted for brevity, but use the penalty logic from earlier)
    }
  }

  return { solution, score, spread };
}
