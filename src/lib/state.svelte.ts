import type { Guarantee } from "./algorithm/types.js";
import { DEFAULT_CAPACITY, TOTAL_SLOTS } from "./config.js";
import { seedFromGroups } from "./lottery.js";
import { type Group, parseChoices } from "./parser.js";
import { STEP_COUNT } from "./steps.js";

export const STORAGE_KEY = "verteiler";

/**
 * Bump whenever the persisted shape changes, so old data is discarded rather than
 * half-restored. Version 2 renumbered the steps: the flags still fit, but they would
 * describe the wrong steps. Version 3 inserted formsClose, shifting everything after it.
 * Version 4 dropped the announce step, shifting everything after it.
 */
export const VERSION = 4;

/**
 * Every persisted field with its value on a fresh start. The single list that persist,
 * restore and reset all derive from, so a new field is one entry here plus its $state
 * declaration on the class.
 */
function defaults() {
	return {
		link: "",
		datum: "",
		uhrzeit: "",
		/** Only the first step starts open, the rest unfold as the organizer works through them. */
		open: [true, ...Array<boolean>(STEP_COUNT - 1).fill(false)],
		done: Array<boolean>(STEP_COUNT).fill(false),
		capacities: Array<number>(TOTAL_SLOTS).fill(DEFAULT_CAPACITY),
		csvFileName: "",
		parsedGroups: null as Group[] | null,
		parseWarnings: [] as string[],
		guarantees: [] as Guarantee[],
	};
}

type Persisted = ReturnType<typeof defaults>;

const PERSISTED = Object.keys(defaults()) as (keyof Persisted)[];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A stored value only replaces a default of the same kind. This is a cheap guard against
 * hand-edited or foreign storage, not a full validation of the contents.
 */
function sameKind(value: unknown, fallback: unknown): boolean {
	// parsedGroups defaults to null, but only a stored array is worth restoring
	if (fallback === null || Array.isArray(fallback)) return Array.isArray(value);
	return typeof value === typeof fallback;
}

/** Pads with false or truncates, so a stored flag list survives steps being appended. */
function fitFlags(flags: boolean[], length: number): boolean[] {
	return flags.concat(Array(length).fill(false)).slice(0, length);
}

/** Exported for tests. Application code uses the `state` singleton below. */
export class VerteilerState {
	#fresh = defaults();

	open = $state(this.#fresh.open);
	done = $state(this.#fresh.done);
	capacities = $state(this.#fresh.capacities);
	link = $state(this.#fresh.link);
	datum = $state(this.#fresh.datum);
	uhrzeit = $state(this.#fresh.uhrzeit);

	csvFileName = $state(this.#fresh.csvFileName);
	parsedGroups = $state(this.#fresh.parsedGroups);
	parseWarnings = $state(this.#fresh.parseWarnings);

	/**
	 * Groups pinned to a rank by hand. Indices point into parsedGroups, so a new upload
	 * clears them: the same index would mean a different group. Additive field, so an
	 * older saved state simply has none and needs no VERSION bump.
	 */
	guarantees = $state(this.#fresh.guarantees);

	/**
	 * True when localStorage holds a payload this build cannot use, either written by a
	 * different VERSION or no longer parseable. Persistence stays off while this is set,
	 * so the old payload survives until the organizer has seen the warning and reset.
	 */
	outdated = $state(false);

	readonly tag = $derived(
		this.datum
			? new Date(`${this.datum}T12:00`).toLocaleDateString("de-DE", {
					weekday: "long",
				})
			: "",
	);

	readonly formattedDatum = $derived(
		this.datum ? this.datum.split("-").reverse().join(".") : "",
	);

	readonly deadlineComplete = $derived(!!this.datum && !!this.uhrzeit);

	/**
	 * The draw for this cohort. Derived from the applications rather than stored, so two
	 * browsers never disagree about which of the equally optimal distributions comes out.
	 * Empty until a CSV is loaded, and solve treats that as no tie-break at all.
	 */
	readonly lotterySeed = $derived(
		this.parsedGroups
			? seedFromGroups(this.parsedGroups.map((g) => g.members))
			: "",
	);

	constructor() {
		if (typeof localStorage !== "undefined") {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed: unknown = JSON.parse(saved);
					if (isRecord(parsed) && parsed.version === VERSION)
						this.#restore(parsed);
					else this.outdated = true;
				} catch {
					this.outdated = true;
				}
			}
		}

		$effect.root(() => {
			$effect(() => {
				if (this.outdated) return;
				const payload: Record<string, unknown> = { version: VERSION };
				for (const key of PERSISTED) payload[key] = this[key];
				localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
			});
		});
	}

	/** Applies a payload already confirmed to carry the current VERSION. */
	#restore(saved: Record<string, unknown>) {
		const fresh = defaults();
		const accepted: Partial<Persisted> = {};
		for (const key of PERSISTED) {
			if (sameKind(saved[key], fresh[key]))
				Object.assign(accepted, { [key]: saved[key] });
		}
		if (accepted.open) accepted.open = fitFlags(accepted.open, STEP_COUNT);
		if (accepted.done) accepted.done = fitFlags(accepted.done, STEP_COUNT);
		if (accepted.capacities?.length !== TOTAL_SLOTS) delete accepted.capacities;
		Object.assign(this, accepted);
	}

	/**
	 * Opens the next step after step i completes.
	 * @param i - Zero-based index of the completed step
	 */
	openNext = (i: number) => {
		if (i + 1 < this.open.length) this.open[i + 1] = true;
	};

	/**
	 * Clears all inputs and resets the workflow to the beginning. Also the only way out of
	 * an outdated save: the stored payload is dropped and the persistence effect writes a
	 * fresh one in the current shape. Nothing is migrated.
	 */
	reset = () => {
		if (typeof localStorage !== "undefined")
			localStorage.removeItem(STORAGE_KEY);
		this.outdated = false;
		Object.assign(this, defaults());
	};

	/**
	 * Replaces the uploaded CSV with a newly parsed one. The previous CSV is cleared first,
	 * so a failed parse leaves nothing behind.
	 * @throws Error with a German message when the file cannot be parsed
	 */
	loadCsv = (fileName: string, text: string) => {
		this.clearCsv();
		const { groups, warnings } = parseChoices(text);
		this.csvFileName = fileName;
		this.parsedGroups = groups;
		this.parseWarnings = warnings;
	};

	/** Guarantees go with the CSV: their indices would mean other groups in the next file. */
	clearCsv = () => {
		this.csvFileName = "";
		this.parsedGroups = null;
		this.parseWarnings = [];
		this.guarantees = [];
	};

	setAllCapacities = (capacity: number) => {
		this.capacities = Array(TOTAL_SLOTS).fill(capacity);
	};
}

export const state = new VerteilerState();
