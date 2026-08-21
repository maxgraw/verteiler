<script lang="ts">
import { Search, X } from "@lucide/svelte";
import { findGroups } from "$lib/distribution";
import type { Group } from "$lib/parser";
import type { Guarantee } from "$lib/algorithm/types";

interface Props {
	groups: Group[];
	guarantees: Guarantee[];
}

let { groups, guarantees = $bindable() }: Props = $props();

let query = $state("");

const taken = $derived(new Set(guarantees.map((g) => g.groupId)));
const matches = $derived(
	findGroups(groups, query).filter((g) => !taken.has(g.id)),
);

function add(id: number) {
	guarantees = [...guarantees, { groupId: id, maxRank: 0 }];
	query = "";
}

function remove(id: number) {
	guarantees = guarantees.filter((g) => g.groupId !== id);
}
</script>

<details class="guarantees">
    <summary>
        Zusagen
        {#if guarantees.length}
            <span class="count">{guarantees.length}</span>
        {/if}
    </summary>

    <p class="note">
        Eine Zusage setzt die Auslosung für eine Gruppe außer Kraft. Andere
        rücken dafür nach hinten. Was sie kostet, steht nach dem Rechnen im
        Ergebnis.
    </p>

    <div class="search">
        <span class="search-icon"><Search size={15} /></span>
        <input
            type="search"
            placeholder="Name suchen"
            bind:value={query}
            aria-label="Gruppe über einen Namen suchen"
        />
    </div>

    {#if query.trim().length >= 2}
        {#if matches.length}
            <ul class="results">
                {#each matches as group (group.id)}
                    <li>
                        <button type="button" onclick={() => add(group.id)}>
                            <span class="members">{group.members}</span>
                            <span class="size">{group.size}</span>
                        </button>
                    </li>
                {/each}
            </ul>
        {:else}
            <p class="empty">Kein Treffer.</p>
        {/if}
    {/if}

    {#if guarantees.length}
        <ul class="chosen">
            {#each guarantees as guarantee (guarantee.groupId)}
                <li>
                    <span class="members">
                        {groups[guarantee.groupId]?.members ?? "Unbekannte Gruppe"}
                    </span>
                    <select
                        bind:value={guarantee.maxRank}
                        aria-label="Zugesagter Rang"
                    >
                        <option value={0}>1. Wahl</option>
                        <option value={1}>höchstens 2. Wahl</option>
                    </select>
                    <button
                        type="button"
                        class="remove"
                        onclick={() => remove(guarantee.groupId)}
                        aria-label="Zusage entfernen"
                    >
                        <X size={14} />
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</details>

<style>
    .guarantees {
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--space-2) var(--space-3);
    }

    summary {
        cursor: pointer;
        font-size: var(--text-sm);
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .count {
        font-size: var(--text-xs);
        font-weight: 700;
        color: var(--color-warning);
        background: var(--color-warning-bg);
        border-radius: var(--radius-full);
        padding: 0 var(--space-2);
    }

    .note {
        margin: var(--space-2) 0;
        font-size: var(--text-xs);
        color: var(--color-text-muted);
    }

    .search {
        position: relative;
        display: flex;
        align-items: center;
    }

    .search-icon {
        position: absolute;
        left: var(--space-2);
        display: flex;
        color: var(--color-text-faint);
    }

    .search input {
        width: 100%;
        padding: var(--space-2) var(--space-2) var(--space-2) var(--space-8);
        font-size: var(--text-sm);
        border: 1px solid var(--color-border-input);
        border-radius: var(--radius-md);
        background: var(--color-bg);
    }

    .results,
    .chosen {
        display: flex;
        flex-direction: column;
        margin-top: var(--space-2);
    }

    .results li button {
        display: flex;
        width: 100%;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
        padding: var(--space-2);
        font-size: var(--text-sm);
        text-align: left;
        border-radius: var(--radius-sm);
    }

    .results li button:hover {
        background: var(--color-bg-subtle);
    }

    .size {
        flex-shrink: 0;
        font-size: var(--text-xs);
        color: var(--color-text-faint);
    }

    .chosen li {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) 0;
        border-top: 1px solid var(--color-border);
        font-size: var(--text-sm);
    }

    .members {
        flex: 1;
        color: var(--color-text-muted);
    }

    .chosen select {
        flex-shrink: 0;
        font-size: var(--text-xs);
        padding: var(--space-1) var(--space-2);
        border: 1px solid var(--color-border-input);
        border-radius: var(--radius-sm);
        background: var(--color-bg);
    }

    .remove {
        flex-shrink: 0;
        display: flex;
        color: var(--color-text-faint);
    }

    .remove:hover {
        color: var(--color-error);
    }

    .empty {
        margin-top: var(--space-2);
        font-size: var(--text-xs);
        color: var(--color-text-faint);
    }
</style>
