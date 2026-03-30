<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import { state } from '$lib/state.svelte';
</script>

<Step num={7} title="Antworten als CSV herunterladen" bind:open={state.open[6]} bind:done={state.done[6]} ondone={() => state.openNext(6)}>
    <StepContent>
        <ol>
            <li>Google Forms öffnen → Reiter Antworten.</li>
            <li>
                Oben rechts auf „⋮" klicken → „Antworten herunterladen (.csv)".
            </li>
            <li>Die heruntergeladene Datei im nächsten Schritt hochladen.</li>
        </ol>
    </StepContent>
</Step>
