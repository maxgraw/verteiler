import type { Group } from "./parser";
import type { Solution } from "./algorithm/types";
import { NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT } from "./config";

/** Labels for the four preference ranks, indexed the same way as SolveResult.spread. */
export const SPREAD_LABELS = ["1. Wahl", "2. Wahl", "3. Wahl", "Kein Wunsch"];

/**
 * Rank of a time slot within a group's preferences: 0, 1 or 2, and 3 for no match.
 * A choice of -1 ("Egal") matches any time slot at that position.
 */
export function rankOf(choices: number[], timeSlot: number): number {
	for (let k = 0; k < choices.length; k++) {
		if (choices[k] === -1 || choices[k] === timeSlot) return k;
	}
	return 3;
}

/**
 * Replace missing or out-of-range capacities with 1. The min=1 attribute on the
 * number inputs is advisory only, so cleared fields arrive here as null or NaN.
 */
export function sanitizeCapacities(capacities: number[]): number[] {
	return capacities.map((c) => (Number.isFinite(c) && c >= 1 ? c : 1));
}

/**
 * German error message when the cohort cannot possibly fit, or null when it fits.
 * Checked before solving because the solver's own infeasibility error is not actionable.
 */
export function checkCapacity(
	groups: Group[],
	capacities: number[],
): string | null {
	const students = groups.reduce((sum, g) => sum + g.size, 0);
	const capacity = capacities.reduce((sum, c) => sum + c, 0);
	if (students > capacity) {
		return `Nicht genug Kapazität: ${students} Studierende, aber nur ${capacity} Plätze verfügbar. Bitte Kapazitäten erhöhen.`;
	}
	return null;
}

export interface TimeSlotView {
	/** 1-based number shown to the user */
	num: number;
	/** Rotation group range, e.g. "Gruppe 5–8" */
	label: string;
	groups: (Group & { rank: number })[];
	studentCount: number;
}

/** Regroup a solution by time slot for display, annotating each group with its rank. */
export function groupByTimeSlot(
	solution: Solution,
	numTimeSlots: number = NUM_TIME_SLOTS,
	slotsPerTimeSlot: number = SLOTS_PER_TIME_SLOT,
): TimeSlotView[] {
	return Array.from({ length: numTimeSlots }, (_, t) => {
		const groups = solution.groups
			.filter((g) => solution.occupancy[g.currentSelection].timeSlot === t)
			.map((g) => ({ ...g, rank: rankOf(g.choices, t) }));
		return {
			num: t + 1,
			label: `Gruppe ${t * slotsPerTimeSlot + 1}–${(t + 1) * slotsPerTimeSlot}`,
			groups,
			studentCount: groups.reduce((sum, g) => sum + g.size, 0),
		};
	});
}

/** Plain-text rendering of a distribution, for the copy-to-clipboard button. */
export function formatDistribution(timeSlots: TimeSlotView[]): string {
	const lines: string[] = [];
	for (const ts of timeSlots) {
		lines.push(`Zeitslot ${ts.num} (${ts.label}):`);
		for (const g of ts.groups) lines.push(`  ${g.members}`);
		lines.push("");
	}
	return lines.join("\n").trim();
}

/** Turn any solver or worker failure into a German message the organizer can act on. */
export function toUserMessage(e: unknown): string {
	const msg = e instanceof Error ? e.message : String(e);
	if (msg.includes("Infeasible") || msg.includes("feasible")) {
		return "Keine gültige Verteilung möglich. Prüfe ob die Kapazitäten ausreichen.";
	}
	if (msg.includes("Zeitüberschreitung")) return msg;
	return `Unbekannter Fehler. Bitte Seite neu laden und erneut versuchen. (${msg})`;
}
