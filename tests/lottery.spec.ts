import { describe, it, expect } from "vitest";
import {
	lotteryNumber,
	lotteryPriorities,
	seedFromGroups,
} from "$lib/lottery";

const KEYS = ["Anna, Ben", "Clara", "Dora, Emil, Frida", "Gero"];

describe("seedFromGroups", () => {
	it("has the same shape a seed always had", () => {
		expect(seedFromGroups(KEYS)).toMatch(/^[A-Z2-9]{6}$/);
	});

	it("omits characters that are easy to confuse when read off a screen", () => {
		const seeds = Array.from({ length: 50 }, (_, i) =>
			seedFromGroups([...KEYS, `Gruppe ${i}`]),
		).join("");
		expect(seeds).not.toMatch(/[IO01]/);
	});

	it("gives the same draw for the same applications, on any machine", () => {
		expect(seedFromGroups(KEYS)).toBe(seedFromGroups(KEYS));
	});

	it("ignores the order the responses were exported in", () => {
		expect(seedFromGroups([...KEYS].reverse())).toBe(seedFromGroups(KEYS));
	});

	it("changes when the applications change, so a new semester draws afresh", () => {
		expect(seedFromGroups([...KEYS, "Hedda"])).not.toBe(seedFromGroups(KEYS));
	});

	it("changes when a single member list is corrected", () => {
		const corrected = ["Anna, Ben", "Klara", "Dora, Emil, Frida", "Gero"];
		expect(seedFromGroups(corrected)).not.toBe(seedFromGroups(KEYS));
	});

	it("spreads across the alphabet rather than favouring one letter", () => {
		const seeds = Array.from({ length: 200 }, (_, i) =>
			seedFromGroups([`Gruppe ${i}`]),
		);
		expect(new Set(seeds).size).toBeGreaterThan(190);
	});

	it("handles an empty field", () => {
		expect(seedFromGroups([])).toMatch(/^[A-Z2-9]{6}$/);
	});
});

describe("lotteryNumber", () => {
	it("is deterministic for the same seed and key", () => {
		expect(lotteryNumber("ABC123", "Anna")).toBe(
			lotteryNumber("ABC123", "Anna"),
		);
	});

	it("differs between keys under the same seed", () => {
		expect(lotteryNumber("ABC123", "Anna")).not.toBe(
			lotteryNumber("ABC123", "Ben"),
		);
	});

	it("differs between seeds for the same key", () => {
		expect(lotteryNumber("ABC123", "Anna")).not.toBe(
			lotteryNumber("XYZ789", "Anna"),
		);
	});
});

describe("lotteryPriorities", () => {
	it("returns one position per key", () => {
		expect(lotteryPriorities("ABC123", KEYS)).toHaveLength(KEYS.length);
	});

	it("is a complete permutation, so every position is handed out exactly once", () => {
		const priorities = lotteryPriorities("ABC123", KEYS);
		expect([...priorities].sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
	});

	it("is reproducible from the same seed", () => {
		expect(lotteryPriorities("ABC123", KEYS)).toEqual(
			lotteryPriorities("ABC123", KEYS),
		);
	});

	it("does not depend on the order the keys arrive in", () => {
		const forward = lotteryPriorities("ABC123", KEYS);
		const reversed = lotteryPriorities("ABC123", [...KEYS].reverse());
		expect([...reversed].reverse()).toEqual(forward);
	});

	it("gives a different draw for a different seed", () => {
		const a = lotteryPriorities("ABC123", KEYS);
		const b = lotteryPriorities("ZZZ999", KEYS);
		expect(a).not.toEqual(b);
	});

	it("handles duplicate keys without losing a position", () => {
		const priorities = lotteryPriorities("ABC123", ["Anna", "Anna", "Ben"]);
		expect([...priorities].sort((a, b) => a - b)).toEqual([0, 1, 2]);
	});

	it("handles an empty field", () => {
		expect(lotteryPriorities("ABC123", [])).toEqual([]);
	});
});
