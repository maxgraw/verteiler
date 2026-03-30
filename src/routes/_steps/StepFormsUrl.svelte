<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import ImageHint from '$lib/components/ImageHint.svelte';
    import { state } from '$lib/state.svelte';

    const isValidLink = $derived(
        state.link.startsWith('https://docs.google.com/forms/') &&
            state.link.includes('/viewform'),
    );
    const linkError = $derived.by(() => {
        if (state.link.length === 0) return '';
        if (!state.link.startsWith('https://docs.google.com/forms/'))
            return 'Das sieht nicht wie ein Google Forms Link aus. Der Link muss mit https://docs.google.com/forms/ beginnen.';
        if (state.link.includes('/edit') || state.link.includes('/copy'))
            return 'Das ist kein Teilnehmerlink. Bitte den Link über "Veröffentlichen" und dann "Teilnehmerlink kopieren" holen - er enthält /viewform.';
        if (!state.link.includes('/viewform'))
            return 'Bitte den Teilnehmerlink einfügen. Er enthält /viewform und ist über "Veröffentlichen" und dann "Teilnehmerlink kopieren" erreichbar.';
        return '';
    });
</script>

<Step
    num={2}
    title="Formular veröffentlichen und Link speichern"
    bind:open={state.open[1]}
    bind:done={state.done[1]}
    ondone={() => state.openNext(1)}
    checkDisabled={!isValidLink}
>
    <StepContent>
        <ol>
            <li>Kopiertes Google Forms öffnen</li>
            <li>
                „Veröffentlichen" oben rechts klicken und im Dialog bestätigen.
                <ImageHint src="/images/forms-publish.png" />
            </li>
            <li>
                Im erscheinenden Dialog „Teilnehmerlink kopieren" klicken.
                <ImageHint src="/images/forms-link.png" />
            </li>
            <li>Link hier einfügen.</li>
        </ol>
        <small class="hint">Der Link wird später automatisch in die Nachrichten eingefügt.</small>
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
    </StepContent>
</Step>

<style>
    .field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    label {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    input {
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border-input);
        border-radius: var(--radius-sm);
        font-size: var(--text-base);
        background: var(--color-bg-subtle);
        width: 100%;
    }

    input:focus {
        outline: 2px solid var(--color-primary);
        outline-offset: 1px;
    }

    input:user-invalid {
        border-color: var(--color-error);
        background: var(--color-error-bg);
    }

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
