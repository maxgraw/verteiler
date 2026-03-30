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
        'Nicht eingetragene Personen werden bei der Verteilung nicht berücksichtigt und müssen Restplätze nehmen.'
    );
</script>

<Step num={5} title="Einen Tag vor Deadline: Erinnerung schicken" bind:open {ondone}>
    <StepContent>
        <p class="description">
            Schick diese Erinnerung einen Tag vor der Deadline in die
            Semestergruppe.
        </p>
        <TemplateMessage {message} {disabled} />
    </StepContent>
</Step>
