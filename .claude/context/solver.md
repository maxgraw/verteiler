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

One weighted sum, minimized in the first of three solves.

COSTS = [0, 1, 5, 100] is the cost of putting one student on their 1st choice, 2nd, 3rd, or
on no wish at all. Objective coefficients are that cost times the group size, so the sum
counts students rather than groups. Displacing a six-person group weighs six times as much as
displacing a single applicant. The capacity constraints always used sizes; the objective did
not, which was the actual bug.

COSTS lives in algorithm/costs.ts, not in index.ts, because validate.ts needs it too and
importing it back from index.ts would be a cycle. The values have to stay integers: the
optimality certificate cuts the objective at V - 1, which proves nothing if a value can sit
in between.

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

An empty objective is rendered as the 0 x_0_0 fallback that LP format requires. It looks
like a bug and is not.

time_limit is 30 seconds per stage, and "Time limit reached" is still accepted alongside
"Optimal", so a timed-out solve returns its incumbent instead of failing. Only a missing
assignment counts as failure. What changed is that this is no longer silent: the certificate
below decides whether the incumbent was actually the optimum, and runStage reports whether
it ran out of time.

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

The seed lives in state.lotterySeed, is drawn once, persists, and is printed into
deadlineMessage in messages.ts so it is public before the form closes. reset() draws a new
one, since that starts a new semester.

## Validation

algorithm/validate.ts checks a finished result against the input it came from: every group
in exactly one real slot, no slot over capacity, occupancy and invAllocation agreeing with
the assignment, and spread, studentSpread, fairnessValue and score all recomputed from
rankOf rather than trusted.

solve() runs it last and throws on the first violation, because a distribution that breaks
its own constraints must never reach the organizer. HiGHS would not catch any of this: it
reports on the LP it was handed, not on whether that LP said what we meant.

The messages are German and name the applicant group by its members, since "Gruppe N"
already means a rotation group everywhere else.

## Optimality certificate

HiGHS through this binding returns Status, ObjectiveValue, Columns and Rows. No dual bound,
no MIP gap. So "Optimal" and a timed-out incumbent are indistinguishable from the outside,
and the app used to present both as the answer.

certify() closes that. Every objective coefficient is an integer, so any better solution
costs at most V - 1. It re-solves the same model with that cut and an empty objective, which
asks only whether such a point exists:

- Infeasible means no better solution exists, so V is proven minimal
- Optimal means one does exist, so the first stage stopped short
- anything else means the proof ran out of time and nothing is claimed

The result carries this as SolveResult.optimality, and solveCaveat in distribution.ts turns
anything short of proven into a German warning above the result list. A proven optimum says
nothing at all: it is the normal case.

Measured on a real 46 group export the cut came back Infeasible in 1.1 seconds against a
fairness optimum of 194, so 15 seconds is a wide budget.

lotteryComplete is the same idea one level down. If the tie-break stage times out, the
distribution is still valid and still optimal, but the published seed did not fully decide
who absorbs the leftover disappointment, and that gets said too.

## Guarantees

The organizer can pin a group to a rank: `SolveOptions.guarantees` is a list of
`{ groupId, maxRank }`, and guaranteeRows turns each one into a constraint that allows only
the time slots satisfying it. allowedTimeSlots lives in distribution.ts next to rankOf,
because it is the same rank logic read backwards, and putting it in the solver would make
distribution.ts and index.ts import each other.

The constraint goes into all three solves. Leaving it out of the certificate would prove
the optimum of the unconstrained problem, which is not the one being answered.

A guarantee overrides the lottery for one group and is paid for by others, so solve runs
the whole pipeline a second time without the guarantees and reports the difference:
guaranteeCost is the extra fairness cost, displaced lists every group that came off worse,
worst hit first. guaranteeSummary in distribution.ts turns that into German.

The price is not guessable and has to be computed. Measured on a real 46 group export:
pinning a four person group to its first choice cost 9, while several six person groups
cost 0, 4 or 6. Guaranteeing that same group its second choice instead cost exactly the
same 9, because the whole price was for getting it out of the third choice slot, not for
where it went afterwards. Do not add a UI that suggests the weaker guarantee is cheaper.

checkGuarantees is the pre-check. It only tests necessary conditions, a group that fits no
rotation group in its promised time slot and more guaranteed students than a time slot can
hold, because full feasibility is the solver's job. Its point is to name the guarantee that
is impossible rather than leave the organizer with a bare Infeasible.

validateSolution asserts every guarantee was kept. Nothing else in the chain would notice a
dropped constraint: the result would look like an ordinary optimum.

state.guarantees holds indices into parsedGroups, so uploading a new CSV clears them. An
index means a different group in a different file.

## Offline cross-check

tools/verify rebuilds the model in PuLP/CBC and OR-Tools CP-SAT and compares objective
values against a run of the real solver. Guarantees are exported as resolved time slot
sets and modelled in both checkers, otherwise they would solve a looser problem, find a
cheaper objective and report it as a disagreement. See tools/verify/README.md. It is development
tooling, never shipped, and Python stays a checking tool rather than a dependency, which is
the distinction the Gurobi attempt in the history below got wrong.

## Worker lifecycle

solver.worker.ts wraps solve so Wasm never blocks the UI. It posts back three message types:
status, result, error.

StepAlgorithm.svelte owns the lifecycle, and each guard exists for a reason:

- one cached worker, prewarmed by an effect when step 9 is checked off, so the first solve
  does not pay Wasm init latency
- worker is nulled on both onerror and timeout, otherwise a dead worker gets reused forever
  and every later run hangs with no result and no error
- a 120 second client-side timeout above the solver's own budget, cleared on both resolve
  and reject paths. That budget is three solves: 30 seconds to optimise, 15 to prove it,
  30 to break ties. The client limit has to stay above their sum
- a pre-solve feasibility check comparing total students against total capacity, because the
  solver's own infeasibility error means nothing to the user
- capacities clamped to finite and at least 1 before buildSlots, since the min=1 HTML
  attribute is only advisory

The pure parts of all that (sanitizeCapacities, checkCapacity, groupByTimeSlot,
formatDistribution, solveCaveat, toUserMessage) live in distribution.ts and are covered by
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
