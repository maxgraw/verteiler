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

<details class="step" class:step--tool={tool} class:step--done={done} bind:open>
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
            <span>{title}</span>
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
</style>
