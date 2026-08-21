import { describe, it, expect } from "vitest";
import { render } from "vitest-browser-svelte";
import { page } from "vitest/browser";
import SeedField from "../src/routes/_steps/StepAlgorithm/SeedField.svelte";

describe("SeedField", () => {
	it("shows the draw the distribution came from", async () => {
		render(SeedField, { props: { seed: "K7M2QP" } });
		await expect.element(page.getByText("K7M2QP")).toBeInTheDocument();
	});

	// It is derived from the applications, so an input would only invite someone to
	// re-roll until they like who loses.
	it("offers no way to change it", async () => {
		render(SeedField, { props: { seed: "K7M2QP" } });
		expect(document.querySelectorAll("input, button")).toHaveLength(0);
	});
});
