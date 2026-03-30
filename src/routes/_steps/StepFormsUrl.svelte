<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";

    interface Props {
        open?: boolean;
        done?: boolean;
        ondone?: () => void;
        link?: string;
    }

    let {
        open = $bindable(false),
        done = $bindable(false),
        ondone,
        link = $bindable(""),
    }: Props = $props();

    const isValidLink = $derived(
        link.startsWith("https://docs.google.com/forms/") &&
            link.includes("/viewform"),
    );
    const linkError = $derived.by(() => {
        if (link.length === 0) return "";
        if (!link.startsWith("https://docs.google.com/forms/"))
            return "Das sieht nicht wie ein Google Forms Link aus. Der Link muss mit https://docs.google.com/forms/ beginnen.";
        if (link.includes("/edit") || link.includes("/copy"))
            return 'Das ist kein Teilnehmerlink. Bitte den Link über "Veröffentlichen" und dann "Teilnehmerlink kopieren" holen - er enthält /viewform.';
        if (!link.includes("/viewform"))
            return 'Bitte den Teilnehmerlink einfügen. Er enthält /viewform und ist über "Veröffentlichen" und dann "Teilnehmerlink kopieren" erreichbar.';
        return "";
    });
</script>

<Step
    num={2}
    title="Formular veröffentlichen und Link speichern"
    bind:open
    bind:done
    {ondone}
    checkDisabled={!isValidLink}
>
    <StepContent>
        <ol>
            <li>Kopiertes Google Forms öffnen</li>
            <li>„Veröffentlichen" oben rechts klicken.</li>
            <li>Im Dialog erneut „Veröffentlichen" bestätigen.</li>
            <li>
                Oben rechts sollte ein Dialog mit „Teilnehmerlink kopieren"
                klicken erscheinen.
            </li>
            <li>„Teilnehmerlink kopieren" klicken.</li>
            <li>Link hier einfügen.</li>
        </ol>
        <small class="hint"
            >Der Link wird später automatisch in die Nachrichten eingefügt.</small
        >
        <div class="field">
            <label for="forms-url">Google Forms Link</label>
            {#if isValidLink}
                <div class="confirmed">
                    <span class="confirmed-text">{link}</span>
                    <button class="change-btn" onclick={() => (link = "")}>Ändern</button>
                </div>
            {:else}
                <input
                    type="url"
                    id="forms-url"
                    placeholder="https://docs.google.com/forms/..."
                    required
                    pattern="https://docs\.google\.com/forms/.*/viewform.*"
                    bind:value={link}
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
