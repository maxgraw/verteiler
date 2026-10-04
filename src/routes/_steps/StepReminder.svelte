<script lang="ts">
import TemplateMessage from "#lib/components/TemplateMessage.svelte";
import { reminderMessage } from "#lib/messages.ts";
import { state as appState } from "#lib/state.svelte.ts";
import { STEPS } from "#lib/steps.ts";
import WizardStep from "./WizardStep.svelte";

const message = $derived(reminderMessage(appState.tag, appState.uhrzeit));
</script>

<WizardStep index={STEPS.reminder} title="Einen Tag vor Deadline: Erinnerung schicken">
    <p class="description">
        Schick diese Erinnerung einen Tag vor der Deadline in die
        Semestergruppe.
    </p>
    <TemplateMessage {message} disabled={!appState.deadlineComplete} />
</WizardStep>
