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

const DONT_CARE_WORD = 'Egal';
const MIN_COLUMNS = 7;

function detectSeparator(firstLine: string): ',' | ';' {
    const commas = (firstLine.match(/,/g) ?? []).length;
    const semicolons = (firstLine.match(/;/g) ?? []).length;
    return semicolons > commas ? ';' : ',';
}

function parseCSVText(text: string): string[][] {
    const clean = text.replace(/^\uFEFF/, '');
    const lines = clean.split(/\r?\n/);
    const nonEmpty = lines.filter((l) => l.trim() !== '');
    if (nonEmpty.length === 0) return [];

    const sep = detectSeparator(nonEmpty[0]);
    const rows: string[][] = [];

    for (const line of nonEmpty) {
        const row: string[] = [];
        let inQuote = false;
        let cell = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (ch === sep && !inQuote) {
                row.push(cell.trim());
                cell = '';
            } else {
                cell += ch;
            }
        }
        row.push(cell.trim());
        rows.push(row);
    }

    return rows;
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
    return Math.floor(y / 4) - 1;
}

/**
 * Parse the Google Forms CSV export into groups and warnings.
 *
 * Expected columns (0-based):
 *   0: Timestamp
 *   1: Email
 *   2: Gruppengröße (1–6)
 *   3: Mitglieder
 *   4: 1. Wahl  ("Gruppe X-Y" or "Egal")
 *   5: 2. Wahl
 *   6: 3. Wahl
 *
 * @throws {Error} If the file is empty, has no data rows, or is missing required columns
 */
export function parseChoices(csvText: string): ParseResult {
    const records = parseCSVText(csvText);

    if (records.length === 0) {
        throw new Error('Die Datei ist leer.');
    }
    if (records.length < 2) {
        throw new Error(
            'Die CSV enthält nur eine Kopfzeile — es wurden keine Einträge gefunden.'
        );
    }
    if (records[0].length < MIN_COLUMNS) {
        throw new Error(
            `Ungültiges Format: Die Kopfzeile hat nur ${records[0].length} Spalten, erwartet werden mindestens ${MIN_COLUMNS}. ` +
                'Bitte prüfe, ob die richtige Google-Forms-CSV ausgewählt wurde.'
        );
    }

    const groups: Group[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < records.length; i++) {
        const row = records[i];
        const rowNum = i + 1;

        if (row.length < MIN_COLUMNS) {
            warnings.push(`Zeile ${rowNum}: Zu wenige Spalten (${row.length}) — Eintrag übersprungen.`);
            continue;
        }

        const size = parseInt(row[2], 10);
        if (isNaN(size) || size < 1 || size > 6) {
            warnings.push(`Zeile ${rowNum}: Ungültige Gruppengröße "${row[2]}" — Eintrag übersprungen.`);
            continue;
        }

        const members = row[3].trim();
        if (!members) {
            warnings.push(`Zeile ${rowNum}: Keine Mitgliedernamen angegeben — Eintrag übersprungen.`);
            continue;
        }

        const choices: number[] = [];
        let choiceError = false;
        for (let c = 0; c < 3; c++) {
            const parsed = parseChoiceCell(row[4 + c]);
            if (parsed === null) {
                warnings.push(
                    `Zeile ${rowNum}: Wahl ${c + 1} "${row[4 + c]}" konnte nicht gelesen werden — Eintrag übersprungen.`
                );
                choiceError = true;
                break;
            }
            choices.push(parsed);
        }
        if (choiceError) continue;

        groups.push({ id: groups.length, size, members, choices, currentSelection: -1 });
    }

    if (groups.length === 0) {
        throw new Error(
            'Es konnten keine gültigen Einträge gelesen werden. Bitte prüfe das Format der CSV-Datei.'
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
    capacities: number[]
): Slot[] {
    const total = numTimeSlots * slotsPerTimeSlot;
    if (capacities.length !== total) {
        throw new Error(`Erwartet ${total} Kapazitätswerte, erhalten: ${capacities.length}`);
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
