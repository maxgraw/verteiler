import { describe, it, expect } from 'vitest';
import { parseChoices, buildSlots } from './parser';

const HEADER = 'Zeitstempel,E-Mail-Adresse,Gruppengröße,Mitglieder,1. Wahl,2. Wahl,3. Wahl';

function row(size: number, members: string, w1: string, w2: string, w3: string): string {
    return `01.01.2025 10:00:00,test@test.de,${size},"${members}",${w1},${w2},${w3}`;
}

function csv(...rows: string[]): string {
    return [HEADER, ...rows].join('\n');
}

// ─── parseChoices ─────────────────────────────────────────────────────────────

describe('parseChoices', () => {
    describe('fatal errors', () => {
        it('throws on empty input', () => {
            expect(() => parseChoices('')).toThrow();
        });

        it('throws on whitespace-only input', () => {
            expect(() => parseChoices('   \n  ')).toThrow();
        });

        it('throws on header only — no data rows', () => {
            expect(() => parseChoices(HEADER)).toThrow();
        });

        it('throws when header has fewer than 7 columns', () => {
            expect(() => parseChoices('a,b,c\n1,2,3')).toThrow();
        });

        it('throws when all data rows are invalid', () => {
            // size 9 is invalid → row is skipped → no valid groups → throw
            expect(() => parseChoices(csv(row(9, 'Test', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16')))).toThrow();
        });
    });

    describe('valid single row', () => {
        it('parses size, members and choices correctly', () => {
            const { groups, warnings } = parseChoices(
                csv(row(3, 'Anna Müller, Ben Schmidt, Clara Weber', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16')),
            );
            expect(groups).toHaveLength(1);
            expect(warnings).toHaveLength(0);
            expect(groups[0].size).toBe(3);
            expect(groups[0].members).toBe('Anna Müller, Ben Schmidt, Clara Weber');
            expect(groups[0].choices).toEqual([2, 1, 3]);
        });

        it('sets id to 0 for first row', () => {
            const { groups } = parseChoices(
                csv(row(1, 'Max', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12')),
            );
            expect(groups[0].id).toBe(0);
        });

        it('sets currentSelection to -1', () => {
            const { groups } = parseChoices(
                csv(row(1, 'Max', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12')),
            );
            expect(groups[0].currentSelection).toBe(-1);
        });
    });

    describe('multiple rows', () => {
        it('assigns sequential ids', () => {
            const { groups } = parseChoices(
                csv(
                    row(1, 'Anna', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12'),
                    row(1, 'Ben', 'Gruppe 5-8', 'Gruppe 1-4', 'Gruppe 9-12'),
                    row(1, 'Clara', 'Gruppe 9-12', 'Gruppe 1-4', 'Gruppe 5-8'),
                ),
            );
            expect(groups.map((g) => g.id)).toEqual([0, 1, 2]);
        });

        it('ids are re-indexed after skipped rows', () => {
            // row 1: invalid size → skipped; row 2: valid → id 0
            const { groups } = parseChoices(
                csv(
                    row(9, 'Bad', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16'),
                    row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12'),
                ),
            );
            expect(groups).toHaveLength(1);
            expect(groups[0].id).toBe(0);
        });
    });

    describe('choice value parsing', () => {
        it.each([
            ['Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12', 0],
            ['Gruppe 5-8', 'Gruppe 1-4', 'Gruppe 9-12', 1],
            ['Gruppe 9-12', 'Gruppe 1-4', 'Gruppe 5-8', 2],
            ['Gruppe 13-16', 'Gruppe 1-4', 'Gruppe 5-8', 3],
            ['Gruppe 17-20', 'Gruppe 1-4', 'Gruppe 5-8', 4],
            ['Gruppe 21-24', 'Gruppe 1-4', 'Gruppe 5-8', 5],
            ['Gruppe 25-28', 'Gruppe 1-4', 'Gruppe 5-8', 6],
            ['Gruppe 29-32', 'Gruppe 1-4', 'Gruppe 5-8', 7],
        ])('maps "%s" to timeslot %i', (w1, w2, w3, expected) => {
            const { groups } = parseChoices(csv(row(1, 'Test', w1, w2, w3)));
            expect(groups[0].choices[0]).toBe(expected);
        });

        it('maps "Egal" to -1', () => {
            const { groups } = parseChoices(csv(row(1, 'Test', 'Egal', 'Egal', 'Egal')));
            expect(groups[0].choices).toEqual([-1, -1, -1]);
        });

        it('allows mixed Egal and real choices', () => {
            const { groups } = parseChoices(
                csv(row(1, 'Test', 'Gruppe 9-12', 'Egal', 'Gruppe 5-8')),
            );
            expect(groups[0].choices).toEqual([2, -1, 1]);
        });

        it('parses all three choice positions independently', () => {
            const { groups } = parseChoices(
                csv(row(1, 'Test', 'Gruppe 1-4', 'Gruppe 13-16', 'Gruppe 29-32')),
            );
            expect(groups[0].choices).toEqual([0, 3, 7]);
        });
    });

    describe('warnings — rows skipped', () => {
        it('skips and warns on invalid group size (too large)', () => {
            const valid = row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12');
            const bad = row(7, 'Bad', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16');
            const { groups, warnings } = parseChoices(csv(bad, valid));
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Gruppengröße'))).toBe(true);
        });

        it('skips and warns on invalid group size (zero)', () => {
            const valid = row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12');
            const bad = row(0, 'Bad', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16');
            const { groups, warnings } = parseChoices(csv(bad, valid));
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Gruppengröße'))).toBe(true);
        });

        it('skips and warns on empty members field', () => {
            const valid = row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12');
            const bad = `01.01.2025 10:00:00,test@test.de,3,,Gruppe 9-12,Gruppe 5-8,Gruppe 13-16`;
            const { groups, warnings } = parseChoices(csv(bad, valid));
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Mitglied'))).toBe(true);
        });

        it('skips and warns on unrecognised choice value', () => {
            const valid = row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12');
            const bad = row(1, 'Bad', 'KeinGültigerWert', 'Gruppe 5-8', 'Gruppe 9-12');
            const { groups, warnings } = parseChoices(csv(bad, valid));
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Wahl'))).toBe(true);
        });

        it('skips and warns on a data row with too few columns', () => {
            const valid = row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12');
            const { groups, warnings } = parseChoices(`${HEADER}\na,b,c\n${valid}`);
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Spalten'))).toBe(true);
        });

        it('includes the row number in warnings', () => {
            const bad = row(9, 'Bad', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16');
            const good = row(1, 'Good', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12');
            const { warnings } = parseChoices(csv(bad, good));
            expect(warnings[0]).toMatch(/Zeile 2/);
        });
    });

    describe('warnings — rows kept', () => {
        it('warns but keeps row on member count mismatch', () => {
            // size says 3 but only 2 names given
            const { groups, warnings } = parseChoices(
                csv(row(3, 'Anna, Ben', 'Gruppe 9-12', 'Gruppe 5-8', 'Gruppe 13-16')),
            );
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Mitglied'))).toBe(true);
        });

        it('warns but keeps row on duplicate non-Egal timeslot preference', () => {
            const { groups, warnings } = parseChoices(
                csv(row(1, 'Test', 'Gruppe 9-12', 'Gruppe 9-12', 'Gruppe 5-8')),
            );
            expect(groups).toHaveLength(1);
            expect(warnings.some((w) => w.includes('Doppelte'))).toBe(true);
        });

        it('does not warn on all-Egal choices (no duplicates to detect)', () => {
            const { groups, warnings } = parseChoices(
                csv(row(1, 'Test', 'Egal', 'Egal', 'Egal')),
            );
            expect(groups).toHaveLength(1);
            expect(warnings).toHaveLength(0);
        });
    });

    describe('separator detection', () => {
        it('parses semicolon-separated CSV', () => {
            const semicolonCsv =
                'Zeitstempel;E-Mail-Adresse;Gruppengröße;Mitglieder;1. Wahl;2. Wahl;3. Wahl\n' +
                '01.01.2025 10:00:00;test@test.de;2;Anna, Ben;Gruppe 9-12;Gruppe 5-8;Gruppe 13-16';
            const { groups } = parseChoices(semicolonCsv);
            expect(groups).toHaveLength(1);
            expect(groups[0].choices[0]).toBe(2);
        });
    });

    describe('quoted fields', () => {
        it('handles member list with commas inside quotes', () => {
            const { groups } = parseChoices(
                `${HEADER}\n01.01.2025 10:00:00,test@test.de,3,"Anna Müller, Ben Schmidt, Clara Weber",Gruppe 9-12,Gruppe 5-8,Gruppe 13-16`,
            );
            expect(groups[0].members).toBe('Anna Müller, Ben Schmidt, Clara Weber');
            expect(groups[0].size).toBe(3);
        });

        it('handles escaped double quotes inside quoted field', () => {
            const { groups } = parseChoices(
                `${HEADER}\n01.01.2025 10:00:00,test@test.de,1,"Max ""der Große"" Müller",Gruppe 1-4,Gruppe 5-8,Gruppe 9-12`,
            );
            expect(groups[0].members).toBe('Max "der Große" Müller');
        });
    });

    describe('BOM and line endings', () => {
        it('strips UTF-8 BOM', () => {
            const withBom = '\uFEFF' + csv(row(1, 'Test', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12'));
            const { groups } = parseChoices(withBom);
            expect(groups).toHaveLength(1);
        });

        it('handles Windows CRLF line endings', () => {
            const crlfCsv = [
                HEADER,
                row(1, 'Test', 'Gruppe 1-4', 'Gruppe 5-8', 'Gruppe 9-12'),
            ].join('\r\n');
            const { groups } = parseChoices(crlfCsv);
            expect(groups).toHaveLength(1);
        });
    });
});

// ─── buildSlots ───────────────────────────────────────────────────────────────

describe('buildSlots', () => {
    it('throws when capacities length does not match numTimeSlots × slotsPerTimeSlot', () => {
        expect(() => buildSlots(8, 4, [6])).toThrow();
        expect(() => buildSlots(8, 4, Array(31).fill(6))).toThrow();
        expect(() => buildSlots(8, 4, Array(33).fill(6))).toThrow();
    });

    it('creates the correct total number of slots', () => {
        expect(buildSlots(8, 4, Array(32).fill(6))).toHaveLength(32);
        expect(buildSlots(2, 3, Array(6).fill(6))).toHaveLength(6);
    });

    it('assigns sequential ids starting from 0', () => {
        const slots = buildSlots(2, 2, [6, 6, 6, 6]);
        expect(slots.map((s) => s.id)).toEqual([0, 1, 2, 3]);
    });

    it('groups consecutive slots into the same timeSlot', () => {
        const slots = buildSlots(3, 2, Array(6).fill(6));
        expect(slots[0].timeSlot).toBe(0);
        expect(slots[1].timeSlot).toBe(0);
        expect(slots[2].timeSlot).toBe(1);
        expect(slots[3].timeSlot).toBe(1);
        expect(slots[4].timeSlot).toBe(2);
        expect(slots[5].timeSlot).toBe(2);
    });

    it('applies per-slot capacities in order', () => {
        const slots = buildSlots(2, 2, [1, 2, 3, 4]);
        expect(slots.map((s) => s.capacity)).toEqual([1, 2, 3, 4]);
    });

    it('initialises amount to 0 for all slots', () => {
        const slots = buildSlots(8, 4, Array(32).fill(6));
        expect(slots.every((s) => s.amount === 0)).toBe(true);
    });

    it('uses the full 8×4 config correctly', () => {
        const slots = buildSlots(8, 4, Array(32).fill(6));
        // slot 0–3 → timeSlot 0, slot 28–31 → timeSlot 7
        expect(slots[0].timeSlot).toBe(0);
        expect(slots[3].timeSlot).toBe(0);
        expect(slots[4].timeSlot).toBe(1);
        expect(slots[28].timeSlot).toBe(7);
        expect(slots[31].timeSlot).toBe(7);
    });
});
