<script lang="ts">
import type { Snippet } from "svelte";
import { state as appState } from "#lib/state.svelte.ts";

interface Props {
	/**
	 * Zero-based position in the workflow. It indexes the open/done arrays and the
	 * user-facing number is derived from it, so the two can no longer drift apart.
	 */
	index: number;
	title: string;
	/** Blocks the done checkbox until the step's precondition is met */
	checkDisabled?: boolean;
	children: Snippet;
}

let { index, title, checkDisabled = false, children }: Props = $props();

const num = $derived(index + 1);

function onCheckboxChange() {
	appState.open[index] = !appState.done[index];
	if (appState.done[index]) appState.openNext(index);
}
</script>

<details class="step" data-done={appState.done[index]} bind:open={appState.open[index]}>
    <summary class="step-header">
        <input
            class="step-checkbox"
            type="checkbox"
            aria-label="Schritt {num} erledigt"
            bind:checked={appState.done[index]}
            onclick={(e) => e.stopPropagation()}
            onchange={onCheckboxChange}
            disabled={checkDisabled}
        />
        <div class="step-title">
            <span class="step-num">{num}</span>
            <span class="step-content">{title}</span>
        </div>
    </summary>
    <div class="step-body">
        {@render children()}
    </div>
</details>

<style>
    .step {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        overflow: hidden;
        transition: border-color var(--transition-fast);
    }

    .step[data-done="true"] {
        opacity: 0.6;
    }

    .step[data-done="true"] .step-title {
        color: var(--color-text-subtle);
    }

    .step[data-done="true"] .step-content {
        text-decoration: line-through;
    }

    .step-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        cursor: pointer;
        user-select: none;
    }

    .step-header:hover {
        background: var(--color-bg-subtle);
    }

    .step-checkbox {
        width: 1.1rem;
        height: 1.1rem;
        flex-shrink: 0;
        accent-color: var(--color-primary);
        cursor: pointer;
    }

    .step-title {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--color-text);
        flex: 1;
    }

    .step-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: var(--radius-full);
        background: var(--color-border);
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--color-text-muted);
        flex-shrink: 0;
    }

    /* Steps style their content by plain tags and classes, so no step needs its own wrappers */
    .step-body {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4) var(--space-4);
        border-top: 1px solid var(--color-border);
    }

    .step-body :global(p.description) {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        line-height: 1.6;
    }

    .step-body :global(small.hint) {
        font-size: var(--text-xs);
        color: var(--color-text-faint);
    }

    .step-body :global(ol) {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        line-height: 1.7;
        margin-left: var(--space-5);
        list-style: decimal;
    }

    .step-body :global(li) {
        margin-bottom: var(--space-3);
    }
</style>
