<script lang="ts">
    import { state } from '$lib/state.svelte';
    import { ArrowRight } from '@lucide/svelte';
</script>

<header>
    <div class="header-top">
        <div>
            <h1>Verteiler</h1>
            <p class="tagline">Rotationsgruppenverteilung für Semesterorganisatoren</p>
        </div>
        <button class="reset-btn" onclick={() => state.reset()}>Zurücksetzen</button>
    </div>

    <div class="intro">
        <p>
            Diese App führt euch Schritt für Schritt durch den gesamten Prozess – vom Erstellen des
            Google-Formulars bis zur fertigen Gruppenverteilung. Folgt einfach den Schritten der
            Reihe nach.
        </p>
        <div class="flow">
            <span>Formular erstellen</span>
            <ArrowRight class="arrow" size={14} />
            <span>Anmeldungen sammeln</span>
            <ArrowRight class="arrow" size={14} />
            <span>Verteilung berechnen</span>
        </div>
        <p class="save-note">
            Euer Fortschritt wird automatisch gespeichert und bleibt nach dem Schließen des
            Browsers erhalten – aber nur auf diesem Gerät.
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

    .flow {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text);
    }

    :global(.arrow) {
        color: var(--color-text-faint);
        flex-shrink: 0;
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
</style>
