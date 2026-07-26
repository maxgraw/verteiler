<script lang="ts">
    import "$lib/styles/app.css";

    let { children } = $props();
</script>

<svelte:head>
    <title>Verteiler — Rotationsgruppenverteilung</title>
    <meta
        name="description"
        content="Schritt-für-Schritt-Tool für Semesterorganisatoren: Rotationsgruppen anhand der 1./2./3.-Wahl des Semesters verteilen."
    />
</svelte:head>

{@render children()}
