import { describe, it, expect, beforeEach } from "vitest";
import { tick } from "svelte";
import { TOTAL_SLOTS, DEFAULT_CAPACITY } from "$lib/config";
import { STORAGE_KEY, VERSION, VerteilerState } from "$lib/state.svelte";
import { STEP_COUNT } from "$lib/steps";

/**
 * A new instance restores from localStorage exactly like a page load does.
 * The module-level singleton cannot be used here because it is built once per
 * test run, long before any of these tests set up their storage.
 */
async function freshState() {
	return new VerteilerState();
}

function save(payload: Record<string, unknown>) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

beforeEach(() => {
	localStorage.clear();
});

describe("restore from localStorage", () => {
	it("starts from defaults when nothing is stored", async () => {
		const state = await freshState();
		expect(state.link).toBe("");
		expect(state.parsedGroups).toBeNull();
		expect(state.open[0]).toBe(true);
		expect(state.capacities).toHaveLength(TOTAL_SLOTS);
		expect(state.capacities.every((c) => c === DEFAULT_CAPACITY)).toBe(true);
	});

	it("restores a payload written by the current version", async () => {
		save({
			version: VERSION,
			link: "https://example.test/viewform",
			datum: "2026-05-04",
			uhrzeit: "18:00",
		});
		const state = await freshState();
		expect(state.link).toBe("https://example.test/viewform");
		expect(state.datum).toBe("2026-05-04");
		expect(state.uhrzeit).toBe("18:00");
	});

	it("discards a payload written by a different version", async () => {
		save({ version: VERSION + 1, link: "https://example.test/viewform" });
		const state = await freshState();
		expect(state.link).toBe("");
	});

	it("discards a payload with no version at all", async () => {
		save({ link: "https://example.test/viewform" });
		const state = await freshState();
		expect(state.link).toBe("");
	});

	it("falls back to defaults on corrupt JSON instead of throwing", async () => {
		localStorage.setItem(STORAGE_KEY, "{not json");
		const state = await freshState();
		expect(state.link).toBe("");
	});

	it("reports nothing outdated when storage is empty or current", async () => {
		expect((await freshState()).outdated).toBe(false);
		save({ version: VERSION, link: "https://example.test/viewform" });
		expect((await freshState()).outdated).toBe(false);
	});

	it("flags a payload from another version as outdated", async () => {
		save({ version: VERSION + 1 });
		expect((await freshState()).outdated).toBe(true);
	});

	it("flags corrupt JSON as outdated too, since the remedy is the same", async () => {
		localStorage.setItem(STORAGE_KEY, "{not json");
		expect((await freshState()).outdated).toBe(true);
	});

	it("pads a short done array up to the current step count", async () => {
		save({ version: VERSION, done: [true, true] });
		const state = await freshState();
		expect(state.done).toHaveLength(STEP_COUNT);
		expect(state.done.slice(0, 2)).toEqual([true, true]);
		expect(state.done.slice(2).every((d) => d === false)).toBe(true);
	});

	it("truncates an over-long open array to the current step count", async () => {
		save({ version: VERSION, open: Array(20).fill(true) });
		const state = await freshState();
		expect(state.open).toHaveLength(STEP_COUNT);
	});

	it("ignores a capacities array of the wrong length", async () => {
		save({ version: VERSION, capacities: [1, 2, 3] });
		const state = await freshState();
		expect(state.capacities).toHaveLength(TOTAL_SLOTS);
	});

	it("restores capacities of the correct length", async () => {
		save({ version: VERSION, capacities: Array(TOTAL_SLOTS).fill(4) });
		const state = await freshState();
		expect(state.capacities.every((c) => c === 4)).toBe(true);
	});
});

describe("persistence", () => {
	it("writes changes back to localStorage with the current version", async () => {
		const state = await freshState();
		state.link = "https://example.test/viewform";
		await tick();
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
		expect(stored.version).toBe(VERSION);
		expect(stored.link).toBe("https://example.test/viewform");
	});

	it("leaves an outdated payload untouched instead of overwriting it", async () => {
		const stale = JSON.stringify({ version: VERSION + 1, link: "alt" });
		localStorage.setItem(STORAGE_KEY, stale);
		const state = await freshState();
		state.link = "https://example.test/viewform";
		await tick();
		expect(localStorage.getItem(STORAGE_KEY)).toBe(stale);
	});

	it("round-trips through a reload", async () => {
		const first = await freshState();
		first.datum = "2026-05-04";
		first.uhrzeit = "18:00";
		await tick();
		const second = await freshState();
		expect(second.datum).toBe("2026-05-04");
		expect(second.uhrzeit).toBe("18:00");
	});
});

describe("derived values", () => {
	it("formats the date as German day.month.year", async () => {
		const state = await freshState();
		state.datum = "2026-05-04";
		expect(state.formattedDatum).toBe("04.05.2026");
	});

	it("names the weekday in German", async () => {
		const state = await freshState();
		state.datum = "2026-05-04";
		expect(state.tag).toBe("Montag");
	});

	it("leaves the derived date fields empty when no date is set", async () => {
		const state = await freshState();
		expect(state.tag).toBe("");
		expect(state.formattedDatum).toBe("");
	});

	it("reports the deadline complete only once date and time are both set", async () => {
		const state = await freshState();
		expect(state.deadlineComplete).toBe(false);
		state.datum = "2026-05-04";
		expect(state.deadlineComplete).toBe(false);
		state.uhrzeit = "18:00";
		expect(state.deadlineComplete).toBe(true);
	});
});

describe("openNext", () => {
	it("opens the following step", async () => {
		const state = await freshState();
		state.openNext(0);
		expect(state.open[1]).toBe(true);
	});

	it("does nothing past the last step", async () => {
		const state = await freshState();
		const last = state.open.length - 1;
		expect(() => state.openNext(last)).not.toThrow();
		expect(state.open).toHaveLength(STEP_COUNT);
	});
});

describe("reset", () => {
	it("clears inputs and returns to the first step", async () => {
		const state = await freshState();
		state.link = "https://example.test/viewform";
		state.datum = "2026-05-04";
		state.csvFileName = "antworten.csv";
		state.parsedGroups = [
			{
				id: 0,
				size: 1,
				members: "Anna",
				choices: [0, 1, 2],
				currentSelection: -1,
			},
		];
		state.parseWarnings = ["irgendein Hinweis"];
		state.done[0] = true;
		state.capacities[0] = 1;

		state.reset();

		expect(state.link).toBe("");
		expect(state.datum).toBe("");
		expect(state.csvFileName).toBe("");
		expect(state.parsedGroups).toBeNull();
		expect(state.parseWarnings).toEqual([]);
		expect(state.open[0]).toBe(true);
		expect(state.open.slice(1).every((o) => o === false)).toBe(true);
		expect(state.done.every((d) => d === false)).toBe(true);
		expect(state.capacities.every((c) => c === DEFAULT_CAPACITY)).toBe(true);
	});

	it("clears an outdated save and starts persisting again", async () => {
		save({ version: VERSION + 1, link: "alt" });
		const state = await freshState();
		expect(state.outdated).toBe(true);

		state.reset();
		expect(state.outdated).toBe(false);

		state.link = "https://example.test/viewform";
		await tick();
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
		expect(stored.version).toBe(VERSION);
		expect(stored.link).toBe("https://example.test/viewform");
	});
});

describe("lottery seed", () => {
	it("draws a seed when none is stored", async () => {
		const state = await freshState();
		expect(state.lotterySeed).toMatch(/^[A-Z2-9]{6}$/);
	});

	it("keeps the stored seed, so a reload cannot change a published draw", async () => {
		save({ version: VERSION, lotterySeed: "ABC234" });
		const state = await freshState();
		expect(state.lotterySeed).toBe("ABC234");
	});

	it("persists the seed it drew", async () => {
		const state = await freshState();
		const drawn = state.lotterySeed;
		state.link = "https://example.test/viewform";
		await tick();
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
		expect(stored.lotterySeed).toBe(drawn);
	});

	it("draws a new seed on reset, since that starts a new semester", async () => {
		const state = await freshState();
		const before = state.lotterySeed;
		state.reset();
		expect(state.lotterySeed).not.toBe(before);
	});
});
