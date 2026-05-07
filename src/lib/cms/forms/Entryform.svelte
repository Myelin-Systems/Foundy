<!-- EntryForm.svelte — dynamic form rendered from collection field definitions -->
<script lang="ts">
  import type { CollectionField, Entry } from '../types';

  const {
    fields, initial = {}, loading, onsubmit, oncancel,
  }: {
    fields:    CollectionField[];
    initial?:  Record<string, unknown>;
    loading:   boolean;
    onsubmit:  (data: Record<string, unknown>) => void;
    oncancel:  () => void;
  } = $props();

  // Seed form data from initial values or empty defaults per field type
  const defaults: Record<string, unknown> = {};
  for (const f of fields) {
    defaults[f.name] = initial[f.name] ?? (
      f.type === 'boolean' ? false :
      f.type === 'number' || f.type === 'stock' ? 0 : ''
    );
  }

  let formData = $state<Record<string, unknown>>({ ...defaults });
  let errors   = $state<Record<string, string>>({});

  function validate(): boolean {
    errors = {};
    for (const f of fields) {
      if (f.required) {
        const v = formData[f.name];
        if (v === '' || v === null || v === undefined) {
          errors[f.name] = `${f.label} is required.`;
        }
      }
    }
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    onsubmit(formData);
  }

  function setField(name: string, value: unknown) {
    formData = { ...formData, [name]: value };
    if (errors[name]) errors = { ...errors, [name]: '' };
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  {#if fields.length === 0}
    <p class="no-fields">
      This collection has no fields defined yet.<br>
      Add fields to the collection schema first.
    </p>
  {:else}
    {#each fields as field (field.name)}
      <div class="field" class:field--error={!!errors[field.name]}>
        <label class="label" for="field-{field.name}">
          {field.label}
          {#if field.required}<span class="required" aria-label="required">*</span>{/if}
        </label>

        {#if field.type === 'textarea'}
          <textarea
            id="field-{field.name}"
            class="input input--textarea"
            value={String(formData[field.name] ?? '')}
            oninput={(e) => setField(field.name, e.currentTarget.value)}
            disabled={loading}
            rows="4"
          ></textarea>

        {:else if field.type === 'boolean'}
          <label class="toggle">
            <input
              id="field-{field.name}"
              type="checkbox"
              checked={Boolean(formData[field.name])}
              onchange={(e) => setField(field.name, e.currentTarget.checked)}
              disabled={loading}
              class="toggle__input"
            />
            <span class="toggle__track"></span>
            <span class="toggle__label">{formData[field.name] ? 'Yes' : 'No'}</span>
          </label>

        {:else if field.type === 'select'}
          <select
            id="field-{field.name}"
            class="input"
            value={String(formData[field.name] ?? '')}
            onchange={(e) => setField(field.name, e.currentTarget.value)}
            disabled={loading}
          >
            <option value="">Select…</option>
            {#each field.options ?? [] as opt}
              <option value={opt}>{opt}</option>
            {/each}
          </select>

        {:else if field.type === 'number' || field.type === 'stock'}
          <input
            id="field-{field.name}"
            class="input"
            type="number"
            min={field.type === 'stock' ? 0 : undefined}
            value={Number(formData[field.name] ?? 0)}
            oninput={(e) => setField(field.name, Number(e.currentTarget.value))}
            disabled={loading}
          />

        {:else if field.type === 'date'}
          <input
            id="field-{field.name}"
            class="input"
            type="date"
            value={String(formData[field.name] ?? '')}
            oninput={(e) => setField(field.name, e.currentTarget.value)}
            disabled={loading}
          />

        {:else}
          <!-- text / image (URL for now) -->
          <input
            id="field-{field.name}"
            class="input"
            type="text"
            value={String(formData[field.name] ?? '')}
            oninput={(e) => setField(field.name, e.currentTarget.value)}
            disabled={loading}
            placeholder={field.hint ?? ''}
          />
        {/if}

        {#if errors[field.name]}
          <span class="error-msg">{errors[field.name]}</span>
        {/if}
        {#if field.hint && field.type !== 'text'}
          <span class="hint">{field.hint}</span>
        {/if}
      </div>
    {/each}
  {/if}

  <div class="footer">
    <button type="button" class="btn btn--cancel" onclick={oncancel} disabled={loading}>Cancel</button>
    <button type="submit" class="btn btn--primary" disabled={loading || fields.length === 0}>
      {loading ? 'Saving…' : 'Save entry'}
    </button>
  </div>
</form>

<style>
  .no-fields {
    text-align: center; padding: 24px 0; font-size: 13px;
    color: var(--cms-text-dim); line-height: 1.7;
  }

  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .field--error .input { border-color: var(--cms-red); }

  .label { font-size: 12px; font-weight: 600; color: var(--cms-text-mid); letter-spacing: 0.03em; }
  .required { color: var(--cms-red); margin-left: 3px; }

  .input {
    padding: 9px 13px; background: var(--cms-surface); border: 1px solid var(--cms-border);
    border-radius: 8px; color: var(--cms-text); font-size: 14px; font-family: inherit;
    outline: none; width: 100%; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .input:disabled { opacity: 0.5; }
  .input--textarea { resize: vertical; min-height: 90px; }
  select.input { cursor: pointer; }

  /* Toggle */
  .toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; }
  .toggle__input { display: none; }
  .toggle__track {
    width: 36px; height: 20px; border-radius: 10px; background: var(--cms-border-hi);
    transition: background 0.15s; flex-shrink: 0; position: relative;
  }
  .toggle__track::after {
    content: ''; position: absolute; left: 3px; top: 3px;
    width: 14px; height: 14px; border-radius: 50%; background: #fff;
    transition: transform 0.15s;
  }
  .toggle__input:checked + .toggle__track { background: var(--cms-accent); }
  .toggle__input:checked + .toggle__track::after { transform: translateX(16px); }
  .toggle__label { font-size: 13px; color: var(--cms-text-mid); }

  .error-msg { font-size: 12px; color: var(--cms-red); }
  .hint      { font-size: 11px; color: var(--cms-text-dim); }

  .footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; padding-top: 20px; border-top: 1px solid var(--cms-border); }

  .btn {
    padding: 9px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.12s; border: 1px solid var(--cms-border);
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn--cancel  { background: transparent; color: var(--cms-text-dim); }
  .btn--cancel:hover:not(:disabled) { color: var(--cms-text); border-color: var(--cms-border-hi); }
  .btn--primary { background: var(--cms-accent); color: #06090f; border-color: var(--cms-accent); }
  .btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
</style>