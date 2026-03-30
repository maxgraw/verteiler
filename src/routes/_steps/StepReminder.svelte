<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import TemplateMessage from '$lib/components/TemplateMessage.svelte';

    interface Props {
        open?: boolean;
        ondone?: () => void;
        tag?: string;
        uhrzeit?: string;
        disabled?: boolean;
    }

    let { open = $bindable(false), ondone, tag = '', uhrzeit = '', disabled = false }: Props =
        $props();

    const message = $derived(
        `Friendly reminder: bitte noch bis ${tag || '[TAG]'}, ${uhrzeit || '[UHRZEIT]'} Uhr ins Google Forms eintragen für die Rotationsgruppen 😊 ` +
        'Wer nicht eingetragen ist, von dem wissen wir nicht, dass er/sie existiert — ' +
        'diese Personen bekommen keine Gruppe zugeteilt und müssen Restplätze nehmen.'
    );
</script>

<Step num={5} title="Einen Tag vor Deadline: Erinnerung schicken" bind:open {ondone}>
    <StepContent>
        <TemplateMessage {message} {disabled} />
    </StepContent>
</Step>
