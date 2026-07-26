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
│   │   ├── types.ts          # SolveResult { solution, score, spread }
│   │   ├── index.spec.ts     # correctness + structural guarantees (browser project)
│   │   └── benchmark.spec.ts # score quality + wall-clock timing (browser project)
│   ├── components/           # presentational: Step, StepContent, TemplateMessage
│   ├── parser.ts             # parseChoices() CSV to Group[], buildSlots()
│   ├── parser.spec.ts        # (node project)
│   ├── solver.worker.ts      # Web Worker wrapper around solve()
│   ├── state.svelte.ts       # state singleton, runes + localStorage persistence
│   └── styles/app.css        # reset + design tokens
├── routes/
│   ├── +page.svelte          # renders the 10 steps in order
│   ├── AppHeader.svelte
│   └── _steps/Step*.svelte   # one file per step, index 0-9
└── test/*.csv                # fixtures, also imported by benchmark.spec.ts via ?raw
```

Data flows one way: CSV, parseChoices(), appState.parsedGroups, solver.worker.ts, solve(),
SolveResult rendered in StepAlgorithm.svelte.

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

PLAN.md is a completed robustness checklist, kept for history and not a to-do list.
