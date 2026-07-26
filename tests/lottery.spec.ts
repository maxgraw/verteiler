import { describe, it, expect } from "vitest";
import { generateSeed, lotteryNumber, lotteryPriorities } from "$lib/lottery";

const KEYS = ["Anna, Ben", "Clara", "Dora, Emil, Frida", "Gero"];

describe("generateSeed", () => {
	it("has a fixed length", () => {
		expect(generateSeed()).toHaveLength(6);
	});

	it("omits characters that are easy to confuse when retyped", () => {
		const seeds = Array.from({ length: 50 }, generateSeed).join("");
		expect(seeds).not.toMatch(/[IO01]/);
	});

	it("uses only characters that survive a chat message", () => {
		expect(generateSeed()).toMatch(/^[A-Z2-9]+$/);
	});

	it("does not repeat itself", () => {
		const seeds = new Set(Array.from({ length: 50 }, generateSeed));
		expect(seeds.size).toBeGreaterThan(45);
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

	it("is reproducible from the published seed", () => {
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
