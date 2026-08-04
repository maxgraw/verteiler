import { NUM_TIME_SLOTS } from "./config.js";

/**
 * The three long German texts the organizer copies into the semester chat. They live here
 * rather than in the step components because they are long, parameterized and the only copy
 * in the app worth asserting on.
 *
 * Missing deadline fields render as [TAG], [DATUM], [UHRZEIT] or [LINK]: the message stays
 * readable while the organizer fills the form, and an accidental copy is obviously incomplete.
 */

export interface DeadlineFields {
	/** Weekday name of the deadline, e.g. "Montag" */
	tag: string;
	/** Deadline date, already formatted as dd.mm.yyyy */
	datum: string;
	uhrzeit: string;
	/** Google Forms participant link */
	link: string;
	/** Published before the form closes so the tie-break stays verifiable */
	lotterySeed: string;
}

export const announceMessage = `Hallo an alle!

Ich habe einen Vorschlag, wie wir die Verteilung der Rotationsgruppen semesterintern umsetzen können, und würde die Organisation übernehmen: Über ein Google Forms gibt jede Gruppe drei der ${NUM_TIME_SLOTS} Zeitslots als 1., 2. und 3. Wahl an. Ein Algorithmus berechnet daraus die bestmögliche Verteilung für unser Semester.

LG`;

/**
 * Goes into the form description itself, where the students see it before answering. The
 * deadline is repeated here on purpose: the form is often opened without the chat message
 * at hand.
 */
export function formIntroMessage(
	tag: string,
	datum: string,
	uhrzeit: string,
): string {
	return `Hallo liebe Studierende,

bitte füllt das Google Forms vollständig bis ${tag || "[TAG]"}, den ${datum || "[DATUM]"} um ${uhrzeit || "[UHRZEIT]"} Uhr aus. Gebt alle Gruppenmitglieder mit Vor- und Nachnamen im Feld „Gruppenmitglieder mit Vor- und Nachname“ an.

Ihr kommt garantiert mit den Leuten aus eurer Gruppe zusammen. Nicht garantiert ist, dass jede Gruppe eine ihrer drei Wahlen bekommt: bewerben sich zu viele auf denselben Zeitslot, kann nicht jeder Wunsch erfüllt werden. Der Algorithmus findet aber die bestmögliche Lösung für alle.

Liebe Grüße`;
}

export function deadlineMessage({
	tag,
	datum,
	uhrzeit,
	link,
	lotterySeed,
}: DeadlineFields): string {
	return `Liebes Semester,

ich bitte euch, eure Rotationsgruppen-Wünsche bis ${tag || "[TAG]"}, den ${datum || "[DATUM]"} um ${uhrzeit || "[UHRZEIT]"} Uhr in das Google Forms einzutragen:

${link || "[LINK]"}

Das Formular bleibt bis zur Deadline offen. Wer sich bis dahin nicht eingetragen hat, kann nicht mehr berücksichtigt werden.

Ein paar Hinweise:
- Es handelt sich NICHT um First-come-first-serve, also kein Stress!
- Eine Person pro Gruppe trägt ein und gibt alle Namen an. Sprecht ab, wer das macht, damit es keine Doppelungen gibt.
- Bitte Gruppengröße und Anzahl der Namen abgleichen.
- Auch Alleinanmeldungen laufen über das Formular. Vorangemeldete Personen tragen sich NICHT ein.
- Wenn ihr euch vertan habt: NICHT nochmal eintragen, sondern mir eine Nachricht schicken.
- Die 1./2./3. Wahl ist entsprechend gewichtet, garantiert ist aber keine davon. Die Gruppe bleibt in jedem Fall zusammen.

Bei Fragen gerne melden`;
}

export function reminderMessage(tag: string, uhrzeit: string): string {
	return `Friendly reminder: bitte bis ${tag || "[TAG]"}, ${uhrzeit || "[UHRZEIT]"} Uhr eure Rotationsgruppen-Wünsche ins Google Forms eintragen. Wer nicht eingetragen ist, wird bei der Verteilung nicht berücksichtigt und muss Restplätze nehmen.`;
}
