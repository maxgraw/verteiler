/**
 * Benchmark suite for the solve() algorithm.
 *
 * Not a correctness test — measures score quality and wall-clock time
 * so that algorithm improvements can be compared objectively.
 *
 * Run with: bun run test (client project, Chromium)
 */
import { describe, it, expect } from "vitest";
import { solve } from "$lib/algorithm";
import { parseChoices, buildSlots } from "$lib/parser";

import realistischCsv from "./fixtures/realistisch.csv?raw";
import engpassCsv from "./fixtures/engpass.csv?raw";
import semester2026Csv from "./fixtures/semester_2026.csv?raw";

const NUM_TIME_SLOTS = 8;
const SLOTS_PER_TIME_SLOT = 4;
const UNIFORM_CAPACITY = 6;

function uniformSlots() {
	return buildSlots(
		NUM_TIME_SLOTS,
		SLOTS_PER_TIME_SLOT,
		Array(32).fill(UNIFORM_CAPACITY),
	);
}

/**
 * Uneven capacities as KLIPS pre-registrations leave them: 180 places for the 175
 * students of semester_2026.csv. Hand picked, not taken from the real run.
 */
const KLIPS_CAPACITIES = [
	6, 5, 6, 6, 5, 6, 6, 4, 6, 6, 5, 6, 6, 5, 6, 6, 6, 6, 6, 5, 6, 5, 6, 6, 5, 6, 6, 5, 6,
	6, 4, 6,
];

/** One place less in every slot of the four most wanted time slots, 176 places. */
const POPULAR_MINUS_ONE = Array.from({ length: 32 }, (_, i) =>
	[0, 1, 6, 7].includes(Math.floor(i / SLOTS_PER_TIME_SLOT)) ? 5 : 6,
);

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

describe("algorithm benchmark", () => {
	it("realistisch.csv — realistic semester input", async () => {
		const { groups } = parseChoices(realistischCsv);
		const slots = uniformSlots();
		const t0 = performance.now();
		const result = await solve(groups, slots);
		const ms = performance.now() - t0;
		formatBenchmark("realistisch.csv", result.score, result.spread, ms);
		expect(result.score).toBeDefined();
	}, 60_000);

	it("engpass.csv — contested input (20/32 groups want same timeslot)", async () => {
		const { groups } = parseChoices(engpassCsv);
		const slots = uniformSlots();
		const t0 = performance.now();
		const result = await solve(groups, slots);
		const ms = performance.now() - t0;
		formatBenchmark("engpass.csv", result.score, result.spread, ms);
		expect(result.score).toBeDefined();
	}, 60_000);

	it.each([
		["uniform capacity", Array(32).fill(UNIFORM_CAPACITY)],
		["KLIPS-like uneven capacity", KLIPS_CAPACITIES],
		["most wanted time slots one place short", POPULAR_MINUS_ONE],
	])("semester_2026.csv — %s", async (label, capacities) => {
		const { groups } = parseChoices(semester2026Csv);
		const slots = buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, capacities);
		const t0 = performance.now();
		const result = await solve(groups, slots);
		const ms = performance.now() - t0;
		formatBenchmark(`semester_2026.csv, ${label}`, result.score, result.spread, ms);
		expect(result.score).toBeDefined();
	}, 60_000);

	it("synthetic — 32 groups, all Egal", async () => {
		const groups = syntheticAllEgal(32);
		const slots = uniformSlots();
		const t0 = performance.now();
		const result = await solve(groups, slots);
		const ms = performance.now() - t0;
		formatBenchmark(
			"synthetic: all Egal (32 groups × 1)",
			result.score,
			result.spread,
			ms,
		);
		expect(result.score).toBeDefined();
	}, 60_000);

	it("synthetic — 32 groups of 1, all want timeslot 0 (maximum contention)", async () => {
		// 32 groups × 1 student; only 4 slots × 6 = 24 capacity in timeslot 0
		const groups = syntheticContested(32, 0);
		const slots = uniformSlots();
		const t0 = performance.now();
		const result = await solve(groups, slots);
		const ms = performance.now() - t0;
		formatBenchmark(
			"synthetic: all want t=0 (32 groups × 1)",
			result.score,
			result.spread,
			ms,
		);
		expect(result.score).toBeDefined();
	}, 60_000);
});
