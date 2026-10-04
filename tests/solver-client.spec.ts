import { describe, expect, it } from "vitest";
import { PIPELINE_LIMIT_SECONDS } from "#lib/algorithm/limits.ts";
import { type SolveRequest, timeoutMs } from "#lib/solver-client.ts";

const plain: SolveRequest = { groups: [], slots: [] };
const guaranteed: SolveRequest = {
	groups: [],
	slots: [],
	guarantees: [{ groupId: 0, maxRank: 0 }],
};

describe("timeoutMs", () => {
	it("stays above one pipeline run without guarantees", () => {
		expect(timeoutMs(plain)).toBeGreaterThan(PIPELINE_LIMIT_SECONDS * 1000);
	});

	it("stays above two pipeline runs with guarantees", () => {
		expect(timeoutMs(guaranteed)).toBeGreaterThan(
			2 * PIPELINE_LIMIT_SECONDS * 1000,
		);
	});
});
