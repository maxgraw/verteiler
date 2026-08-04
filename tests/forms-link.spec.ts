import { describe, expect, it } from "vitest";
import { formsLinkError, isFormsLink } from "$lib/forms-link";

describe("isFormsLink", () => {
	it("accepts the short link from the publish dialog", () => {
		expect(isFormsLink("https://forms.gle/9JCY1WYkkxMMLrRq9")).toBe(true);
	});

	it("accepts the long participant link", () => {
		expect(
			isFormsLink("https://docs.google.com/forms/d/e/abc123/viewform"),
		).toBe(true);
	});

	it("accepts a long link with query parameters", () => {
		expect(
			isFormsLink(
				"https://docs.google.com/forms/d/e/abc123/viewform?usp=sf_link",
			),
		).toBe(true);
	});

	it("ignores whitespace around a pasted link", () => {
		expect(isFormsLink("  https://forms.gle/9JCY1WYkkxMMLrRq9\n")).toBe(true);
	});

	it("rejects the short link without an id", () => {
		expect(isFormsLink("https://forms.gle/")).toBe(false);
	});

	it("rejects the edit link", () => {
		expect(isFormsLink("https://docs.google.com/forms/d/abc123/edit")).toBe(
			false,
		);
	});

	it("rejects an unrelated url", () => {
		expect(isFormsLink("https://example.test/viewform")).toBe(false);
	});

	it("rejects http, because Google only serves https", () => {
		expect(isFormsLink("http://forms.gle/9JCY1WYkkxMMLrRq9")).toBe(false);
	});
});

describe("formsLinkError", () => {
	it("stays silent while the field is empty", () => {
		expect(formsLinkError("")).toBe("");
	});

	it("stays silent for a valid link", () => {
		expect(formsLinkError("https://forms.gle/9JCY1WYkkxMMLrRq9")).toBe("");
	});

	it("names the missing id of a short link", () => {
		expect(formsLinkError("https://forms.gle/")).toContain("Kennung");
	});

	it("points the edit link at the participant link", () => {
		expect(
			formsLinkError("https://docs.google.com/forms/d/abc123/edit"),
		).toContain("kein Teilnehmerlink");
	});

	it("asks for viewform on a long link without it", () => {
		expect(formsLinkError("https://docs.google.com/forms/d/abc123/")).toContain(
			"/viewform",
		);
	});

	it("lists both formats for an unrelated url", () => {
		const message = formsLinkError("https://example.test/form");
		expect(message).toContain("https://forms.gle/");
	});
});
