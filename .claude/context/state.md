# State and steps

src/lib/state.svelte.ts exports one VerteilerState instance as state, imported by step
components as appState. The class itself is exported too, but only for tests: the singleton
is built once per module load, so specs construct their own instance to exercise the
localStorage restore. It holds the open[10] and done[10] accordion flags, capacities[32],
the deadline fields (link, datum, uhrzeit) and the parsed CSV (csvFileName, parsedGroups,
parseWarnings). tag, formattedDatum and deadlineComplete are derived on the class.

There is no store, no context and no prop drilling. Step components mutate appState directly.

## Persistence

The whole object is serialized to localStorage under the key "verteiler" from an effect
wrapped in $effect.root(), which is needed because the class lives outside a component
lifecycle.

VERSION guards the persisted shape. Bump it whenever the shape changes: on mismatch the
restore is skipped entirely and defaults are used, instead of silently half-restoring
incompatible data. The restore pads and truncates open and done to the current length, so
adding a step needs no bump.

parsedGroups is persisted, so a reload keeps the uploaded CSV. The empty catch in the
constructor is deliberate: corrupt storage falls back to defaults rather than breaking boot.

## Step components

Each step is a self-contained file in src/routes/_steps/ wrapping the shared Step component
with bind:open={appState.open[i]}, bind:done={appState.done[i]} and
ondone={() => appState.openNext(i)}. The num prop shown to the user is 1-based while the
state indices are 0-based. checkDisabled blocks the done checkbox until a precondition holds.

StepContent styles its children globally by tag and class (p.description, small.hint, ol,
li), so use those plain elements instead of new wrappers. Steps whose only job is producing a
copyable German message use TemplateMessage.

To add a step: create the file, add it to the ol in +page.svelte, and grow the open and done
arrays in both the field initializers and reset().
