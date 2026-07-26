<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";
</script>

<WizardStep
    index={STEPS.formsExport}
    title="Formular schließen und Antworten exportieren"
>
    <p class="description">
        Beides passiert im Reiter „Antworten“: erst keine neuen Antworten mehr
        annehmen, dann die vorhandenen als CSV herunterladen.
    </p>
    <ol>
        <li>Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten“.</li>
        <li>
            Den Schalter „Antworten möglich“ deaktivieren, bis „Antworten werden nicht
            akzeptiert“ erscheint.
        </li>
        <li>
            Oben rechts das Dreipunkt-Menü ⋮ öffnen
            <ChevronRight size={12} class="inline-arrow" /> „Antworten herunterladen (.csv)“.
        </li>
    </ol>
</WizardStep>
