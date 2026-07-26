<script lang="ts">
import DeadlineInputs from "$lib/components/DeadlineInputs.svelte";
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import { state } from "$lib/state.svelte";
import WizardStep from "./WizardStep.svelte";

const complete = $derived(!!state.datum && !!state.uhrzeit && !!state.link);

const message = $derived(
	"Liebes Semester,\n\n" +
		`ich bitte euch eure Rotationsgruppen-Wünsche bis ${state.tag || "[TAG]"}, den ${state.formattedDatum || "[DATUM]"} um ${state.uhrzeit || "[UHRZEIT]"} Uhr in das Google Formular einzutragen!\n\n` +
		`${state.link || "[LINK]"}\n\n` +
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
		"- Die Gruppe bleibt in jedem Fall zusammen.\n" +
		`- Sind mehrere Verteilungen gleich fair, entscheidet ein Losverfahren mit dem Startwert ${state.lotterySeed}. Den veröffentliche ich hiermit vorab, damit das Ergebnis nachvollziehbar bleibt.\n\n` +
		"Bei Fragen gerne melden!",
);
</script>

<WizardStep
    index={3}
    title="Deadline eintragen und Nachricht rausschicken"
    checkDisabled={!complete}
>
    <p class="description">
        Trag die Deadline ein und schick die fertige Nachricht in die Semestergruppe.
    </p>
    <DeadlineInputs bind:datum={state.datum} bind:uhrzeit={state.uhrzeit} />
    {#if !complete}
        <small class="missing">
            Noch fehlt:
            {[
                !state.link && 'Google Forms Link (Schritt 2)',
                !state.datum && 'Datum',
                !state.uhrzeit && 'Uhrzeit',
            ]
                .filter(Boolean)
                .join(', ')}
        </small>
    {/if}
    <TemplateMessage {message} disabled={!complete} />
</WizardStep>

<style>
    .missing {
        font-size: var(--text-sm);
        color: var(--color-error);
    }
</style>
