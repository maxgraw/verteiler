<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";
</script>

<WizardStep index={STEPS.formsExport} title="Antworten exportieren">
    <p class="description">
        Durch den Abschlusszeitpunkt aus Schritt {STEPS.formsClose + 1} hat sich das
        Formular schon selbst geschlossen. Prüf das kurz, dann lad die Antworten
        als CSV herunter.
    </p>
    <ol>
        <li>Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten“.</li>
        <li>
            Prüfen, dass „Antworten werden nicht akzeptiert“ steht. Falls doch noch
            angenommen wird, oben rechts über „Veröffentlicht“ die Option „Antworten
            möglich“ ausschalten.
        </li>
        <li>
            Oben rechts das Dreipunkt-Menü ⋮ öffnen
            <ChevronRight size={12} class="inline-arrow" /> „Antworten herunterladen (.csv)“.
        </li>
    </ol>
</WizardStep>
