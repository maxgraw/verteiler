/**
 * The solver against exhaustive search on instances small enough to try every assignment.
 *
 * tools/verify cross-checks HiGHS with CP-SAT and CBC, but all three solve a model written
 * by hand, so a misreading of the domain that lands in both models is confirmed rather than
 * caught. Enumeration has no model: it walks every assignment, keeps the legal ones and
 * takes the cheapest. The rank rule is restated here from the domain instead of imported
 * from rankOf, so a bug there cannot agree with itself either.
 *
 * Instances are random but seeded. A failure names the case, and its instance is in the
 * message, so it can be pasted into a plain test.
 */
import { describe, it, expect } from "vitest";
import { solve } from "#lib/algorithm/index.ts";
import { COSTS } from "#lib/algorithm/costs.ts";
import type { Guarantee } from "#lib/algorithm/types.ts";
import { buildSlots } from "#lib/parser.ts";
import type { Group, Slot } from "#lib/parser.ts";

const CASES = 500;
const SEED = 20260928;

interface Instance {
	numTimeSlots: number;
	slotsPerTimeSlot: number;
	capacities: number[];
	/** Per group: size, then three choices where -1 is Egal */
	groups: { size: number; choices: number[] }[];
	guarantees: Guarantee[];
}

function mulberry32(seed: number): () => number {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Tuned so most cases are solvable and contested: a shared favourite time slot, mostly
 * small groups, rarely a closed slot. Uniform randomness left two thirds infeasible and no
 * guarantee ever binding, which let a solver that ignored guarantees pass.
 */
function randomInstance(random: () => number): Instance {
	const int = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
	const numTimeSlots = int(1, 3);
	const slotsPerTimeSlot = int(1, 2);
	const capacities = Array.from({ length: numTimeSlots * slotsPerTimeSlot }, () =>
		random() < 0.1 ? 0 : int(3, 6),
	);
	const room = capacities.reduce((a, b) => a + b, 0);
	const favourite = int(0, numTimeSlots - 1);
	// Duplicates and Egal in any position on purpose, the parser lets both through
	const groups: Instance["groups"] = [];
	let students = 0;
	while (groups.length < 6) {
		const size = random() < 0.7 ? int(1, 3) : int(4, 6);
		// Fill to roughly the load of a real semester, sometimes past it
		const limit = room * (random() < 0.9 ? 0.9 : 1.2);
		if (groups.length > 0 && students + size > limit) break;
		students += size;
		groups.push({
			size,
			// Most want the favourite first, so guarantees on it actually cost someone
			choices: Array.from({ length: 3 }, (_, k) => {
				const r = random();
				if (r < 0.15) return -1;
				if (r < (k === 0 ? 0.85 : 0.5)) return favourite;
				return int(0, numTimeSlots - 1);
			}),
		});
	}
	const guarantees: Guarantee[] = [];
	if (random() < 0.5) {
		for (let g = 0; g < groups.length; g++) {
			if (random() < 0.5) guarantees.push({ groupId: g, maxRank: random() < 0.7 ? 0 : 1 });
		}
	}
	return { numTimeSlots, slotsPerTimeSlot, capacities, groups, guarantees };
}

/** Position of the first choice that is Egal or this time slot, 3 when none is. */
function rank(choices: number[], timeSlot: number): number {
	const k = choices.findIndex((c) => c === -1 || c === timeSlot);
	return k === -1 ? 3 : k;
}

/**
 * Cheapest total cost over every legal assignment, counted per student, or null when no
 * assignment is legal. Depth first with a capacity check per step, so dead branches end
 * early, but nothing is pruned on cost.
 */
function bruteForce(instance: Instance, withGuarantees: boolean): number | null {
	const { groups, capacities, slotsPerTimeSlot } = instance;
	const maxRank = new Map<number, number>();
	if (withGuarantees)
		for (const g of instance.guarantees) maxRank.set(g.groupId, g.maxRank);

	const load = capacities.map(() => 0);
	let best: number | null = null;

	function place(g: number, cost: number) {
		if (g === groups.length) {
			if (best === null || cost < best) best = cost;
			return;
		}
		const { size, choices } = groups[g];
		for (let s = 0; s < capacities.length; s++) {
			if (load[s] + size > capacities[s]) continue;
			const r = rank(choices, Math.floor(s / slotsPerTimeSlot));
			if (r > (maxRank.get(g) ?? 3)) continue;
			load[s] += size;
			place(g + 1, cost + size * COSTS[r]);
			load[s] -= size;
		}
	}

	place(0, 0);
	return best;
}

function materialize(instance: Instance): { groups: Group[]; slots: Slot[] } {
	return {
		groups: instance.groups.map((g, id) => ({
			id,
			size: g.size,
			members: `Team ${id}`,
			choices: g.choices,
			currentSelection: -1,
		})),
		slots: buildSlots(
			instance.numTimeSlots,
			instance.slotsPerTimeSlot,
			instance.capacities,
		),
	};
}

const random = mulberry32(SEED);
const instances = Array.from({ length: CASES }, () => randomInstance(random));

describe("solve against exhaustive search", () => {
	it.each(instances.map((instance, n) => [n, instance] as const))(
		"case %i",
		async (n, instance) => {
			const context = `case ${n}: ${JSON.stringify(instance)}`;
			const { groups, slots } = materialize(instance);
			const optimum = bruteForce(instance, true);
			const run = solve(groups, slots, {
				guarantees: instance.guarantees,
				lotterySeed: `case-${n}`,
			});

			if (optimum === null) {
				await expect(run, context).rejects.toThrow();
				return;
			}

			const result = await run;
			expect(result.fairnessValue, context).toBe(optimum);
			expect(result.optimality, context).toBe("proven");
			if (instance.guarantees.length > 0) {
				const free = bruteForce(instance, false);
				expect(result.guaranteeCost, context).toBe(optimum - (free ?? optimum));
			}
		},
	);
});
