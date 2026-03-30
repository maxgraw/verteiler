<script lang="ts">
    interface Props {
        message: string;
        disabled?: boolean;
    }

    let { message, disabled = false }: Props = $props();

    let copied = $state(false);

    function copy() {
        navigator.clipboard.writeText(message).then(() => {
            copied = true;
            setTimeout(() => (copied = false), 2000);
        });
    }
</script>

<div class="template">
    <div class="body">{message}</div>
    <button class="copy-btn" onclick={copy} {disabled}>
        {copied ? 'Kopiert ✓' : 'Nachricht kopieren'}
    </button>
</div>

<style>
    .body {
        white-space: pre-wrap;
    }
</style>
