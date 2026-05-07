<!-- EntriesView.svelte — full CRUD: create, edit, publish, delete, search, paginate -->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import Icon              from './Icon.svelte';
  import StatusBadge       from './StatusBadge.svelte';
  import StockBadge        from './StockBadge.svelte';
  import Modal             from './Modal.svelte';
  import ConfirmDialog     from '../dialog/ConfirmDialog.svelte';
  import EntryForm         from '../forms/EntryForm.svelte';
  import FieldBuilder      from './FieldBuilder.svelte';
  import type { Collection, Entry } from '../types';

  const {
    collection,
    entries,
    siteId,
  }: {
    collection: Collection;
    entries:    Entry[];
    siteId:     string | null;
  } = $props();

  // ── Search + pagination ───────────────────────────────────────────────────
  const PAGE_SIZE = 20;
  let searchQuery  = $state('');
  let currentPage  = $state(1);

  const filtered = $derived(
    searchQuery.trim()
      ? entries.filter(e =>
          getTitle(e).toLowerCase().includes(searchQuery.toLowerCase()))
      : entries
  );

  const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const paginated  = $derived(filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE));

  $effect(() => {
    // Reset to page 1 whenever search or collection changes
    searchQuery; collection.id;
    currentPage = 1;
  });

  // ── Selection ─────────────────────────────────────────────────────────────
  let selected   = $state<Set<string>>(new Set());
  const allSelected = $derived(paginated.length > 0 && paginated.every(e => selected.has(e.id)));

  function toggleOne(id: string)  { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); selected = s; }
  function toggleAll()            { selected = allSelected ? new Set() : new Set(paginated.map(e => e.id)); }

  // ── Column visibility ─────────────────────────────────────────────────────
  console.log(entries)
  const hasStock = $derived(entries.some(e => 'stock' in e.data));
  const hasPrice = $derived(entries.some(e => 'price' in e.data));
  const hasRole  = $derived(entries.some(e => 'role'  in e.data));

  // ── Row menu ──────────────────────────────────────────────────────────────
  let openMenuId = $state<string | null>(null);

  function toggleMenu(id: string) { openMenuId = openMenuId === id ? null : id; }
  function closeMenu()            { openMenuId = null; }

  // ── Modals ────────────────────────────────────────────────────────────────
  let showNewEntry      = $state(false);
  let editEntry         = $state<Entry | null>(null);
  let deleteEntry       = $state<Entry | null>(null);
  let showFieldBuilder  = $state(false);
  let saving            = $state(false);
  let deleting          = $state(false);

  async function handleCreate(data: Record<string, unknown>) {
    if (!siteId) return;
    saving = true;
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ collection_id: collection.id, data }),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      showNewEntry = false;
      await invalidateAll();
    } finally { saving = false; }
  }

  async function handleEdit(data: Record<string, unknown>) {
    if (!siteId || !editEntry) return;
    saving = true;
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/entries/${editEntry.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ data }),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      editEntry = null;
      await invalidateAll();
    } finally { saving = false; }
  }

  async function handleDelete() {
    if (!siteId || !deleteEntry) return;
    deleting = true;
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/entries/${deleteEntry.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      deleteEntry = null;
      selected = new Set();
      await invalidateAll();
    } finally { deleting = false; }
  }

  async function toggleStatus(entry: Entry) {
    if (!siteId) return;
    const newStatus = entry.status === 'published' ? 'draft' : 'published';
    closeMenu();
    const res = await fetch(`/api/cms/sites/${siteId}/entries/${entry.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (!json.ok) { alert(json.message); return; }
    await invalidateAll();
  }

  async function deleteSelected() {
    if (!siteId || selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} entries? This cannot be undone.`)) return;
    for (const id of selected) {
      await fetch(`/api/cms/sites/${siteId}/entries/${id}`, { method: 'DELETE' });
    }
    selected = new Set();
    await invalidateAll();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getTitle(e: Entry): string {
    return String(e.data.title ?? e.data.name ?? e.id.slice(0, 8));
  }

  function getUpdated(e: Entry): string {
    const d = new Date(e.updated_at);
    const diff = Date.now() - d.getTime();
    const h = Math.floor(diff / 3_600_000);
    const d_ = Math.floor(diff / 86_400_000);
    if (h < 1)  return `${Math.floor(diff / 60_000)}m ago`;
    if (h < 24) return `${h}h ago`;
    if (d_ < 30) return `${d_}d ago`;
    return d.toLocaleDateString();
  }
</script>

<!-- Click away closes row menu -->
<svelte:window onclick={closeMenu} />

<div class="entries cms-fade-in">

  <!-- Header -->
  <div class="entries__header">
    <div class="entries__title-group">
      <h1 class="entries__title">{collection.name}</h1>
      <span class="entries__subtitle">{entries.length} entries</span>
    </div>
    <div class="entries__actions">
      <!-- Search -->
      <div class="entries__search">
        <span class="entries__search-icon"><Icon name="search" size={14} /></span>
        <input
          class="entries__search-input"
          type="search"
          placeholder="Search entries…"
          bind:value={searchQuery}
          aria-label="Search entries"
        />
      </div>

      <!-- Fields button -->
      <button class="entries__fields-btn" onclick={() => (showFieldBuilder = true)}
        title="Configure fields">
        Fields ({collection.fields.length})
      </button>

      <!-- Bulk delete (shows when rows selected) -->
      {#if selected.size > 0}
        <button class="entries__bulk-delete" onclick={deleteSelected}>
          Delete {selected.size}
        </button>
      {/if}

      <button class="entries__new-btn" onclick={() => (showNewEntry = true)}>
        <Icon name="plus" size={15} /> New entry
      </button>
    </div>
  </div>

  <!-- No fields configured yet -->
  {#if collection.fields.length === 0}
    <div class="entries__empty">
      <p class="entries__empty-title">No fields configured</p>
      <p class="entries__empty-sub">
        Define the structure of <strong>{collection.name}</strong> before adding entries
      </p>
      <button class="entries__configure-btn" onclick={() => (showFieldBuilder = true)}>
        Configure fields →
      </button>
    </div>

  <!-- Has fields but no entries yet -->
  {:else if entries.length === 0}
    <div class="entries__empty">
      <p class="entries__empty-title">No entries yet</p>
      <p class="entries__empty-sub">Create your first entry in {collection.name}</p>
      <div class="entries__empty-actions">
        <button class="entries__new-btn" onclick={() => (showNewEntry = true)}>
          <Icon name="plus" size={15} /> New entry
        </button>
        <button class="entries__fields-link" onclick={() => (showFieldBuilder = true)}>
          Edit fields
        </button>
      </div>
    </div>

  {:else}
    <!-- Table -->
    <div class="entries__table-wrap">
      <table class="entries__table">
        <thead>
          <tr class="entries__thead-row">
            <th class="entries__th entries__th--check">
              <button class="entries__checkbox" class:entries__checkbox--checked={allSelected}
                onclick={toggleAll} aria-label="Select all">
                {#if allSelected}<Icon name="check" size={9} />{/if}
              </button>
            </th>
            <th class="entries__th">Title</th>
            <th class="entries__th">Status</th>
            {#if hasStock}<th class="entries__th">Stock</th>{/if}
            {#if hasPrice}<th class="entries__th">Price</th>{/if}
            {#if hasRole} <th class="entries__th">Role</th>{/if}
            <th class="entries__th">ID</th>
            <th class="entries__th entries__th--right">Updated</th>
            <th class="entries__th entries__th--action"></th>
          </tr>
        </thead>
        <tbody>
          {#each paginated as entry (entry.id)}
            {@const isSel = selected.has(entry.id)}
            <tr class="entries__row" class:entries__row--selected={isSel}
              onclick={() => { editEntry = entry; }}>

              <td class="entries__td entries__td--check" onclick={(e) => e.stopPropagation()}>
                <button class="entries__checkbox" class:entries__checkbox--checked={isSel}
                  onclick={() => toggleOne(entry.id)} aria-label="Select">
                  {#if isSel}<Icon name="check" size={9} />{/if}
                </button>
              </td>

              <td class="entries__td">
                <span class="entries__entry-title">{getTitle(entry)}</span>
              </td>
              <td class="entries__td"><StatusBadge status={entry.status} /></td>

              {#if hasStock}
                <td class="entries__td"><StockBadge stock={Number(entry.data.stock ?? 0)} /></td>
              {/if}
              {#if hasPrice}
                <td class="entries__td">
                  <span class="entries__price cms-mono">{String(entry.data.price ?? '—')}</span>
                </td>
              {/if}
              {#if hasRole}
                <td class="entries__td">
                  <span class="entries__meta">{String(entry.data.role ?? '—')}</span>
                </td>
              {/if}

              <td class="entries__td">
                <span class="entries__id cms-mono">{entry.id.slice(0, 8)}…</span>
              </td>
              <td class="entries__td entries__td--right">
                <span class="entries__updated">{getUpdated(entry)}</span>
              </td>

              <!-- Row menu -->
              <td class="entries__td entries__td--action" onclick={(e) => e.stopPropagation()}>
                <div class="row-menu">
                  <button class="entries__more-btn" onclick={(e) => { e.stopPropagation(); toggleMenu(entry.id); }}
                    aria-label="More options">
                    <Icon name="more" size={15} />
                  </button>

                  {#if openMenuId === entry.id}
                    <div class="row-menu__dropdown cms-slide-in">
                      <button class="row-menu__item" onclick={(e) => { e.stopPropagation(); editEntry = entry; closeMenu(); }}>
                        Edit
                      </button>
                      <button class="row-menu__item" onclick={(e) => { e.stopPropagation(); toggleStatus(entry); }}>
                        {entry.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <div class="row-menu__divider"></div>
                      <button class="row-menu__item row-menu__item--danger"
                        onclick={(e) => { e.stopPropagation(); deleteEntry = entry; closeMenu(); }}>
                        Delete
                      </button>
                    </div>
                  {/if}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Footer + pagination -->
    <div class="entries__footer">
      <span class="entries__footer-info">
        {selected.size > 0
          ? `${selected.size} selected`
          : `${filtered.length} of ${entries.length} entries`}
      </span>
      {#if totalPages > 1}
        <div class="entries__pagination">
          <button class="entries__page-btn" disabled={currentPage === 1}
            onclick={() => currentPage--}>‹</button>
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
            <button class="entries__page-btn" class:entries__page-btn--active={p === currentPage}
              onclick={() => (currentPage = p)}>{p}</button>
          {/each}
          <button class="entries__page-btn" disabled={currentPage === totalPages}
            onclick={() => currentPage++}>›</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- New entry modal -->
<Modal open={showNewEntry} title="New entry — {collection.name}" onclose={() => (showNewEntry = false)}>
  <EntryForm
    fields={collection.fields}
    loading={saving}
    onsubmit={handleCreate}
    oncancel={() => (showNewEntry = false)}
  />
</Modal>

<!-- Edit entry modal -->
<Modal open={!!editEntry} title="Edit entry" onclose={() => (editEntry = null)}>
  {#if editEntry}
    <EntryForm
      fields={collection.fields}
      initial={editEntry.data}
      loading={saving}
      onsubmit={handleEdit}
      oncancel={() => (editEntry = null)}
    />
  {/if}
</Modal>

<!-- Delete confirmation -->
<ConfirmDialog
  open={!!deleteEntry}
  title="Delete entry"
  message='Are you sure you want to delete "{deleteEntry ? getTitle(deleteEntry) : ''}"? This cannot be undone.'
  loading={deleting}
  onconfirm={handleDelete}
  oncancel={() => (deleteEntry = null)}
/>

<!-- Field builder -->
{#if siteId}
  <Modal
    open={showFieldBuilder}
    title="Fields — {collection.name}"
    onclose={() => (showFieldBuilder = false)}
    size="lg"
  >
    <FieldBuilder
      {siteId}
      collection={{ id: collection.id, name: collection.name, fields: collection.fields }}
      onclose={() => (showFieldBuilder = false)}
    />
  </Modal>
{/if}

<style>
  .entries { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

  .entries__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 28px 16px; border-bottom: 1px solid var(--cms-border);
    flex-shrink: 0; gap: 16px;
  }
  .entries__title-group { display: flex; flex-direction: column; gap: 2px; }
  .entries__title       { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .entries__subtitle    { font-size: 12px; color: var(--cms-text-dim); }

  .entries__actions { display: flex; align-items: center; gap: 10px; }

  .entries__search {
    display: flex; align-items: center; gap: 8px;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 8px; padding: 7px 12px; width: 220px;
    transition: border-color 0.15s;
  }
  .entries__search:focus-within { border-color: rgba(0,212,255,0.4); }
  .entries__search-icon { color: var(--cms-text-dim); display: flex; }
  .entries__search-input {
    background: none; border: none; outline: none; width: 100%;
    font-size: 13px; color: var(--cms-text); font-family: inherit;
  }
  .entries__search-input::placeholder { color: var(--cms-text-dim); }

  .entries__fields-btn {
    display: flex; align-items: center; gap: 5px;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 8px; padding: 7px 12px;
    color: var(--cms-text-dim); font-size: 13px; transition: all 0.12s;
  }
  .entries__fields-btn:hover { color: var(--cms-text); border-color: var(--cms-border-hi); }

  .entries__configure-btn {
    margin-top: 8px; padding: 10px 20px;
    background: var(--cms-accent); color: #06090f;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
    transition: all 0.12s;
  }
  .entries__configure-btn:hover { filter: brightness(1.1); }

  .entries__empty-actions { display: flex; align-items: center; gap: 12px; margin-top: 8px; }

  .entries__fields-link {
    background: none; border: none; font-size: 13px;
    color: var(--cms-text-dim); text-decoration: underline; cursor: pointer;
    transition: color 0.12s;
  }
  .entries__fields-link:hover { color: var(--cms-text);
    background: rgba(255,64,96,0.1); border: 1px solid rgba(255,64,96,0.3);
    color: var(--cms-red); border-radius: 8px; padding: 7px 12px;
    font-size: 13px; font-weight: 500; transition: all 0.12s;
  }
  .entries__bulk-delete:hover { background: rgba(255,64,96,0.2); }

  .entries__new-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--cms-accent); color: #06090f; border: none;
    border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; transition: all 0.12s;
  }
  .entries__new-btn:hover { filter: brightness(1.1); box-shadow: 0 4px 20px rgba(0,212,255,0.25); }

  .entries__empty {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 8px; padding: 40px;
  }
  .entries__empty-title { font-size: 15px; font-weight: 600; }
  .entries__empty-sub   { font-size: 13px; color: var(--cms-text-dim); margin-bottom: 8px; }

  .entries__table-wrap { flex: 1; overflow-y: auto; }
  .entries__table      { width: 100%; border-collapse: collapse; }

  .entries__thead-row {
    border-bottom: 1px solid var(--cms-border);
    position: sticky; top: 0; background: var(--cms-bg); z-index: 1;
  }
  .entries__th {
    padding: 10px 16px; text-align: left;
    font-size: 11px; font-weight: 600; color: var(--cms-text-dim);
    letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
  }
  .entries__th--check  { width: 48px; padding: 10px 12px 10px 20px; }
  .entries__th--right  { text-align: right; }
  .entries__th--action { width: 56px; }

  .entries__row           { border-bottom: 1px solid var(--cms-border); cursor: pointer; transition: background 0.1s; }
  .entries__row:hover     { background: var(--cms-accent-glow); }
  .entries__row--selected { background: rgba(0,212,255,0.03); }

  .entries__td           { padding: 13px 16px; vertical-align: middle; }
  .entries__td--check    { padding: 13px 12px 13px 20px; }
  .entries__td--right    { text-align: right; }
  .entries__td--action   { padding: 13px 16px 13px 0; text-align: right; }

  .entries__checkbox {
    width: 16px; height: 16px; border-radius: 4px;
    border: 1.5px solid var(--cms-border-hi); background: var(--cms-card);
    display: flex; align-items: center; justify-content: center;
    color: #06090f; transition: all 0.1s; flex-shrink: 0;
  }
  .entries__checkbox--checked { border-color: var(--cms-accent); background: var(--cms-accent); }

  .entries__entry-title { font-size: 14px; font-weight: 500; }
  .entries__price       { font-size: 13px; color: var(--cms-text-mid); }
  .entries__meta        { font-size: 13px; color: var(--cms-text-mid); }
  .entries__id          { font-size: 11px; color: var(--cms-text-dim); }
  .entries__updated     { font-size: 12px; color: var(--cms-text-dim); }

  /* Row menu */
  .row-menu { position: relative; display: inline-flex; }

  .entries__more-btn {
    background: none; border: none; color: var(--cms-text-dim);
    padding: 4px 6px; border-radius: 4px; transition: all 0.1s; display: inline-flex;
  }
  .entries__more-btn:hover { background: var(--cms-border); color: var(--cms-text); }

  .row-menu__dropdown {
    position: absolute; right: 0; top: calc(100% + 4px);
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 9px; padding: 4px; min-width: 140px; z-index: 20;
    box-shadow: var(--cms-shadow);
  }
  .row-menu__item {
    display: block; width: 100%; padding: 8px 12px;
    background: none; border: none; border-radius: 6px;
    text-align: left; font-size: 13px; color: var(--cms-text-mid);
    cursor: pointer; transition: all 0.1s;
  }
  .row-menu__item:hover            { background: var(--cms-accent-glow); color: var(--cms-text); }
  .row-menu__item--danger          { color: var(--cms-red); }
  .row-menu__item--danger:hover    { background: rgba(255,64,96,0.08); }
  .row-menu__divider               { height: 1px; background: var(--cms-border); margin: 3px 0; }

  /* Footer */
  .entries__footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 28px; border-top: 1px solid var(--cms-border); flex-shrink: 0;
  }
  .entries__footer-info { font-size: 12px; color: var(--cms-text-dim); }
  .entries__pagination  { display: flex; gap: 4px; }

  .entries__page-btn {
    width: 28px; height: 28px; border-radius: 6px;
    border: 1px solid var(--cms-border); background: transparent;
    color: var(--cms-text-dim); font-size: 12px; transition: all 0.1s;
  }
  .entries__page-btn:hover:not(:disabled)  { border-color: var(--cms-border-hi); color: var(--cms-text); }
  .entries__page-btn--active               { background: var(--cms-card); color: var(--cms-text); border-color: var(--cms-border-hi); }
  .entries__page-btn:disabled              { opacity: 0.3; cursor: not-allowed; }
</style>