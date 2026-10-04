<script lang="ts">
import { SPREAD_LABELS } from "#lib/rank.ts";
import type { TimeSlotView } from "#lib/result.ts";

interface Props {
	timeSlots: TimeSlotView[];
}

let { timeSlots }: Props = $props();
</script>

<div class="time-slots">
    {#each timeSlots as ts}
        <div class="time-slot">
            <div class="time-slot-header">
                <span class="time-slot-title">Zeitslot {ts.num}</span>
                <span class="time-slot-meta">
                    {ts.label} · {ts.studentCount} Studierende
                </span>
            </div>
            {#each ts.rotationGroups as rg}
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
    .time-slots {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .time-slot {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .time-slot-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) var(--space-3);
        background: var(--color-bg-subtle);
        border-bottom: 1px solid var(--color-border);
    }

    .time-slot-title {
        font-weight: 700;
        font-size: var(--text-sm);
    }

    .time-slot-meta {
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
        padding: var(--space-0-5) var(--space-2);
        border-radius: var(--radius-full);
        background: var(--rank-bg);
        color: var(--rank-text);
    }
</style>
