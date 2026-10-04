import type { Group } from "./parser";

/** Fold case, umlauts and stray spacing, so "Muller" finds "Müller". */
function foldName(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/ß/g, "ss")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Groups whose member list contains the query. The organizer knows a person's name, not
 * a group number, so this is the only sane way into a list of 46 anonymous rows.
 *
 * @param limit - Cap on results, because a short query matches almost everything
 */
export function findGroups(groups: Group[], query: string, limit = 8): Group[] {
	const needle = foldName(query);
	if (needle.length < 2) return [];
	return groups
		.filter((g) => foldName(g.members).includes(needle))
		.slice(0, limit);
}
