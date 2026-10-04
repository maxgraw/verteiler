# Code quality

TypeScript is strict with checkJs on. Do not reach for any or non-null assertions to silence
the checker. Use import type for type-only imports. #lib resolves to src/lib
through the imports field in package.json. Kit 3 removed $lib, and #lib paths need the file
extension (#lib/parser.ts).

Biome formats and lints TS, JS and JSON, with tabs. Run bun run format before committing;
CI runs bun run lint and fails on any diff. Biome does not format Svelte markup or style
blocks, which use 4 spaces. Match that by hand.

bun run check must stay at 0 errors and 0 warnings.

Keep logic out of components. Parsing belongs in parser.ts, solving in algorithm/, shared
state in state.svelte.ts. Rank logic is in rank.ts, everything between the button and the
worker in presolve.ts, result views and caveats in result.ts, the group name search in
search.ts. Components wire those together and render.

The slot layout constants live in src/lib/config.ts (NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT,
TOTAL_SLOTS, DEFAULT_CAPACITY). Import them, never redeclare them locally.
