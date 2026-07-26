import { describe, expect, it } from "vitest";
import { NUM_TIME_SLOTS } from "$lib/config";
import {
	announceMessage,
	deadlineMessage,
	formIntroMessage,
	reminderMessage,
} from "$lib/messages";

const filled = {
	tag: "Montag",
	datum: "01.12.2025",
	uhrzeit: "18:00",
	link: "https://docs.google.com/forms/d/e/abc/viewform",
	lotterySeed: "K7M2P9",
};

describe("announceMessage", () => {
	it("names the number of time slots from the config", () => {
		expect(announceMessage).toContain(`der ${NUM_TIME_SLOTS} Zeitslots`);
	});
});

describe("formIntroMessage", () => {
	it("carries the deadline, so the form description cannot go stale", () => {
		const message = formIntroMessage("Montag", "01.12.2025", "18:00");
		expect(message).toContain("Montag, den 01.12.2025 um 18:00 Uhr");
	});

	it("names the member field exactly as the form labels it", () => {
		expect(formIntroMessage("Montag", "01.12.2025", "18:00")).toContain(
			"„Gruppenmitglieder mit Vor- und Nachname“",
		);
	});

	it("falls back to placeholders", () => {
		const message = formIntroMessage("", "", "");
		expect(message).toContain("[TAG]");
		expect(message).toContain("[DATUM]");
		expect(message).toContain("[UHRZEIT]");
	});
});

describe("deadlineMessage", () => {
	it("inserts deadline, link and lottery seed", () => {
		const message = deadlineMessage(filled);
		expect(message).toContain("Montag, den 01.12.2025 um 18:00 Uhr");
		expect(message).toContain(filled.link);
		expect(message).toContain("Startwert K7M2P9");
	});

	it("marks missing fields as placeholders instead of leaving gaps", () => {
		const message = deadlineMessage({ ...filled, tag: "", link: "" });
		expect(message).toContain("[TAG]");
		expect(message).toContain("[LINK]");
		expect(message).not.toContain("[UHRZEIT]");
	});

	// The seed has to be public before the form closes, otherwise the tie-break
	// cannot be checked afterwards.
	it("publishes the seed in the message that goes out before the deadline", () => {
		expect(deadlineMessage(filled)).toMatch(/Losverfahren.*K7M2P9/);
	});
});

describe("reminderMessage", () => {
	it("inserts the deadline and stays a single paragraph", () => {
		const message = reminderMessage("Montag", "18:00");
		expect(message).toContain("Montag, 18:00 Uhr");
		expect(message).not.toContain("\n");
	});

	it("falls back to placeholders", () => {
		expect(reminderMessage("", "")).toContain("[TAG]");
	});
});
