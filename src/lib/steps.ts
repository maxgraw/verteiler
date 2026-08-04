/**
 * Zero-based position of every step in the wizard. This is the only place the order is
 * written down: step components pass these to WizardStep, and copy that points at another
 * step derives its 1-based number from the same value, so renumbering stays a one-file edit.
 *
 * The order follows the three phases the organizer works in: prepare the form in Google,
 * talk to the semester, then evaluate the answers after the deadline.
 */
export const STEPS = {
	formsCopy: 0,
	deadline: 1,
	formsUrl: 2,
	formsClose: 3,
	deadlineMessage: 4,
	reminder: 5,
	formsExport: 6,
	csvUpload: 7,
	capacities: 8,
	algorithm: 9,
} as const;

/** Length of state.open and state.done. */
export const STEP_COUNT = Object.keys(STEPS).length;
