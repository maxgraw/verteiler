<script lang="ts">
import Alert from "$lib/components/Alert.svelte";
import { SPREAD_LABELS } from "$lib/distribution";

interface Props {
	/** Groups per rank: [1st choice, 2nd, 3rd, no match] */
	spread: number[];
	/** Students per rank, same four buckets */
	studentSpread: number[];
}

let { spread, studentSpread }: Props = $props();
</script>

<div class="spread">
    {#each spread as count, i}
        <div class="spread-item" data-rank={i}>
            <span class="spread-count">{count}</span>
            <span class="spread-label">{SPREAD_LABELS[i]}</span>
            <span class="spread-students">{studentSpread[i]} Studierende</span>
        </div>
    {/each}
</div>

{#if spread[3] > 0}
    <Alert variant="warning">
        {spread[3]} Gruppe(n) mit {studentSpread[3]} Studierenden konnten keinem
        Wunsch-Zeitslot zugewiesen werden und benötigen manuelle Nachbearbeitung.
    </Alert>
{/if}

<style>
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
        border: 1px solid var(--rank-border);
        background: var(--rank-bg);
    }

    .spread-count {
        font-size: var(--text-xl);
        font-weight: 700;
        color: var(--rank-text);
    }

    .spread-label {
        font-size: var(--text-xs);
        font-weight: 600;
        text-align: center;
        color: var(--rank-text);
    }

    .spread-students {
        font-size: var(--text-xs);
        color: var(--color-text-subtle);
        text-align: center;
    }
</style>
