# Verteiler

Single-page SvelteKit app that assigns student groups to university rotation time slots
based on ranked preferences. Semester organizers walk through 10 steps in three phases:
prepare the Google Form, message the semester, then evaluate the answers by uploading the
CSV export, setting capacities, solving and copying the result.

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
│   │   ├── index.ts          # solve(): size-weighted LP via HiGHS, then a lottery tie-break
│   │   └── types.ts          # SolveResult { solution, score, spread, studentSpread }
│   ├── components/           # presentational: Step, StepContent, Alert, CopyButton
│   ├── clipboard.ts          # copyText(), reports failure instead of rejecting
│   ├── config.ts             # slot layout constants, the single source of truth
│   ├── distribution.ts       # pure helpers around a solved distribution
│   ├── lottery.ts            # seeded draw that breaks ties between equally fair results
│   ├── messages.ts           # the three copyable German chat messages
│   ├── parser.ts             # parseChoices() CSV to Group[], buildSlots()
│   ├── solver-client.ts      # SolverClient: worker lifecycle, progress, timeout
│   ├── solver.worker.ts      # Web Worker wrapper around solve()
│   ├── state.svelte.ts       # state singleton, runes + localStorage persistence
│   ├── steps.ts              # STEPS, the wizard order and the only place it is written down
│   └── styles/app.css        # reset, design tokens, .field, .inline-arrow, [data-rank]
└── routes/
    ├── +page.svelte          # renders the 10 steps in the order STEPS defines
    ├── AppHeader.svelte
    └── _steps/
        ├── WizardStep.svelte # binds one step to state.open/done by zero-based index
        ├── Step*.svelte      # one file per step, each passing its STEPS entry
        └── StepAlgorithm/    # the one step with private sub-components

tests/
├── fixtures/*.csv            # real Google Forms exports, imported with ?raw
├── algorithm.spec.ts         # solver correctness (browser project)
├── benchmark.spec.ts         # score quality + timing (browser project)
├── distribution.spec.ts      # pure result helpers (node project)
├── lottery.spec.ts           # seeded draw (node project)
├── messages.spec.ts          # template placeholders and interpolation (node project)
├── parser.spec.ts            # CSV parsing (node project)
├── steps.spec.ts             # STEPS indices stay unique and gapless (node project)
└── state.svelte.spec.ts      # persistence and restore (browser project)
```

Data flows one way: CSV, parseChoices(), appState.parsedGroups, SolverClient, solver.worker.ts,
solve(), SolveResult, groupByTimeSlot() rendered in StepAlgorithm/.

A step file holds its own state, its styles and the German copy that is only shown in the
page: headings, descriptions, list items, labels. The four long copyable messages live in
messages.ts instead. It wraps its body in WizardStep, which owns the open/done wiring so no
step repeats the index three times.

Never write a step position as a literal, not as an index and not inside German copy. Take it
from STEPS in steps.ts, which is also where reordering happens.

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
