<script lang="ts">
import type { TimeSlotView } from "$lib/distribution";
import { SPREAD_LABELS } from "$lib/distribution";

interface Props {
	timeSlots: TimeSlotView[];
}

let { timeSlots }: Props = $props();
</script>

<div class="zeitslots">
    {#each timeSlots as zs}
        <div class="zeitslot">
            <div class="zeitslot-header">
                <span class="zeitslot-title">Zeitslot {zs.num}</span>
                <span class="zeitslot-meta">
                    {zs.label} · {zs.studentCount} Studierende
                </span>
            </div>
            {#each zs.rotationGroups as rg}
                <div class="rotation">
                    <div class="rotation-header">
                        <span class="rotation-title">Gruppe {rg.num}</span>
                        <span class="rotation-meta">
                            {#if rg.groups.length === 0}
                                frei
                            {:else}
                                {rg.studentCount} von {rg.capacity} Plätzen
                            {/if}
                        </span>
                    </div>
                    <ul class="group-list">
                        {#each rg.groups as g}
                            <li class="group-row">
                                <span class="group-members">{g.members}</span>
                                <span class="choice-badge" data-rank={g.rank}>
                                    {SPREAD_LABELS[g.rank]}
                                </span>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/each}
        </div>
    {/each}
</div>

<style>
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

    .rotation {
        padding: var(--space-2) 0;
        border-bottom: 1px solid var(--color-border);
    }

    .rotation:last-child {
        border-bottom: none;
    }

    .rotation-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-2);
        padding: 0 var(--space-3);
        font-size: var(--text-xs);
    }

    .rotation-title {
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    .rotation-meta {
        color: var(--color-text-faint);
    }

    .group-list {
        display: flex;
        flex-direction: column;
    }

    /* Indented past the rotation group header, so the members read as its contents
       rather than as rotation groups of their own. */
    .group-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-3) var(--space-1) var(--space-6);
        font-size: var(--text-sm);
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
        background: var(--rank-bg);
        color: var(--rank-text);
    }
</style>
