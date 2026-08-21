# /// script
# requires-python = ">=3.12,<3.13"
# dependencies = ["pulp>=3.0", "ortools>=9.14"]
# ///
"""Cross-check a distribution from tools/verify/export.ts against two other solvers.

The app minimises its objective with HiGHS and proves optimality with an integer cutoff.
Both of those are the same piece of software making a claim about itself. This rebuilds
the model from scratch in PuLP/CBC and in OR-Tools CP-SAT and asks three things:

  1. Is the assignment the app produced legal at all?
  2. Does it cost what the app says it costs?
  3. Can either solver do strictly better?

CP-SAT is here because it is constraint programming, not branch-and-cut like HiGHS and
CBC. Two solvers of the same family can share a blind spot more easily than three.

Objective *values* are compared, never assignments: a contested semester has many
distributions that tie for best, and expecting the same one back would be wrong.

Usage:
    bun run tools/verify/export.ts auswahl.csv > solution.json
    uv run tools/verify/verify.py solution.json
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from typing import NamedTuple

import pulp
from ortools.sat.python import cp_model


def rank_of(choices: list[int], time_slot: int) -> int:
    """Position of a time slot in a group's preferences, 3 when it matches none.

    Re-derived here on purpose. Importing the app's rule would make the two sides agree
    by construction, which is exactly what this script exists to avoid.
    """
    for position, choice in enumerate(choices):
        if choice == -1 or choice == time_slot:
            return position
    return 3


def build_costs(data: dict) -> dict[tuple[int, int], int]:
    """Cost of putting group g in slot s, counted per student."""
    costs = data["costs"]
    return {
        (g["id"], s["id"]): costs[rank_of(g["choices"], s["timeSlot"])] * g["size"]
        for g in data["groups"]
        for s in data["slots"]
    }


def pinned(data: dict) -> list[dict]:
    """Guarantees, resolved to the time slots each pinned group may take.

    Without these the checker would model a less constrained problem, find a cheaper
    objective and report it as a disagreement. A pure false alarm, and a loud one.
    """
    return [g for g in data.get("guarantees", []) if g.get("allowedTimeSlots")]


def check_assignment(data: dict, cost: dict) -> tuple[list[str], int | None]:
    """Validate the app's assignment and score it. Returns (problems, its cost)."""
    problems: list[str] = []
    groups, slots = data["groups"], data["slots"]
    assignment = data["assignment"]
    slot_ids = {s["id"] for s in slots}
    capacity = {s["id"]: s["capacity"] for s in slots}

    if len(assignment) != len(groups):
        return [f"{len(groups)} groups but {len(assignment)} assignments"], None

    load: Counter[int] = Counter()
    for group, slot in zip(groups, assignment):
        if slot not in slot_ids:
            problems.append(f"group {group['id']} sits in slot {slot}, which does not exist")
            continue
        load[slot] += group["size"]

    for slot, used in sorted(load.items()):
        if used > capacity[slot]:
            problems.append(f"slot {slot} holds {used} students, capacity is {capacity[slot]}")

    time_slot = {s["id"]: s["timeSlot"] for s in slots}
    for guarantee in pinned(data):
        slot = assignment[guarantee["groupId"]]
        if time_slot.get(slot) not in guarantee["allowedTimeSlots"]:
            problems.append(
                f"group {guarantee['groupId']} was guaranteed time slots "
                f"{guarantee['allowedTimeSlots']} but sits in {time_slot.get(slot)}"
            )

    if problems:
        return problems, None

    value = sum(cost[(g["id"], s)] for g, s in zip(groups, assignment))
    return [], value


class SolverRun(NamedTuple):
    label: str
    status: str
    #: None when the solver produced nothing usable
    value: int | None
    #: True only when this solver proved its value minimal. A solver that ran out of
    #: time still returns a value, and that value says nothing about the true minimum.
    proven: bool


def solve_cbc(label: str, data: dict, cost: dict, time_limit: int) -> SolverRun:
    problem = pulp.LpProblem("verteiler", pulp.LpMinimize)
    x = {
        (g["id"], s["id"]): pulp.LpVariable(f"x_{g['id']}_{s['id']}", cat="Binary")
        for g in data["groups"]
        for s in data["slots"]
    }

    problem += pulp.lpSum(cost[k] * v for k, v in x.items())
    for g in data["groups"]:
        problem += pulp.lpSum(x[(g["id"], s["id"])] for s in data["slots"]) == 1
    for s in data["slots"]:
        problem += (
            pulp.lpSum(g["size"] * x[(g["id"], s["id"])] for g in data["groups"])
            <= s["capacity"]
        )
    for guarantee in pinned(data):
        problem += (
            pulp.lpSum(
                x[(guarantee["groupId"], s["id"])]
                for s in data["slots"]
                if s["timeSlot"] in guarantee["allowedTimeSlots"]
            )
            == 1
        )

    problem.solve(pulp.PULP_CBC_CMD(msg=0, timeLimit=time_limit))

    # problem.status says "Optimal" even when CBC stopped on the time limit. sol_status
    # is the one that separates a proven optimum from a solution it merely reached.
    status = pulp.LpSolution.get(problem.sol_status, str(problem.sol_status))
    if problem.sol_status not in (pulp.LpSolutionOptimal, pulp.LpSolutionIntegerFeasible):
        return SolverRun(label, status, None, False)
    return SolverRun(
        label,
        status,
        round(pulp.value(problem.objective)),
        problem.sol_status == pulp.LpSolutionOptimal,
    )


def solve_cpsat(label: str, data: dict, cost: dict, time_limit: int) -> SolverRun:
    model = cp_model.CpModel()
    x = {
        (g["id"], s["id"]): model.new_bool_var(f"x_{g['id']}_{s['id']}")
        for g in data["groups"]
        for s in data["slots"]
    }

    for g in data["groups"]:
        model.add_exactly_one(x[(g["id"], s["id"])] for s in data["slots"])
    for s in data["slots"]:
        model.add(
            sum(g["size"] * x[(g["id"], s["id"])] for g in data["groups"])
            <= s["capacity"]
        )
    for guarantee in pinned(data):
        model.add_exactly_one(
            x[(guarantee["groupId"], s["id"])]
            for s in data["slots"]
            if s["timeSlot"] in guarantee["allowedTimeSlots"]
        )
    model.minimize(sum(cost[k] * v for k, v in x.items()))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = float(time_limit)
    status = solver.solve(model)
    name = solver.status_name(status)
    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return SolverRun(label, name, None, False)
    return SolverRun(label, name, round(solver.objective_value), status == cp_model.OPTIMAL)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution", help="JSON written by tools/verify/export.ts")
    parser.add_argument("--time-limit", type=int, default=120, help="seconds per solver")
    args = parser.parse_args()

    # CBC can grind for minutes on an instance HiGHS finishes in a second, and block
    # buffering would hide every line until it is done
    sys.stdout.reconfigure(line_buffering=True)

    with open(args.solution, encoding="utf-8") as handle:
        data = json.load(handle)

    cost = build_costs(data)
    claimed = data["fairnessValue"]

    print(f"source          {data['source']}")
    print(f"groups / slots  {len(data['groups'])} / {len(data['slots'])}")
    print(f"app (HiGHS)     {claimed}   optimality={data['optimality']}")
    if pinned(data):
        print(f"guarantees      {len(pinned(data))} pinned group(s), modelled in both checkers")

    failures: list[str] = []

    problems, actual = check_assignment(data, cost)
    if problems:
        failures.extend(problems)
        print("assignment      ILLEGAL")
        for problem in problems:
            print(f"                {problem}")
    else:
        print(f"assignment      legal, costs {actual}")
        if actual != claimed:
            failures.append(f"app reports {claimed} but its own assignment costs {actual}")

    runs: list[SolverRun] = []
    for label, solver in (("CBC", solve_cbc), ("CP-SAT", solve_cpsat)):
        print(f"{label:<15} solving, up to {args.time_limit}s ...")
        run = solver(label, data, cost, args.time_limit)
        runs.append(run)

        if run.value is None:
            print(f"{label:<15} {run.status}, nothing to compare")
            continue

        if run.value < claimed:
            note = "BETTER"
            failures.append(f"{label} found {run.value}, better than the app's {claimed}")
        elif run.value == claimed:
            note = "same, proven" if run.proven else "same, but not proven"
        elif run.proven:
            note = "WORSE and proven"
            failures.append(
                f"{label} proved {run.value} minimal while the app reports {claimed}, "
                "so the two models describe different problems"
            )
        else:
            # Ran out of time. That is a statement about this solver's budget, not about
            # the app, and treating it as a contradiction would be a pure false alarm.
            note = f"worse, but {label} did not finish"
        print(f"{label:<15} {run.value}   ({note})")

    proven = [r for r in runs if r.proven and r.value is not None]
    if data["optimality"] == "suboptimal" and proven and all(r.value >= claimed for r in proven):
        failures.append(
            "app says a better distribution exists, but an independent optimum says otherwise"
        )

    print()
    if failures:
        print("FAIL")
        for failure in failures:
            print(f"  {failure}")
        return 1

    confirmed = [r.label for r in proven if r.value == claimed]
    if confirmed:
        print(f"OK: assignment is legal and {' and '.join(confirmed)} proved {claimed} minimal")
        return 0

    print("INCONCLUSIVE: assignment is legal and nothing beat it, but no solver finished.")
    print("Raise --time-limit to get a verdict.")
    return 2


if __name__ == "__main__":
    sys.exit(main())
