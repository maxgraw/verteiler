/** Number of time periods in the rotation plan. */
export const NUM_TIME_SLOTS = 8;

/** Parallel rotation groups per time period. */
export const SLOTS_PER_TIME_SLOT = 4;

/** Total assignable slots per semester. */
export const TOTAL_SLOTS = NUM_TIME_SLOTS * SLOTS_PER_TIME_SLOT;

/** Students per slot before KLIPS pre-registrations are subtracted. */
export const DEFAULT_CAPACITY = 6;
