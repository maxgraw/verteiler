# Robustness Plan

Issues ordered by impact. Each item is self-contained and can be implemented independently.

---

## 1. Dead Worker recovery
**File:** `src/routes/_steps/StepAlgorithm.svelte`

`getWorker()` caches the Worker forever. If it dies (Wasm crash, OOM), every future `run()` posts to a dead worker — no result, no error, spinner hangs forever.

**Fix:** Set `worker = null` in `w.onerror` so the next call to `getWorker()` spawns a fresh one.

```ts
w.onerror = (e) => {
  worker = null; // force recreation on next run
  reject(new Error(e.message ?? 'Worker-Fehler'));
};
```

---

## 2. Pre-solve feasibility check
**File:** `src/routes/_steps/StepAlgorithm.svelte`

If total students > total capacity, the solver throws a raw technical error. The user has no idea what to do.

**Fix:** Check before posting to the worker. Show a clear German message with the numbers.

```ts
const totalStudents = appState.parsedGroups.reduce((s, g) => s + g.size, 0);
const totalCapacity = appState.capacities.reduce((a, b) => a + b, 0);
if (totalStudents > totalCapacity) {
  error = `Nicht genug Kapazität: ${totalStudents} Studierende, aber nur ${totalCapacity} Plätze verfügbar. Bitte Kapazitäten erhöhen.`;
  running = false;
  return;
}
```

---

## 3. Timeout — prevent infinite spinner
**Files:** `src/lib/algorithm/index.ts`, `src/routes/_steps/StepAlgorithm.svelte`

If HiGHS hangs or the Worker freezes, the spinner runs forever with no escape.

**Fix (solver):** Pass `time_limit: 30` to HiGHS so the solver gives up after 30s and returns whatever it has. Accept `'Time limit reached'` as a valid status if columns are populated.

```ts
const result = highs.solve(lp, { time_limit: 30 });
if (result.Status !== 'Optimal' && result.Status !== 'Time limit reached') {
  throw new Error(...);
}
```

**Fix (UI):** Add a 60s `setTimeout` in `run()` that rejects the promise and kills the worker.

```ts
const timeout = setTimeout(() => {
  worker?.terminate();
  worker = null;
  reject(new Error('Zeitüberschreitung: Berechnung dauerte zu lange.'));
}, 60_000);
// clear it in the .then()/.finally() path
```

---

## 4. User-friendly error messages
**File:** `src/routes/_steps/StepAlgorithm.svelte`

Raw solver messages like `"No feasible solution found (status: Infeasible)"` reach the UI.

**Fix:** Map known cases in the catch block.

```ts
function toUserMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('Infeasible') || msg.includes('feasible'))
    return 'Keine gültige Verteilung möglich. Prüfe ob die Kapazitäten ausreichen.';
  if (msg.includes('Zeitüberschreitung'))
    return msg;
  return `Unbekannter Fehler. Bitte Seite neu laden und erneut versuchen. (${msg})`;
}
```

---

## 5. Warn when groups get "Kein Match"
**File:** `src/routes/_steps/StepAlgorithm.svelte`

`spread[3] > 0` means students got none of their preferences. This needs manual follow-up but currently looks the same as other stats.

**Fix:** Show a prominent warning box below the spread stats when `solveResult.spread[3] > 0`.

```svelte
{#if solveResult.spread[3] > 0}
  <div class="warning-box">
    {solveResult.spread[3]} Gruppe(n) konnten keinem Wunsch-Zeitslot zugewiesen
    werden und benötigen manuelle Nachbearbeitung.
  </div>
{/if}
```

---

## 6. Capacity input validation
**File:** `src/routes/_steps/StepCapacities.svelte`

`min=1` is a soft HTML attribute — users can type 0 or clear the field. `buildSlots` then creates slots with capacity `0` or `NaN`, causing silent solver misbehaviour.

**Fix:** Clamp in `StepAlgorithm` before calling `buildSlots`, or add an `oninput` handler in `StepCapacities` that replaces invalid values.

```ts
const safeCapacities = appState.capacities.map(c => (Number.isFinite(c) && c >= 1) ? c : 1);
const slots = buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, safeCapacities);
```

---

## 7. localStorage schema versioning
**File:** `src/lib/state.svelte.ts`

No version key in persisted state. If the data shape changes in a future update, old data causes silent bugs on load. The `catch {}` eats all errors.

**Fix:** Add a `VERSION` constant. On load, if `saved.version !== VERSION`, discard the saved state and start fresh.

```ts
const VERSION = 1;
// in constructor:
if (saved.version !== VERSION) { /* skip restore, use defaults */ }
```

---

## 8. Prewarm the Worker
**File:** `src/routes/_steps/StepAlgorithm.svelte`

The Worker is created on first `run()` click, so the first solve includes Wasm init latency. The Worker could instead be created when step 9 (capacities) is marked done, hiding the startup cost.

**Fix:** Watch `appState.done[8]` and call `getWorker()` early.

```ts
$effect(() => {
  if (appState.done[8]) getWorker();
});
```

---

## 9. CSV size guard
**File:** `src/routes/_steps/StepCsvUpload.svelte`

Parser accepts unlimited groups. A soft warning for unusually large files helps catch "uploaded wrong CSV" mistakes.

**Fix:** After parsing, if `groups.length > 80` show a warning: *„Ungewöhnlich viele Gruppen ({n}). Bitte prüfen ob die richtige Datei hochgeladen wurde."*

---

## Implementation order

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Dead Worker recovery | 2 lines | Critical |
| 2 | Pre-solve feasibility check | 5 lines | High |
| 3 | Timeout | ~15 lines | High |
| 4 | Error message mapping | ~10 lines | High |
| 5 | Kein-Match warning | ~5 lines + style | Medium |
| 6 | Capacity clamping | 2 lines | Medium |
| 7 | localStorage versioning | ~10 lines | Medium |
| 8 | Worker prewarm | 5 lines | Low |
| 9 | CSV size guard | 3 lines | Low |
