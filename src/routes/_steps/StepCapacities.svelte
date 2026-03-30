<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";
    import { state as appState } from "$lib/state.svelte";

    const NUM_TIME_SLOTS = 8;
    const SLOTS_PER_TIME_SLOT = 4;
    const TOTAL_SLOTS = NUM_TIME_SLOTS * SLOTS_PER_TIME_SLOT;

    let defaultCapacity = $state(6);
</script>

<Step
    num={9}
    title="Kapazitäten einstellen"
    bind:open={appState.open[8]}
    bind:done={appState.done[8]}
    ondone={() => appState.openNext(8)}
>
    <StepContent>
        <p class="description">
            Prüfe in KLIPS, ob Voranmeldungen Plätze in einzelnen
            Rotationsgruppen belegen, und passe die Kapazitäten entsprechend an.
        </p>

        <ol>
            <li>Öffne KLIPS und navigiere zu „Generalanmeldung".</li>
            <li>Wähle dein Semester aus und klicke auf „weiter".</li>
            <li>
                Klappe „Studiengruppe 1" auf. Dort siehst du für jede
                Rotationsgruppe, wie viele Plätze noch verfügbar sind
                (z.&nbsp;B. „Verfügbare Plätze: 5").
            </li>
            <li>
                Gruppen mit weniger als 6 freien Plätzen haben Voranmeldungen.
                Trage die jeweilige Anzahl unten ein.
            </li>
        </ol>

        <div class="capacity-card">
            <div class="capacity-card-header">
                <span class="capacity-card-title">Kapazitäten</span>
                <div class="capacity-default">
                    <label for="default-capacity">Alle auf</label>
                    <input
                        type="number"
                        id="default-capacity"
                        min="1"
                        max="20"
                        bind:value={defaultCapacity}
                    />
                    <button
                        class="apply-btn"
                        onclick={() => {
                            appState.capacities =
                                Array(TOTAL_SLOTS).fill(defaultCapacity);
                        }}>Anwenden</button
                    >
                </div>
            </div>

            <div class="capacity-grid">
                {#each Array(NUM_TIME_SLOTS) as _, t}
                    <div class="grid-row">
                        <span class="zs-label">ZS {t + 1}</span>
                        {#each Array(SLOTS_PER_TIME_SLOT) as _, s}
                            {@const slotId = t * SLOTS_PER_TIME_SLOT + s}
                            <div class="grid-cell">
                                <span class="group-num">Gr. {slotId + 1}</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    bind:value={appState.capacities[slotId]}
                                />
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        </div>
    </StepContent>
</Step>

<style>
    .capacity-card {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .capacity-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg-subtle);
        border-bottom: 1px solid var(--color-border);
    }

    .capacity-card-title {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    .capacity-default {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .capacity-default label {
        font-size: var(--text-sm);
        color: var(--color-text-subtle);
    }

    .capacity-default input {
        width: 4rem;
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border-input);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        background: var(--color-bg);
        text-align: center;
    }

    .apply-btn {
        padding: var(--space-1) var(--space-2);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        border: 1px solid var(--color-primary-border);
        border-radius: var(--radius-sm);
        background: var(--color-primary-bg);
        transition: background var(--transition-fast);
    }

    .apply-btn:hover {
        background: var(--color-primary-border);
    }

    .capacity-grid {
        display: flex;
        flex-direction: column;
        gap: 1px;
        background: var(--color-border);
    }

    .grid-row {
        display: grid;
        grid-template-columns: 3rem repeat(4, 1fr);
        gap: 1px;
        background: var(--color-border);
    }

    .zs-label {
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--color-text-subtle);
        background: var(--color-bg-subtle);
        display: flex;
        align-items: center;
        padding: 0 var(--space-2);
    }

    .grid-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--space-1);
        background: var(--color-bg);
    }

    .group-num {
        font-size: var(--text-xs);
        color: var(--color-text-subtle);
    }

    .capacity-grid input {
        padding: var(--space-1);
        border: 1px solid var(--color-border-input);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        background: var(--color-bg-subtle);
        text-align: center;
        width: 100%;
    }
</style>
