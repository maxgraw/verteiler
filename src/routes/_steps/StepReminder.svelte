<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import TemplateMessage from '$lib/components/TemplateMessage.svelte';
    import { state } from '$lib/state.svelte';

    const message = $derived(
        `Friendly reminder: bitte noch bis ${state.tag || '[TAG]'}, ${state.uhrzeit || '[UHRZEIT]'} Uhr ins Google Forms eintragen für die Rotationsgruppen 😊 ` +
        'Nicht eingetragene Personen werden bei der Verteilung nicht berücksichtigt und müssen Restplätze nehmen.'
    );
</script>

<Step num={5} title="Einen Tag vor Deadline: Erinnerung schicken" bind:open={state.open[4]} bind:done={state.done[4]} ondone={() => state.openNext(4)}>
    <StepContent>
        <p class="description">
            Schick diese Erinnerung einen Tag vor der Deadline in die
            Semestergruppe.
        </p>
        <TemplateMessage {message} disabled={!state.deadlineComplete} />
    </StepContent>
</Step>
