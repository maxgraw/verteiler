import loadHighs from 'highs';
import wasmUrl from 'highs/runtime?url';
import type { Group, Slot } from '../parser';
import type { SolveResult, Solution } from './types';

const PENALTIES = [0, -1, -5, -100] as const;

const highsInstance = loadHighs({ locateFile: () => wasmUrl });

function rankOf(group: Group, timeslot: number): number {
  for (let k = 0; k < group.choices.length; k++) {
    if (group.choices[k] === -1 || group.choices[k] === timeslot) return k;
  }
  return 3;
}

function varName(g: number, s: number): string {
  return `x_${g}_${s}`;
}

function buildLP(groups: Group[], slots: Slot[]): string {
  const lines: string[] = ['Maximize'];

  // Objective: maximise total preference score (all non-zero penalties are negative)
  let objLine = '';
  for (let g = 0; g < groups.length; g++) {
    for (let s = 0; s < slots.length; s++) {
      const coef = PENALTIES[rankOf(groups[g], slots[s].timeSlot)];
      if (coef === 0) continue;
      const name = varName(g, s);
      if (objLine === '') {
        objLine = `${coef} ${name}`;
      } else if (coef > 0) {
        objLine += ` + ${coef} ${name}`;
      } else {
        objLine += ` - ${Math.abs(coef)} ${name}`;
      }
    }
  }
  // LP format requires at least one term; fall back to a zero coefficient when all choices are Egal
  lines.push(`  obj: ${objLine || `0 ${varName(0, 0)}`}`);

  lines.push('Subject To');

  // Each group assigned to exactly one slot
  for (let g = 0; g < groups.length; g++) {
    const terms = slots.map((_, s) => varName(g, s)).join(' + ');
    lines.push(`  assign_${g}: ${terms} = 1`);
  }

  // Each slot's student count must not exceed its capacity
  for (let s = 0; s < slots.length; s++) {
    const terms = groups.map((grp, g) => `${grp.size} ${varName(g, s)}`).join(' + ');
    lines.push(`  cap_${s}: ${terms} <= ${slots[s].capacity}`);
  }

  const allVars = groups.flatMap((_, g) => slots.map((__, s) => varName(g, s)));
  lines.push('Binary', `  ${allVars.join(' ')}`, 'End');

  return lines.join('\n');
}

function buildResult(groups: Group[], slots: Slot[], assignment: number[]): SolveResult {
  const solution: Solution = {
    occupancy: slots.map((s) => ({ ...s, amount: 0 })),
    groups: groups.map((g, i) => ({ ...g, currentSelection: assignment[i] })),
    invAllocation: {},
  };

  let score = 0;
  const spread = [0, 0, 0, 0];

  for (let gi = 0; gi < groups.length; gi++) {
    const s = assignment[gi];
    if (s < 0) continue;
    solution.occupancy[s].amount += groups[gi].size;
    if (!solution.invAllocation[s]) solution.invAllocation[s] = [];
    solution.invAllocation[s].push(gi);
    const rank = rankOf(groups[gi], slots[s].timeSlot);
    score += PENALTIES[rank];
    spread[rank]++;
  }

  return { solution, score, spread };
}

export async function solve(
  groups: Group[],
  slots: Slot[],
  onProgress?: (message: string) => void,
): Promise<SolveResult> {
  onProgress?.('Initialisiere Solver…');
  const highs = await highsInstance;

  onProgress?.('Erstelle Modell…');
  const lp = buildLP(groups, slots);

  onProgress?.('Optimiere…');
  const result = highs.solve(lp);

  if (result.Status !== 'Optimal') {
    throw new Error(`No feasible solution found (status: ${result.Status}).`);
  }

  onProgress?.('Verarbeite Ergebnis…');
  const columns = result.Columns as Record<string, { Primal: number }>;
  const assignment = new Array<number>(groups.length).fill(-1);
  for (const [name, col] of Object.entries(columns)) {
    if (col.Primal > 0.5) {
      const parts = name.split('_');
      assignment[parseInt(parts[1], 10)] = parseInt(parts[2], 10);
    }
  }

  if (assignment.some((s) => s < 0)) {
    throw new Error('No feasible solution found.');
  }

  return buildResult(groups, slots, assignment);
}
