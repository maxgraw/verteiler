/**
 * Deterministic lottery used to break ties between equally fair distributions.
 *
 * The solver usually has several optimal solutions. Without an explicit rule the
 * one that gets returned depends on solver internals, which cannot be justified
 * to the group that ends up worse off. Instead every group draws a lottery number
 * from one seed, and that seed is computed from the applications themselves. The
 * same export therefore always yields the same distribution, with no seed to
 * store, publish or carry between machines.
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
 * The draw that belongs to one set of applications.
 *
 * Derived from the applications instead of stored, so the same export produces the
 * same distribution on every machine and in every browser, with nothing to carry
 * over. A new semester brings other applicants and therefore a different draw by
 * itself, which a hardcoded seed would not do: there the same member list would
 * draw the same luck every semester, and a group that once drew badly would keep
 * drawing badly.
 *
 * Only the member lists go in, not sizes or choices, so correcting a wrongly
 * entered choice leaves the draw alone. Keys are sorted first, so re-exporting the
 * same responses in a different order is still the same draw.
 *
 * The alphabet leaves out I, O, 0 and 1, which keeps the value legible when it is
 * read off the screen and compared against another run.
 *
 * @param keys - One stable identifier per group, e.g. the member list
 */
export function seedFromGroups(keys: string[]): string {
	const canonical = [...keys].sort().join("\n");
	let seed = "";
	for (let i = 0; i < SEED_LENGTH; i++) {
		seed += SEED_ALPHABET[hash(`${i}:${canonical}`) % SEED_ALPHABET.length];
	}
	return seed;
}

/**
 * Lottery number of a single group. Derived from the seed and the group's own
 * key, so the same seed always gives the same group the same number.
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
