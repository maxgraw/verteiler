/**
 * Deterministic lottery used to break ties between equally fair distributions.
 *
 * The solver usually has several optimal solutions. Without an explicit rule the
 * one that gets returned depends on solver internals, which cannot be justified
 * to the group that ends up worse off. Instead every group draws a lottery number
 * from a seed that the organizer publishes before the deadline, so the outcome is
 * reproducible and checkable after the fact.
 */

const SEED_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SEED_LENGTH = 6;

/** Hash a string to a 32-bit unsigned integer (xmur3). */
function hash(input: string): number {
	let h = 1779033703 ^ input.length;
	for (let i = 0; i < input.length; i++) {
		h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	h = Math.imul(h ^ (h >>> 16), 2246822507);
	h = Math.imul(h ^ (h >>> 13), 3266489909);
	return (h ^= h >>> 16) >>> 0;
}

/**
 * A fresh seed to publish. Ambiguous characters (I, O, 0, 1) are left out so it
 * survives being read aloud or retyped from a chat message.
 */
export function generateSeed(): string {
	const bytes = new Uint8Array(SEED_LENGTH);
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		crypto.getRandomValues(bytes);
	} else {
		for (let i = 0; i < SEED_LENGTH; i++)
			bytes[i] = Math.floor(Math.random() * 256);
	}
	return Array.from(bytes, (b) => SEED_ALPHABET[b % SEED_ALPHABET.length]).join(
		"",
	);
}

/**
 * Lottery number of a single group. Derived from the seed and the group's own
 * key, so a group can recompute its own number once the seed is public.
 */
export function lotteryNumber(seed: string, key: string): number {
	return hash(`${seed}:${key}`);
}

/**
 * Rank every group by its lottery number: 0 is the luckiest, keys.length - 1 the
 * unluckiest. Positions are stable regardless of the order the keys arrive in,
 * and collisions fall back to the original index so the result is always a
 * complete permutation.
 *
 * @param keys - One stable identifier per group, e.g. the member list
 * @returns priorities[i] = position of keys[i], 0-based
 */
export function lotteryPriorities(seed: string, keys: string[]): number[] {
	const drawn = keys.map((key, index) => ({
		index,
		value: lotteryNumber(seed, key),
	}));
	drawn.sort((a, b) => a.value - b.value || a.index - b.index);

	const priorities = new Array<number>(keys.length);
	drawn.forEach((entry, position) => {
		priorities[entry.index] = position;
	});
	return priorities;
}
