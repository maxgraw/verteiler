import type { Slot, Group } from "../parser";

export interface Solution {
  occupancy: Slot[];
  groups: Group[];
  invAllocation: Record<number, number[]>;
}

export interface SolveResult {
  solution: Solution;
  score: number;
  spread: number[];
}
