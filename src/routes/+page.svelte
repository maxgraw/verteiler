<script lang="ts">
import AppHeader from "./AppHeader.svelte";
import StepFormsCopy from "./_steps/StepFormsCopy.svelte";
import StepDeadline from "./_steps/StepDeadline.svelte";
import StepFormsUrl from "./_steps/StepFormsUrl.svelte";
import StepFormsClose from "./_steps/StepFormsClose.svelte";
import StepDeadlineMessage from "./_steps/StepDeadlineMessage.svelte";
import StepReminder from "./_steps/StepReminder.svelte";
import StepExport from "./_steps/StepExport.svelte";
import StepCsvUpload from "./_steps/StepCsvUpload.svelte";
import StepCapacities from "./_steps/StepCapacities.svelte";
import StepAlgorithm from "./_steps/StepAlgorithm/StepAlgorithm.svelte";
</script>

<AppHeader />

<main>
    <ol>
        <li><StepFormsCopy /></li>
        <li><StepDeadline /></li>
        <li><StepFormsUrl /></li>
        <li><StepFormsClose /></li>
        <li><StepDeadlineMessage /></li>
        <li><StepReminder /></li>
        <li><StepExport /></li>
        <li><StepCsvUpload /></li>
        <li><StepCapacities /></li>
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
