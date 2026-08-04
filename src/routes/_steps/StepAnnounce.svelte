<script lang="ts">
import TemplateMessage from "$lib/components/TemplateMessage.svelte";
import { announceMessage } from "$lib/messages";
import { STEPS } from "$lib/steps";
import WizardStep from "./WizardStep.svelte";
</script>

<WizardStep index={STEPS.announce} title="Semester über das Verfahren informieren">
    <p class="description">
        Schick diese Nachricht in die Semestergruppe, bevor das Google Forms
        rausgeht.
    </p>
    <TemplateMessage message={announceMessage} />
</WizardStep>
