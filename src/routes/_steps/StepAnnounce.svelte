<script lang="ts">
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import WizardStep from "./WizardStep.svelte";

const message =
	"Hallo an Alle!\n\n" +
	"ich habe einen Vorschlag, wie wir die Verteilung der Rotationsgruppen semesterintern umsetzen können " +
	"und würde hierfür die Organisation übernehmen. Es gibt ein 1./2./3.-Wahl-Verfahren, bei dem man 3 " +
	"(von den 8) Zeitslots im Rotationsplan als Wahl angibt. Ein Algorithmus berechnet dann anhand eurer " +
	"Wahlen eine bestmögliche Verteilung der Rotationsgruppen für unser Semester.\n\n" +
	"LG";
</script>

<WizardStep index={2} title="Semester über das Verfahren informieren">
    <p class="description">
        Schick diese Nachricht in eure Semestergruppe, bevor du das Google Forms
        rausschickst.
    </p>
    <TemplateMessage {message} />
</WizardStep>
