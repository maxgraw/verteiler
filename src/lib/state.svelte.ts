import type { Group } from './parser.js';
import { DEFAULT_CAPACITY, TOTAL_SLOTS } from './config.js';

export const STORAGE_KEY = 'verteiler';

/** Bump whenever the persisted shape changes, so old data is discarded rather than half-restored. */
export const VERSION = 1;

/** Exported for tests. Application code uses the `state` singleton below. */
export class VerteilerState {
    open = $state([true, false, false, false, false, false, false, false, false, false]);
    done = $state([false, false, false, false, false, false, false, false, false, false]);
    capacities = $state<number[]>(Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY));
    link = $state('');
    datum = $state('');
    uhrzeit = $state('');

    csvFileName = $state('');
    parsedGroups = $state<Group[] | null>(null);
    parseWarnings = $state<string[]>([]);

    readonly tag = $derived(
        this.datum
            ? new Date(`${this.datum}T12:00`).toLocaleDateString('de-DE', { weekday: 'long' })
            : '',
    );

    readonly formattedDatum = $derived(
        this.datum ? this.datum.split('-').reverse().join('.') : '',
    );

    readonly deadlineComplete = $derived(!!this.datum && !!this.uhrzeit);

    constructor() {
        if (typeof localStorage !== 'undefined') {
            try {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.version !== VERSION) return;
                    const { link, datum, uhrzeit, open, done, csvFileName, parsedGroups, parseWarnings, capacities } = parsed;
                    if (link) this.link = link;
                    if (datum) this.datum = datum;
                    if (uhrzeit) this.uhrzeit = uhrzeit;
                    if (open) this.open = open.concat(Array(this.open.length).fill(false)).slice(0, this.open.length);
                    if (done) this.done = done.concat(Array(this.done.length).fill(false)).slice(0, this.done.length);
                    if (capacities && Array.isArray(capacities) && capacities.length === TOTAL_SLOTS) this.capacities = capacities;
                    if (csvFileName) this.csvFileName = csvFileName;
                    if (parsedGroups) this.parsedGroups = parsedGroups;
                    if (parseWarnings) this.parseWarnings = parseWarnings;
                }
            } catch {}
        }

        $effect.root(() => {
            $effect(() => {
                const { link, datum, uhrzeit, open, done, csvFileName, parsedGroups, parseWarnings, capacities } = this;
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, link, datum, uhrzeit, open, done, csvFileName, parsedGroups, parseWarnings, capacities }));
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
        this.link = '';
        this.datum = '';
        this.uhrzeit = '';
        this.open = [true, false, false, false, false, false, false, false, false, false];
        this.done = [false, false, false, false, false, false, false, false, false, false];
        this.capacities = Array(TOTAL_SLOTS).fill(DEFAULT_CAPACITY);
        this.csvFileName = '';
        this.parsedGroups = null;
        this.parseWarnings = [];
    };
}

export const state = new VerteilerState();
