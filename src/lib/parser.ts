import { NUM_TIME_SLOTS } from "./config";

export interface Slot {
	/** Unique index of this slot */
	id: number;
	/** Time period index (0-based); multiple slots share the same timeSlot */
	timeSlot: number;
	/** Max number of students */
	capacity: number;
	/** Current occupancy */
	amount: number;
}

export interface Group {
	/** Index of this group */
	id: number;
	/** Number of members */
	size: number;
	/** Names of members */
	members: string;
	/** 3 time slot preferences (0-based); -1 = don't care */
	choices: number[];
	/** Index into slots array; -1 = unassigned */
	currentSelection: number;
}

export interface ParseResult {
	groups: Group[];
	warnings: string[];
}

const DONT_CARE_WORD = "Egal";

/** Column positions parseChoices reads, resolved from the header row. */
interface Layout {
	size: number;
	members: number;
	/** Columns of the three choices, ranked by their position in the export */
	choices: number[];
}

/**
 * Resolve the columns by header text instead of by position. Google Forms only exports the
 * E-Mail column when the form asks for addresses, so the same form yields a 6 or 7 column
 * export, and the wording of the questions differs between form copies.
 */
function detectLayout(header: string[]): Layout | null {
	// Auswahl does not match: \b requires a non-word character before Wahl.
	const choices = header.flatMap((h, i) => (/\bwahl\b/i.test(h) ? [i] : []));
	if (choices.length !== 3) return null;

	// Resolved before members, because "Anzahl Gruppenmitglieder" matches both patterns.
	const size = header.findIndex(
		(h, i) => !choices.includes(i) && /anzahl|größe|grösse|groesse/i.test(h),
	);
	if (size === -1) return null;

	const members = header.findIndex(
		(h, i) => i !== size && !choices.includes(i) && /name|mitglied/i.test(h),
	);
	if (members === -1) return null;

	return { size, members, choices };
}

/**
 * Above this many groups the organizer almost certainly picked the wrong export.
 * Only warned about, never rejected: an unusually large semester is possible.
 */
const IMPLAUSIBLE_GROUP_COUNT = 80;

function detectSeparator(firstLine: string): "," | ";" {
	const commas = (firstLine.match(/,/g) ?? []).length;
	const semicolons = (firstLine.match(/;/g) ?? []).length;
	return semicolons > commas ? ";" : ",";
}

/**
 * Split CSV text into rows of trimmed cells.
 *
 * Scans the whole text rather than splitting on newlines first, so a quoted
 * field may span multiple lines. Google Forms produces those whenever someone
 * types the member names one per line. Blank rows are dropped.
 */
function parseCSVText(text: string): string[][] {
	const clean = text.replace(/^\uFEFF/, "");
	const firstLine = clean.split(/\r?\n/).find((l) => l.trim() !== "");
	if (firstLine === undefined) return [];

	const sep = detectSeparator(firstLine);
	const rows: string[][] = [];

	let row: string[] = [];
	let cell = "";
	let inQuote = false;

	for (let i = 0; i < clean.length; i++) {
		const ch = clean[i];

		if (ch === '"') {
			if (inQuote && clean[i + 1] === '"') {
				cell += '"';
				i++;
			} else {
				inQuote = !inQuote;
			}
		} else if (ch === sep && !inQuote) {
			row.push(cell.trim());
			cell = "";
		} else if ((ch === "\n" || ch === "\r") && !inQuote) {
			if (ch === "\r" && clean[i + 1] === "\n") i++;
			row.push(cell.trim());
			rows.push(row);
			row = [];
			cell = "";
		} else {
			cell += ch;
		}
	}

	row.push(cell.trim());
	rows.push(row);

	return rows.filter((r) => r.some((c) => c !== ""));
}

/**
 * Parse a single choice cell value into a 0-based time slot index.
 * "Gruppe X-Y" → Math.floor(Y / 4) - 1
 * "Egal"       → -1
 */
function parseChoiceCell(cell: string): number | null {
	const trimmed = cell.trim();
	if (trimmed === DONT_CARE_WORD) return -1;
	const match = trimmed.match(/-(\d+)$/);
	if (!match) return null;
	const y = parseInt(match[1], 10);
	const timeSlot = Math.floor(y / 4) - 1;
	if (timeSlot < 0 || timeSlot >= NUM_TIME_SLOTS) return null;
	return timeSlot;
}

/**
 * Parse the Google Forms CSV export into groups and warnings.
 *
 * The header names the columns: a group size, the member names and three ranked choices,
 * each "Gruppe X-Y" or "Egal". Every other column, timestamp and E-Mail among them, is
 * ignored.
 *
 * @throws {Error} If the file is empty, has no data rows, or is missing required columns
 */
export function parseChoices(csvText: string): ParseResult {
	const records = parseCSVText(csvText);

	if (records.length === 0) {
		throw new Error("Die Datei ist leer.");
	}
	if (records.length < 2) {
		throw new Error(
			"Die CSV enthält nur eine Kopfzeile, aber keine Einträge.",
		);
	}
	const layout = detectLayout(records[0]);
	if (!layout) {
		throw new Error(
			"Ungültiges Format: In der Kopfzeile fehlen Spalten. " +
				"Erwartet werden Gruppengröße, Mitglieder und 1., 2. und 3. Wahl. " +
				"Ist das die richtige CSV?",
		);
	}
	const columnsNeeded =
		Math.max(layout.size, layout.members, ...layout.choices) + 1;

	const groups: Group[] = [];
	const warnings: string[] = [];

	for (let i = 1; i < records.length; i++) {
		const row = records[i];
		const rowNum = i + 1;

		if (row.length < columnsNeeded) {
			warnings.push(
				`Zeile ${rowNum}: Nur ${row.length} Spalten. Eintrag übersprungen.`,
			);
			continue;
		}

		const size = parseInt(row[layout.size], 10);
		if (isNaN(size) || size < 1 || size > 6) {
			warnings.push(
				`Zeile ${rowNum}: Ungültige Gruppengröße "${row[layout.size]}". Eintrag übersprungen.`,
			);
			continue;
		}

		// Names may be comma- or newline-separated depending on how the form was filled in
		const memberNames = row[layout.members]
			.split(/[,\r\n]+/)
			.map((m) => m.trim())
			.filter(Boolean);
		const members = memberNames.join(", ");
		if (!members) {
			warnings.push(
				`Zeile ${rowNum}: Keine Namen angegeben. Eintrag übersprungen.`,
			);
			continue;
		}

		const choices: number[] = [];
		let choiceError = false;
		for (let c = 0; c < 3; c++) {
			const cell = row[layout.choices[c]];
			const parsed = parseChoiceCell(cell);
			if (parsed === null) {
				warnings.push(
					`Zeile ${rowNum}: Wahl ${c + 1} "${cell}" nicht lesbar. Eintrag übersprungen.`,
				);
				choiceError = true;
				break;
			}
			choices.push(parsed);
		}
		if (choiceError) continue;

		const uniqueSlots = new Set(choices.filter((c) => c !== -1));
		if (uniqueSlots.size < choices.filter((c) => c !== -1).length) {
			warnings.push(
				`Zeile ${rowNum}: Doppelte Zeitslot-Wahl. Eintrag trotzdem übernommen.`,
			);
		}

		if (memberNames.length !== size) {
			const label = memberNames.length === 1 ? "Mitglied" : "Mitglieder";
			warnings.push(
				`Zeile ${rowNum}: Gruppengröße ${size}, aber ${memberNames.length} ${label} angegeben. ` +
					`Gerechnet wird mit ${size} Plätzen.`,
			);
		}

		groups.push({
			id: groups.length,
			size,
			members,
			choices,
			currentSelection: -1,
		});
	}

	if (groups.length === 0) {
		throw new Error(
			"Es konnten keine gültigen Einträge gelesen werden. Bitte prüfe das Format der CSV-Datei.",
		);
	}

	// Goes first: it questions the file as a whole, so it outranks the per-row notes.
	if (groups.length > IMPLAUSIBLE_GROUP_COUNT) {
		warnings.unshift(
			`Ungewöhnlich viele Gruppen (${groups.length}). Ist das die richtige Datei?`,
		);
	}

	return { groups, warnings };
}

/**
 * Build a slot array from per-slot capacities.
 * @param capacities - One value per slot; length must equal numTimeSlots * slotsPerTimeSlot
 */
export function buildSlots(
	numTimeSlots: number,
	slotsPerTimeSlot: number,
	capacities: number[],
): Slot[] {
	const total = numTimeSlots * slotsPerTimeSlot;
	if (capacities.length !== total) {
		throw new Error(
			`Erwartet ${total} Kapazitätswerte, erhalten: ${capacities.length}`,
		);
	}
	const slots: Slot[] = [];
	let id = 0;
	for (let t = 0; t < numTimeSlots; t++) {
		for (let s = 0; s < slotsPerTimeSlot; s++) {
			slots.push({ id, timeSlot: t, capacity: capacities[id], amount: 0 });
			id++;
		}
	}
	return slots;
}
