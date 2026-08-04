<script lang="ts">
import { state } from "$lib/state.svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";

/** Falls back to a pointer at the deadline step while datum or uhrzeit are still empty. */
const deadlineLabel = $derived(
	state.deadlineComplete
		? `${state.tag}, den ${state.formattedDatum} um ${state.uhrzeit} Uhr`
		: `deine Deadline aus Schritt ${STEPS.deadline + 1}`,
);
</script>

<WizardStep
    index={STEPS.formsClose}
    title="Abschlusszeitpunkt im Formular setzen"
    checkDisabled={!state.deadlineComplete}
>
    <p class="description">
        So schließt das Formular pünktlich von selbst. Nach der Deadline kommt
        nichts mehr nach.
    </p>
    <ol>
        <li>Oben rechts den Button anklicken, der jetzt „Veröffentlicht“ heißt.</li>
        <li>
            Im Reiter „Antworten möglich“, der auf „Ja“ steht, auf
            „Abschlussdatum oder Antwortlimit festlegen“ klicken.
        </li>
        <li>Als Zeitpunkt {deadlineLabel} auswählen und bestätigen.</li>
        <li>„Speichern“ klicken. Danach ein zweites Mal „Speichern“.</li>
    </ol>
    <small class="hint">
        Der zweite Klick ist wichtig. Ohne ihn wird der Abschlusszeitpunkt nicht
        übernommen.
    </small>
</WizardStep>
