<script lang="ts">
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import { reminderMessage } from "$lib/messages";
import { state } from "$lib/state.svelte";
import WizardStep from "./WizardStep.svelte";

const message = $derived(reminderMessage(state.tag, state.uhrzeit));
</script>

<WizardStep index={4} title="Einen Tag vor Deadline: Erinnerung schicken">
    <p class="description">
        Schick diese Erinnerung einen Tag vor der Deadline in die
        Semestergruppe.
    </p>
    <TemplateMessage {message} disabled={!state.deadlineComplete} />
</WizardStep>
