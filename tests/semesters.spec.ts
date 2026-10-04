/**
 * Real semesters, one per year, anonymized with tools/anonymize.ts.
 *
 * Each entry pins what the solver achieved when the fixture was added. fairnessValue is a
 * proven optimum, so any correct solver lands on exactly that number: a lower one breaks
 * a constraint, a higher one misses the optimum. Assignments are not pinned, because a
 * contested semester has many distributions that tie for best.
 */
import { describe, it, expect } from "vitest";
import { solve } from "#lib/algorithm/index.ts";
import { validateSolution } from "#lib/algorithm/validate.ts";
import {
	DEFAULT_CAPACITY,
	NUM_TIME_SLOTS,
	SLOTS_PER_TIME_SLOT,
	TOTAL_SLOTS,
} from "#lib/config.ts";
import { buildSlots, parseChoices } from "#lib/parser.ts";

import semester2026 from "./fixtures/semester_2026.csv?raw";

interface Semester {
	year: number;
	csv: string;
	groups: number;
	students: number;
	fairnessValue: number;
}

const SEMESTERS: Semester[] = [
	{
		year: 2026,
		csv: semester2026,
		groups: 46,
		students: 175,
		fairnessValue: 194,
	},
];

function uniformSlots() {
	return buildSlots(
		NUM_TIME_SLOTS,
		SLOTS_PER_TIME_SLOT,
		Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY),
	);
}

describe.each(SEMESTERS)("semester $year", (semester) => {
	it("parses every row without a warning", () => {
		const { groups, warnings } = parseChoices(semester.csv);
		expect(warnings).toEqual([]);
		expect(groups).toHaveLength(semester.groups);
		expect(groups.reduce((sum, g) => sum + g.size, 0)).toBe(semester.students);
	});

	it("solves to the proven optimum with a sound distribution", async () => {
		const { groups } = parseChoices(semester.csv);
		const slots = uniformSlots();
		const result = await solve(groups, slots);
		expect(validateSolution(groups, slots, result)).toEqual([]);
		expect(result.optimality).toBe("proven");
		expect(result.fairnessValue).toBe(semester.fairnessValue);
	}, 60_000);
});
