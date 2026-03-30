<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import ImageHint from '$lib/components/ImageHint.svelte';
    import { ChevronRight } from '@lucide/svelte';
    import { state } from '$lib/state.svelte';
</script>

<Step num={7} title="Antworten als CSV herunterladen" bind:open={state.open[6]} bind:done={state.done[6]} ondone={() => state.openNext(6)}>
    <StepContent>
        <p class="description">Exportiere die Formularantworten als CSV-Datei für den nächsten Schritt.</p>
        <ol>
            <li>
                Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten".
                <ImageHint src="/images/forms-answers-tab.png" />
            </li>
            <li>
                Oben rechts auf „⋮" klicken <ChevronRight size={12} class="inline-arrow" /> „Antworten herunterladen (.csv)".
                <ImageHint src="/images/forms-csv-download.png" />
            </li>
        </ol>
    </StepContent>
</Step>

<style>
    :global(.inline-arrow) {
        display: inline;
        vertical-align: middle;
        color: var(--color-text-faint);
    }
</style>
