/**
 * Benchmark suite for the solve() algorithm.
 *
 * Not a correctness test — measures score quality and wall-clock time
 * so that algorithm improvements can be compared objectively.
 *
 * Run with: bun run test (client project, Chromium)
 */
import { describe, it, expect } from 'vitest';
import { solve } from './index';
import { parseChoices, buildSlots } from '../parser';

import realistischCsv from '../../test/realistisch.csv?raw';
import engpassCsv from '../../test/engpass.csv?raw';

const NUM_TIME_SLOTS = 8;
const SLOTS_PER_TIME_SLOT = 4;
const UNIFORM_CAPACITY = 6;

function uniformSlots() {
  return buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, Array(32).fill(UNIFORM_CAPACITY));
}

function syntheticAllEgal(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    size: 1,
    members: `Student ${i}`,
    choices: [-1, -1, -1],
    currentSelection: -1,
  }));
}

function syntheticContested(n: number, timeslot: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    size: 1,
    members: `Student ${i}`,
    choices: [timeslot, -1, -1],
    currentSelection: -1,
  }));
}

function formatBenchmark(
  label: string,
  score: number,
  spread: number[],
  ms: number,
) {
  const [first, second, third, noMatch] = spread;
  const total = spread.reduce((a, b) => a + b, 0);
  console.log(
    `\n┌─ ${label}\n` +
    `│  Score:    ${score}\n` +
    `│  1. Wahl:  ${first} / ${total}  (${((first / total) * 100).toFixed(1)}%)\n` +
    `│  2. Wahl:  ${second} / ${total}  (${((second / total) * 100).toFixed(1)}%)\n` +
    `│  3. Wahl:  ${third} / ${total}  (${((third / total) * 100).toFixed(1)}%)\n` +
    `│  Kein M.:  ${noMatch} / ${total}  (${((noMatch / total) * 100).toFixed(1)}%)\n` +
    `└  Time:     ${ms.toFixed(1)} ms`,
  );
}

describe('algorithm benchmark', () => {
  it('realistisch.csv — realistic semester input', async () => {
    const { groups } = parseChoices(realistischCsv);
    const slots = uniformSlots();
    const t0 = performance.now();
    const result = await solve(groups, slots);
    const ms = performance.now() - t0;
    formatBenchmark('realistisch.csv', result.score, result.spread, ms);
    expect(result.score).toBeDefined();
  }, 60_000);

  it('engpass.csv — contested input (20/32 groups want same timeslot)', async () => {
    const { groups } = parseChoices(engpassCsv);
    const slots = uniformSlots();
    const t0 = performance.now();
    const result = await solve(groups, slots);
    const ms = performance.now() - t0;
    formatBenchmark('engpass.csv', result.score, result.spread, ms);
    expect(result.score).toBeDefined();
  }, 60_000);

  it('synthetic — 32 groups, all Egal', async () => {
    const groups = syntheticAllEgal(32);
    const slots = uniformSlots();
    const t0 = performance.now();
    const result = await solve(groups, slots);
    const ms = performance.now() - t0;
    formatBenchmark('synthetic: all Egal (32 groups × 1)', result.score, result.spread, ms);
    expect(result.score).toBeDefined();
  }, 60_000);

  it('synthetic — 32 groups of 1, all want timeslot 0 (maximum contention)', async () => {
    // 32 groups × 1 student; only 4 slots × 6 = 24 capacity in timeslot 0
    const groups = syntheticContested(32, 0);
    const slots = uniformSlots();
    const t0 = performance.now();
    const result = await solve(groups, slots);
    const ms = performance.now() - t0;
    formatBenchmark('synthetic: all want t=0 (32 groups × 1)', result.score, result.spread, ms);
    expect(result.score).toBeDefined();
  }, 60_000);
});
