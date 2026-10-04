# Testing

All tests live in tests/, never next to the file they cover. Specs import the code under test
through the #lib subpath import, so a spec never contains a ../../src path.

bun run test runs vitest once across the two projects defined in vite.config.ts.

client runs in real Chromium via Playwright. It covers tests/**/*.svelte.{test,spec}.{js,ts}
plus tests/algorithm.spec.ts, tests/benchmark.spec.ts, tests/semesters.spec.ts and
tests/brute-force.spec.ts, which need performance, Web Workers and Wasm. state.svelte.spec.ts lands there through the .svelte.spec.ts suffix,
because it needs localStorage.

server runs in node and covers everything else.

Prefer the node project. Logic that needs a browser to be tested usually belongs in a pure
module instead, which is why presolve.ts and result.ts exist.

The include and exclude lists are maintained by hand and mirror each other. A new spec that
touches the solver, Wasm or the DOM must be added to the client include and to the server
exclude. Missing the second half makes it run under node as well, where it fails. A spec that
needs the browser for DOM or storage reasons can instead be named *.svelte.spec.ts, which
both lists already route correctly.

requireAssertions is on, so a test that asserts nothing is an error.

Fixtures live in tests/fixtures/ and are imported with ?raw. semester_YYYY.csv are real
exports, anonymized. The others are hand written in an older form layout and only feed the
parser and the benchmark. Keep engpass.csv: it is the regression guard for the contested input that broke the previous
solver.

Never commit a real export with names in it. Raw exports stay in csv/, which is gitignored.
Each new semester goes through bun run tools/anonymize.ts csv/<file>.csv
tests/fixtures/semester_YYYY.csv and gets one entry in SEMESTERS in semesters.spec.ts,
pinning the fairnessValue the solver proved on it.

benchmark.spec.ts measures the fairness value and wall-clock time so algorithm changes can be
compared. It is not a correctness test. Do not tighten its thresholds into flaky assertions.

Follow the local helper factories in the file you are extending (makeGroup, fullSlots,
onlyTimeslot, csv, row) instead of adding a shared fixtures module.
