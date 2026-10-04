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

/** Turn any solver or worker failure into a German message the organizer can act on. */
export function toUserMessage(e: unknown): string {
	const msg = e instanceof Error ? e.message : String(e);
	switch (errorKind(e)) {
		case "infeasible":
			return "Keine gültige Verteilung möglich. Prüf, ob die Kapazitäten ausreichen.";
		// Not a capacity problem: a solve that ran out of time found nothing, which says
		// nothing about whether the capacities are enough
		case "timeLimit":
		case "timeout":
			return "Die Berechnung hat zu lange gedauert. Versuch es nochmal.";
		// Already plain German and already names what broke
		case "invalid":
			return msg;
		case "worker":
		case "unknown":
			return `Unbekannter Fehler. Bitte Seite neu laden und nochmal versuchen. (${msg})`;
	}
}
