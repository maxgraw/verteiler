<script lang="ts">
    import Step from '$lib/components/Step.svelte';
    import StepContent from '$lib/components/StepContent.svelte';
    import { state as appState } from '$lib/state.svelte';
    import { parseChoices } from '$lib/parser';

    let error = $state('');

    async function handleFileChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        error = '';
        appState.csvFileName = file.name;
        appState.parsedGroups = null;
        appState.parseWarnings = [];
        try {
            const { groups, warnings } = parseChoices(await file.text());
            appState.parsedGroups = groups;
            appState.parseWarnings = warnings;
        } catch (e) {
            error = e instanceof Error ? e.message : 'Unbekannter Fehler';
            appState.csvFileName = '';
        }
    }
</script>

<Step
    num={8}
    title="CSV hochladen"
    bind:open={appState.open[7]}
    bind:done={appState.done[7]}
    ondone={() => appState.openNext(7)}
    checkDisabled={!appState.parsedGroups}
>
    <StepContent>
        <p class="description">Lade die heruntergeladene CSV-Datei aus Schritt 7 hoch.</p>

        <div class="upload-area" class:has-file={!!appState.parsedGroups}>
            <input type="file" id="csv-input" accept=".csv" onchange={handleFileChange} />
            <label for="csv-input">
                {appState.csvFileName || 'CSV-Datei auswählen'}
            </label>
        </div>

        {#if error}
            <div class="error-box">{error}</div>
        {/if}

        {#if appState.parsedGroups}
            <small class="hint">{appState.parsedGroups.length} Gruppen eingelesen.</small>
        {/if}

        {#if appState.parseWarnings.length}
            <div class="warnings">
                <strong>Hinweise zur CSV:</strong>
                <ul>
                    {#each appState.parseWarnings as w}
                        <li>{w}</li>
                    {/each}
                </ul>
            </div>
        {/if}
    </StepContent>
</Step>

<style>
    .upload-area input[type='file'] {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
    }

    .upload-area label {
        display: block;
        padding: var(--space-2) var(--space-3);
        border: 1px dashed var(--color-border-input);
        border-radius: var(--radius-sm);
        font-size: var(--text-sm);
        color: var(--color-text-subtle);
        background: var(--color-bg-subtle);
        cursor: pointer;
        transition: border-color var(--transition-fast), color var(--transition-fast);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .upload-area label:hover {
        border-color: var(--color-primary);
        color: var(--color-text);
    }

    .upload-area.has-file label {
        border-style: solid;
        border-color: var(--color-success-border);
        background: var(--color-success-bg);
        color: var(--color-text-muted);
    }

    .error-box {
        padding: var(--space-3);
        border: 1px solid var(--color-error-border);
        border-radius: var(--radius-sm);
        background: var(--color-error-bg);
        color: var(--color-error-text);
        font-size: var(--text-sm);
    }

    .warnings {
        padding: var(--space-3);
        border: 1px solid var(--color-warning-border);
        border-radius: var(--radius-sm);
        background: var(--color-warning-bg);
        color: var(--color-warning-text);
        font-size: var(--text-sm);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .warnings ul {
        list-style: disc;
        padding-left: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }
</style>
