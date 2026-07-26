<script lang="ts">
import CopyButton from "./CopyButton.svelte";

interface Props {
	message: string;
	disabled?: boolean;
}

let { message, disabled = false }: Props = $props();
</script>

<div class="template">
    <div class="body">{message}</div>
    <CopyButton text={message} label="Nachricht kopieren" {disabled} />
</div>

<style>
    .template {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .body {
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        line-height: 1.65;
        padding: var(--space-3);
        background: var(--color-bg-subtle);
        border-bottom: 1px solid var(--color-border);
        white-space: pre-wrap;
    }
</style>
