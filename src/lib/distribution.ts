import type { Group, Slot } from "./parser";
import type { Guarantee, Solution, SolveResult } from "./algorithm/types";
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
 * Time slots a group may take without breaking a guarantee, or null when every slot
 * qualifies anyway. The inverse of rankOf, and it lives here for the same reason: the
 * solver and the views must agree on what a rank means.
 *
 * An "Egal" among the choices up to maxRank matches any time slot at that position, so
 * such a group meets its guarantee wherever it lands and needs no constraint at all.
 */
export function allowedTimeSlots(
	choices: number[],
	maxRank: number,
): number[] | null {
	const reachable = choices.slice(0, maxRank + 1);
	if (reachable.includes(-1)) return null;
	return [...new Set(reachable)];
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
		return `Nicht genug Kapazität: ${students} Studierende, aber nur ${capacity} Plätze. Bitte Kapazitäten erhöhen.`;
	}
	return null;
}

/**
 * One rotation group, the unit students are actually placed in. Several applicant groups
 * can share one, which is why this level exists at all: without it a solo applicant looks
 * like a rotation group of their own.
 */
export interface RotationGroupView {
	/** 1-based number shown to the user, e.g. 3 for "Gruppe 3" */
	num: number;
	groups: (Group & { rank: number })[];
	studentCount: number;
	capacity: number;
}

/**
 * German error when a guarantee cannot possibly be met, or null when they all can.
 *
 * Only necessary conditions, not a full feasibility test: that is the solver's job. The
 * point is to name the guarantee that is impossible, because the solver's own answer is
 * a bare "Infeasible" that says nothing about which one caused it.
 */
export function checkGuarantees(
	groups: Group[],
	slots: Slot[],
	guarantees: Guarantee[],
): string | null {
	for (const { groupId, maxRank } of guarantees) {
		const group = groups[groupId];
		if (!group) return "Eine Zusage zeigt auf eine Gruppe, die es nicht mehr gibt.";

		const allowed = allowedTimeSlots(group.choices, maxRank);
		if (allowed === null) continue;

		const open = slots.filter((s) => allowed.includes(s.timeSlot));
		const largest = Math.max(0, ...open.map((s) => s.capacity));
		if (group.size > largest) {
			return `Zusage nicht möglich: "${group.members}" hat ${group.size} Mitglieder, aber im zugesagten Zeitslot fasst keine Rotationsgruppe so viele.`;
		}
	}

	// Groups pinned to a single time slot compete only with each other for it
	const perSlot = new Map<number, number>();
	for (const { groupId, maxRank } of guarantees) {
		const group = groups[groupId];
		const allowed = group ? allowedTimeSlots(group.choices, maxRank) : null;
		if (allowed === null || allowed.length !== 1) continue;
		perSlot.set(allowed[0], (perSlot.get(allowed[0]) ?? 0) + group.size);
	}
	for (const [timeSlot, students] of perSlot) {
		const capacity = slots
			.filter((s) => s.timeSlot === timeSlot)
			.reduce((sum, s) => sum + s.capacity, 0);
		if (students > capacity) {
			return `Zu viele Zusagen für Zeitslot ${timeSlot + 1}: ${students} Studierende, aber nur ${capacity} Plätze.`;
		}
	}

	return null;
}

/** Fold case, umlauts and stray spacing, so "Muller" finds "Müller". */
function foldName(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/ß/g, "ss")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Groups whose member list contains the query. The organizer knows a person's name, not
 * a group number, so this is the only sane way into a list of 46 anonymous rows.
 *
 * @param limit - Cap on results, because a short query matches almost everything
 */
export function findGroups(
	groups: Group[],
	query: string,
	limit = 8,
): Group[] {
	const needle = foldName(query);
	if (needle.length < 2) return [];
	return groups.filter((g) => foldName(g.members).includes(needle)).slice(0, limit);
}

/**
 * German summary of what the guarantees cost, or null when none were set. Names the
 * damage in groups and students rather than in objective points, which mean nothing to
 * the person reading it.
 */
export function guaranteeSummary(result: SolveResult): string | null {
	if (result.guaranteeCost === null) return null;
	const { displaced } = result;
	if (displaced.length === 0) {
		return "Die Zusagen kosten nichts. Niemand steht dadurch schlechter.";
	}
	const students = displaced.reduce((sum, d) => sum + d.size, 0);
	const groupWord = displaced.length === 1 ? "Gruppe" : "Gruppen";
	const steep = displaced.filter((d) => d.to - d.from >= 2).length;
	const tail =
		steep > 0
			? ` ${steep} davon ${steep === 1 ? "fällt" : "fallen"} um zwei Ränge.`
			: "";
	return `Die Zusagen kosten ${displaced.length} ${groupWord} mit ${students} Studierenden ihren Platz.${tail}`;
}

export interface TimeSlotView {
	/** 1-based number shown to the user */
	num: number;
	/** Rotation group range, e.g. "Gruppe 5–8" */
	label: string;
	/** Always slotsPerTimeSlot long; an unused rotation group stays in with no groups */
	rotationGroups: RotationGroupView[];
	studentCount: number;
}

/**
 * Regroup a solution by time slot and rotation group for display, annotating each group
 * with its rank. Slot ids are read positionally, the same way buildSlots lays them out.
 * Groups still carrying currentSelection -1 are left out.
 */
export function groupByTimeSlot(
	solution: Solution,
	numTimeSlots: number = NUM_TIME_SLOTS,
	slotsPerTimeSlot: number = SLOTS_PER_TIME_SLOT,
): TimeSlotView[] {
	return Array.from({ length: numTimeSlots }, (_, t) => {
		const rotationGroups = Array.from({ length: slotsPerTimeSlot }, (_, k) => {
			const slot = t * slotsPerTimeSlot + k;
			const groups = solution.groups
				.filter((g) => g.currentSelection === slot)
				.map((g) => ({ ...g, rank: rankOf(g.choices, t) }));
			return {
				num: slot + 1,
				groups,
				studentCount: groups.reduce((sum, g) => sum + g.size, 0),
				capacity: solution.occupancy[slot]?.capacity ?? 0,
			};
		});
		return {
			num: t + 1,
			label: `Gruppe ${t * slotsPerTimeSlot + 1}–${(t + 1) * slotsPerTimeSlot}`,
			rotationGroups,
			studentCount: rotationGroups.reduce((sum, rg) => sum + rg.studentCount, 0),
		};
	});
}

export interface GroupRow {
	members: string;
	/** 1-based number of the rotation group the group was assigned to */
	num: number;
	/** Rotation group the group was assigned to, e.g. "Gruppe 6" */
	label: string;
	/** Preference rank, index into SPREAD_LABELS */
	rank: number;
}

/**
 * Flatten a distribution to one row per group, ordered by rotation group. The row names the
 * single group the solver picked, not the range of four its time slot covers: the range is
 * how the form asks, the number is what the students end up in. The time slot itself stays
 * out, it is an internal index.
 */
export function groupRows(timeSlots: TimeSlotView[]): GroupRow[] {
	return timeSlots.flatMap((ts) =>
		ts.rotationGroups.flatMap((rg) =>
			rg.groups.map((g) => ({
				members: g.members,
				num: rg.num,
				label: `Gruppe ${rg.num}`,
				rank: g.rank,
			})),
		),
	);
}

/** Plain-text rendering of a distribution, for the copy-to-clipboard button. */
export function formatDistribution(rows: GroupRow[]): string {
	return rows
		.map((r) => `${r.members}: ${r.label} (${SPREAD_LABELS[r.rank]})`)
		.join("\n");
}

/**
 * What the solver could not promise about this distribution, or null when it promised
 * everything. Shown as a warning above the result list. Never claims success: a proven
 * optimum is the normal case and needs no announcement.
 */
export function solveCaveat(result: SolveResult): string | null {
	if (result.optimality === "suboptimal") {
		return "Es gibt eine bessere Verteilung. Der Solver hat sie in seinem Zeitlimit nicht gefunden.";
	}
	if (result.optimality === "unproven") {
		return "Diese Verteilung ist gültig, aber nicht als beste bewiesen. Die Prüfung lief in ihr Zeitlimit.";
	}
	if (!result.lotteryComplete) {
		return "Die Auslosung wurde nicht vollständig angewendet. Das Ergebnis ist gültig, lässt sich aber nicht allein aus dem Seed nachrechnen.";
	}
	return null;
}

/** Turn any solver or worker failure into a German message the organizer can act on. */
export function toUserMessage(e: unknown): string {
	const msg = e instanceof Error ? e.message : String(e);
	// Already plain German and already names what broke, so it goes through untouched
	if (msg.startsWith("Ungültige Verteilung")) return msg;
	if (msg.includes("Zeitüberschreitung")) return msg;
	// Checked before the infeasibility branch: a solve that ran out of time found nothing,
	// which says nothing about whether the capacities are enough
	if (msg.includes("Time limit reached")) {
		return "Die Berechnung hat zu lange gedauert. Versuch es nochmal.";
	}
	if (msg.includes("Infeasible") || msg.includes("feasible")) {
		return "Keine gültige Verteilung möglich. Prüf, ob die Kapazitäten ausreichen.";
	}
	return `Unbekannter Fehler. Bitte Seite neu laden und nochmal versuchen. (${msg})`;
}
