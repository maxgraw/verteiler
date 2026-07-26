<script lang="ts">
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import { deadlineMessage } from "$lib/messages";
import { state } from "$lib/state.svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";

const complete = $derived(state.deadlineComplete && !!state.link);

const message = $derived(
	deadlineMessage({
		tag: state.tag,
		datum: state.formattedDatum,
		uhrzeit: state.uhrzeit,
		link: state.link,
		lotterySeed: state.lotterySeed,
	}),
);
</script>

<WizardStep
    index={STEPS.deadlineMessage}
    title="Deadline-Nachricht rausschicken"
    checkDisabled={!complete}
>
    <p class="description">
        Schick die fertige Nachricht mit Deadline und Link in die Semestergruppe.
    </p>
    {#if !complete}
        <small class="missing">
            Noch fehlt:
            {[
                !state.deadlineComplete &&
                    `Deadline (Schritt ${STEPS.deadline + 1})`,
                !state.link && `Google Forms Link (Schritt ${STEPS.formsUrl + 1})`,
            ]
                .filter(Boolean)
                .join(', ')}
        </small>
    {/if}
    <TemplateMessage {message} disabled={!complete} />
</WizardStep>

<style>
    .missing {
        font-size: var(--text-sm);
        color: var(--color-error);
    }
</style>
