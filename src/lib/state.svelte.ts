import type { Group } from "./parser.js";
import { DEFAULT_CAPACITY, TOTAL_SLOTS } from "./config.js";
import { generateSeed } from "./lottery.js";
import { STEP_COUNT } from "./steps.js";

export const STORAGE_KEY = "verteiler";

/**
 * Bump whenever the persisted shape changes, so old data is discarded rather than
 * half-restored. Version 2 renumbered the steps: the flags still fit, but they would
 * describe the wrong steps.
 */
export const VERSION = 2;

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

	/**
	 * Seed for the tie-break lottery, published in the deadline message before the
	 * form closes. Additive field: older saved states simply draw a fresh one, so
	 * this needs no VERSION bump and does not discard a semester in progress.
	 */
	lotterySeed = $state(generateSeed());

	csvFileName = $state("");
	parsedGroups = $state<Group[] | null>(null);
	parseWarnings = $state<string[]>([]);

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
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const parsed = JSON.parse(saved);
					if (parsed.version !== VERSION) return;
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
						lotterySeed,
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
					if (
						capacities &&
						Array.isArray(capacities) &&
						capacities.length === TOTAL_SLOTS
					)
						this.capacities = capacities;
					if (csvFileName) this.csvFileName = csvFileName;
					if (parsedGroups) this.parsedGroups = parsedGroups;
					if (parseWarnings) this.parseWarnings = parseWarnings;
					if (lotterySeed) this.lotterySeed = lotterySeed;
				}
			} catch {}
		}

		$effect.root(() => {
			$effect(() => {
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
					lotterySeed,
				} = this;
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
						lotterySeed,
					}),
				);
			});
		});
	}

	/**
	 * Opens the next step after step i completes.
	 * @param i - Zero-based index of the completed step
	 */
	openNext = (i: number) => {
		if (i + 1 < this.open.length) this.open[i + 1] = true;
	};

	/** Clears all inputs and resets the workflow to the beginning. */
	reset = () => {
		this.link = "";
		this.datum = "";
		this.uhrzeit = "";
		this.open = freshOpen();
		this.done = freshDone();
		this.capacities = Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY);
		this.csvFileName = "";
		this.parsedGroups = null;
		this.parseWarnings = [];
		this.lotterySeed = generateSeed();
	};
}

export const state = new VerteilerState();
