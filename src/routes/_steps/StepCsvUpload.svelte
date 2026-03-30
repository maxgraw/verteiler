<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";
    import { state as appState } from "$lib/state.svelte";
    import { parseChoices } from "$lib/parser";

    let error = $state("");
    let dragOver = $state(false);

    const studentCount = $derived(
        appState.parsedGroups?.reduce((sum, g) => sum + g.size, 0) ?? 0,
    );

    async function processFile(file: File) {
        error = "";
        appState.csvFileName = file.name;
        appState.parsedGroups = null;
        appState.parseWarnings = [];
        try {
            const { groups, warnings } = parseChoices(await file.text());
            appState.parsedGroups = groups;
            appState.parseWarnings = warnings;
        } catch (e) {
            error = e instanceof Error ? e.message : "Unbekannter Fehler";
            appState.csvFileName = "";
        }
    }

    async function handleFileChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) await processFile(file);
    }

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragOver = false;
        const file = e.dataTransfer?.files?.[0];
        if (file) await processFile(file);
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        dragOver = true;
    }

    function handleDragLeave() {
        dragOver = false;
    }

    function reset() {
        error = "";
        appState.csvFileName = "";
        appState.parsedGroups = null;
        appState.parseWarnings = [];
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
        <p class="description">
            Lade die heruntergeladene CSV-Datei aus Schritt 7 hoch.
        </p>

        {#if appState.parsedGroups}
            <div class="success-area">
                <div class="success-info">
                    <svg
                        class="file-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                        />
                    </svg>
                    <div class="success-text">
                        <span class="file-name">{appState.csvFileName}</span>
                        <span class="file-meta"
                            >{appState.parsedGroups.length} Gruppen · {studentCount}
                            Studierende</span
                        >
                    </div>
                </div>
                <button class="reset-btn" onclick={reset}>Entfernen</button>
            </div>
        {:else}
            <div
                class="upload-area"
                tabindex="0"
                class:drag-over={dragOver}
                ondrop={handleDrop}
                ondragover={handleDragOver}
                ondragleave={handleDragLeave}
            >
                <input
                    type="file"
                    id="csv-input"
                    accept=".csv"
                    onchange={handleFileChange}
                />
                <label for="csv-input">
                    <svg
                        class="upload-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                        />
                    </svg>
                    <span class="upload-label">CSV-Datei auswählen</span>
                    <span class="upload-hint">oder hierher ziehen</span>
                </label>
            </div>
        {/if}

        {#if error}
            <div class="error-box">{error}</div>
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
    .upload-area {
        position: relative;
    }

    .upload-area input[type="file"] {
        position: absolute;
        width: 1px;
        height: 1px;
        opacity: 0;
    }

    .upload-area label {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-6) var(--space-4);
        border: 1.5px dashed var(--color-border-input);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        color: var(--color-text-subtle);
        background: var(--color-bg-subtle);
        cursor: pointer;
        transition:
            border-color var(--transition-fast),
            color var(--transition-fast),
            background var(--transition-fast);
        text-align: center;
    }

    .upload-area label:hover,
    .upload-area.drag-over label {
        border-color: var(--color-primary);
        color: var(--color-text);
        background: var(--color-primary-bg);
    }

    .upload-icon {
        width: 2rem;
        height: 2rem;
        color: var(--color-text-subtle);
    }

    .upload-area label:hover .upload-icon,
    .upload-area.drag-over .upload-icon {
        color: var(--color-primary);
    }

    .upload-label {
        font-weight: 600;
        color: var(--color-text);
    }

    .upload-hint {
        font-size: var(--text-xs);
    }

    .success-area {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--color-success-border);
        border-radius: var(--radius-md);
        background: var(--color-success-bg);
    }

    .success-info {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        min-width: 0;
    }

    .file-icon {
        flex-shrink: 0;
        width: 1.75rem;
        height: 1.75rem;
        color: var(--color-choice-1);
    }

    .success-text {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
        min-width: 0;
    }

    .file-name {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .file-meta {
        font-size: var(--text-xs);
        color: var(--color-choice-1);
        font-weight: 500;
    }

    .reset-btn {
        flex-shrink: 0;
        font-size: var(--text-xs);
        font-weight: 600;
        color: var(--color-text-muted);
        background: none;
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition:
            color var(--transition-fast),
            border-color var(--transition-fast);
    }

    .reset-btn:hover {
        color: var(--color-error);
        border-color: var(--color-error);
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
