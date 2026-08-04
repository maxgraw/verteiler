# Verteiler

Single-page SvelteKit app that assigns student groups to university rotation time slots by ranked preference. Organizers walk through 10 steps in three phases: prepare the Google Forms, message the semester, then evaluate the answers by uploading the CSV export, setting capacities and solving.

Everything runs client-side. No backend, no database, no network call at runtime. The
uploaded CSV never leaves the browser.

## Commands

```bash
bun run dev        # dev server
bun run build      # static build into build/
bun run check      # svelte-kit sync + svelte-check (types + a11y)
bun run test       # vitest, both projects, single run
bun run test:unit  # vitest watch mode
```

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
