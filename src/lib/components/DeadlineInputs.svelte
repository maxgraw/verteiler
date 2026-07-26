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
</style>
