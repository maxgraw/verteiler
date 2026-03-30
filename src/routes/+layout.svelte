<script lang="ts">
    import "$lib/styles/app.css";

    let { children } = $props();
</script>

<svelte:head></svelte:head>

{@render children()}
