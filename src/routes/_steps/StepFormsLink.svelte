<script lang="ts">
    import Step from "$lib/components/Step.svelte";
    import StepContent from "$lib/components/StepContent.svelte";
    import TemplateMessage from "$lib/components/TemplateMessage.svelte";
    import DeadlineInputs from "$lib/components/DeadlineInputs.svelte";

    interface Props {
        open?: boolean;
        ondone?: () => void;
        datum?: string;
        uhrzeit?: string;
        link?: string;
    }

    let {
        open = $bindable(false),
        ondone,
        datum = $bindable(""),
        uhrzeit = $bindable(""),
        link = "",
    }: Props = $props();

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
    const complete = $derived(!!datum && !!uhrzeit && !!link);

    const message = $derived(
        "Liebes Semester,\n\n" +
            `ich bitte euch eure Rotationsgruppen-Wünsche bis ${tag || "[TAG]"}, den ${formattedDatum || "[DATUM]"} um ${uhrzeit || "[UHRZEIT]"} Uhr in das Google Formular einzutragen!\n\n` +
            `${link || "[LINK]"}\n\n` +
            "Dieses Formular wird bis zur genannten Deadline offen bleiben und danach wird der Algorithmus drüber laufen. " +
            "Alle, die sich bis dahin nicht ins Formular eingetragen haben, können nicht mehr berücksichtigt werden.\n\n" +
            "Ein paar Hinweise:\n" +
            "- Es handelt sich NICHT um ein First-come-First-serve-System, also kein Stress!\n" +
            "- Es reicht das Ausfüllen des Formulars durch eine Person eurer Gruppe — diese gibt alle Namen an.\n" +
            "- Bitte absprecht, wer eure Gruppe einträgt, damit es keine Doppelungen gibt.\n" +
            "- Bitte die Anzahl der Gruppenmitglieder mit der Anzahl der Namen abgleichen!\n" +
            "- Alleinanmeldungen bitte auch über das Google Form.\n" +
            "- Wenn ihr euch vertan habt: NICHT nochmal eintragen, sondern mir eine Nachricht schicken.\n" +
            "- Vorangemeldete Personen tragen sich hier NICHT ein!\n" +
            "- 1./2./3.-Wahl ist entsprechend gewichtet.\n" +
            "- Ein Erhalt der 1., 2. oder 3. Wahl kann nicht garantiert werden.\n" +
            "- Die Gruppe bleibt in jedem Fall zusammen.\n\n" +
            "Bei Fragen gerne melden!",
    );
</script>

<Step
    num={4}
    title="Google Forms Link mit Deadline rausschicken"
    bind:open
    {ondone}
>
    <StepContent>
        <p class="description">
            Deadline und Link eingeben — die fertige Nachricht in die
            Semestergruppe schicken.
        </p>
        <DeadlineInputs bind:datum bind:uhrzeit />
        <TemplateMessage {message} disabled={!complete} />
    </StepContent>
</Step>
