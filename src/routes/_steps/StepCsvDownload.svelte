<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";

    interface Props {
        open?: boolean;
        ondone?: () => void;
    }

    let { open = $bindable(false), ondone }: Props = $props();
</script>

<Step num={7} title="Antworten als CSV herunterladen" bind:open {ondone}>
    <StepContent>
        <ol>
            <li>Google Forms öffnen → Reiter Antworten.</li>
            <li>
                Oben rechts auf das Tabellen-Symbol klicken (→ Google Tabellen).
            </li>
            <li>
                In Google Tabellen: Datei → Herunterladen → Kommagetrennte Werte
                (.csv).
            </li>
            <li>Die heruntergeladene Datei im nächsten Schritt hochladen.</li>
        </ol>
    </StepContent>
</Step>
