<script lang="ts">
import WizardStep from "./WizardStep.svelte";

const FORMS_COPY_URL =
	"https://docs.google.com/forms/d/1NPfygE5n_37uiPebmw23j0SxaCU02rDuR3uaqfaO304/copy";
</script>

<WizardStep index={0} title="Eigene Google Forms Kopie erstellen">
    <p class="description">
        Leg eine eigene Kopie des Formulars in deinem Google Drive an. Jedes
        Semester braucht eine eigene, damit sich die Antworten nicht vermischen.
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
        Google fragt nach, ob du eine Kopie erstellen möchtest — einfach
        bestätigen.
    </small>
</WizardStep>

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
