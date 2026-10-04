import type { Solution, SolveResult } from "./algorithm/types";
import { NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT } from "./config";
import type { Group } from "./parser";
import { rankOf, SPREAD_LABELS } from "./rank";

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
 * Unassigned groups are left out.
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
				.filter((_, i) => solution.assignment[i] === slot)
				.map((g) => ({ ...g, rank: rankOf(g.choices, t) }));
			return {
				num: slot + 1,
				groups,
				studentCount: groups.reduce((sum, g) => sum + g.size, 0),
				capacity: solution.slots[slot]?.capacity ?? 0,
			};
		});
		return {
			num: t + 1,
			label: `Gruppe ${t * slotsPerTimeSlot + 1}–${(t + 1) * slotsPerTimeSlot}`,
			rotationGroups,
			studentCount: rotationGroups.reduce(
				(sum, rg) => sum + rg.studentCount,
				0,
			),
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
