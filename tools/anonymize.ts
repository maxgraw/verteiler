/**
 * Turn a real Google Forms export into a fixture that is safe to commit.
 *
 * Member names become "Person N", numbered in order of appearance, and E-Mail addresses
 * become personN@example.com. Timestamps keep only their date. Everything the parser
 * cares about survives byte for byte: separators, stray spaces, leading line breaks, the
 * number of names per cell, sizes and choices. Those quirks are what make a real export
 * worth testing against, so the output keeps them.
 *
 * Aborts without writing if any original name or address still appears in the output.
 *
 * Usage: bun run tools/anonymize.ts <real.csv> <tests/fixtures/semester_YYYY.csv>
 */
import { readFileSync, writeFileSync } from "node:fs";
import { detectLayout, detectSeparator, splitCsv } from "../src/lib/parser";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
	console.error("Usage: bun run tools/anonymize.ts <real.csv> <fixture.csv>");
	process.exit(2);
}

// Google Forms quotes every cell, so writing them all quoted reproduces its format
function writeCsv(rows: string[][], sep: string): string {
	return rows
		.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(sep))
		.join("\n")
		.concat("\n");
}

const raw = readFileSync(input, "utf8");
const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
const text = raw.slice(bom.length);
const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
const sep = detectSeparator(firstLine);

// Raw cells, not parseChoices: the whitespace it trims is part of what the fixture keeps
const [header, ...body] = splitCsv(text, sep);

const memberCol = detectLayout(header)?.members ?? -1;
const mailCol = header.findIndex((h) => /mail/i.test(h));
const timeCol = header.findIndex((h) => /zeitstempel|timestamp/i.test(h));

if (memberCol === -1) {
	console.error("Header not recognized, no member column found.");
	process.exit(1);
}

const names: string[] = [];
const mails: string[] = [];
let person = 0;

const anonymized = body.map((row, r) =>
	row.map((cell, c) => {
		if (c === memberCol) {
			// Replace each name but keep the separators and whitespace around it
			return cell.replace(/[^,\r\n]+/g, (token) => {
				const name = token.trim();
				if (!name) return token;
				names.push(name);
				const lead = token.slice(0, token.indexOf(name));
				const trail = token.slice(token.indexOf(name) + name.length);
				return `${lead}Person ${++person}${trail}`;
			});
		}
		if (c === mailCol && cell.trim()) {
			mails.push(cell.trim().toLowerCase());
			return `person${r + 1}@example.com`;
		}
		if (c === timeCol) return cell.split(" ")[0];
		return cell;
	}),
);

const result = bom + writeCsv([header, ...anonymized], sep);

// Whole words only, so short surnames do not trip over "Egal" or the header
const resultBody = writeCsv(anonymized, sep).toLowerCase();
const leaked = new Set<string>(mails.filter((m) => resultBody.includes(m)));
for (const name of names) {
	for (const word of name.split(/\s+/)) {
		if (word.length < 3) continue;
		const escaped = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		if (
			new RegExp(`(^|[^\\p{L}])${escaped}($|[^\\p{L}])`, "u").test(resultBody)
		)
			leaked.add(word);
	}
}
if (leaked.size > 0) {
	console.error(
		`Still in the output, nothing written: ${[...leaked].join(", ")}`,
	);
	process.exit(1);
}

writeFileSync(output, result);
console.error(
	`${body.length} rows, ${person} names replaced, written to ${output}`,
);
