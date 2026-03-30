<script lang="ts">
    interface Props {
        datum?: string;
        uhrzeit?: string;
    }

    let {
        datum = $bindable(''),
        uhrzeit = $bindable(''),
    }: Props = $props();
</script>

<div class="inputs">
    <div class="field">
        <label for="deadline-datum">Datum</label>
        <input type="date" id="deadline-datum" bind:value={datum} />
    </div>
    <div class="field">
        <label for="deadline-uhrzeit">Uhrzeit</label>
        <input type="time" id="deadline-uhrzeit" bind:value={uhrzeit} />
    </div>
</div>

<style>
    .inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--space-3);
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    label {
        font-size: var(--text-sm);
        font-weight: 600;
        color: var(--color-text-secondary);
    }

    input {
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border-input);
        border-radius: var(--radius-sm);
        font-size: var(--text-base);
        background: var(--color-bg-subtle);
        width: 100%;
    }

    input:focus {
        outline: 2px solid var(--color-primary);
        outline-offset: 1px;
    }

    input:user-invalid {
        border-color: var(--color-error);
        background: var(--color-error-bg);
    }
</style>
