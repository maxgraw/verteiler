<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children: Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="content">
    {@render children()}
</div>

<style>
    .content {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        margin-top: var(--space-3);
    }

    .content :global(p.description) {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        line-height: 1.6;
    }

    .content :global(small.hint) {
        font-size: var(--text-xs);
        color: var(--color-text-faint);
    }

    .content :global(ol) {
        font-size: var(--text-base);
        color: var(--color-text-muted);
        line-height: 1.7;
        margin-left: var(--space-5);
        list-style: decimal;
    }

    .content :global(li) {
        margin-bottom: var(--space-1);
    }
</style>
