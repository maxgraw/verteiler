<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';

    const FORMS_COPY_URL = 'https://docs.google.com/forms/d/REPLACE_WITH_FORM_ID/copy';

    interface Props {
        open?: boolean;
        ondone?: () => void;
    }

    let { open = $bindable(false), ondone }: Props = $props();
</script>

<Step num={1} title="Eigene Google Forms Kopie erstellen" bind:open {ondone}>
    <StepContent>
        <p class="description">
            Klicke auf den Button, um eine eigene Kopie des Formulars in deinem
            Google Drive zu erstellen. Jedes Semester braucht eine eigene Kopie,
            damit sich die Antworten nicht vermischen.
        </p>
        <a class="action" href={FORMS_COPY_URL} target="_blank" rel="noopener noreferrer">
            Google Forms Kopie erstellen
        </a>
        <small class="hint">
            Google fragt dich, ob du eine Kopie erstellen möchtest — einfach
            bestätigen. Die Kopie erscheint dann in deinem Google Drive.
        </small>
    </StepContent>
</Step>
