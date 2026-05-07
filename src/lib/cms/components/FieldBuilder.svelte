<!-- =============================================================================
     lib/cms/components/FieldBuilder.svelte
     Define and manage fields for a collection.
     Saves to collections.fields (JSONB) via PATCH /api/cms/sites/[siteId]/collections/[colId]
     ============================================================================= -->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import Icon              from './Icon.svelte';
  import type { CollectionField, FieldType } from '../types';

  const {
    siteId,
    collection,
    onclose,
  }: {
    siteId:     string;
    collection: { id: string; name: string; fields: CollectionField[] };
    onclose:    () => void;
  } = $props();

  // Work on a local copy — only persist on save
  let fields  = $state<CollectionField[]>(structuredClone(collection.fields));
  let saving  = $state(false);
  let error   = $state('');

  const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
    { value: 'text',     label: 'Text',     hint: 'Short single-line text'         },
    { value: 'textarea', label: 'Textarea', hint: 'Long multi-line text'           },
    { value: 'number',   label: 'Number',   hint: 'Any numeric value'              },
    { value: 'stock',    label: 'Stock',    hint: 'Integer quantity with tracking' },
    { value: 'boolean',  label: 'Boolean',  hint: 'True / false toggle'            },
    { value: 'select',   label: 'Select',   hint: 'Dropdown from predefined options'},
    { value: 'date',     label: 'Date',     hint: 'Date picker'                    },
    { value: 'image',    label: 'Image',    hint: 'Image URL or media upload'      },
  ];

  // ── Add / remove ──────────────────────────────────────────────────────────
  function addField() {
    fields = [
      ...fields,
      { name: '', label: '', type: 'text', required: false },
    ];
  }

  function removeField(i: number) {
    fields = fields.filter((_, idx) => idx !== i);
  }

  function updateField(i: number, patch: Partial<CollectionField>) {
    fields = fields.map((f, idx) => idx === i ? { ...f, ...patch } : f);
  }

  // Auto-generate API name from label (only if name is still empty)
  function onLabelInput(i: number, label: string) {
    const f = fields[i];
    const autoName = !f.name || f.name === slugify(f.label);
    updateField(i, {
      label,
      ...(autoName ? { name: slugify(label) } : {}),
    });
  }

  function slugify(s: string): string {
    return s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }

  // ── Validation ────────────────────────────────────────────────────────────
  function validate(): boolean {
    error = '';
    const names = new Set<string>();
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) { error = `Field ${i + 1}: display name is required.`;  return false; }
      if (!f.name.trim())  { error = `Field ${i + 1}: API name is required.`;       return false; }
      if (!/^[a-z0-9_]+$/.test(f.name)) {
        error = `Field "${f.name}": API name must be lowercase letters, numbers and underscores only.`;
        return false;
      }
      if (names.has(f.name)) {
        error = `Duplicate API name "${f.name}" — each field name must be unique.`;
        return false;
      }
      names.add(f.name);
      if (f.type === 'select' && (!f.options || f.options.length === 0)) {
        error = `Field "${f.label}": select fields must have at least one option.`;
        return false;
      }
    }
    return true;
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function save() {
    if (!validate()) return;
    saving = true;
    error  = '';
    try {
      const res = await fetch(`/api/cms/sites/${siteId}/collections/${collection.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fields }),
      });

      // Guard against non-JSON responses (e.g. 404 HTML from wrong route)
      const contentType = res.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        error = `Unexpected server response (${res.status}). Check the terminal for errors.`;
        return;
      }

      const result = await res.json();
      if (!result.ok) {
        error = result.message ?? 'Save failed.';
        return;
      }

      await invalidateAll();
      onclose();
    } catch (err) {
      error = `Network error: ${(err as Error).message}`;
    } finally {
      saving = false;
    }
  }
</script>

<div class="fb">
  {#if error}
    <div class="fb__error">{error}</div>
  {/if}

  <!-- Field list -->
  {#if fields.length === 0}
    <div class="fb__empty">
      <p class="fb__empty-title">No fields yet</p>
      <p class="fb__empty-sub">Add fields to define the structure of your content</p>
    </div>
  {:else}
    <div class="fb__list">
      {#each fields as field, i (i)}
        <div class="fb__field">
          <!-- Field header -->
          <div class="fb__field-header">
            <span class="fb__field-num">{i + 1}</span>
            <span class="fb__field-type-badge">{field.type}</span>
            <div class="fb__field-spacer"></div>
            <label class="fb__toggle" title="Required">
              <input
                type="checkbox"
                checked={field.required}
                onchange={(e) => updateField(i, { required: e.currentTarget.checked })}
                class="fb__toggle-input"
              />
              <span class="fb__toggle-track"></span>
              <span class="fb__toggle-label">Required</span>
            </label>
            <button class="fb__remove" onclick={() => removeField(i)} aria-label="Remove field">
              <Icon name="close" size={13} />
            </button>
          </div>

          <!-- Field inputs -->
          <div class="fb__field-row">
            <!-- Display name -->
            <div class="fb__col fb__col--grow">
              <label class="fb__label" for="field-label-{i}">Display name</label>
              <input
                id="field-label-{i}"
                class="fb__input"
                type="text"
                placeholder="e.g. Product Name"
                value={field.label}
                oninput={(e) => onLabelInput(i, e.currentTarget.value)}
                disabled={saving}
              />
            </div>

            <!-- API name -->
            <div class="fb__col fb__col--grow">
              <label class="fb__label" for="field-name-{i}">API name</label>
              <input
                id="field-name-{i}"
                class="fb__input fb__input--mono"
                type="text"
                placeholder="e.g. product_name"
                value={field.name}
                oninput={(e) => updateField(i, { name: e.currentTarget.value })}
                disabled={saving}
              />
            </div>

            <!-- Type -->
            <div class="fb__col fb__col--type">
              <label class="fb__label" for="field-type-{i}">Type</label>
              <select
                id="field-type-{i}"
                class="fb__input fb__select"
                value={field.type}
                onchange={(e) => updateField(i, { type: e.currentTarget.value as FieldType })}
                disabled={saving}
              >
                {#each FIELD_TYPES as t}
                  <option value={t.value}>{t.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <!-- Select options (only shown for select type) -->
          {#if field.type === 'select'}
            <div class="fb__options">
              <label class="fb__label">Options <span class="fb__label-hint">(one per line)</span></label>
              <textarea
                class="fb__input fb__textarea"
                placeholder="Option A&#10;Option B&#10;Option C"
                value={(field.options ?? []).join('\n')}
                oninput={(e) => updateField(i, {
                  options: e.currentTarget.value.split('\n').map(s => s.trim()).filter(Boolean)
                })}
                rows="3"
                disabled={saving}
              ></textarea>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Add field button -->
  <button class="fb__add" onclick={addField} disabled={saving}>
    <Icon name="plus" size={14} /> Add field
  </button>

  <!-- Footer -->
  <div class="fb__footer">
    <button class="fb__btn fb__btn--cancel" onclick={onclose} disabled={saving}>Cancel</button>
    <button class="fb__btn fb__btn--primary" onclick={save} disabled={saving || fields.length === 0}>
      {saving ? 'Saving…' : `Save ${fields.length} field${fields.length === 1 ? '' : 's'}`}
    </button>
  </div>
</div>

<style>
  .fb { display: flex; flex-direction: column; gap: 16px; }

  .fb__error {
    padding: 10px 14px; background: rgba(255,64,96,0.08);
    border: 1px solid rgba(255,64,96,0.25); border-radius: 8px;
    color: var(--cms-red); font-size: 13px; line-height: 1.5;
  }

  .fb__empty {
    text-align: center; padding: 24px 0;
  }
  .fb__empty-title { font-size: 14px; font-weight: 600; color: var(--cms-text); margin-bottom: 4px; }
  .fb__empty-sub   { font-size: 13px; color: var(--cms-text-dim); }

  /* Field cards */
  .fb__list { display: flex; flex-direction: column; gap: 10px; }

  .fb__field {
    background:    var(--cms-surface);
    border:        1px solid var(--cms-border);
    border-radius: 10px;
    padding:       14px;
    display:       flex;
    flex-direction: column;
    gap:           10px;
    transition:    border-color 0.12s;
  }
  .fb__field:focus-within { border-color: rgba(0,212,255,0.3); }

  .fb__field-header {
    display:     flex;
    align-items: center;
    gap:         8px;
  }

  .fb__field-num {
    width:         20px;
    height:        20px;
    border-radius: 50%;
    background:    var(--cms-border);
    display:       flex;
    align-items:   center;
    justify-content: center;
    font-size:     11px;
    font-weight:   600;
    color:         var(--cms-text-dim);
    flex-shrink:   0;
  }

  .fb__field-type-badge {
    font-size:     10px;
    font-weight:   600;
    padding:       2px 8px;
    border-radius: 4px;
    background:    var(--cms-accent-dim);
    color:         var(--cms-accent);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .fb__field-spacer { flex: 1; }

  /* Toggle */
  .fb__toggle        { display: flex; align-items: center; gap: 6px; cursor: pointer; }
  .fb__toggle-input  { display: none; }
  .fb__toggle-track  {
    width: 28px; height: 16px; border-radius: 8px; background: var(--cms-border-hi);
    position: relative; transition: background 0.15s; flex-shrink: 0;
  }
  .fb__toggle-track::after {
    content: ''; position: absolute; left: 2px; top: 2px;
    width: 12px; height: 12px; border-radius: 50%; background: #fff;
    transition: transform 0.15s;
  }
  .fb__toggle-input:checked + .fb__toggle-track { background: var(--cms-accent); }
  .fb__toggle-input:checked + .fb__toggle-track::after { transform: translateX(12px); }
  .fb__toggle-label  { font-size: 11px; color: var(--cms-text-dim); white-space: nowrap; }

  .fb__remove {
    width: 24px; height: 24px; border-radius: 6px; border: 1px solid var(--cms-border);
    background: transparent; color: var(--cms-text-dim);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.1s; flex-shrink: 0;
  }
  .fb__remove:hover { background: rgba(255,64,96,0.08); border-color: var(--cms-red); color: var(--cms-red); }

  /* Field row */
  .fb__field-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .fb__col       { display: flex; flex-direction: column; gap: 5px; min-width: 120px; }
  .fb__col--grow { flex: 1; }
  .fb__col--type { width: 120px; flex-shrink: 0; }

  .fb__label {
    font-size: 11px; font-weight: 600; color: var(--cms-text-dim);
    letter-spacing: 0.06em; text-transform: uppercase;
  }
  .fb__label-hint { font-weight: 400; text-transform: none; }

  .fb__input {
    padding: 7px 10px; background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 7px; color: var(--cms-text); font-size: 13px; font-family: inherit;
    outline: none; width: 100%; transition: border-color 0.15s;
  }
  .fb__input:focus   { border-color: rgba(0,212,255,0.4); }
  .fb__input:disabled { opacity: 0.5; }
  .fb__input--mono   { font-family: 'IBM Plex Mono', monospace; font-size: 12px; }
  .fb__select        { cursor: pointer; }
  .fb__textarea      { resize: vertical; min-height: 68px; }

  .fb__options { display: flex; flex-direction: column; gap: 5px; }

  /* Add field */
  .fb__add {
    display:       flex;
    align-items:   center;
    gap:           6px;
    width:         100%;
    padding:       9px;
    background:    transparent;
    border:        1px dashed var(--cms-border);
    border-radius: 8px;
    color:         var(--cms-text-dim);
    font-size:     13px;
    justify-content: center;
    transition:    all 0.12s;
  }
  .fb__add:hover:not(:disabled) {
    border-color: var(--cms-accent);
    color:        var(--cms-accent);
    background:   var(--cms-accent-glow);
  }
  .fb__add:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Footer */
  .fb__footer {
    display:      flex;
    justify-content: flex-end;
    gap:          10px;
    padding-top:  16px;
    border-top:   1px solid var(--cms-border);
  }

  .fb__btn {
    padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.12s; border: 1px solid var(--cms-border);
  }
  .fb__btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .fb__btn--cancel  { background: transparent; color: var(--cms-text-dim); }
  .fb__btn--cancel:hover:not(:disabled)  { color: var(--cms-text); border-color: var(--cms-border-hi); }
  .fb__btn--primary { background: var(--cms-accent); color: #06090f; border-color: var(--cms-accent); }
  .fb__btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
</style>