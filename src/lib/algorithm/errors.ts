/**
 * Why a solve failed. toUserMessage picks the German text from this, so the solver's
 * own messages can stay technical and never have to be matched as strings.
 *
 * - infeasible: HiGHS proved that no distribution satisfies the constraints
 * - timeLimit: HiGHS ran out of time before it found any distribution at all
 * - invalid: the result broke its own constraints; the message is German already
 * - timeout: the client gave up waiting for the worker
 * - worker: the worker itself crashed
 * - unknown: anything else, the message is kept for debugging
 */
export type SolveErrorKind =
	| "infeasible"
	| "timeLimit"
	| "invalid"
	| "timeout"
	| "worker"
	| "unknown";

export class SolveError extends Error {
	constructor(
		readonly kind: SolveErrorKind,
		message: string,
	) {
		super(message);
		this.name = "SolveError";
	}
}

/** Kind of any thrown value. Errors from outside the solver count as unknown. */
export function errorKind(e: unknown): SolveErrorKind {
	return e instanceof SolveError ? e.kind : "unknown";
}
