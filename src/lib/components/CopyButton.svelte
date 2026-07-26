<script lang="ts">
import { onDestroy } from "svelte";
import { copyText } from "$lib/clipboard";

interface Props {
	text: string;
	label: string;
	/** flat sits inside a bordered card, outlined stands on its own */
	variant?: "flat" | "outlined";
	disabled?: boolean;
}

let { text, label, variant = "flat", disabled = false }: Props = $props();

/** How long the result of a copy stays on the button. */
const FEEDBACK_MS = 2000;

let copied = $state(false);
let copyFailed = $state(false);
let timer: ReturnType<typeof setTimeout> | undefined;

async function copy() {
	const ok = await copyText(text);
	copied = ok;
	copyFailed = !ok;
	// Restart the timer so a second click does not inherit the first one's deadline.
	clearTimeout(timer);
	timer = setTimeout(() => {
		copied = false;
		copyFailed = false;
	}, FEEDBACK_MS);
}

onDestroy(() => clearTimeout(timer));
</script>

<button class="copy-btn" data-variant={variant} onclick={copy} {disabled}>
    {#if copyFailed}
        Kopieren nicht möglich
    {:else if copied}
        Kopiert ✓
    {:else}
        {label}
    {/if}
</button>

<style>
    .copy-btn {
        display: block;
        width: 100%;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        text-align: center;
        transition: background var(--transition-fast);
    }

    .copy-btn[data-variant="flat"] {
        background: var(--color-surface);
    }

    .copy-btn[data-variant="flat"]:hover:not(:disabled) {
        background: var(--color-primary-bg);
    }

    .copy-btn[data-variant="outlined"] {
        border: 1px solid var(--color-primary-border);
        border-radius: var(--radius-md);
        background: var(--color-primary-bg);
    }

    .copy-btn[data-variant="outlined"]:hover:not(:disabled) {
        background: var(--color-primary-border);
    }

    .copy-btn:disabled {
        color: var(--color-text-faint);
        cursor: not-allowed;
    }
</style>
