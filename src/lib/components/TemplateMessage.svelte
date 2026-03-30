<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        children: Snippet;
        disabled?: boolean;
    }

    let { children, disabled = false }: Props = $props();

    let bodyEl: HTMLDivElement;
    let copied = $state(false);

    function copy() {
        const text = bodyEl.innerText
            .split('\n')
            .map((l) => l.trim())
            .join('\n')
            .trim();

        navigator.clipboard.writeText(text).then(() => {
            copied = true;
            setTimeout(() => (copied = false), 2000);
        });
    }
</script>

<div class="template">
    <div class="body" bind:this={bodyEl}>
        {@render children()}
    </div>
    <button class="copy-btn" onclick={copy} {disabled}>
        {copied ? 'Kopiert ✓' : 'Nachricht kopieren'}
    </button>
</div>

<style>
</style>
