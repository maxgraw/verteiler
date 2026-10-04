import { describe, expect, it } from "vitest";
import { allowedTimeSlots, rankOf } from "#lib/rank.ts";

describe("rankOf", () => {
	it("returns the position of an exact time slot match", () => {
		expect(rankOf([3, 5, 7], 3)).toBe(0);
		expect(rankOf([3, 5, 7], 5)).toBe(1);
		expect(rankOf([3, 5, 7], 7)).toBe(2);
	});

	it("returns 3 when no choice matches", () => {
		expect(rankOf([3, 5, 7], 1)).toBe(3);
	});

	it("treats Egal as a match at that position", () => {
		expect(rankOf([-1, 5, 7], 1)).toBe(0);
		expect(rankOf([3, -1, 7], 1)).toBe(1);
		expect(rankOf([3, 5, -1], 1)).toBe(2);
	});

	it("prefers an earlier exact match over a later Egal", () => {
		expect(rankOf([1, -1, 7], 1)).toBe(0);
	});
});

describe("allowedTimeSlots", () => {
	it("allows only the first choice at rank 0", () => {
		expect(allowedTimeSlots([3, 5, 7], 0)).toEqual([3]);
	});

	it("allows the first two choices at rank 1", () => {
		expect(allowedTimeSlots([3, 5, 7], 1)).toEqual([3, 5]);
	});

	it("collapses a repeated choice instead of listing it twice", () => {
		expect(allowedTimeSlots([3, 3, 7], 1)).toEqual([3]);
	});

	it("returns null for Egal, which any time slot already satisfies", () => {
		expect(allowedTimeSlots([-1, 5, 7], 0)).toBeNull();
		expect(allowedTimeSlots([3, -1, 7], 1)).toBeNull();
	});

	it("ignores an Egal that sits below the guaranteed rank", () => {
		expect(allowedTimeSlots([3, -1, 7], 0)).toEqual([3]);
	});
});
