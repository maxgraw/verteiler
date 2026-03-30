<script lang="ts">
    import AppHeader from "./AppHeader.svelte";
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

<AppHeader />

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
