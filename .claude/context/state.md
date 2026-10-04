# State and steps

src/lib/state.svelte.ts exports one VerteilerState instance as state, imported by step
components as appState. The class itself is exported too, but only for tests: the singleton
is built once per module load, so specs construct their own instance to exercise the
localStorage restore. It holds the open and done accordion flags, both STEP_COUNT long,
capacities[32],
the deadline fields (link, datum, uhrzeit), the parsed CSV (csvFileName, parsedGroups,
parseWarnings) and guarantees. tag, formattedDatum and deadlineComplete are derived on the class.

There is no store, no context and no prop drilling. Step components mutate appState directly
for single fields. Changes that touch several fields at once go through a method, so the rule
behind them lives in one place: loadCsv and clearCsv also drop guarantees, setAllCapacities
fills every slot.

## Persistence

defaults() lists every persisted field with its fresh value. Persist, restore and reset all
derive from it, so a new field is one entry there plus its $state declaration on the class.
Restore only accepts a stored value of the same kind as its default and skips the rest.

The whole object is serialized to localStorage under the key "verteiler" from an effect
wrapped in $effect.root(), which is needed because the class lives outside a component
lifecycle.

VERSION guards the persisted shape. Bump it whenever the shape changes: on mismatch the
restore is skipped entirely and defaults are used, instead of silently half-restoring
incompatible data. The restore pads and truncates open and done to the current length, so
appending a step needs no bump. Reordering does, because the flags would then describe the
wrong steps: version 2 discarded everything for exactly that reason.

parsedGroups is persisted, so a reload keeps the uploaded CSV. A payload with another
VERSION or one that does not parse sets outdated instead of throwing. Persistence stays off
while it is set, so the old payload survives until the organizer has seen the warning and
reset.

## Step components

Each step is a self-contained file in src/routes/_steps/ wrapping WizardStep with
index={STEPS.x}. WizardStep is the whole accordion item: it binds to appState.open[index]
and appState.done[index] and opens the next step on done. The number shown to the user is
index + 1. checkDisabled blocks the done checkbox until a precondition holds.

The index i always comes from STEPS in steps.ts, never from a literal. Copy that points at
another step does the same: Schritt {STEPS.formsExport + 1}.

WizardStep styles its children globally by tag and class (p.description, small.hint, ol,
li), so use those plain elements instead of new wrappers. Steps whose only job is producing a
copyable German message use TemplateMessage.

src/lib/components holds only components shared by several steps. A component used by one
step lives next to it in src/routes/_steps/, or in the step's own folder like StepAlgorithm/.

To add a step: create the file, add an entry to STEPS, and add it to the ol in +page.svelte in
the matching position. The open and done arrays size themselves from STEP_COUNT. Inserting or
reordering also needs a VERSION bump, appending does not.
