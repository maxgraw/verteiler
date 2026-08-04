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
}

export const announceMessage = `Hallo an alle!

Ich würde die Verteilung der Rotationsgruppen übernehmen. Über ein Google Forms gibt jede Gruppe drei der ${NUM_TIME_SLOTS} Zeitslots als 1., 2. und 3. Wahl an. Ein Algorithmus berechnet daraus die beste Verteilung fürs Semester.

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

bitte füllt das Google Forms bis ${tag || "[TAG]"}, den ${datum || "[DATUM]"} um ${uhrzeit || "[UHRZEIT]"} Uhr aus. Tragt alle Namen ins Feld „Gruppenmitglieder mit Vor- und Nachname“ ein.

Eure Gruppe bleibt in jedem Fall zusammen. Eine eurer drei Wahlen ist nicht garantiert: wollen zu viele denselben Zeitslot, geht nicht jeder Wunsch auf. Der Algorithmus findet die beste Lösung für alle.

Liebe Grüße`;
}

export function deadlineMessage({
	tag,
	datum,
	uhrzeit,
	link,
}: DeadlineFields): string {
	return `Liebes Semester,

tragt eure Rotationsgruppen-Wünsche bitte bis ${tag || "[TAG]"}, den ${datum || "[DATUM]"} um ${uhrzeit || "[UHRZEIT]"} Uhr ins Google Forms ein:

${link || "[LINK]"}

Das Formular schließt zur Deadline automatisch. Wer dann nicht eingetragen ist, kann nicht mehr berücksichtigt werden.

Ein paar Hinweise:
- Kein First-come-first-serve, also kein Stress.
- Eine Person pro Gruppe trägt ein und gibt alle Namen an. Sprecht ab, wer das macht.
- Gruppengröße und Anzahl der Namen müssen übereinstimmen.
- Auch Alleinanmeldungen laufen über das Formular. Vorangemeldete tragen sich nicht ein.
- Vertan? Nicht nochmal eintragen, sondern mir schreiben.
- Die 1./2./3. Wahl ist gewichtet, garantiert ist keine. Die Gruppe bleibt zusammen.

Bei Fragen gerne melden`;
}

export function reminderMessage(tag: string, uhrzeit: string): string {
	return `Friendly reminder: bitte bis ${tag || "[TAG]"}, ${uhrzeit || "[UHRZEIT]"} Uhr eure Rotationsgruppen-Wünsche ins Google Forms eintragen. Wer fehlt, bekommt nur noch Restplätze.`;
}
