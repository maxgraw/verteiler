<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        num: number;
        title: string;
        tool?: boolean;
        tag?: string;
        done?: boolean;
        open?: boolean;
        ondone?: () => void;
        children: Snippet;
    }

    let {
        num,
        title,
        tool = false,
        tag,
        done = $bindable(false),
        open = $bindable(false),
        ondone,
        children,
    }: Props = $props();

    function onCheckboxChange() {
        open = !done;
        if (done) ondone?.();
    }
</script>

<details class="step" data-tool={tool} data-done={done} bind:open>
    <summary class="step-header">
        <input
            class="step-checkbox"
            type="checkbox"
            aria-label="Schritt {num} erledigt"
            bind:checked={done}
            onclick={(e) => e.stopPropagation()}
            onchange={onCheckboxChange}
        />
        <div class="step-title">
            <span class="step-num">{num}</span>
            <span class="step-content">{title}</span>
        </div>
        {#if tag}
            <span class="step-tag">{tag}</span>
        {/if}
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

    .step[data-tool="true"] .step-header {
        background: var(--color-primary-bg);
    }

    .step[data-tool="true"] .step-header:hover {
        background: var(--color-primary-border);
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


    .step-tag {
        font-size: var(--text-xs);
        font-weight: 600;
        padding: 0.1rem var(--space-2);
        border-radius: var(--radius-full);
        background: var(--color-primary-bg);
        color: var(--color-primary);
        border: 1px solid var(--color-primary-border);
    }

    .step-body {
        padding: 0 var(--space-4) var(--space-4);
        border-top: 1px solid var(--color-border);
    }

    .step[data-tool="true"] .step-body {
        border-top-color: var(--color-primary-border);
    }
</style>
