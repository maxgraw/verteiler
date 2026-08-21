import { describe, expect, it } from "vitest";
import type { GroupRow } from "$lib/distribution";
import {
	distributionTable,
	rotationRows,
	spreadTable,
	summaryLine,
} from "$lib/pdf";

const rows: GroupRow[] = [
	{ members: "Anna Müller, Ben Schmidt", num: 1, label: "Gruppe 1", rank: 0 },
	{ members: "Clara Weiß", num: 32, label: "Gruppe 32", rank: 3 },
];

const shared: GroupRow[] = [
	{ members: "Anna Müller", num: 3, label: "Gruppe 3", rank: 0 },
	{ members: "Ben Schmidt", num: 3, label: "Gruppe 3", rank: 1 },
	{ members: "Clara Weiß", num: 4, label: "Gruppe 4", rank: 0 },
];

describe("rotationRows", () => {
	it("collects the groups of a shared rotation group into one row", () => {
		expect(rotationRows(shared)).toEqual([
			{ num: 3, members: ["Anna Müller", "Ben Schmidt"] },
			{ num: 4, members: ["Clara Weiß"] },
		]);
	});

	it("keeps one row per rotation group when none are shared", () => {
		expect(rotationRows(rows).map((r) => r.num)).toEqual([1, 32]);
	});
});

describe("distributionTable", () => {
	it("leads with the rotation group number and drops the rank", () => {
		const { head, body } = distributionTable(rows);
		expect(head).toEqual(["Rotationsgruppe", "Namen"]);
		expect(body[0]).toEqual(["1", "Anna Müller, Ben Schmidt"]);
	});

	it("names the number once and stacks the shared groups below it", () => {
		expect(distributionTable(shared).body).toEqual([
			["3", "Anna Müller\nBen Schmidt"],
			["4", "Clara Weiß"],
		]);
	});
});

describe("spreadTable", () => {
	it("pairs the group count of each rank with its student count", () => {
		const { head, body } = spreadTable([28, 4, 0, 0], [149, 19, 0, 0]);
		expect(head).toEqual(["Wahl", "Gruppen", "Studierende"]);
		expect(body).toEqual([
			["1. Wahl", "28", "149"],
			["2. Wahl", "4", "19"],
			["3. Wahl", "0", "0"],
			["Kein Wunsch", "0", "0"],
		]);
	});
});

describe("summaryLine", () => {
	it("counts rotation groups, not applicant groups", () => {
		expect(summaryLine(shared, 7)).toBe("2 Rotationsgruppen, 7 Studierende");
	});

	it("keeps the singular for a single rotation group", () => {
		expect(summaryLine([rows[0]], 2)).toBe("1 Rotationsgruppe, 2 Studierende");
	});
});
