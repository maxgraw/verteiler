<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import TemplateMessage from "#lib/components/TemplateMessage.svelte";
import { formIntroMessage } from "#lib/messages.ts";
import { state as appState } from "#lib/state.svelte.ts";
import { STEPS } from "#lib/steps.ts";
import DeadlineInputs from "./DeadlineInputs.svelte";
import WizardStep from "./WizardStep.svelte";

const message = $derived(
	formIntroMessage(appState.tag, appState.formattedDatum, appState.uhrzeit),
);
</script>

<WizardStep
    index={STEPS.deadline}
    title="Deadline festlegen und ins Formular schreiben"
    checkDisabled={!appState.deadlineComplete}
>
    <p class="description">
        Leg die Deadline fest. Sie steht danach im Formular und in allen
        Nachrichten ans Semester.
    </p>
    <DeadlineInputs bind:datum={appState.datum} bind:uhrzeit={appState.uhrzeit} />
    <p class="description">
        Das kopierte Formular hat noch keinen Einleitungstext. Setz diesen ein:
    </p>
    <TemplateMessage message={message} disabled={!appState.deadlineComplete} />
    <small class="hint">
        Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Feld
        „Formularbeschreibung“ unter dem Titel anklicken
        <ChevronRight size={12} class="inline-arrow" /> Text einfügen.
    </small>
</WizardStep>
