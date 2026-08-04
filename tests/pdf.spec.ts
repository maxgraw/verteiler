import { describe, expect, it } from "vitest";
import type { GroupRow } from "$lib/distribution";
import { distributionTable, spreadTable, summaryLine } from "$lib/pdf";

const rows: GroupRow[] = [
	{ members: "Anna Müller, Ben Schmidt", label: "Gruppe 1–4", rank: 0 },
	{ members: "Clara Weiß", label: "Gruppe 29–32", rank: 3 },
];

describe("distributionTable", () => {
	it("leads with the assignment, not with the names", () => {
		const { head, body } = distributionTable(rows);
		expect(head).toEqual(["Zuteilung", "Mitglieder", "Wahl"]);
		expect(body[0]).toEqual([
			"Gruppe 1–4",
			"Anna Müller, Ben Schmidt",
			"1. Wahl",
		]);
	});

	it("spells out a missed preference instead of leaving the cell empty", () => {
		expect(distributionTable(rows).body[1][2]).toBe("Kein Wunsch");
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
	it("counts groups and students", () => {
		expect(summaryLine(rows, 7)).toBe("2 Gruppen, 7 Studierende");
	});

	it("keeps the singular for a single group", () => {
		expect(summaryLine([rows[0]], 2)).toBe("1 Gruppe, 2 Studierende");
	});
});
