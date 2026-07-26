<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import WizardStep from "./WizardStep.svelte";
</script>

<WizardStep index={5} title="Formular nach Deadline schließen">
    <p class="description">Schließ das Formular nach der Deadline, damit keine neuen Antworten mehr eingehen.</p>
    <ol>
        <li>Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Reiter „Antworten“.</li>
        <li>
            Den Schalter „Antworten möglich“ deaktivieren, bis „Antworten werden nicht
            akzeptiert“ erscheint.
        </li>
    </ol>
</WizardStep>
