import type { Group } from "./parser.js";
import type { Guarantee } from "./algorithm/types.js";
import { DEFAULT_CAPACITY, TOTAL_SLOTS } from "./config.js";
import { STEP_COUNT } from "./steps.js";

export const STORAGE_KEY = "verteiler";

/**
 * Bump whenever the persisted shape changes, so old data is discarded rather than
 * half-restored. Version 2 renumbered the steps: the flags still fit, but they would
 * describe the wrong steps. Version 3 inserted formsClose, shifting everything after it.
 * Version 4 dropped the announce step, shifting everything after it.
 */
export const VERSION = 4;

/** Fields are optional because a stored payload is untrusted input, not a guarantee. */
interface SavedState {
	version?: number;
	link?: string;
	datum?: string;
	uhrzeit?: string;
	open?: boolean[];
	done?: boolean[];
	csvFileName?: string;
	parsedGroups?: Group[] | null;
	parseWarnings?: string[];
	capacities?: number[];
	guarantees?: Guarantee[];
}

/** Only the first step starts open, the rest unfold as the organizer works through them. */
const freshOpen = (): boolean[] => [
	true,
	...Array<boolean>(STEP_COUNT - 1).fill(false),
];
const freshDone = (): boolean[] => Array<boolean>(STEP_COUNT).fill(false);

/** Exported for tests. Application code uses the `state` singleton below. */
export class VerteilerState {
	open = $state(freshOpen());
	done = $state(freshDone());
	capacities = $state<number[]>(Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY));
	link = $state("");
	datum = $state("");
	uhrzeit = $state("");

	csvFileName = $state("");
	parsedGroups = $state<Group[] | null>(null);
	parseWarnings = $state<string[]>([]);

	/**
	 * Groups pinned to a rank by hand. Indices point into parsedGroups, so a new upload
	 * clears them: the same index would mean a different group. Additive field, so an
	 * older saved state simply has none and needs no VERSION bump.
	 */
	guarantees = $state<Guarantee[]>([]);

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

	constructor() {
		if (typeof localStorage !== "undefined") {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					const parsed: SavedState | null = JSON.parse(saved);
					if (parsed?.version === VERSION) this.#restore(parsed);
					else this.outdated = true;
				} catch {
					this.outdated = true;
				}
			}
		}

		$effect.root(() => {
			$effect(() => {
				const {
					outdated,
					link,
					datum,
					uhrzeit,
					open,
					done,
					csvFileName,
					parsedGroups,
					parseWarnings,
					capacities,
					guarantees,
				} = this;
				if (outdated) return;
				localStorage.setItem(
					STORAGE_KEY,
					JSON.stringify({
						version: VERSION,
						link,
						datum,
						uhrzeit,
						open,
						done,
						csvFileName,
						parsedGroups,
						parseWarnings,
						capacities,
							guarantees,
					}),
				);
			});
		});
	}

	/** Applies a payload already confirmed to carry the current VERSION. */
	#restore(parsed: SavedState) {
		const {
			link,
			datum,
			uhrzeit,
			open,
			done,
			csvFileName,
			parsedGroups,
			parseWarnings,
			capacities,
			guarantees,
		} = parsed;
		if (link) this.link = link;
		if (datum) this.datum = datum;
		if (uhrzeit) this.uhrzeit = uhrzeit;
		if (open)
			this.open = open
				.concat(Array(this.open.length).fill(false))
				.slice(0, this.open.length);
		if (done)
			this.done = done
				.concat(Array(this.done.length).fill(false))
				.slice(0, this.done.length);
		if (capacities && Array.isArray(capacities) && capacities.length === TOTAL_SLOTS)
			this.capacities = capacities;
		if (csvFileName) this.csvFileName = csvFileName;
		if (parsedGroups) this.parsedGroups = parsedGroups;
		if (parseWarnings) this.parseWarnings = parseWarnings;
		if (guarantees && Array.isArray(guarantees)) this.guarantees = guarantees;
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
		this.link = "";
		this.datum = "";
		this.uhrzeit = "";
		this.open = freshOpen();
		this.done = freshDone();
		this.capacities = Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY);
		this.csvFileName = "";
		this.parsedGroups = null;
		this.parseWarnings = [];
		this.guarantees = [];
	};
}

export const state = new VerteilerState();
