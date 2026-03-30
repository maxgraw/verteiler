import type { Group } from './parser.js';

const STORAGE_KEY = 'verteiler';

class VerteilerState {
    open = $state([true, false, false, false, false, false, false, false, false]);
    done = $state([false, false, false, false, false, false, false, false, false]);
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
                    const { link, datum, uhrzeit, open, done, csvFileName, parsedGroups, parseWarnings } = JSON.parse(saved);
                    if (link) this.link = link;
                    if (datum) this.datum = datum;
                    if (uhrzeit) this.uhrzeit = uhrzeit;
                    if (open) this.open = open.concat(Array(this.open.length).fill(false)).slice(0, this.open.length);
                    if (done) this.done = done.concat(Array(this.done.length).fill(false)).slice(0, this.done.length);
                    if (csvFileName) this.csvFileName = csvFileName;
                    if (parsedGroups) this.parsedGroups = parsedGroups;
                    if (parseWarnings) this.parseWarnings = parseWarnings;
                }
            } catch {}
        }

        $effect.root(() => {
            $effect(() => {
                const { link, datum, uhrzeit, open, done, csvFileName, parsedGroups, parseWarnings } = this;
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ link, datum, uhrzeit, open, done, csvFileName, parsedGroups, parseWarnings }));
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
        this.open = [true, false, false, false, false, false, false, false, false];
        this.done = [false, false, false, false, false, false, false, false, false];
        this.csvFileName = '';
        this.parsedGroups = null;
        this.parseWarnings = [];
    };
}

export const state = new VerteilerState();
