<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";
    import TemplateMessage from "$lib/components/TemplateMessage.svelte";
    import DeadlineInputs from "$lib/components/DeadlineInputs.svelte";

    const FORMS_COPY_URL =
        "https://docs.google.com/forms/d/REPLACE_WITH_FORM_ID/copy";

    // Step open states — first step starts open
    let open = $state([true, false, false, false, false, false]);

    function openNext(i: number) {
        if (i + 1 < open.length) open[i + 1] = true;
    }

    // Deadline state — shared between steps 3 and 4
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
    const formattedDatum = $derived(
        datum ? datum.split("-").reverse().join(".") : "",
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
            <Step
                num={1}
                title="Eigene Google Forms Kopie erstellen"
                bind:open={open[0]}
                ondone={() => openNext(0)}
            >
                <StepContent>
                    <p class="description">
                        Klicke auf den Button, um eine eigene Kopie des
                        Formulars in deinem Google Drive zu erstellen. Jedes
                        Semester braucht eine eigene Kopie, damit sich die
                        Antworten nicht vermischen.
                    </p>
                    <a
                        class="action"
                        href={FORMS_COPY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Google Forms Kopie erstellen
                    </a>
                    <small class="hint">
                        Google fragt dich, ob du eine Kopie erstellen möchtest —
                        einfach bestätigen. Die Kopie erscheint dann in deinem
                        Google Drive.
                    </small>
                </StepContent>
            </Step>
        </li>

        <li>
            <Step
                num={2}
                title="Semester über das Verfahren informieren"
                bind:open={open[1]}
                ondone={() => openNext(1)}
            >
                <StepContent>
                    <p>
                        Schick diese Nachricht in eure Semestergruppe, bevor du
                        das Google Forms rausschickst.
                    </p>
                    <TemplateMessage>
                        Hallo an Alle!<br /><br />
                        ich habe einen Vorschlag, wie wir die Verteilung der Rotationsgruppen
                        semesterintern umsetzen können und würde hierfür die Organisation
                        übernehmen. Es gibt ein 1./2./3.-Wahl-Verfahren, bei dem man
                        3 (von den 8) Zeitslots im Rotationsplan als Wahl angibt.
                        Ein Algorithmus berechnet dann anhand eurer Wahlen eine bestmögliche
                        Verteilung der Rotationsgruppen für unser Semester.<br
                        /><br />
                        LG
                    </TemplateMessage>
                </StepContent>
            </Step>
        </li>

        <li>
            <Step
                num={3}
                title="Google Forms Link mit Deadline rausschicken"
                bind:open={open[2]}
                ondone={() => openNext(2)}
            >
                <StepContent>
                    <p>
                        Deadline und Link eingeben — die fertige Nachricht in
                        die Semestergruppe schicken.
                    </p>
                    <DeadlineInputs bind:datum bind:uhrzeit bind:link />
                    <TemplateMessage disabled={!deadlineComplete}>
                        Liebes Semester,<br /><br />
                        ich bitte euch eure Rotationsgruppen-Wünsche bis {tag ||
                            "[TAG]"}, den {formattedDatum || "[DATUM]"} um {uhrzeit ||
                            "[UHRZEIT]"} Uhr in das Google Formular einzutragen!<br
                        /><br />
                        {link || "[LINK]"}<br /><br />
                        Dieses Formular wird bis zur genannten Deadline offen bleiben
                        und danach wird der Algorithmus drüber laufen. Alle, die sich
                        bis dahin nicht ins Formular eingetragen haben, können nicht
                        mehr berücksichtigt werden.<br /><br />
                        Ein paar Hinweise:<br />
                        - Es handelt sich NICHT um ein First-come-First-serve-System,
                        also kein Stress!<br />
                        - Es reicht das Ausfüllen des Formulars durch eine Person
                        eurer Gruppe — diese gibt alle Namen an.<br />
                        - Bitte absprecht, wer eure Gruppe einträgt, damit es keine
                        Doppelungen gibt.<br />
                        - Bitte die Anzahl der Gruppenmitglieder mit der Anzahl der
                        Namen abgleichen!<br />
                        - Alleinanmeldungen bitte auch über das Google Form.<br
                        />
                        - Wenn ihr euch vertan habt: NICHT nochmal eintragen, sondern
                        mir eine Nachricht schicken.<br />
                        - Vorangemeldete Personen tragen sich hier NICHT ein!<br
                        />
                        - 1./2./3.-Wahl ist entsprechend gewichtet.<br />
                        - Ein Erhalt der 1., 2. oder 3. Wahl kann nicht garantiert
                        werden.<br />
                        - Die Gruppe bleibt in jedem Fall zusammen.<br /><br />
                        Bei Fragen gerne melden!
                    </TemplateMessage>
                </StepContent>
            </Step>
        </li>

        <li>
            <Step
                num={4}
                title="Einen Tag vor Deadline: Erinnerung schicken"
                bind:open={open[3]}
                ondone={() => openNext(3)}
            >
                <StepContent>
                    <TemplateMessage disabled={!deadlineComplete}>
                        Friendly reminder: bitte noch bis {tag || "[TAG]"}, {uhrzeit ||
                            "[UHRZEIT]"} Uhr ins Google Forms eintragen für die Rotationsgruppen
                        😊 Wer nicht eingetragen ist, von dem wissen wir nicht, dass
                        er/sie existiert — diese Personen bekommen keine Gruppe zugeteilt
                        und müssen Restplätze nehmen.
                    </TemplateMessage>
                </StepContent>
            </Step>
        </li>

        <li>
            <Step
                num={5}
                title="Google Forms nach Deadline schließen"
                bind:open={open[4]}
                ondone={() => openNext(4)}
            >
                <StepContent>
                    <ol>
                        <li>Google Forms öffnen → Reiter Antworten.</li>
                        <li>
                            Den Schalter „Antworten möglich" umlegen, bis
                            „Antworten werden nicht akzeptiert" erscheint.
                        </li>
                        <li>Ab jetzt kann sich niemand mehr eintragen.</li>
                    </ol>
                </StepContent>
            </Step>
        </li>

        <li>
            <Step
                num={6}
                title="Antworten als CSV herunterladen"
                bind:open={open[5]}
                ondone={() => openNext(5)}
            >
                <StepContent>
                    <ol>
                        <li>Google Forms öffnen → Reiter Antworten.</li>
                        <li>
                            Oben rechts auf das Tabellen-Symbol klicken (→
                            Google Tabellen).
                        </li>
                        <li>
                            In Google Tabellen: Datei → Herunterladen →
                            Kommagetrennte Werte (.csv).
                        </li>
                        <li>
                            Die heruntergeladene Datei im nächsten Schritt
                            hochladen.
                        </li>
                    </ol>
                </StepContent>
            </Step>
        </li>
    </ol>
</main>
