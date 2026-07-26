<script lang="ts">
import DeadlineInputs from "$lib/components/DeadlineInputs.svelte";
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import { deadlineMessage } from "$lib/messages";
import { state } from "$lib/state.svelte";
import WizardStep from "./WizardStep.svelte";

const complete = $derived(!!state.datum && !!state.uhrzeit && !!state.link);

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
    index={3}
    title="Deadline eintragen und Nachricht rausschicken"
    checkDisabled={!complete}
>
    <p class="description">
        Trag die Deadline ein und schick die fertige Nachricht in die Semestergruppe.
    </p>
    <DeadlineInputs bind:datum={state.datum} bind:uhrzeit={state.uhrzeit} />
    {#if !complete}
        <small class="missing">
            Noch fehlt:
            {[
                !state.link && 'Google Forms Link (Schritt 2)',
                !state.datum && 'Datum',
                !state.uhrzeit && 'Uhrzeit',
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
