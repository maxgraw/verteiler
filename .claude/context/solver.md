# Solver

src/lib/algorithm/index.ts emits CPLEX LP-format strings and hands them to HiGHS compiled to
Wasm (the highs npm package). The Wasm binary is resolved through
`import wasmUrl from 'highs/runtime?url'` so Vite bundles it. loadHighs is called once at
module scope, so init cost is paid once per worker.

## Formulation

Binary variable x_group_slot is 1 if that group takes that slot.

Two constraints are always present. assign_g puts each group in exactly one slot, which is
what guarantees a group is never split across slots. cap_s keeps the summed group sizes in a
slot within its capacity.

rankOf lives in distribution.ts so the solver and the results view score a slot identically.

## Objective

One weighted sum, minimized in a single solve.

COSTS = [0, 1, 5, 100] is the cost of putting one student on their 1st choice, 2nd, 3rd, or
on no wish at all. Objective coefficients are that cost times the group size, so the sum
counts students rather than groups. Displacing a six-person group weighs six times as much as
displacing a single applicant. The capacity constraints always used sizes; the objective did
not, which was the actual bug.

SolveResult.score reports the same costs unweighted and negated, so runs stay comparable with
older ones. Nothing optimizes it.

The jump to 100 means "avoid leaving a group without any of its wishes at almost any cost",
which is easy to explain. The 1 against 5 for 2nd against 3rd choice is the only real
judgement call in the file.

A leximin ladder was tried instead of this, minimizing students at the worst rank first and
freezing each level. It was removed: on the fixtures it produced the same number of stranded
students as plain size weighting while pushing five students off their first choice, and it
cannot be explained to a student in one sentence, which matters because they go through this
once per degree. Do not reintroduce it without data showing it wins.

buildResult returns spread (groups per rank) and studentSpread (students per rank). The UI
shows both. spread[3] > 0 means groups got none of their choices and needs manual follow-up.

Two details that look like bugs but are not. An empty objective is rendered as the 0 x_0_0
fallback that LP format requires. And time_limit is 30 seconds with "Time limit reached"
accepted alongside "Optimal", so a timed-out solve returns its incumbent instead of failing.
Only a missing assignment counts as failure.

## Lottery tie-break

Equally fair distributions are common, and without an explicit rule the winner depends on
branch-and-bound internals, which cannot be justified to the group that loses. src/lib/lottery.ts
draws a number per group from a published seed and the group's own member list, so a group can
recompute its own number afterwards.

A second solve minimizes weight_g * rank, where a lucky group carries a high weight and is
therefore expensive to push down a rank. It runs with the first objective frozen at its
optimum, so the lottery only ever chooses between outcomes that are already equally fair. It
never buys a better slot for a lucky group at someone else's expense. The frozen value is
recomputed from the assignment rather than read off ObjectiveValue, which comes back as a
float and would need a tolerance.

The seed lives in state.lotterySeed, is drawn once, persists, and is printed into the deadline
message in StepFormsLink so it is public before the form closes. reset() draws a new one,
since that starts a new semester.

## Worker lifecycle

solver.worker.ts wraps solve so Wasm never blocks the UI. It posts back three message types:
status, result, error.

StepAlgorithm.svelte owns the lifecycle, and each guard exists for a reason:

- one cached worker, prewarmed by an effect when step 9 is checked off, so the first solve
  does not pay Wasm init latency
- worker is nulled on both onerror and timeout, otherwise a dead worker gets reused forever
  and every later run hangs with no result and no error
- a 60 second client-side timeout above the solver's own 30 second limit, cleared on both
  resolve and reject paths. Note the ladder runs up to four solves inside that budget
- a pre-solve feasibility check comparing total students against total capacity, because the
  solver's own infeasibility error means nothing to the user
- capacities clamped to finite and at least 1 before buildSlots, since the min=1 HTML
  attribute is only advisory

The pure parts of all that (sanitizeCapacities, checkCapacity, groupByTimeSlot,
formatDistribution, toUserMessage) live in distribution.ts and are covered by
tests/distribution.spec.ts. Keep new logic there rather than in the component.

## History

The solver has been rewritten several times. Earlier approaches are dead ends:

1. Python and Gurobi. Commercial license, hardcoded absolute paths, not portable.
2. glpk.js. The Emscripten heap only grows, so contested inputs like engpass.csv exhausted
   browser memory or timed out. Symmetry-breaking constraints did not save it.
3. Simulated annealing in pure TypeScript. Fast and dependency-free but only heuristic.
4. HiGHS with a single weighted penalty sum. Provably optimal for that objective, but the
   objective counted groups instead of students and left ties to the solver.
5. HiGHS with a size-weighted objective and a lottery tie-break, current.

Measured effect of step 5 on the fixtures: realistisch is unchanged at groups [28,4,0,0].
engpass moves from students [44,77,42,5] to [44,77,44,3], so two fewer students end up
outside their wishes at the cost of two moving from 2nd to 3rd choice, and no first choice is
lost. Note engpass is a constructed worst case, not a real export.

FINDINGS.md in the git history documents the simulated annealing era and is outdated.
