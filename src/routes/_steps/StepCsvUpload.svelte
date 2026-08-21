<script lang="ts">
import { FileText, Upload } from "@lucide/svelte";
import Alert from "$lib/components/Alert.svelte";
import { parseChoices } from "$lib/parser";
import { state as appState } from "$lib/state.svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";

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
	// Guarantees point at group indices, which mean something else in a new file
	appState.guarantees = [];
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
	appState.guarantees = [];
}
</script>

<WizardStep
    index={STEPS.csvUpload}
    title="CSV hochladen"
    checkDisabled={!appState.parsedGroups}
>
    <p class="description">
        Lad die CSV-Datei aus Schritt {STEPS.formsExport + 1} hoch.
    </p>

    {#if appState.parsedGroups}
        <div class="success-area">
            <div class="success-info">
                <span class="file-icon"><FileText size={28} /></span>
                <div class="success-text">
                    <span class="file-name">{appState.csvFileName}</span>
                    <span class="file-meta">
                        {appState.parsedGroups.length} Gruppen · {studentCount}
                        Studierende
                    </span>
                </div>
            </div>
            <button class="reset-btn" onclick={reset}>Entfernen</button>
        </div>
    {:else}
        <div class="upload-area" class:drag-over={dragOver}>
            <input
                type="file"
                id="csv-input"
                accept=".csv"
                onchange={handleFileChange}
            />
            <!-- Drag handlers sit on the label: it is the visible drop target and
                 reaches the keyboard through its associated file input. -->
            <label
                for="csv-input"
                ondrop={handleDrop}
                ondragover={handleDragOver}
                ondragleave={handleDragLeave}
            >
                <span class="upload-icon"><Upload size={32} /></span>
                <span class="upload-label">CSV-Datei auswählen</span>
                <span class="upload-hint">oder hierher ziehen</span>
            </label>
        </div>
    {/if}

    {#if error}
        <Alert variant="error">{error}</Alert>
    {/if}

    {#if appState.parseWarnings.length}
        <Alert variant="warning">
            <strong>Hinweise zur CSV:</strong>
            <ul class="warning-list">
                {#each appState.parseWarnings as w}
                    <li>{w}</li>
                {/each}
            </ul>
        </Alert>
    {/if}
</WizardStep>

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
        display: flex;
        color: var(--color-text-subtle);
        transition: color var(--transition-fast);
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
        display: flex;
        flex-shrink: 0;
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

    .warning-list {
        list-style: disc;
        padding-left: var(--space-4);
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }
</style>
