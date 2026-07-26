<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import ImageHint from "$lib/components/ImageHint.svelte";
import WizardStep from "./WizardStep.svelte";
</script>

<WizardStep index={6} title="Antworten als CSV herunterladen">
    <p class="description">Exportiere die Formularantworten als CSV-Datei für den nächsten Schritt.</p>
    <ol>
        <li>
            Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten".
            <ImageHint src="/images/forms-answers-tab.png" />
        </li>
        <li>
            Oben rechts auf „⋮" klicken <ChevronRight size={12} class="inline-arrow" /> „Antworten herunterladen (.csv)".
            <ImageHint src="/images/forms-csv-download.png" />
        </li>
    </ol>
</WizardStep>
