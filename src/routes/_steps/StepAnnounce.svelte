<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import TemplateMessage from '$lib/components/TemplateMessage.svelte';

    interface Props {
        open?: boolean;
        ondone?: () => void;
    }

    let { open = $bindable(false), ondone }: Props = $props();

    const message =
        'Hallo an Alle!\n\n' +
        'ich habe einen Vorschlag, wie wir die Verteilung der Rotationsgruppen semesterintern umsetzen können ' +
        'und würde hierfür die Organisation übernehmen. Es gibt ein 1./2./3.-Wahl-Verfahren, bei dem man 3 ' +
        '(von den 8) Zeitslots im Rotationsplan als Wahl angibt. Ein Algorithmus berechnet dann anhand eurer ' +
        'Wahlen eine bestmögliche Verteilung der Rotationsgruppen für unser Semester.\n\n' +
        'LG';
</script>

<Step num={3} title="Semester über das Verfahren informieren" bind:open {ondone}>
    <StepContent>
        <p class="description">
            Schick diese Nachricht in eure Semestergruppe, bevor du das Google
            Forms rausschickst.
        </p>
        <TemplateMessage {message} />
    </StepContent>
</Step>
