# Svelte

Runes mode is forced for every file outside node_modules, so Svelte 4 syntax does not
compile. Use $state, $derived, $derived.by, $props, $effect, $bindable and $state.snapshot.

Props are a typed interface destructured with defaults:

```svelte
interface Props {
    num: number;
    done?: boolean;
    children: Snippet;
}

let { num, done = $bindable(false), children }: Props = $props();
```

Use snippets and {@render children()} for content projection, not slots.

ssr is false and prerender is true, so client APIs like window, localStorage and Worker are
safe to use directly. The exception is state.svelte.ts, which is constructed at import time
during prerendering. Keep its typeof localStorage guard.

Use the base import from $app/paths for absolute URLs and asset paths. Hardcoded ones break
the GitHub Pages build, which sets BASE_PATH.

Pass runes state through $state.snapshot() before postMessage. Raw proxies are not
structured-cloneable.
