<script lang="ts">
    import StepFormsCopy from "./_steps/StepFormsCopy.svelte";
    import StepFormsUrl from "./_steps/StepFormsUrl.svelte";
    import StepAnnounce from "./_steps/StepAnnounce.svelte";
    import StepFormsLink from "./_steps/StepFormsLink.svelte";
    import StepReminder from "./_steps/StepReminder.svelte";
    import StepFormsClose from "./_steps/StepFormsClose.svelte";
    import StepCsvDownload from "./_steps/StepCsvDownload.svelte";

    let open = $state([true, false, false, false, false, false, false]);

    function openNext(i: number) {
        if (i + 1 < open.length) open[i + 1] = true;
    }

    // Shared between StepFormsLink and StepReminder
    let datum = $state("");
    let uhrzeit = $state("");
    let link = $state("");

    const tag = $derived(
        datum
            ? new Date(`${datum}T12:00`).toLocaleDateString("de-DE", {
                  weekday: "long",
              })
            : "",
    );
    const deadlineComplete = $derived(!!datum && !!uhrzeit);
</script>

<header>
    <h1>Verteiler</h1>
    <p>Schritt-für-Schritt Anleitung zur Rotationsgruppenverteilung</p>
</header>

<main>
    <ol>
        <li>
            <StepFormsCopy bind:open={open[0]} ondone={() => openNext(0)} />
        </li>
        <li>
            <StepFormsUrl
                bind:open={open[1]}
                bind:link
                ondone={() => openNext(1)}
            />
        </li>
        <li><StepAnnounce bind:open={open[2]} ondone={() => openNext(2)} /></li>
        <li>
            <StepFormsLink
                bind:open={open[3]}
                bind:datum
                bind:uhrzeit
                {link}
                ondone={() => openNext(3)}
            />
        </li>
        <li>
            <StepReminder
                bind:open={open[4]}
                {tag}
                {uhrzeit}
                disabled={!deadlineComplete}
                ondone={() => openNext(4)}
            />
        </li>
        <li>
            <StepFormsClose bind:open={open[5]} ondone={() => openNext(5)} />
        </li>
        <li>
            <StepCsvDownload bind:open={open[6]} ondone={() => openNext(6)} />
        </li>
    </ol>
</main>

<style>
    header {
        max-width: var(--content-width);
        margin: 0 auto var(--space-8);
    }

    h1 {
        font-size: var(--text-2xl);
        font-weight: 700;
        margin-bottom: var(--space-1);
    }

    p {
        color: var(--color-text-subtle);
    }

    main {
        max-width: var(--content-width);
        margin: 0 auto;
    }

    ol {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
    }
</style>
