# Testing

bun run test runs vitest once across the two projects defined in vite.config.ts.

client runs in real Chromium via Playwright. It covers src/**/*.svelte.{test,spec}.{js,ts}
plus algorithm/index.spec.ts and algorithm/benchmark.spec.ts, which need performance, Web
Workers and Wasm. state.svelte.spec.ts lands here because it needs localStorage.

server runs in node and covers everything else, currently parser.spec.ts and
distribution.spec.ts.

Prefer the node project. Logic that needs a browser to be tested usually belongs in a pure
module instead, which is why distribution.ts exists.

The include and exclude lists are maintained by hand and mirror each other. A new spec that
touches the solver, Wasm or the DOM must be added to the client include and to the server
exclude. Missing the second half makes it run under node as well, where it fails.

requireAssertions is on, so a test that asserts nothing is an error.

Fixtures are real Google Forms exports in src/test/, imported with ?raw. Keep engpass.csv:
it is the regression guard for the contested input that broke the previous solver.

benchmark.spec.ts measures score quality and wall-clock time so algorithm changes can be
compared. It is not a correctness test. Do not tighten its thresholds into flaky assertions.

Follow the local helper factories in the file you are extending (makeGroup, fullSlots,
onlyTimeslot, csv, row) instead of adding a shared fixtures module.
