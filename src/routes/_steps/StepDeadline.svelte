<script lang="ts">
import { ChevronRight } from "@lucide/svelte";
import DeadlineInputs from "#lib/components/DeadlineInputs.svelte";
import TemplateMessage from "#lib/components/TemplateMessage.svelte";
import { formIntroMessage } from "#lib/messages.ts";
import { state } from "#lib/state.svelte.ts";
import { STEPS } from "#lib/steps.ts";
import WizardStep from "./WizardStep.svelte";

const message = $derived(
	formIntroMessage(state.tag, state.formattedDatum, state.uhrzeit),
);
</script>

<WizardStep
    index={STEPS.deadline}
    title="Deadline festlegen und ins Formular schreiben"
    checkDisabled={!state.deadlineComplete}
>
    <p class="description">
        Leg die Deadline fest. Sie steht danach im Formular und in allen
        Nachrichten ans Semester.
    </p>
    <DeadlineInputs bind:datum={state.datum} bind:uhrzeit={state.uhrzeit} />
    <p class="description">
        Das kopierte Formular hat noch keinen Einleitungstext. Setz diesen ein:
    </p>
    <TemplateMessage message={message} disabled={!state.deadlineComplete} />
    <small class="hint">
        Google Forms öffnen <ChevronRight size={12} class="inline-arrow" /> Feld
        „Formularbeschreibung“ unter dem Titel anklicken
        <ChevronRight size={12} class="inline-arrow" /> Text einfügen.
    </small>
</WizardStep>
