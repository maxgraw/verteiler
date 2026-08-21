/**
 * Run the real solver over a CSV export and print the result as JSON.
 *
 * Feeds tools/verify/verify.py, which rebuilds the same model with two other solvers.
 * Everything the checker needs is in the output, so the two halves never have to agree
 * on how to read a CSV.
 *
 * This imports src/lib untouched: Bun resolves highs/runtime?url to a file path by
 * itself, so the production module graph runs here exactly as it does in the browser.
 * Relative imports only, $lib is a Vite alias and does not exist outside the app.
 *
 * Usage: bun run tools/verify/export.ts <csv> [--seed=ABC123]
 *          [--capacity=6 | --capacities=6,6,5,4,...] [--guarantee=Name:0 ...]
 */
import { readFileSync } from "node:fs";
import { solve } from "../../src/lib/algorithm/index";
import { COSTS } from "../../src/lib/algorithm/costs";
import {
	DEFAULT_CAPACITY,
	NUM_TIME_SLOTS,
	SLOTS_PER_TIME_SLOT,
} from "../../src/lib/config";
import { allowedTimeSlots, findGroups } from "../../src/lib/distribution";
import { buildSlots, parseChoices } from "../../src/lib/parser";
import type { Guarantee } from "../../src/lib/algorithm/types";

function flag(name: string, fallback: string): string {
	const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
	return hit ? hit.slice(name.length + 3) : fallback;
}

function flags(name: string): string[] {
	return process.argv
		.filter((a) => a.startsWith(`--${name}=`))
		.map((a) => a.slice(name.length + 3));
}

const csvPath = process.argv[2];
if (!csvPath || csvPath.startsWith("--")) {
	console.error(
		"Usage: bun run tools/verify/export.ts <csv> [--seed=ABC123]" +
			" [--capacity=6 | --capacities=6,6,5,4,...]",
	);
	process.exit(2);
}

const TOTAL = NUM_TIME_SLOTS * SLOTS_PER_TIME_SLOT;
const seed = flag("seed", "");

/**
 * Per-slot capacities in slot order, or one value for all of them. The uneven case is the
 * one worth checking: KLIPS pre-registrations leave every slot at a different number, and
 * a uniform run would never exercise the capacity constraint properly.
 */
function capacities(): number[] {
	const list = flag("capacities", "");
	if (!list) {
		const one = Number(flag("capacity", String(DEFAULT_CAPACITY)));
		if (!Number.isInteger(one) || one < 1) {
			console.error(`Invalid capacity: ${flag("capacity", "")}`);
			process.exit(2);
		}
		return Array(TOTAL).fill(one);
	}

	const values = list.split(",").map((v) => Number(v.trim()));
	if (values.length !== TOTAL || values.some((v) => !Number.isInteger(v) || v < 1)) {
		console.error(
			`--capacities needs ${TOTAL} whole numbers of at least 1, got ${values.length}`,
		);
		process.exit(2);
	}
	return values;
}

const { groups, warnings } = parseChoices(readFileSync(csvPath, "utf8"));
const slots = buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, capacities());

/**
 * Guarantees given as "--guarantee=Nachname:0", resolved by member name because that is
 * what a human knows. The checker needs them: without them it would solve a different,
 * less constrained problem and report a better objective as a disagreement.
 */
function guarantees(): Guarantee[] {
	return flags("guarantee").map((spec) => {
		const at = spec.lastIndexOf(":");
		const name = at === -1 ? spec : spec.slice(0, at);
		const maxRank = at === -1 ? 0 : Number(spec.slice(at + 1));
		if (!Number.isInteger(maxRank) || maxRank < 0 || maxRank > 2) {
			console.error(`Invalid rank in --guarantee=${spec}`);
			process.exit(2);
		}
		const hits = findGroups(groups, name, 2);
		if (hits.length !== 1) {
			console.error(
				`--guarantee=${spec} matches ${hits.length} groups, needs exactly one`,
			);
			process.exit(2);
		}
		return { groupId: hits[0].id, maxRank };
	});
}

const pinned = guarantees();

// Progress and warnings go to stderr so stdout stays pipeable JSON
for (const warning of warnings) console.error(`warning: ${warning}`);
const started = performance.now();
const result = await solve(groups, slots, {
	lotterySeed: seed,
	guarantees: pinned,
	onProgress: (message) => console.error(message),
});
const elapsedMs = Math.round(performance.now() - started);

console.log(
	JSON.stringify(
		{
			source: csvPath,
			seed,
			elapsedMs,
			// Read from the app, never restated here: the checker has to score with the
			// same numbers the solver minimised, including after someone changes them
			costs: COSTS,
			slots: slots.map((s) => ({
				id: s.id,
				timeSlot: s.timeSlot,
				capacity: s.capacity,
			})),
			groups: groups.map((g) => ({
				id: g.id,
				size: g.size,
				choices: g.choices,
				members: g.members,
			})),
			// Resolved to time slots here, so the checker never has to redo rankOf
			guarantees: pinned.map((g) => ({
				groupId: g.groupId,
				maxRank: g.maxRank,
				allowedTimeSlots: allowedTimeSlots(groups[g.groupId].choices, g.maxRank),
			})),
			assignment: result.solution.groups.map((g) => g.currentSelection),
			fairnessValue: result.fairnessValue,
			guaranteeCost: result.guaranteeCost,
			optimality: result.optimality,
			lotteryComplete: result.lotteryComplete,
			spread: result.spread,
			studentSpread: result.studentSpread,
			score: result.score,
		},
		null,
		2,
	),
);
