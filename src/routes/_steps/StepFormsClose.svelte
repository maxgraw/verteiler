<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import ImageHint from '$lib/components/ImageHint.svelte';
    import { ChevronRight } from '@lucide/svelte';
    import { state } from '$lib/state.svelte';
</script>

<Step num={6} title="Formular nach Deadline schließen" bind:open={state.open[5]} bind:done={state.done[5]} ondone={() => state.openNext(5)}>
    <StepContent>
        <p class="description">Schließ das Formular nach der Deadline, damit keine neuen Antworten mehr eingehen.</p>
        <ol>
            <li>
                Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten".
                <ImageHint src="/images/forms-answers-tab.png" />
            </li>
            <li>
                Den Schalter „Antworten möglich" deaktivieren, bis „Antworten werden nicht akzeptiert" erscheint.
                <ImageHint src="/images/forms-close-toggle.png" />
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
