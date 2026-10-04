import { describe, expect, it } from "vitest";
import { findGroups } from "#lib/search.ts";

describe("findGroups", () => {
	const groups = [
		{
			id: 0,
			size: 2,
			members: "Anna Müller, Ben Schmidt",
			choices: [0],
		},
		{
			id: 1,
			size: 1,
			members: "Clara Weiß",
			choices: [0],
		},
	];

	it("finds a group by part of a member name", () => {
		expect(findGroups(groups, "schmidt").map((g) => g.id)).toEqual([0]);
	});

	it("ignores umlauts, so a plain keyboard still finds the name", () => {
		expect(findGroups(groups, "muller").map((g) => g.id)).toEqual([0]);
		expect(findGroups(groups, "weiss").map((g) => g.id)).toEqual([1]);
	});

	it("stays quiet below two characters, which would match everything", () => {
		expect(findGroups(groups, "a")).toEqual([]);
	});

	it("caps the result list", () => {
		expect(findGroups(groups, "e", 1).length).toBeLessThanOrEqual(1);
	});
});
