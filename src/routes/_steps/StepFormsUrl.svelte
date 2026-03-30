<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";

    interface Props {
        open?: boolean;
        ondone?: () => void;
        link?: string;
    }

    let {
        open = $bindable(false),
        ondone,
        link = $bindable(""),
    }: Props = $props();

    const isValidLink = $derived(link.startsWith('https://docs.google.com/forms/'));
</script>

<Step num={2} title="Formular veröffentlichen und Link speichern" bind:open {ondone} checkDisabled={!isValidLink}>
    <StepContent>
        <ol>
            <li>Google Forms öffnen → Senden.</li>
            <li>Link-Symbol auswählen → „Link kopieren".</li>
            <li>Link hier einfügen.</li>
        </ol>
        <small class="hint">Der Link wird später automatisch in die Nachrichten eingefügt.</small>
        <div class="field">
            <label for="forms-url">Google Forms Link</label>
            <input
                type="url"
                id="forms-url"
                placeholder="https://docs.google.com/forms/..."
                required
                pattern="https://docs\.google\.com/forms/.*"
                bind:value={link}
            />
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
</style>
