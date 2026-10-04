import type { Guarantee } from "./algorithm/types";
import { NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT } from "./config";
import {
	checkCapacity,
	checkGuarantees,
	sanitizeCapacities,
} from "./distribution";
import { buildSlots, type Group } from "./parser";
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
