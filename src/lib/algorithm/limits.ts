/**
 * Solver time budgets, in seconds.
 *
 * Kept apart from index.ts so solver-client.ts can size its timeout from them without
 * pulling HiGHS into the main bundle.
 */

/** Per stage: optimising and breaking ties each get this much. */
export const TIME_LIMIT_SECONDS = 30;

/**
 * The certificate only has to fail, which is far cheaper than optimising. Measured at
 * 1.1 s on a real 46 group export, so this is a wide margin. Running out of it costs
 * the proof, never the distribution.
 */
export const CERTIFICATE_TIME_LIMIT_SECONDS = 15;

/** Worst case for one pipeline run: minimise, prove, break ties. */
export const PIPELINE_LIMIT_SECONDS =
	2 * TIME_LIMIT_SECONDS + CERTIFICATE_TIME_LIMIT_SECONDS;
