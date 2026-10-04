<script lang="ts">
import { state as appState } from "#lib/state.svelte.ts";
import { STEPS } from "#lib/steps.ts";
import WizardStep from "./WizardStep.svelte";

/** Falls back to a pointer at the deadline step while datum or uhrzeit are still empty. */
const deadlineLabel = $derived(
	appState.deadlineComplete
		? `${appState.tag}, den ${appState.formattedDatum} um ${appState.uhrzeit} Uhr`
		: `deine Deadline aus Schritt ${STEPS.deadline + 1}`,
);
</script>

<WizardStep
    index={STEPS.formsClose}
    title="Abschlusszeitpunkt im Formular setzen"
    checkDisabled={!appState.deadlineComplete}
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
