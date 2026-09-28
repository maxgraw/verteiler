# Verify

Offline check that a distribution is legal and that nothing beats it. Development tooling
only: nothing in here is built, bundled or shipped, and the app keeps running entirely in
the browser with no backend.

Two steps. The first runs the real solver and dumps the result, the second rebuilds the
same model with two other solvers and compares.

```bash
bun run tools/verify/export.ts auswahl.csv --seed=ABC123 > solution.json
uv run tools/verify/verify.py solution.json
```

Guarantees are passed by member name and modelled in both checkers:

```bash
bun run tools/verify/export.ts csv/auswahl.csv --guarantee=Ciftci:0 > solution.json
```

The rank after the colon is the worst rank the group may get, so 0 pins it to its first
choice and 1 allows first or second. Leaving guarantees out of the checker would let it
solve a looser problem and report the cheaper objective as a disagreement.

To check everything at once, every tests/fixtures/semester_YYYY.csv under every capacity
scenario in tests/fixtures/capacities.ts:

```bash
bun run verify                                  # CBC and CP-SAT, slow
bun run verify --solvers=cpsat --time-limit=60  # real semesters only, about ten seconds
bun run verify --random=10 --solvers=cpsat      # plus ten random semesters
```

Random semesters come from generate.ts: 20 to 80 groups drawn from the real ones, uneven
capacity, sometimes a few guarantees. Each run picks a new seed and prints it, and
--random=<n> --seed=<s> replays a failure exactly. A random case HiGHS calls infeasible is
skipped, any other error from solve counts as a failure.

.github/workflows/verify.yml runs CP-SAT over the real semesters and ten random ones
whenever the model, the parser, the fixtures or the lockfile change, once a week, and on
demand. Exit code 2 only warns there, because a slow runner is not evidence against the
app.

export.ts imports src/lib unchanged, so it exercises the production code path. Bun resolves
the Wasm import by itself, which is why no extra dependency is needed.

verify.py declares pulp and ortools as inline script metadata. uv resolves them into a
throwaway environment on first run, so nothing is installed system wide and the repo gains
no Python dependency.

## What it checks

- Is the assignment legal: one slot per group, no slot over capacity.
- Does it cost what the app claims it costs.
- Does CBC or CP-SAT find a strictly cheaper distribution.
- Does the app's optimality claim survive an independent optimum.
- Did every guaranteed group actually land in a time slot it was promised.

Objective values are compared, never assignments. A contested semester has many
distributions that tie for best, so expecting the same one back would be wrong.

CP-SAT is in there because it is constraint programming. HiGHS and CBC are both
branch-and-cut and could share a blind spot that a third approach would not.

A solver that runs out of time returns a worse value, and that is not evidence against the
app. Only a strictly better value, or a proven optimum that differs, counts as a failure.
CBC is by far the slowest of the three: on a 46 group export it needs around five minutes
for what HiGHS does in one second and CP-SAT in under five, so raise --time-limit rather
than reading a timed out CBC run as a disagreement.

Exit codes: 0 someone proved the app right, 1 contradiction, 2 nobody finished in the
budget.

## Limits

Both models are hand written, once in TypeScript and once in Python. A misunderstanding of
the domain that lands in both would be confirmed by all three solvers rather than caught.
tests/brute-force.spec.ts covers that gap on tiny instances: it enumerates every assignment
of a few hundred seeded random cases and compares the optimum with what solve returns.
