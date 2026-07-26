# Code quality

TypeScript is strict with checkJs on. Do not reach for any or non-null assertions to silence
the checker. Use import type for type-only imports. $lib resolves to src/lib.

Indentation is inconsistent across the repo: 4 spaces in parser.ts and the .svelte files,
2 in src/lib/algorithm. There is no formatter config. Match the file you are editing and do
not reformat surrounding code.

bun run check must stay at 0 errors. The two a11y warnings on the drop zone in
StepCsvUpload.svelte are the known baseline. Do not add new ones.

Keep logic out of components. Parsing belongs in parser.ts, solving in algorithm/, shared
state in state.svelte.ts. Components wire those together and render.

The slot layout constants live in src/lib/config.ts (NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT,
TOTAL_SLOTS, DEFAULT_CAPACITY). Import them, never redeclare them locally.
