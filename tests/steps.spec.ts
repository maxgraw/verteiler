import { describe, expect, it } from "vitest";
import { STEP_COUNT, STEPS } from "$lib/steps";

describe("STEPS", () => {
	// A reorder that duplicates or skips an index would silently bind two steps to the
	// same open/done flag, so it is worth a guard rather than a code review.
	it("covers 0 to STEP_COUNT - 1 exactly once", () => {
		const indices = Object.values(STEPS).slice().sort((a, b) => a - b);
		expect(indices).toEqual(Array.from({ length: STEP_COUNT }, (_, i) => i));
	});

	it("keeps the phases in order: prepare, message, evaluate", () => {
		expect(STEPS.formsCopy).toBeLessThan(STEPS.deadline);
		expect(STEPS.deadline).toBeLessThan(STEPS.formsUrl);
		// The closing time can only be set once the form is published
		expect(STEPS.formsUrl).toBeLessThan(STEPS.formsClose);
		expect(STEPS.formsClose).toBeLessThan(STEPS.deadlineMessage);
		expect(STEPS.deadlineMessage).toBeLessThan(STEPS.reminder);
		expect(STEPS.reminder).toBeLessThan(STEPS.formsExport);
		expect(STEPS.formsExport).toBeLessThan(STEPS.csvUpload);
		expect(STEPS.csvUpload).toBeLessThan(STEPS.algorithm);
		expect(STEPS.capacities).toBeLessThan(STEPS.algorithm);
	});
});
