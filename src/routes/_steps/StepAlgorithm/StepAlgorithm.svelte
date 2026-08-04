<script lang="ts">
import { onDestroy } from "svelte";
import Alert from "$lib/components/Alert.svelte";
import CopyButton from "$lib/components/CopyButton.svelte";
import { NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT } from "$lib/config";
import {
	checkCapacity,
	formatDistribution,
	groupByTimeSlot,
	groupRows,
	sanitizeCapacities,
	toUserMessage,
} from "$lib/distribution";
import { buildSlots } from "$lib/parser";
import { downloadDistributionPdf } from "$lib/pdf";
import { SolverClient } from "$lib/solver-client";
import type { SolveResult } from "$lib/algorithm/types";
import { state as appState } from "$lib/state.svelte";
import { STEPS } from "$lib/steps";
import WizardStep from "../WizardStep.svelte";
import SpreadSummary from "./SpreadSummary.svelte";
import TimeSlotList from "./TimeSlotList.svelte";

let running = $state(false);
let statusMessage = $state("");
let solveResult = $state<SolveResult | null>(null);
let error = $state("");
let pdfRunning = $state(false);

const solver = new SolverClient();
onDestroy(() => solver.dispose());

// Prewarm worker when capacities step is completed
$effect(() => {
	if (appState.done[STEPS.capacities]) solver.prewarm();
});

// Clear results when CSV is removed or state is reset
$effect(() => {
	if (!appState.parsedGroups) {
		solveResult = null;
		error = "";
	}
});

async function run() {
	if (!appState.parsedGroups) return;
	error = "";
	solveResult = null;

	const capacities = sanitizeCapacities(appState.capacities);
	const capacityError = checkCapacity(appState.parsedGroups, capacities);
	if (capacityError) {
		error = capacityError;
		return;
	}

	running = true;
	statusMessage = "Starte…";
	try {
		solveResult = await solver.run(
			{
				groups: $state.snapshot(appState.parsedGroups),
				slots: buildSlots(NUM_TIME_SLOTS, SLOTS_PER_TIME_SLOT, capacities),
				lotterySeed: appState.lotterySeed,
			},
			(message) => {
				statusMessage = message;
			},
		);
	} catch (e) {
		error = toUserMessage(e);
	} finally {
		running = false;
		statusMessage = "";
	}
}

const zeitslots = $derived(
	solveResult ? groupByTimeSlot(solveResult.solution) : [],
);
const rows = $derived(groupRows(zeitslots));

async function downloadPdf() {
	if (!solveResult) return;
	error = "";
	pdfRunning = true;
	try {
		await downloadDistributionPdf(
			rows,
			solveResult.spread,
			solveResult.studentSpread,
		);
	} catch {
		error = "PDF konnte nicht erstellt werden. Bitte Seite neu laden.";
	} finally {
		pdfRunning = false;
	}
}
</script>

<WizardStep index={STEPS.algorithm} title="Verteilung berechnen" checkDisabled={!solveResult}>
    <p class="description">
        Der Algorithmus verteilt alle Gruppen möglichst nach ihren
        Wunsch-Zeitslots. Gezählt werden Studierende, nicht Gruppen: eine
        Sechsergruppe wiegt sechsmal so viel wie eine Einzelperson.
    </p>

    <button
        class="run-btn"
        onclick={run}
        disabled={!appState.parsedGroups || running}
    >
        Verteilung berechnen
    </button>

    {#if running}
        <div class="progress-info">
            <span class="spinner"></span>
            <span class="progress-status">{statusMessage}</span>
        </div>
    {/if}

    {#if error}
        <Alert variant="error">{error}</Alert>
    {/if}

    {#if solveResult}
        <div class="results">
            <SpreadSummary
                spread={solveResult.spread}
                studentSpread={solveResult.studentSpread}
            />
            <TimeSlotList timeSlots={zeitslots} />
            <CopyButton
                text={formatDistribution(rows)}
                label="Ergebnisse kopieren"
                variant="outlined"
            />
            <button class="pdf-btn" onclick={downloadPdf} disabled={pdfRunning}>
                {pdfRunning ? "PDF wird erstellt…" : "PDF herunterladen"}
            </button>
        </div>
    {/if}
</WizardStep>

<style>
    .run-btn {
        width: 100%;
        padding: var(--space-2) var(--space-4);
        background: var(--color-primary);
        color: white;
        font-weight: 600;
        font-size: var(--text-base);
        border-radius: var(--radius-md);
        transition: background var(--transition-fast);
    }

    .run-btn:hover:not(:disabled) {
        background: var(--color-primary-hover);
    }

    .run-btn:disabled {
        background: var(--color-primary-disabled);
        cursor: not-allowed;
    }

    .results {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .pdf-btn {
        width: 100%;
        padding: var(--space-2) var(--space-3);
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-primary);
        border: 1px solid var(--color-primary-border);
        border-radius: var(--radius-md);
        background: var(--color-primary-bg);
        transition: background var(--transition-fast);
    }

    .pdf-btn:hover:not(:disabled) {
        background: var(--color-primary-border);
    }

    .pdf-btn:disabled {
        color: var(--color-text-faint);
        cursor: not-allowed;
    }

    .progress-info {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-4);
        background: var(--color-bg-subtle);
        border-radius: var(--radius-md);
        font-size: var(--text-sm);
        border: 1px solid var(--color-border);
    }

    .spinner {
        flex-shrink: 0;
        width: 1rem;
        height: 1rem;
        border: 2px solid var(--color-border);
        border-top-color: var(--color-primary);
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .progress-status {
        color: var(--color-text-muted);
        font-weight: 500;
    }
</style>
