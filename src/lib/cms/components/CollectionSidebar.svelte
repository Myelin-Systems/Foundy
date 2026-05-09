<!-- CollectionSidebar.svelte -->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import Icon              from './Icon.svelte';
  import Modal             from './Modal.svelte';
  import CollectionForm    from '../forms/CollectionForm.svelte';
  import { isUnlimited }   from '$lib/shared/plans';
  import type { Collection } from '../types';
  import type { OrgUsage }   from '$lib/server/services/foundiq/UsageService';

  const {
    collections, active, onselect, ondelete, siteId, usage,
  }: {
    collections: Collection[];
    active:      Collection;
    onselect:    (col: Collection) => void;
    ondelete?:   (col: Collection) => void;
    siteId:      string | null;
    usage:       OrgUsage | null;
  } = $props();

  let showForm = $state(false);
  let saving   = $state(false);
  let deleting = $state(false);
  let confirmId = $state<string | null>(null);
  let hoveredId = $state<string | null>(null);

  // ── Storage bar ───────────────────────────────────────────────────────────
  const dbBytes      = $derived(usage?.db_bytes       ?? 0);
  const dbLimitBytes = $derived(usage?.db_limit_bytes ?? 0);
  const dbPct        = $derived(
    !usage || isUnlimited(dbLimitBytes) || dbLimitBytes === 0
      ? 0
      : Math.min(100, Math.round((dbBytes / dbLimitBytes) * 100))
  );

  function fmtBytes(n: number): string {
    if (isUnlimited(n) || n < 0) return '∞';
    if (n === 0)                  return '0 B';
    if (n < 1_024)                return `${n} B`;
    if (n < 1_048_576)            return `${(n / 1_024).toFixed(1)} KB`;
    if (n < 10_737_418_240)       return `${(n / 1_048_576).toFixed(0)} MB`;
    return `${(n / 1_073_741_824).toFixed(0)} GB`;
  }

  function barColor(p: number): string {
    if (p >= 90) return 'var(--cms-red)';
    if (p >= 70) return 'var(--cms-amber)';
    return 'var(--cms-accent)';
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function requestDelete(e: MouseEvent, col: Collection) {
    e.stopPropagation();
    confirmId = col.id;
  }

  function cancelDelete(e: MouseEvent) {
    e.stopPropagation();
    confirmId = null;
  }

  async function confirmDelete(e: MouseEvent, col: Collection) {
    e.stopPropagation();
    if (!siteId) return;
    deleting = true;
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}/collections/${col.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { alert(json.message ?? 'Failed to delete collection.'); return; }
      confirmId = null;
      ondelete?.(col);
      await invalidateAll();
    } finally { deleting = false; }
  }

  async function handleCreate(data: { name: string; label: string; color: string }) {
    if (!siteId) return;
    saving = true;
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}/collections`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      showForm = false;
      await invalidateAll();
    } finally { saving = false; }
  }
</script>

<svelte:window onclick={() => { confirmId = null; }} />

<aside class="col-sidebar" aria-label="Collections">
  <div class="col-sidebar__header">
    <span class="col-sidebar__heading">Collections</span>
    <button
      class="col-sidebar__add-btn"
      onclick={() => (showForm = true)}
      disabled={!siteId}
      aria-label="Add collection"
      title={siteId ? 'New collection' : 'Create a site first'}
    >
      <Icon name="plus" size={13} />
    </button>
  </div>

  <ul class="col-sidebar__list" role="listbox" aria-label="Collections">
    {#each collections as col (col.id)}
      {@const isActive  = active.id === col.id}
      {@const isConfirm = confirmId === col.id}
      {@const isHovered = hoveredId === col.id}

      <li
        onmouseenter={() => { hoveredId = col.id; }}
        onmouseleave={() => { hoveredId = null; }}
      >
        {#if isConfirm}
          <div class="col-sidebar__confirm" onclick={(e) => e.stopPropagation()}>
            <span class="col-sidebar__confirm-label">
              Delete <strong>{col.name}</strong>?
            </span>
            <div class="col-sidebar__confirm-actions">
              <button
                class="col-sidebar__confirm-yes"
                onclick={(e) => confirmDelete(e, col)}
                disabled={deleting}
              >
                {deleting ? '…' : 'Delete'}
              </button>
              <button
                class="col-sidebar__confirm-no"
                onclick={cancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
            </div>
          </div>
        {:else}
          <button
            class="col-sidebar__item"
            class:col-sidebar__item--active={isActive}
            role="option" aria-selected={isActive}
            onclick={() => onselect(col)}
          >
            <span
              class="col-sidebar__dot"
              style="background:{isActive ? 'var(--cms-accent)' : col.color};opacity:{isActive ? 1 : 0.55}"
              aria-hidden="true"
            ></span>
            <span class="col-sidebar__name">{col.name}</span>
            <span class="col-sidebar__count" class:col-sidebar__count--active={isActive}>
              {col.count}
            </span>
            {#if isHovered || isActive}
              <button
                class="col-sidebar__delete-btn"
                onclick={(e) => requestDelete(e, col)}
                aria-label="Delete {col.name}"
                title="Delete collection"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <path d="M2 3h8M5 3V2h2v1M4.5 5v4M7.5 5v4M3 3l.5 7h5L9 3"
                    stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            {/if}
          </button>
        {/if}
      </li>
    {/each}

    {#if collections.length === 0}
      <li class="col-sidebar__empty">No collections yet</li>
    {/if}
  </ul>

  <!-- ── Storage footer ───────────────────────────────────────────────────── -->
  <div class="col-sidebar__storage">
    <div class="col-sidebar__storage-row">
      <span class="col-sidebar__storage-label">Database</span>
      <span class="col-sidebar__storage-value cms-mono">
        {#if !usage}
          — / —
        {:else if isUnlimited(dbLimitBytes)}
          {fmtBytes(dbBytes)} / ∞
        {:else}
          {fmtBytes(dbBytes)} / {fmtBytes(dbLimitBytes)}
        {/if}
      </span>
    </div>
    <div class="col-sidebar__storage-track">
      <div
        class="col-sidebar__storage-fill"
        style="width:{dbPct}%; background:{barColor(dbPct)}"
      ></div>
    </div>
  </div>
</aside>

<Modal open={showForm} title="New collection" onclose={() => (showForm = false)} size="sm">
  <CollectionForm siteId={siteId!} loading={saving} onsubmit={handleCreate} oncancel={() => (showForm = false)} />
</Modal>

<style>
  .col-sidebar { width: 232px; border-right: 1px solid var(--cms-border); display: flex; flex-direction: column; flex-shrink: 0; overflow: hidden; }

  .col-sidebar__header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid var(--cms-border); flex-shrink: 0; }
  .col-sidebar__heading { font-size: 11px; font-weight: 600; color: var(--cms-text-dim); letter-spacing: 0.08em; text-transform: uppercase; }

  .col-sidebar__add-btn { width: 24px; height: 24px; border-radius: 6px; background: var(--cms-card); border: 1px solid var(--cms-border); color: var(--cms-text-dim); display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
  .col-sidebar__add-btn:hover { color: var(--cms-accent); border-color: var(--cms-accent-dim); }

  .col-sidebar__list { flex: 1; overflow-y: auto; padding: 8px; list-style: none; }

  .col-sidebar__item {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 8px 8px 8px 10px; border-radius: 8px;
    background: transparent; border: 1px solid transparent;
    color: var(--cms-text-mid); font-size: 13px; text-align: left;
    cursor: pointer; margin-bottom: 2px; transition: all 0.12s; position: relative;
  }
  .col-sidebar__item:hover      { background: var(--cms-accent-glow); color: var(--cms-text); }
  .col-sidebar__item--active    { background: var(--cms-accent-glow); border-color: rgba(0,212,255,0.12); color: var(--cms-text); font-weight: 600; }

  .col-sidebar__dot   { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .col-sidebar__name  { flex: 1; }
  .col-sidebar__count { font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: var(--cms-text-dim); background: var(--cms-card); padding: 1px 7px; border-radius: 20px; flex-shrink: 0; }
  .col-sidebar__count--active { color: var(--cms-accent); background: var(--cms-accent-dim); }
  .col-sidebar__empty { padding: 16px 10px; font-size: 12px; color: var(--cms-text-dim); }

  .col-sidebar__delete-btn {
    flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px; border: none;
    background: transparent; color: var(--cms-text-dim);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.12s; margin-left: 2px;
  }
  .col-sidebar__delete-btn:hover { background: rgba(255,64,96,0.12); color: var(--cms-red, #ff4060); }

  .col-sidebar__confirm {
    display: flex; flex-direction: column; gap: 8px;
    padding: 10px 10px 10px 12px; margin-bottom: 2px;
    background: rgba(255,64,96,0.06); border: 1px solid rgba(255,64,96,0.2);
    border-radius: 8px; animation: confirmSlide 0.12s ease;
  }
  @keyframes confirmSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .col-sidebar__confirm-label        { font-size: 12px; color: var(--cms-text-mid); line-height: 1.4; }
  .col-sidebar__confirm-label strong { color: var(--cms-text); font-weight: 600; }
  .col-sidebar__confirm-actions      { display: flex; gap: 6px; }

  .col-sidebar__confirm-yes {
    flex: 1; padding: 5px 0;
    background: rgba(255,64,96,0.15); border: 1px solid rgba(255,64,96,0.35);
    border-radius: 6px; color: var(--cms-red, #ff4060);
    font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.12s;
  }
  .col-sidebar__confirm-yes:hover:not(:disabled) { background: rgba(255,64,96,0.25); border-color: rgba(255,64,96,0.5); }
  .col-sidebar__confirm-yes:disabled             { opacity: 0.5; cursor: not-allowed; }

  .col-sidebar__confirm-no {
    flex: 1; padding: 5px 0; background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 6px; color: var(--cms-text-dim);
    font-size: 12px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all 0.12s;
  }
  .col-sidebar__confirm-no:hover:not(:disabled) { color: var(--cms-text); border-color: var(--cms-border-hi); }
  .col-sidebar__confirm-no:disabled             { opacity: 0.5; cursor: not-allowed; }

  /* Storage footer */
  .col-sidebar__storage       { border-top: 1px solid var(--cms-border); padding: 12px 16px; flex-shrink: 0; }
  .col-sidebar__storage-row   { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .col-sidebar__storage-label { font-size: 11px; color: var(--cms-text-dim); }
  .col-sidebar__storage-value { font-size: 11px; color: var(--cms-text-dim); }
  .col-sidebar__storage-track { height: 3px; background: var(--cms-border); border-radius: 3px; overflow: hidden; }
  .col-sidebar__storage-fill  { height: 100%; border-radius: 3px; transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }
</style>