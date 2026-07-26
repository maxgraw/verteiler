# Verteiler

Single-page SvelteKit app that assigns student groups to university rotation time slots
based on ranked preferences. Semester organizers walk through 10 steps: create a Google
Form, collect responses, upload the CSV export, set capacities, solve, copy results.

Everything runs client-side. There is no backend, no database and no network call at
runtime. The uploaded CSV never leaves the browser.

## Commands

```bash
bun run dev        # dev server
bun run build      # static build into build/
bun run check      # svelte-kit sync + svelte-check (types + a11y)
bun run test       # vitest, both projects, single run
bun run test:unit  # vitest watch mode
```

## Layout

```
src/
├── lib/
│   ├── algorithm/
│   │   ├── index.ts          # solve(): builds an LP string, runs HiGHS, maps columns back
│   │   └── types.ts          # SolveResult { solution, score, spread }
│   ├── components/           # presentational: Step, StepContent, TemplateMessage
│   ├── clipboard.ts          # copyText(), reports failure instead of rejecting
│   ├── config.ts             # slot layout constants, the single source of truth
│   ├── distribution.ts       # pure helpers around a solved distribution
│   ├── parser.ts             # parseChoices() CSV to Group[], buildSlots()
│   ├── solver.worker.ts      # Web Worker wrapper around solve()
│   ├── state.svelte.ts       # state singleton, runes + localStorage persistence
│   └── styles/app.css        # reset, design tokens, shared .field and .inline-arrow
└── routes/
    ├── +page.svelte          # renders the 10 steps in order
    ├── AppHeader.svelte
    └── _steps/Step*.svelte   # one file per step, index 0-9

tests/
├── fixtures/*.csv            # real Google Forms exports, imported with ?raw
├── algorithm.spec.ts         # solver correctness (browser project)
├── benchmark.spec.ts         # score quality + timing (browser project)
├── distribution.spec.ts      # pure result helpers (node project)
├── parser.spec.ts            # CSV parsing (node project)
└── state.svelte.spec.ts      # persistence and restore (browser project)
```

Data flows one way: CSV, parseChoices(), appState.parsedGroups, solver.worker.ts, solve(),
SolveResult, groupByTimeSlot() rendered in StepAlgorithm.svelte.

All tests live in tests/, never beside the source file. Components stay thin: anything worth
testing belongs in parser.ts, distribution.ts or algorithm/, which the specs import via $lib.

## Rules

@.claude/rules/language.md
@.claude/rules/svelte.md
@.claude/rules/styling.md
@.claude/rules/testing.md
@.claude/rules/code-quality.md
@.claude/rules/comments.md
@.claude/rules/markdown.md

## Context

Background on how the app works, read when relevant:

- .claude/context/domain.md, slot layout, CSV format and parse failure modes
- .claude/context/solver.md, LP formulation, worker lifecycle and algorithm history
- .claude/context/state.md, state singleton, persistence and the step pattern

Two earlier planning documents, PLAN.md and FINDINGS.md, have been removed. Both were
completed or outdated. Their still-relevant content is in .claude/context/.
