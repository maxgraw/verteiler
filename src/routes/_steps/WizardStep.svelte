<script lang="ts">
import type { Snippet } from "svelte";
import Step from "$lib/components/Step.svelte";
import StepContent from "$lib/components/StepContent.svelte";
import { state as appState } from "$lib/state.svelte";

interface Props {
	/**
	 * Zero-based position in the workflow. It indexes the open/done arrays and the
	 * user-facing number is derived from it, so the two can no longer drift apart.
	 */
	index: number;
	title: string;
	/** Blocks the done checkbox until the step's precondition is met */
	checkDisabled?: boolean;
	children: Snippet;
}

let { index, title, checkDisabled = false, children }: Props = $props();
</script>

<Step
    num={index + 1}
    {title}
    {checkDisabled}
    bind:open={appState.open[index]}
    bind:done={appState.done[index]}
    ondone={() => appState.openNext(index)}
>
    <StepContent>
        {@render children()}
    </StepContent>
</Step>
