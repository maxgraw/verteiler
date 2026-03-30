<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import { state } from '$lib/state.svelte';

    const FORMS_COPY_URL =
        'https://docs.google.com/forms/d/1NPfygE5n_37uiPebmw23j0SxaCU02rDuR3uaqfaO304/copy';
</script>

<Step num={1} title="Eigene Google Forms Kopie erstellen" bind:open={state.open[0]} bind:done={state.done[0]} ondone={() => state.openNext(0)}>
    <StepContent>
        <p class="description">
            Klicke auf den Button, um eine eigene Kopie des Formulars in deinem
            Google Drive zu erstellen. Jedes Semester braucht eine eigene Kopie,
            damit sich die Antworten nicht vermischen.
        </p>
        <a
            class="action"
            href={FORMS_COPY_URL}
            target="_blank"
            rel="noopener noreferrer"
        >
            Google Forms Kopie erstellen
        </a>
        <small class="hint">
            Google fragt dich, ob du eine Kopie erstellen möchtest — einfach
            bestätigen. Die Kopie erscheint dann in deinem Google Drive.
        </small>
    </StepContent>
</Step>

<style>
    .action {
        display: inline-block;
        padding: var(--space-2) var(--space-4);
        background: var(--color-primary);
        color: var(--color-surface);
        font-size: var(--text-base);
        font-weight: 600;
        border-radius: var(--radius-md);
        text-decoration: none;
        transition: background var(--transition-fast);
    }

    .action:hover {
        background: var(--color-primary-hover);
    }
</style>
