import type { Guarantee } from "./algorithm/types";
import { NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT } from "./config";
import { buildSlots, type Group, type Slot } from "./parser";
import { allowedTimeSlots } from "./rank";
import type { SolveRequest } from "./solver-client";

export interface SolveInput {
	groups: Group[];
	/** One per slot, straight from the inputs. Cleared or invalid fields are fine. */
	capacities: number[];
	guarantees: Guarantee[];
	lotterySeed: string;
}

/**
 * Everything that happens between the organizer pressing the button and the worker
 * starting: clamp the capacities, build the slots and reject inputs that cannot work.
 * The input must be plain data, so snapshot runes state before passing it in.
 *
 * @returns The request for the worker, or a German error naming the problem. The checks
 *   only exist because the solver's own infeasibility error is not actionable.
 */
export function prepareSolve(
	input: SolveInput,
): { request: SolveRequest } | { error: string } {
	const capacities = sanitizeCapacities(input.capacities);
	const capacityError = checkCapacity(input.groups, capacities);
	if (capacityError) return { error: capacityError };

	const slots = buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, capacities);
	const guaranteeError = checkGuarantees(input.groups, slots, input.guarantees);
	if (guaranteeError) return { error: guaranteeError };

	return {
		request: {
			groups: input.groups,
			slots,
			lotterySeed: input.lotterySeed,
			guarantees: input.guarantees,
		},
	};
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
		if (!group)
			return "Eine Zusage zeigt auf eine Gruppe, die es nicht mehr gibt.";

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
