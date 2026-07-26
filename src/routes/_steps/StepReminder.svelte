<script lang="ts">
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import { state } from "$lib/state.svelte";
import WizardStep from "./WizardStep.svelte";

const message = $derived(
	`Friendly reminder: bitte noch bis ${state.tag || "[TAG]"}, ${state.uhrzeit || "[UHRZEIT]"} Uhr ins Google Forms eintragen für die Rotationsgruppen 😊 ` +
		"Nicht eingetragene Personen werden bei der Verteilung nicht berücksichtigt und müssen Restplätze nehmen.",
);
</script>

<WizardStep index={4} title="Einen Tag vor Deadline: Erinnerung schicken">
    <p class="description">
        Schick diese Erinnerung einen Tag vor der Deadline in die
        Semestergruppe.
    </p>
    <TemplateMessage {message} disabled={!state.deadlineComplete} />
</WizardStep>
