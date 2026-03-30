<script lang="ts">
    import { Image } from '@lucide/svelte';

    interface Props {
        src: string;
        label?: string;
    }

    let { src, label = 'Screenshot anzeigen' }: Props = $props();
</script>

<a href={src} target="_blank" rel="noopener" class="image-hint">
    <Image size={12} />
    {label}
</a>

<style>
    .image-hint {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--color-text-muted);
        background: var(--color-bg);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        padding: 0.15rem var(--space-2);
        text-decoration: none;
        transition:
            color var(--transition-fast),
            border-color var(--transition-fast);
    }

    .image-hint:hover {
        color: var(--color-primary);
        border-color: var(--color-primary-border);
    }
</style>
