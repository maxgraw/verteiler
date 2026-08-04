/**
 * Google Forms hands out two participant links. The publish dialog shows the short one,
 * the address bar of the open form the long one. Both are accepted.
 */

/** Short link, for example https://forms.gle/9JCY1WYkkxMMLrRq9 */
const SHORT_LINK = /^https:\/\/forms\.gle\/[A-Za-z0-9_-]+$/;

/** Long link, always carries /viewform */
const LONG_LINK = /^https:\/\/docs\.google\.com\/forms\/.+\/viewform/;

const SHORT_PREFIX = "https://forms.gle/";
const LONG_PREFIX = "https://docs.google.com/forms/";

/** True for a participant link in either format. Surrounding whitespace is ignored. */
export function isFormsLink(link: string): boolean {
	const trimmed = link.trim();
	return SHORT_LINK.test(trimmed) || LONG_LINK.test(trimmed);
}

/**
 * German message shown under the input. Empty when the link is valid or still empty,
 * so an untouched field stays silent.
 */
export function formsLinkError(link: string): string {
	const trimmed = link.trim();
	if (trimmed.length === 0 || isFormsLink(trimmed)) return "";

	if (trimmed.startsWith(SHORT_PREFIX))
		return "Nach https://forms.gle/ fehlt die Kennung des Formulars.";

	if (trimmed.startsWith(LONG_PREFIX)) {
		if (trimmed.includes("/edit") || trimmed.includes("/copy"))
			return "Das ist kein Teilnehmerlink. Er enthält /viewform und erscheint nach dem Veröffentlichen oben rechts.";
		return "Bitte den Teilnehmerlink einfügen. Er enthält /viewform und erscheint nach dem Veröffentlichen oben rechts.";
	}

	return "Das sieht nicht wie ein Google Forms Link aus. Er beginnt mit https://forms.gle/ oder https://docs.google.com/forms/.";
}
