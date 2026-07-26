<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import WizardStep from "./WizardStep.svelte";
</script>

<WizardStep index={6} title="Antworten als CSV herunterladen">
    <p class="description">Exportiere die Formularantworten als CSV-Datei für den nächsten Schritt.</p>
    <ol>
        <li>Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten“.</li>
        <li>
            Oben rechts das Dreipunkt-Menü ⋮ öffnen
            <ChevronRight size={12} class="inline-arrow" /> „Antworten herunterladen (.csv)“.
        </li>
    </ol>
</WizardStep>
