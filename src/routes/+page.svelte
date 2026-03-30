<script lang="ts">
    import { state } from "$lib/state.svelte";
    import StepFormsCopy from "./_steps/StepFormsCopy.svelte";
    import StepFormsUrl from "./_steps/StepFormsUrl.svelte";
    import StepAnnounce from "./_steps/StepAnnounce.svelte";
    import StepFormsLink from "./_steps/StepFormsLink.svelte";
    import StepReminder from "./_steps/StepReminder.svelte";
    import StepFormsClose from "./_steps/StepFormsClose.svelte";
    import StepCsvDownload from "./_steps/StepCsvDownload.svelte";
    import StepCsvUpload from "./_steps/StepCsvUpload.svelte";
    import StepAlgorithm from "./_steps/StepAlgorithm.svelte";
</script>

<header>
    <div class="header-text">
        <h1>Verteiler</h1>
        <p>Schritt-für-Schritt Anleitung zur Rotationsgruppenverteilung</p>
    </div>
    <button class="reset-btn" onclick={() => state.reset()}>Zurücksetzen</button>
</header>

<main>
    <ol>
        <li><StepFormsCopy /></li>
        <li><StepFormsUrl /></li>
        <li><StepAnnounce /></li>
        <li><StepFormsLink /></li>
        <li><StepReminder /></li>
        <li><StepFormsClose /></li>
        <li><StepCsvDownload /></li>
        <li><StepCsvUpload /></li>
        <li><StepAlgorithm /></li>
    </ol>
</main>

<style>
    header {
        max-width: var(--content-width);
        margin: 0 auto var(--space-8);
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-4);
    }

    h1 {
        font-size: var(--text-2xl);
        font-weight: 700;
        margin-bottom: var(--space-1);
    }

    p {
        color: var(--color-text-subtle);
    }

    .reset-btn {
        flex-shrink: 0;
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text-muted);
        background: none;
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: color var(--transition-fast), border-color var(--transition-fast);
    }

    .reset-btn:hover {
        color: var(--color-error);
        border-color: var(--color-error);
    }

    main {
        max-width: var(--content-width);
        margin: 0 auto;
    }

    ol {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }
</style>
