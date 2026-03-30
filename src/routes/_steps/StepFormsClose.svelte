<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";

    interface Props {
        open?: boolean;
        done?: boolean;
        ondone?: () => void;
    }

    let { open = $bindable(false), done = $bindable(false), ondone }: Props = $props();
</script>

<Step num={6} title="Google Forms nach Deadline schließen" bind:open bind:done {ondone}>
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
