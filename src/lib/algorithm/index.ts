import GLPK from 'glpk.js';
import { generateVariables } from './variables';
import { buildConstraints } from './constraints';
import { PENALTIES, getPenalty } from './utils';
import type { SolveResult, Solution } from './types';
import type { Group, Slot } from '../parser';

let glpk: any;

/**
 * Solves the group-to-slot assignment problem using GLPK MIP.
 *
 * Uses symmetry-breaking constraints (slot load ordering within each timeslot)
 * to make the B&B search tractable even for heavily-contested inputs where many
 * groups prefer the same timeslot.
 *
 * @param groups - Parsed student groups with preferences
 * @param slots - Available rotation slots with individual capacities
 * @param onProgress - Optional callback fired at each stage of solving
 */
export async function solve(
  groups: Group[],
  slots: Slot[],
  onProgress?: (message: string) => void,
): Promise<SolveResult> {
  if (!glpk) {
    onProgress?.('Initialisiere Solver…');
    glpk = await GLPK();
  }

  onProgress?.('Erstelle Modell…');
  const { objVars, binaries, varMap } = generateVariables(groups, slots);
  const constraints = buildConstraints(groups, slots, glpk);

  onProgress?.('Optimiere…');
  const result = await glpk.solve(
    {
      name: 'distribution',
      objective: { direction: glpk.GLP_MAX, name: 'obj', vars: objVars },
      subjectTo: constraints,
      binaries,
    },
    { msglev: glpk.GLP_MSG_OFF, presol: true },
  );

  if (result.result.status !== glpk.GLP_OPT && result.result.status !== glpk.GLP_FEAS) {
    throw new Error('No feasible solution found.');
  }

  onProgress?.('Verarbeite Ergebnis…');
  return reconstruct(result.result.vars, groups, slots, varMap);
}

function reconstruct(
  vars: Record<string, number>,
  groups: Group[],
  slots: Slot[],
  varMap: Map<string, { g: number; s: number }>,
): SolveResult {
  const solution: Solution = {
    occupancy: slots.map((slot) => ({ ...slot, amount: 0 })),
    groups: groups.map((g) => ({ ...g, currentSelection: -1 })),
    invAllocation: {},
  };

  let score = 0;
  const spread = [0, 0, 0, 0];

  for (const [name, val] of Object.entries(vars)) {
    if (Math.round(val) !== 1) continue;
    const entry = varMap.get(name);
    if (!entry) continue;

    const { g, s } = entry;
    solution.groups[g].currentSelection = s;
    solution.occupancy[s].amount += groups[g].size;

    if (!solution.invAllocation[s]) solution.invAllocation[s] = [];
    solution.invAllocation[s].push(g);

    const penalty = getPenalty(groups[g], slots[s].timeSlot);
    score += penalty;
    const rankIndex = (PENALTIES as readonly number[]).indexOf(penalty);
    spread[rankIndex >= 0 ? rankIndex : 3]++;
  }

  return { solution, score, spread };
}
