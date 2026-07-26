<script lang="ts">
import { state } from "$lib/state.svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";

const isValidLink = $derived(
	state.link.startsWith("https://docs.google.com/forms/") &&
		state.link.includes("/viewform"),
);
const linkError = $derived.by(() => {
	if (state.link.length === 0) return "";
	if (!state.link.startsWith("https://docs.google.com/forms/"))
		return "Das sieht nicht wie ein Google Forms Link aus. Der Link muss mit https://docs.google.com/forms/ beginnen.";
	if (state.link.includes("/edit") || state.link.includes("/copy"))
		return "Das ist kein Teilnehmerlink. Hol ihn über „Veröffentlichen“ und dann „Teilnehmerlink kopieren“ — er enthält /viewform.";
	if (!state.link.includes("/viewform"))
		return "Bitte den Teilnehmerlink einfügen. Er enthält /viewform und steht unter „Veröffentlichen“ und dann „Teilnehmerlink kopieren“.";
	return "";
});
</script>

<WizardStep
    index={STEPS.formsUrl}
    title="Formular veröffentlichen und Link speichern"
    checkDisabled={!isValidLink}
>
    <ol>
        <li>Kopiertes Google Forms öffnen.</li>
        <li>Oben rechts „Veröffentlichen“ klicken und im Dialog bestätigen.</li>
        <li>Im nächsten Dialog „Teilnehmerlink kopieren“ klicken.</li>
        <li>Link hier einfügen.</li>
    </ol>
    <div class="field">
        <label for="forms-url">Google Forms Link</label>
        {#if isValidLink}
            <div class="confirmed">
                <span class="confirmed-text">{state.link}</span>
                <button class="change-btn" onclick={() => (state.link = '')}>Ändern</button>
            </div>
        {:else}
            <input
                type="url"
                id="forms-url"
                placeholder="https://docs.google.com/forms/..."
                required
                pattern="https://docs\.google\.com/forms/.*/viewform.*"
                bind:value={state.link}
            />
            {#if linkError}
                <small class="error">{linkError}</small>
            {/if}
        {/if}
    </div>
</WizardStep>

<style>
    .confirmed {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-success-border, var(--color-primary));
        border-radius: var(--radius-sm);
        background: var(--color-success-bg, var(--color-primary-bg));
    }

    .confirmed-text {
        flex: 1;
        font-size: var(--text-sm);
        color: var(--color-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }

    .change-btn {
        flex-shrink: 0;
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        background: none;
        padding: 0;
        cursor: pointer;
    }

    .change-btn:hover {
        text-decoration: underline;
    }

    .error {
        font-size: var(--text-sm);
        color: var(--color-error);
    }
</style>
