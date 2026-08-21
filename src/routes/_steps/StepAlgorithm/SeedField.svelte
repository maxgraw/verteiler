<script lang="ts">
interface Props {
	seed: string;
}

let { seed }: Props = $props();
</script>

<p class="lottery">
    <span class="label">Auslosung</span>
    <span class="seed">{seed}</span>
    <span class="note">
        Meist gibt es mehrere gleich gute Verteilungen. Welche davon herauskommt,
        entscheidet die Auslosung. Sie ergibt sich aus den Anmeldungen: dieselbe
        CSV liefert immer dasselbe Ergebnis.
    </span>
</p>

<style>
    .lottery {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0 var(--space-2);
        margin: 0;
        padding: var(--space-2) var(--space-3);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        background: var(--color-bg-subtle);
    }

    .label {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    .seed {
        font-family: ui-monospace, monospace;
        font-size: var(--text-sm);
        letter-spacing: 0.08em;
        color: var(--color-text-subtle);
    }

    .note {
        grid-column: 1 / -1;
        margin-top: var(--space-1);
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }
</style>
