<script lang="ts">
    import StepFormsCopy from "./_steps/StepFormsCopy.svelte";
    import StepAnnounce from "./_steps/StepAnnounce.svelte";
    import StepFormsLink from "./_steps/StepFormsLink.svelte";
    import StepReminder from "./_steps/StepReminder.svelte";
    import StepFormsClose from "./_steps/StepFormsClose.svelte";
    import StepCsvDownload from "./_steps/StepCsvDownload.svelte";

    let open = $state([true, false, false, false, false, false]);

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
    const deadlineComplete = $derived(!!datum && !!uhrzeit && !!link);
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
        <li><StepAnnounce bind:open={open[1]} ondone={() => openNext(1)} /></li>
        <li>
            <StepFormsLink
                bind:open={open[2]}
                bind:datum
                bind:uhrzeit
                bind:link
                ondone={() => openNext(2)}
            />
        </li>
        <li>
            <StepReminder
                bind:open={open[3]}
                {tag}
                {uhrzeit}
                disabled={!deadlineComplete}
                ondone={() => openNext(3)}
            />
        </li>
        <li>
            <StepFormsClose bind:open={open[4]} ondone={() => openNext(4)} />
        </li>
        <li>
            <StepCsvDownload bind:open={open[5]} ondone={() => openNext(5)} />
        </li>
    </ol>
</main>
