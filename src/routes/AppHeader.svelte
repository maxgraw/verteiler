<script lang="ts">
import Alert from "$lib/components/Alert.svelte";
import { state } from "$lib/state.svelte";
</script>

<header>
    <div class="header-top">
        <div>
            <h1>Verteiler</h1>
            <p class="tagline">
                Rotationsgruppenverteilung für Semesterorganisatoren
            </p>
        </div>
        <button class="reset-btn" onclick={() => state.reset()}
            >Zurücksetzen</button
        >
    </div>

    {#if state.outdated}
        <Alert variant="warning">
            <p>
                Auf diesem Gerät liegt ein gespeicherter Fortschritt aus einer
                älteren Version dieser App. Er lässt sich nicht weiterverwenden,
                und bis du zurücksetzt wird nichts Neues gespeichert.
            </p>
            <div>
                <button class="outdated-btn" onclick={() => state.reset()}>
                    Zurücksetzen und neu starten
                </button>
            </div>
        </Alert>
    {/if}

    <div class="intro">
        <p>
            Diese App führt vom Google Forms bis zur fertigen
            Gruppenverteilung. Arbeite die Schritte der Reihe nach ab.
        </p>
        <p class="save-note">
            Dein Fortschritt wird auf diesem Gerät gespeichert und übersteht das
            Schließen des Browsers.
        </p>
    </div>
</header>

<style>
    header {
        max-width: var(--content-width);
        margin: 0 auto var(--space-8);
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .header-top {
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

    .tagline {
        color: var(--color-text-subtle);
    }

    .intro {
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-4) var(--space-5);
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }

    .intro p {
        font-size: var(--text-sm);
        color: var(--color-text-secondary);
        line-height: 1.6;
    }

    .save-note {
        font-size: var(--text-xs) !important;
        color: var(--color-text-subtle) !important;
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
        transition:
            color var(--transition-fast),
            border-color var(--transition-fast);
    }

    .reset-btn:hover {
        color: var(--color-error);
        border-color: var(--color-error);
    }

    .outdated-btn {
        font-size: var(--text-sm);
        font-weight: 600;
        color: inherit;
        background: none;
        padding: var(--space-1) var(--space-3);
        border: 1px solid var(--color-warning-border);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background var(--transition-fast);
    }

    .outdated-btn:hover {
        background: var(--color-warning-border);
    }
</style>
