<script lang="ts">
import { formsLinkError, isFormsLink } from "#lib/forms-link.ts";
import { state as appState } from "#lib/state.svelte.ts";
import { STEPS } from "#lib/steps.ts";
import WizardStep from "./WizardStep.svelte";

const isValidLink = $derived(isFormsLink(appState.link));
const linkError = $derived(formsLinkError(appState.link));
</script>

<WizardStep
    index={STEPS.formsUrl}
    title="Formular veröffentlichen und Link speichern"
    checkDisabled={!isValidLink}
>
    <ol>
        <li>Kopiertes Google Forms öffnen.</li>
        <li>
            Oben rechts „Veröffentlichen“ klicken und im Dialog unten nochmal
            „Veröffentlichen“ bestätigen.
        </li>
        <li>Der Teilnehmerlink erscheint danach oben rechts. Kopieren.</li>
        <li>Link hier einfügen.</li>
    </ol>
    <div class="field">
        <label for="forms-url">Google Forms Link</label>
        {#if isValidLink}
            <div class="confirmed">
                <span class="confirmed-text">{appState.link}</span>
                <button class="change-btn" onclick={() => (appState.link = '')}>Ändern</button>
            </div>
        {:else}
            <input
                type="url"
                id="forms-url"
                placeholder="https://forms.gle/..."
                required
                bind:value={appState.link}
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
        border: 1px solid var(--color-success-border);
        border-radius: var(--radius-sm);
        background: var(--color-success-bg);
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
