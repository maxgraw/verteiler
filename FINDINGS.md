# Verteiler — Project Findings

## What this is

**Verteiler** is a SvelteKit web app that assigns student groups to rotation time slots based on ranked preferences. Each semester, students submit a Google Forms response with their group size, member names, and three time-slot preferences. The app reads those CSV exports and computes an optimal assignment that satisfies as many first-choice preferences as possible while respecting per-slot capacity limits.

Input: Google Forms CSV export  
Output: Assignment table + stats (how many groups got 1st/2nd/3rd choice)

---

## Algorithm evolution

### 1. Python + Gurobi (`python/GPTGurobi.py`)

The original tool, written by Emil Schober, used **Gurobi** — a commercial integer linear programming solver.

**Formulation:**
- Binary variable `x[g][s]` = 1 if group `g` is assigned to slot `s`
- Objective: minimize `sum(cost(g, s) * x[g][s])` where cost is 0/1/2/100 for 1st/2nd/3rd/no-match
- Constraints: each group assigned exactly once, each slot's student count ≤ capacity

**Notable quirk:** Contains a hardcoded special case — if "Emil Schober" is in a group's member list, that group is forced to its first choice (`m.addConstr(... == 1)`).

**Limitations:**
- Requires a Gurobi license (commercial, expensive outside academia)
- Hardcoded absolute file paths (`C:/Users/Emil Schober/OneDrive/...`)
- Outputs a static HTML file; no web UI
- Not portable — no one else could run it

### 2. glpk.js — WASM ILP (`git log ~45d5eed → 5332a43`)

The first TypeScript rewrite used **glpk.js**, an Emscripten-compiled WebAssembly build of the open-source GLPK solver.

**Formulation:** Same ILP structure as the Gurobi version, plus symmetry-breaking constraints (slot load ordering within each timeslot) to reduce the branch-and-bound search space on contested inputs.

**Files removed in the switch:**
- `src/lib/algorithm/variables.ts` — generated `x[g][s]` binary variables
- `src/lib/algorithm/constraints.ts` — assignment, capacity, and symmetry-breaking constraints
- `src/lib/algorithm/utils.ts` — variable naming and penalty helpers

**Why it failed:** glpk.js is an Emscripten-compiled Wasm module. The Wasm linear memory heap can only grow, never shrink. On heavily-contested inputs (like `engpass.csv`, where 20/32 groups prefer the same timeslot), the branch-and-bound search explodes in both time and memory. The heap accumulated allocations across restarts with no GC relief, eventually hitting browser per-tab memory limits or timing out entirely.

The commit message: **"switch algo"** (2026-03-31) replaced the entire ILP implementation with simulated annealing.

### 3. Simulated Annealing — pure TypeScript (current)

**No external dependencies.** The algorithm runs entirely in a Web Worker with no Wasm, no ILP solver.

**Phase 1 — Greedy initialization:**  
Sorts groups largest-first (hardest to place gets first pick). Assigns each group to the highest-preference slot that still has capacity, breaking ties by preferring emptier slots.

**Phase 2 — Simulated annealing (10 independent restarts):**  
Each restart runs 30,000 iterations from the greedy solution with a different PRNG seed. Two move types are mixed 50/50:
- **Swap:** exchange two groups between their current slots (if both fit after swap)
- **Move:** relocate one group to a random different slot (if capacity permits)

Temperature schedule: `T_START=5 → T_END=0.01` with multiplicative cooling, so the solver accepts ~37% of 5-point worsenings early on and essentially nothing at the end.

The best solution across all 10 restarts is returned. Uses a seeded LCG PRNG for deterministic, reproducible output.

**Tradeoffs vs. ILP:**
| Property | GLPK ILP | Simulated Annealing |
|---|---|---|
| Optimality guarantee | Yes (provably optimal) | No (heuristic) |
| Browser memory | Problematic (Wasm heap) | None (plain JS) |
| Contested inputs | Slow/fails | Fast, predictable |
| Determinism | Yes | Yes (seeded) |
| Dependencies | glpk.js (Wasm) | None |
| Typical runtime | Variable (seconds–∞) | ~200–500ms |

For the problem sizes in practice (32 groups, 32 slots), SA consistently produces near-optimal results and runs in well under a second.

---

## Current architecture

```
src/
├── lib/
│   ├── algorithm/
│   │   ├── index.ts          # SA solver (greedy init + 10 restarts)
│   │   ├── types.ts          # SolveResult, Solution interfaces
│   │   ├── index.spec.ts     # Unit + integration tests
│   │   └── benchmark.spec.ts # Score quality + timing benchmarks
│   ├── parser.ts             # CSV parsing, slot building
│   ├── parser.spec.ts        # Parser tests
│   ├── solver.worker.ts      # Web Worker wrapper around solve()
│   └── state.svelte.ts       # App state (Svelte 5 runes)
├── routes/
│   └── _steps/               # Step-by-step UI (upload → config → solve → export)
└── test/
    ├── realistisch.csv        # 32 groups, well-distributed preferences
    └── engpass.csv            # 32 groups, 20/32 all prefer the same timeslot
```

**Slot naming convention:**  
`"Gruppe X-Y"` in the CSV maps to timeslot index `Math.floor(Y / 4) - 1`.  
So: `Gruppe 1-4` → ts0, `Gruppe 5-8` → ts1, ..., `Gruppe 29-32` → ts7.  
There are 8 timeslots × 4 parallel slots = 32 slots total per semester.

---

## Test data

### `realistisch.csv`
32 groups (6×16 + 5×12 + 3×4), preferences distributed across all 8 timeslots. Represents a typical semester cohort. SA achieves ≥28/32 groups on 1st or 2nd choice.

### `engpass.csv`
32 groups, all 6-person, with 20/32 preferring `Gruppe 9-12` (timeslot 2) as their first choice. This is the pathological case that broke glpk.js — the ILP's branch-and-bound explodes because timeslot 2 can only hold 24 students (4 slots × 6 capacity) but 120 students (20 groups × 6) want it. SA handles this gracefully by moving overflow groups to their 2nd/3rd choices.

### New test files (see `src/test/`)

| File | Description |
|---|---|
| `minimal.csv` | 3 groups, trivially satisfiable — smoke test |
| `alle_egal.csv` | 10 groups, all three choices are "Egal" — tests don't-care handling |
| `gemischt.csv` | Mix of group sizes 1–6 + some Egal choices — realistic edge cases |
| `kapazitaetsgrenze.csv` | Exactly fills available capacity — tests boundary conditions |
