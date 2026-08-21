import type { GroupRow } from "./distribution";
import { SPREAD_LABELS } from "./distribution";

export const PDF_FILE_NAME = "rotationsgruppen-verteilung.pdf";

const TITLE = "Verteilung der Rotationsgruppen";

const MARGIN = 40;

/** Mirrors the --color-text, -text-muted and -border tokens in app.css. */
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [82, 82, 91];
const RULE: [number, number, number] = [228, 228, 231];

/** Mirrors --color-choice-1, -2, -3 and -0, indexed like SPREAD_LABELS. */
const RANK_COLORS: [number, number, number][] = [
	[22, 163, 74],
	[202, 138, 4],
	[234, 88, 12],
	[220, 38, 38],
];

/** Shared by both tables: no frame, no zebra, one hairline under each row. */
const TABLE_STYLE = {
	margin: { left: MARGIN, right: MARGIN, bottom: 56 },
	theme: "plain" as const,
	styles: {
		fontSize: 9,
		cellPadding: { top: 5, right: 8, bottom: 5, left: 0 },
		textColor: INK,
		lineColor: RULE,
		lineWidth: { top: 0, right: 0, bottom: 0.5, left: 0 },
	},
	headStyles: {
		fontStyle: "bold" as const,
		textColor: MUTED,
		fontSize: 8,
		lineWidth: { top: 0, right: 0, bottom: 1, left: 0 },
		lineColor: MUTED,
	},
};

/**
 * One row per rotation group: the number once, its members below each other. Several
 * applicant groups can share a rotation group, and on paper the reader wants the group
 * they walk into, not who applied together.
 */
export interface RotationRow {
	/** 1-based rotation group number */
	num: number;
	/** Member lists of the applicant groups sharing this rotation group, in solver order */
	members: string[];
}

/** Fold the per-group rows into one entry per rotation group, keeping their order. */
export function rotationRows(rows: GroupRow[]): RotationRow[] {
	const out: RotationRow[] = [];
	for (const row of rows) {
		const last = out[out.length - 1];
		if (last && last.num === row.num) last.members.push(row.members);
		else out.push({ num: row.num, members: [row.members] });
	}
	return out;
}

/**
 * Header and body of the result table. The rank each group got is left out: the spread
 * above already says how the wishes worked out, and per group it only invites comparison.
 */
export function distributionTable(rows: GroupRow[]): {
	head: string[];
	body: string[][];
} {
	return {
		head: ["Rotationsgruppe", "Namen"],
		body: rotationRows(rows).map((r) => [
			String(r.num),
			r.members.join("\n"),
		]),
	};
}

export function summaryLine(rows: GroupRow[], studentCount: number): string {
	const count = rotationRows(rows).length;
	const groupWord = count === 1 ? "Rotationsgruppe" : "Rotationsgruppen";
	return `${count} ${groupWord}, ${studentCount} Studierende`;
}

/**
 * One row per rank, mirroring the spread cards above the result list: how many groups got
 * that rank and how many students that is. Empty ranks stay in, a zero says as much as a
 * count.
 *
 * @param spread - Groups per rank, four buckets
 * @param studentSpread - Students per rank, same four buckets
 */
export function spreadTable(
	spread: number[],
	studentSpread: number[],
): { head: string[]; body: string[][] } {
	return {
		head: ["Wahl", "Gruppen", "Studierende"],
		body: SPREAD_LABELS.map((label, i) => [
			label,
			String(spread[i] ?? 0),
			String(studentSpread[i] ?? 0),
		]),
	};
}

/**
 * Build the result PDF and hand it to the browser as a download.
 *
 * jsPDF is imported on demand: it is by far the largest dependency and only the last step
 * needs it. The built-in Helvetica is WinAnsi encoded, which covers umlauts, ß and the en
 * dash in the slot labels, so no font has to be embedded.
 */
export async function downloadDistributionPdf(
	rows: GroupRow[],
	spread: number[],
	studentSpread: number[],
): Promise<void> {
	const [{ jsPDF }, { default: autoTable }] = await Promise.all([
		import("jspdf"),
		import("jspdf-autotable"),
	]);

	const studentCount = studentSpread.reduce((sum, n) => sum + n, 0);

	// compress keeps the file at a few KB: autoTable writes one verbose draw call per cell
	const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();

	doc.setFont("helvetica", "bold");
	doc.setFontSize(17);
	doc.setTextColor(...INK);
	doc.text(TITLE, MARGIN, 56);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(10);
	doc.setTextColor(...MUTED);
	doc.text(summaryLine(rows, studentCount), MARGIN, 74);

	doc.setDrawColor(...RULE);
	doc.setLineWidth(0.5);
	doc.line(MARGIN, 88, pageWidth - MARGIN, 88);

	const spreadCols = spreadTable(spread, studentSpread);
	// autoTable does not report where it stopped, so the hook keeps the cursor for the next one
	let spreadEnd = 110;
	autoTable(doc, {
		...TABLE_STYLE,
		startY: 110,
		head: [spreadCols.head],
		body: spreadCols.body,
		columnStyles: { 0: { cellWidth: 78 }, 1: { cellWidth: 60 } },
		tableWidth: 210,
		// The rank keeps the color it has on screen, so a missed wish stands out on paper too
		didParseCell: (data) => {
			if (data.section !== "body" || data.column.index !== 0) return;
			data.cell.styles.textColor = RANK_COLORS[data.row.index];
		},
		didDrawPage: (data) => {
			spreadEnd = data.cursor?.y ?? spreadEnd;
		},
	});

	const { head, body } = distributionTable(rows);
	autoTable(doc, {
		...TABLE_STYLE,
		startY: spreadEnd + 30,
		head: [head],
		body,
		columnStyles: {
			0: { cellWidth: 84, textColor: MUTED },
		},
	});

	const created = `Erstellt am ${new Date().toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	})}`;
	const pages = doc.getNumberOfPages();
	for (let page = 1; page <= pages; page++) {
		doc.setPage(page);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(8);
		doc.setTextColor(...MUTED);
		doc.text(created, MARGIN, pageHeight - 30);
		doc.text(
			`Seite ${page} von ${pages}`,
			pageWidth - MARGIN,
			pageHeight - 30,
			{ align: "right" },
		);
	}

	doc.save(PDF_FILE_NAME);
}
