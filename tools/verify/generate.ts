/**
 * Random semesters of realistic shape for the cross-check, 20 to 80 groups.
 *
 * Groups are drawn from the real semesters in tests/fixtures: a real size and a real
 * choice triple, so the 1-4/5-8 clustering and the neighbouring second choices survive.
 * The triple is shifted by a random number of time slots now and then, otherwise every
 * semester would fight over the same two blocks. Output is a CSV in the real form layout,
 * so the parser is part of the path, exactly as in a manual run.
 *
 * Members are named Team<n>x<k>. "Team<n>x" matches exactly one group, which is what
 * export.ts needs to resolve a guarantee by name.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT } from "../../src/lib/config";
import { parseChoices } from "../../src/lib/parser";

export interface RandomSemester {
	csv: string;
	capacities: number[];
	/** Ready to pass to export.ts as --guarantee=... values */
	guarantees: string[];
}

interface Sample {
	size: number;
	choices: number[];
}

export function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** Every group of every real semester, the pool random semesters are drawn from. */
export function loadSamples(fixtures: string): Sample[] {
	return readdirSync(fixtures)
		.filter((f) => /^semester_\d{4}\.csv$/.test(f))
		.flatMap(
			(f) => parseChoices(readFileSync(join(fixtures, f), "utf8")).groups,
		)
		.map((g) => ({ size: g.size, choices: g.choices }));
}

function label(timeSlot: number): string {
	if (timeSlot === -1) return "Egal";
	const first = timeSlot * SLOTS_PER_TIME_SLOT + 1;
	return `${first}-${first + SLOTS_PER_TIME_SLOT - 1}`;
}

export function randomSemester(
	random: () => number,
	samples: Sample[],
): RandomSemester {
	const int = (lo: number, hi: number) =>
		lo + Math.floor(random() * (hi - lo + 1));
	const count = int(20, 80);

	const groups = Array.from({ length: count }, () => {
		const { size, choices } = samples[int(0, samples.length - 1)];
		const shift = random() < 0.3 ? int(1, NUM_TIME_SLOTS - 1) : 0;
		return {
			size,
			choices: choices.map((c) =>
				c === -1 ? -1 : (c + shift) % NUM_TIME_SLOTS,
			),
		};
	});
	const students = groups.reduce((sum, g) => sum + g.size, 0);

	// 80 groups outgrow 32 slots of 6, so capacity scales with the semester. Uneven, as
	// KLIPS leaves it, and with a little slack so most semesters are solvable.
	const slotCount = NUM_TIME_SLOTS * SLOTS_PER_TIME_SLOT;
	const base = Math.max(
		6,
		Math.ceil((students * int(102, 115)) / 100 / slotCount),
	);
	const capacities = Array.from({ length: slotCount }, () =>
		Math.max(1, base - (random() < 0.3 ? int(1, 2) : 0)),
	);

	const header = [
		"Zeitstempel",
		"Anzahl Gruppenmitglieder",
		"Vor- und Nachname aller Gruppenmitglieder",
		"Zeitslot Auswahl [1. Wahl]",
		"Zeitslot Auswahl [2. Wahl]",
		"Zeitslot Auswahl [3. Wahl]",
	];
	const rows = groups.map((g, n) => [
		"2026/01/01",
		String(g.size),
		Array.from({ length: g.size }, (_, k) => `Team${n}x${k + 1}`).join(", "),
		...g.choices.map(label),
	]);
	const csv = [header, ...rows]
		.map((r) => r.map((c) => `"${c}"`).join(","))
		.join("\n")
		.concat("\n");

	// Keyed by group, so no group is pinned twice with different ranks
	const pinned = new Map<number, number>();
	if (random() < 0.4) {
		for (let k = int(1, 3); k > 0; k--) {
			pinned.set(int(0, count - 1), random() < 0.7 ? 0 : 1);
		}
	}
	const guarantees = [...pinned].map(([n, rank]) => `Team${n}x:${rank}`);

	return { csv, capacities, guarantees };
}
