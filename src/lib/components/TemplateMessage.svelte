<script lang="ts">
    import { copyText } from '$lib/clipboard';

    interface Props {
        message: string;
        disabled?: boolean;
    }

    let { message, disabled = false }: Props = $props();

    let copied = $state(false);
    let copyFailed = $state(false);

    async function copy() {
        const ok = await copyText(message);
        copied = ok;
        copyFailed = !ok;
        setTimeout(() => {
            copied = false;
            copyFailed = false;
        }, 2000);
    }
</script>

<div class="template">
    <div class="body">{message}</div>
    <button class="copy-btn" onclick={copy} {disabled}>
        {#if copyFailed}
            Kopieren nicht möglich
        {:else if copied}
            Kopiert ✓
        {:else}
            Nachricht kopieren
        {/if}
    </button>
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

    .copy-btn {
        display: block;
        width: 100%;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        text-align: center;
        background: var(--color-surface);
        transition: background var(--transition-fast);
    }

    .copy-btn:hover:not(:disabled) {
        background: var(--color-primary-bg);
    }

    .copy-btn:disabled {
        color: var(--color-text-faint);
        cursor: not-allowed;
    }
</style>
