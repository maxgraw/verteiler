import { describe, expect, it } from "vitest";
import { SolveError, toUserMessage } from "#lib/algorithm/errors.ts";

describe("toUserMessage", () => {
	it("maps solver infeasibility to a capacity hint", () => {
		const message = toUserMessage(
			new SolveError("infeasible", "No feasible solution found."),
		);
		expect(message).toBe(
			"Keine gültige Verteilung möglich. Prüf, ob die Kapazitäten ausreichen.",
		);
	});

	it("calls a timed out solve a timeout, not a capacity problem", () => {
		const message = toUserMessage(
			new SolveError("timeLimit", "No assignment returned."),
		);
		expect(message).toBe(
			"Die Berechnung hat zu lange gedauert. Versuch es nochmal.",
		);
	});

	it("says the same when the client gave up waiting", () => {
		expect(toUserMessage(new SolveError("timeout", "Client timeout."))).toBe(
			"Die Berechnung hat zu lange gedauert. Versuch es nochmal.",
		);
	});

	it("passes a validation failure through, it already names what broke", () => {
		const original =
			"Ungültige Verteilung: Gruppe 3 ist mit 9 von 6 Plätzen überbelegt.";
		expect(toUserMessage(new SolveError("invalid", original))).toBe(original);
	});

	it("no longer guesses the kind from the message text", () => {
		const message = toUserMessage(
			new Error("No feasible solution found (status: Infeasible)."),
		);
		expect(message).toContain("Unbekannter Fehler");
	});

	it("wraps an unknown error and keeps the original text for debugging", () => {
		expect(toUserMessage(new Error("boom"))).toBe(
			"Unbekannter Fehler. Bitte Seite neu laden und nochmal versuchen. (boom)",
		);
	});

	it("handles a thrown non-Error value", () => {
		expect(toUserMessage("kaputt")).toContain("kaputt");
	});
});
