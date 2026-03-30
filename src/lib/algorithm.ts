import type { Slot, Group } from "./parser.js";
import GLPK from "glpk.js";

export type { Slot, Group };

export interface Solution {
  occupancy: Slot[];
  groups: Group[];
  /** slot id → list of group ids */
  invAllocation: Record<number, number[]>;
}

export interface SolveResult {
  solution: Solution;
  score: number;
  /** [#1stChoice, #2ndChoice, #3rdChoice, #noMatch] */
  spread: number[];
}

/** Penalties indexed by preference rank: [1st, 2nd, 3rd, no match] */
const PENALTIES = [0, -1, -5, -100] as const;

// Logging utilities for performance analysis
type LogEntry = { step: string; durationMs?: number };

const logEntries: LogEntry[] = [];
const TOTAL_STEPS = 5;
let currentStep = 0;

function logStep(step: string) {
  const start = performance.now();
  logEntries[currentStep] = { step };
  currentStep++;
}

function finalizeStep(step: string, durationMs = 0) {
  logEntries[currentStep - 1] = { step, durationMs };
}

function getStepProgress(current: number, total: number): string {
  return `${(current / total) * 100}%`;
}

function getStepDescription(current: number, total: number): string {
  const percent = ((current + 1) / total) * 100;
  return `Fortschritt: ${current + 1}/${total} (${percent.toFixed(0)}%)`;
}

function getTimingInfo(): string {
  return logEntries
    .map(
      (e) =>
        `${e.step}${e.durationMs ? ` (${e.durationMs.toFixed(1)}ms)` : ""}`,
    )
    .join(", ");
}

let glpkInstance: Awaited<ReturnType<typeof GLPK>> | null = null;

async function getGLPK() {
  if (!glpkInstance) {
    logStep("GLPK Initialisierung");
    const start = performance.now();
    glpkInstance = await GLPK();
    finalizeStep("GLPK Initialisierung", performance.now() - start);
  }
  return glpkInstance;
}

/**
 * Penalty coefficient for assigning group to slot.
 * Matches choices against the slot's timeSlot; -1 (Egal) matches anything.
 */
function penaltyCoef(group: Group, slot: Slot): number {
  const ts = slot.timeSlot;
  for (let k = 0; k < group.choices.length; k++) {
    if (group.choices[k] === -1 || ts === group.choices[k]) {
      return PENALTIES[k];
    }
  }
  return PENALTIES[3];
}

/**
 * Solve the group-to-slot assignment problem using Integer Linear Programming.
 * Finds the globally optimal assignment maximising total preference satisfaction.
 *
 * @param groups - Parsed student groups
 * @param slots - Available rotation slots with capacities
 */
export async function solve(
  groups: Group[],
  slots: Slot[],
): Promise<SolveResult> {
  logStep("Problem Initialisierung");
  const glpk = await getGLPK();

  // Log problem size
  const varCount = groups.length * slots.length;
  const constraintsCount = groups.length + slots.length;
  console.log(
    `[Verteiler] Problem: ${groups.length} Gruppen, ${slots.length} Zeit slots`,
  );
  console.log(
    `[Verteiler] Variablen: ${varCount}, Constraints: ${constraintsCount}`,
  );

  const varName = (i: number, j: number) => `x_${i}_${j}`;

  // Objective: maximise Σ penalty(i,j) · x_ij
  logStep("Objektivfunktion berechnen");
  const objVars = groups.flatMap((g, i) =>
    slots.map((s, j) => ({ name: varName(i, j), coef: penaltyCoef(g, s) })),
  );

  // Each group must be assigned to exactly one slot
  logStep("Zuweisungs-Constraints erstellen");
  const assignConstraints = groups.map((_, i) => ({
    name: `assign_${i}`,
    vars: slots.map((_, j) => ({ name: varName(i, j), coef: 1 })),
    bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 },
  }));

  // Each slot must not exceed its capacity
  logStep("Kapazitäts-Constraints erstellen");
  const capacityConstraints = slots.map((slot, j) => ({
    name: `cap_${j}`,
    vars: groups.map((g, i) => ({ name: varName(i, j), coef: g.size })),
    bnds: { type: glpk.GLP_UP, lb: 0, ub: slot.capacity },
  }));

  const binaries = groups.flatMap((_, i) => slots.map((_, j) => varName(i, j)));

  const startTime = performance.now();
  logStep("ILP-Problem lösen");
  const result = await glpk.solve(
    {
      name: "verteiler",
      objective: { direction: glpk.GLP_MAX, name: "obj", vars: objVars },
      subjectTo: [...assignConstraints, ...capacityConstraints],
      binaries,
    },
    {
      msglev: glpk.GLP_MSG_OFF,
      tmlim: 30,
      mipgap: 0.01,
      presol: true,
    },
  );
  finalizeStep("ILP-Problem lösen", performance.now() - startTime);

  const status = result.result.status;
  if (status !== glpk.GLP_OPT && status !== glpk.GLP_FEAS) {
    throw new Error(
      "Keine gültige Verteilung gefunden. Bitte prüfe, ob die Kapazitäten ausreichen.",
    );
  }

  // Reconstruct Solution from variable assignments
  const solution: Solution = {
    occupancy: slots.map((s) => ({ ...s })),
    groups: groups.map((g) => ({ ...g, choices: [...g.choices] })),
    invAllocation: {},
  };

  const vars = result.result.vars;
  logStep("Lösung rekonstruieren");
  for (let i = 0; i < groups.length; i++) {
    for (let j = 0; j < slots.length; j++) {
      if (Math.round(vars[varName(i, j)] ?? 0) === 1) {
        solution.groups[i].currentSelection = j;
        solution.occupancy[j].amount += groups[i].size;
        if (!solution.invAllocation[j]) solution.invAllocation[j] = [];
        solution.invAllocation[j].push(i);
        break;
      }
    }
  }

  // Compute score and spread from the reconstructed solution
  logStep("Ergebnisse berechnen");
  let score = 0;
  const spread = [0, 0, 0, 0];
  for (const group of solution.groups) {
    const ts = solution.occupancy[group.currentSelection].timeSlot;
    let penaltyIndex = PENALTIES.length - 1;
    for (let k = 0; k < group.choices.length; k++) {
      if (group.choices[k] === -1 || ts === group.choices[k]) {
        penaltyIndex = k;
        break;
      }
    }
    score += PENALTIES[penaltyIndex];
    spread[penaltyIndex]++;
  }

  const totalDuration = performance.now() - startTime;
  console.log(`[Verteiler] Gesamtlaufzeit: ${totalDuration.toFixed(1)}ms`);
  console.log(`[Verteiler] Zeitverteilung: ${getTimingInfo()}`);

  return { solution, score, spread };
}
