<script lang="ts">
import TemplateMessage from "#lib/components/TemplateMessage.svelte";
import { deadlineMessage } from "#lib/messages.ts";
import { state as appState } from "#lib/state.svelte.ts";
import { STEPS } from "#lib/steps.ts";
import WizardStep from "./WizardStep.svelte";

const complete = $derived(appState.deadlineComplete && !!appState.link);

const message = $derived(
	deadlineMessage({
		tag: appState.tag,
		datum: appState.formattedDatum,
		uhrzeit: appState.uhrzeit,
		link: appState.link,
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
                !appState.deadlineComplete &&
                    `Deadline (Schritt ${STEPS.deadline + 1})`,
                !appState.link && `Google Forms Link (Schritt ${STEPS.formsUrl + 1})`,
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
