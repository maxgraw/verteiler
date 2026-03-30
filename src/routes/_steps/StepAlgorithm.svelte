<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";
    import { state as appState } from "$lib/state.svelte";
    import { buildSlots } from "$lib/parser";
    import { solve } from "$lib/algorithm/index";
    import type { SolveResult, Solution } from "$lib/algorithm/types";
    import type { Group } from "$lib/parser";

    const NUM_TIME_SLOTS = 8;
    const SLOTS_PER_TIME_SLOT = 4;
    const SPREAD_LABELS = ["1. Wahl", "2. Wahl", "3. Wahl", "Kein Match"];

    let running = $state(false);
    let solveResult = $state<SolveResult | null>(null);
    let error = $state("");

    async function run() {
        if (!appState.parsedGroups) return;
        error = "";
        solveResult = null;
        running = true;

        // Clear previous console log to avoid duplicates
        if (typeof console !== "undefined") {
            console.clear();
            console.log(
                `[Verteiler] ${appState.parsedGroups.length} Gruppen, ${appState.capacities.reduce((a, b) => a + b, 0)} Studierende`,
            );
        }

        // Log to browser console for debugging
        const logProgress = (message: string) => {
            console.log(`[Verteiler] ${message}`);
        };

        try {
            const slots = buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, [
                ...appState.capacities,
            ]);
            logProgress("Slots erstellt");

            solveResult = await solve(appState.parsedGroups, slots);
            logProgress("Erfolg!");
        } catch (e) {
            error = e instanceof Error ? e.message : "Unbekannter Fehler";
            logProgress(`Fehler: ${error}`);
        } finally {
            running = false;
        }
    }

    function choiceRank(group: Group, solution: Solution): number {
        const ts = solution.occupancy[group.currentSelection].timeSlot;
        for (let k = 0; k < group.choices.length; k++) {
            if (group.choices[k] === -1 || ts === group.choices[k]) return k;
        }
        return 3;
    }

    const zeitslots = $derived.by(() => {
        if (!solveResult) return [];
        const { solution } = solveResult;
        return Array.from({ length: NUM_TIME_SLOTS }, (_, t) => {
            const groups = solution.groups
                .filter(
                    (g) =>
                        solution.occupancy[g.currentSelection].timeSlot === t,
                )
                .map((g) => ({ ...g, rank: choiceRank(g, solution) }));
            return {
                num: t + 1,
                label: `Gruppe ${t * 4 + 1}–${(t + 1) * 4}`,
                groups,
                studentCount: groups.reduce((sum, g) => sum + g.size, 0),
            };
        });
    });

    let copied = $state(false);

    function copyResults() {
        const lines: string[] = [];
        for (const zs of zeitslots) {
            lines.push(`Zeitslot ${zs.num} (${zs.label}):`);
            for (const g of zs.groups) lines.push(`  ${g.members}`);
            lines.push("");
        }
        navigator.clipboard.writeText(lines.join("\n").trim()).then(() => {
            copied = true;
            setTimeout(() => (copied = false), 2000);
        });
    }
</script>

<Step
    num={10}
    title="Verteilung berechnen"
    bind:open={appState.open[9]}
    bind:done={appState.done[9]}
    ondone={() => appState.openNext(9)}
    checkDisabled={!solveResult}
>
    <StepContent>
        <p class="description">
            Starte die Berechnung. Der Algorithmus verteilt alle Gruppen
            möglichst nach ihren Wunsch-Zeitslots.
        </p>

        <button
            class="run-btn"
            onclick={run}
            disabled={!appState.parsedGroups || running}
        >
            {running ? "Wird berechnet…" : "Verteilung berechnen"}
        </button>

        <div class="progress-info">
            <span class="progress-hint">
                Ergebnisse werden direkt im Browser berechnet.
            </span>
        </div>

        {#if error}
            <div class="error-box">{error}</div>
        {/if}

        {#if solveResult}
            <div class="results">
                <div class="spread">
                    {#each solveResult.spread as count, i}
                        <div class="spread-item" data-rank={i}>
                            <span class="spread-count">{count}</span>
                            <span class="spread-label">{SPREAD_LABELS[i]}</span>
                        </div>
                    {/each}
                </div>

                <div class="zeitslots">
                    {#each zeitslots as zs}
                        <div class="zeitslot">
                            <div class="zeitslot-header">
                                <span class="zeitslot-title"
                                    >Zeitslot {zs.num}</span
                                >
                                <span class="zeitslot-meta"
                                    >{zs.label} · {zs.studentCount} Studierende</span
                                >
                            </div>
                            <ul class="group-list">
                                {#each zs.groups as g}
                                    <li class="group-row">
                                        <span class="group-members"
                                            >{g.members}</span
                                        >
                                        <span
                                            class="choice-badge"
                                            data-rank={g.rank}
                                            >{SPREAD_LABELS[g.rank]}</span
                                        >
                                    </li>
                                {/each}
                            </ul>
                        </div>
                    {/each}
                </div>

                <button class="copy-btn" onclick={copyResults}>
                    {copied ? "Kopiert ✓" : "Ergebnisse kopieren"}
                </button>
            </div>
        {/if}
    </StepContent>
</Step>

<style>
    .run-btn {
        width: 100%;
        padding: var(--space-2) var(--space-4);
        background: var(--color-primary);
        color: white;
        font-weight: 600;
        font-size: var(--text-base);
        border-radius: var(--radius-md);
        transition: background var(--transition-fast);
    }

    .run-btn:hover:not(:disabled) {
        background: var(--color-primary-hover);
    }

    .run-btn:disabled {
        background: var(--color-primary-disabled);
        cursor: not-allowed;
    }

    .error-box {
        padding: var(--space-3);
        border: 1px solid var(--color-error-border);
        border-radius: var(--radius-sm);
        background: var(--color-error-bg);
        color: var(--color-error-text);
        font-size: var(--text-sm);
    }

    .results {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .spread {
        display: flex;
        gap: var(--space-2);
    }

    .spread-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border);
        background: var(--color-bg-subtle);
    }

    .spread-count {
        font-size: var(--text-xl);
        font-weight: 700;
    }

    .spread-label {
        font-size: var(--text-xs);
        font-weight: 600;
        text-align: center;
    }

    .spread-item[data-rank="0"] {
        background: var(--color-success-bg);
        border-color: var(--color-success-border);
    }
    .spread-item[data-rank="0"] .spread-count,
    .spread-item[data-rank="0"] .spread-label {
        color: var(--color-choice-1);
    }

    .spread-item[data-rank="1"] {
        background: var(--color-warning-bg);
        border-color: var(--color-warning-border);
    }
    .spread-item[data-rank="1"] .spread-count,
    .spread-item[data-rank="1"] .spread-label {
        color: var(--color-choice-2);
    }

    .spread-item[data-rank="2"] {
        background: #fff7ed;
        border-color: #fed7aa;
    }
    .spread-item[data-rank="2"] .spread-count,
    .spread-item[data-rank="2"] .spread-label {
        color: var(--color-choice-3);
    }

    .spread-item[data-rank="3"] {
        background: var(--color-error-bg);
        border-color: var(--color-error-border);
    }
    .spread-item[data-rank="3"] .spread-count,
    .spread-item[data-rank="3"] .spread-label {
        color: var(--color-choice-0);
    }

    .zeitslots {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .zeitslot {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .zeitslot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg-subtle);
        border-bottom: 1px solid var(--color-border);
    }

    .zeitslot-title {
        font-weight: 700;
        font-size: var(--text-sm);
    }

    .zeitslot-meta {
        font-size: var(--text-xs);
        color: var(--color-text-subtle);
    }

    .group-list {
        display: flex;
        flex-direction: column;
    }

    .group-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        border-bottom: 1px solid var(--color-border);
    }

    .group-row:last-child {
        border-bottom: none;
    }

    .group-members {
        color: var(--color-text-muted);
        flex: 1;
    }

    .choice-badge {
        flex-shrink: 0;
        font-size: var(--text-xs);
        font-weight: 600;
        padding: 0.1rem var(--space-2);
        border-radius: var(--radius-full);
    }

    .choice-badge[data-rank="0"] {
        background: var(--color-success-bg);
        color: var(--color-choice-1);
    }
    .choice-badge[data-rank="1"] {
        background: var(--color-warning-bg);
        color: var(--color-choice-2);
    }
    .choice-badge[data-rank="2"] {
        background: #fff7ed;
        color: var(--color-choice-3);
    }
    .choice-badge[data-rank="3"] {
        background: var(--color-error-bg);
        color: var(--color-choice-0);
    }

    .copy-btn {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        border: 1px solid var(--color-primary-border);
        border-radius: var(--radius-md);
        background: var(--color-primary-bg);
        transition: background var(--transition-fast);
    }

    .copy-btn:hover {
        background: var(--color-primary-border);
    }

    .progress-info {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        background: var(--color-bg-subtle);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        border: 1px solid var(--color-border);
    }

    .progress-hint {
        color: var(--color-text-muted);
        font-weight: 500;
    }
</style>
