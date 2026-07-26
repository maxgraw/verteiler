<script lang="ts">
import type { Snippet } from "svelte";

interface Props {
	variant: "error" | "warning";
	children: Snippet;
}

let { variant, children }: Props = $props();
</script>

<div class="alert" data-variant={variant}>
    {@render children()}
</div>

<style>
    .alert {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid;
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
    }

    .alert[data-variant="error"] {
        border-color: var(--color-error-border);
        background: var(--color-error-bg);
        color: var(--color-error-text);
    }

    .alert[data-variant="warning"] {
        border-color: var(--color-warning-border);
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
        font-weight: 500;
    }
</style>
