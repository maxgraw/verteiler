<script lang="ts">
    interface Props {
        datum?: string;
        uhrzeit?: string;
        link?: string;
    }

    let {
        datum = $bindable(''),
        uhrzeit = $bindable(''),
        link = $bindable(''),
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
    <div class="field field--link">
        <label for="deadline-link">Google Forms Link</label>
        <input
            type="url"
            id="deadline-link"
            placeholder="https://..."
            bind:value={link}
        />
    </div>
</div>

<style>
</style>
