/**
 * Capacity scenarios run against every real semester, by benchmark.spec.ts and by
 * tools/verify/all.ts. Plain literals without imports, because the verify script runs
 * under Bun where the $lib alias does not exist.
 *
 * Only uniform is guaranteed to fit every semester. The tighter ones were picked for the
 * 175 students of 2026, and a later semester may simply not fit into them.
 */
export const CAPACITY_SCENARIOS: { name: string; capacities: number[] }[] = [
	{ name: "uniform capacity", capacities: Array(32).fill(6) },
	{
		// Uneven, as KLIPS pre-registrations leave it. Hand picked, 180 places.
		name: "KLIPS-like uneven capacity",
		capacities: [
			6, 5, 6, 6, 5, 6, 6, 4, 6, 6, 5, 6, 6, 5, 6, 6, 6, 6, 6, 5, 6, 5, 6, 6, 5, 6, 6, 5,
			6, 6, 4, 6,
		],
	},
	{
		// One place less in every slot of 1-4, 5-8, 25-28 and 29-32, 176 places
		name: "most wanted time slots one place short",
		capacities: [
			5, 5, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5,
			5, 5, 5, 5,
		],
	},
];
