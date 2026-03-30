<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import { state } from '$lib/state.svelte';
</script>

<Step num={6} title="Google Forms nach Deadline schließen" bind:open={state.open[5]} bind:done={state.done[5]} ondone={() => state.openNext(5)}>
    <StepContent>
        <ol>
            <li>Google Forms öffnen → Reiter Antworten.</li>
            <li>
                Den Schalter „Antworten möglich" umlegen, bis „Antworten werden
                nicht akzeptiert" erscheint.
            </li>
            <li>Ab jetzt kann sich niemand mehr eintragen.</li>
        </ol>
    </StepContent>
</Step>
