# Solver

src/lib/algorithm/index.ts emits a CPLEX LP-format string and hands it to HiGHS compiled to
Wasm (the highs npm package). The Wasm binary is resolved through
`import wasmUrl from 'highs/runtime?url'` so Vite bundles it. loadHighs is called once at
module scope, so init cost is paid once per worker.

## Formulation

Binary variable x_group_slot is 1 if that group takes that slot.

Objective maximizes the sum of PENALTIES[rank] * x, with PENALTIES = [0, -1, -5, -100] for
first, second, third choice and no match. All non-zero coefficients are negative, so
maximizing minimizes total penalty.

Constraints: assign_g puts each group in exactly one slot; cap_s keeps the summed group sizes
in a slot within its capacity.

Two details that look like bugs but are not. Zero coefficients are skipped when building the
objective, which can leave it empty when every group answered "Egal", hence the 0 x_0_0
fallback that LP format requires. And time_limit is 30 seconds with "Time limit reached"
accepted alongside "Optimal", so a timed-out solve returns its incumbent instead of failing.
Only a missing assignment counts as failure.

Results are read back by parsing variable names out of result.Columns and thresholding
Primal > 0.5. buildResult returns solution, score and spread, where spread[rank] counts
groups per rank. spread[3] > 0 means groups got none of their choices and the UI warns that
manual follow-up is needed.

## Worker lifecycle

solver.worker.ts wraps solve so Wasm never blocks the UI. It posts back three message types:
status, result, error.

StepAlgorithm.svelte owns the lifecycle, and each guard exists for a reason:

- one cached worker, prewarmed by an effect when step 9 is checked off, so the first solve
  does not pay Wasm init latency
- worker is nulled on both onerror and timeout, otherwise a dead worker gets reused forever
  and every later run hangs with no result and no error
- a 60 second client-side timeout above the solver's own 30 second limit, cleared on both
  resolve and reject paths
- a pre-solve feasibility check comparing total students against total capacity, because the
  solver's own infeasibility error means nothing to the user
- capacities clamped to finite and at least 1 before buildSlots, since the min=1 HTML
  attribute is only advisory

## History

The solver has been rewritten several times. Earlier approaches are dead ends:

1. Python and Gurobi. Commercial license, hardcoded absolute paths, not portable.
2. glpk.js. The Emscripten heap only grows, so contested inputs like engpass.csv exhausted
   browser memory or timed out. Symmetry-breaking constraints did not save it.
3. Simulated annealing in pure TypeScript. Fast and dependency-free but only heuristic.
4. HiGHS, current. Provably optimal and fast enough at 32 groups by 32 slots.

FINDINGS.md in the git history documents the simulated annealing era and is outdated.
