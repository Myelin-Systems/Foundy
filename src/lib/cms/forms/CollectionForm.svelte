<!-- CollectionForm.svelte — create a new collection with name, label, color and initial fields -->
<script lang="ts">
  import Icon from '../components/Icon.svelte';

  const {
    siteId, loading, onsubmit, oncancel,
  }: {
    siteId:   string;
    loading:  boolean;
    onsubmit: (data: { name: string; label: string; color: string }) => void;
    oncancel: () => void;
  } = $props();

  let name  = $state('');
  let label = $state('');
  let color = $state('#00d4ff');
  let error = $state('');

  const COLORS = ['#00d4ff','#7c5cfc','#00e896','#f5b800','#ff4060','#ff8c42','#c084fc'];

  // Auto-generate slug-like name from label
  $effect(() => {
    if (!name) {
      name = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
  });

  function handleSubmit() {
    error = '';
    if (!label.trim()) { error = 'Display name is required.'; return; }
    if (!name.trim())  { error = 'API name is required.';     return; }
    if (!/^[a-z0-9_]+$/.test(name)) {
      error = 'API name can only contain lowercase letters, numbers and underscores.';
      return;
    }
    onsubmit({ name: name.trim(), label: label.trim(), color });
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  {#if error}
    <div class="form-error">{error}</div>
  {/if}

  <div class="field">
    <label class="label" for="col-label">Display name</label>
    <input id="col-label" class="input" type="text" placeholder="Blog Posts"
      bind:value={label} disabled={loading} />
    <span class="hint">Shown in the sidebar and UI</span>
  </div>

  <div class="field">
    <label class="label" for="col-name">API name</label>
    <input id="col-name" class="input" type="text" placeholder="blog_posts"
      bind:value={name} disabled={loading} />
    <span class="hint">Used in API endpoints — lowercase, no spaces</span>
  </div>

  <div class="field">
    <span class="label">Colour</span>
    <div class="colors">
      {#each COLORS as c}
        <button
          type="button"
          class="color-swatch"
          class:color-swatch--active={color === c}
          style="background: {c};"
          onclick={() => (color = c)}
          aria-label="Select colour {c}"
        >
          {#if color === c}
            <Icon name="check" size={12} />
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <div class="footer">
    <button type="button" class="btn btn--cancel" onclick={oncancel} disabled={loading}>Cancel</button>
    <button type="submit" class="btn btn--primary" disabled={loading}>
      {loading ? 'Creating…' : 'Create collection'}
    </button>
  </div>
</form>

<style>
  .form-error {
    padding: 10px 14px; margin-bottom: 18px;
    background: rgba(255,64,96,0.08); border: 1px solid rgba(255,64,96,0.25);
    border-radius: 8px; color: var(--cms-red); font-size: 13px;
  }
  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .label { font-size: 12px; font-weight: 600; color: var(--cms-text-mid); letter-spacing: 0.03em; }
  .hint  { font-size: 11px; color: var(--cms-text-dim); }

  .input {
    padding: 9px 13px; background: var(--cms-surface); border: 1px solid var(--cms-border);
    border-radius: 8px; color: var(--cms-text); font-size: 14px; font-family: inherit;
    outline: none; width: 100%; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .input:disabled { opacity: 0.5; }

  .colors { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }

  .color-swatch {
    width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
    color: #fff; transition: transform 0.12s, box-shadow 0.12s;
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch--active { border-color: #fff; box-shadow: 0 0 0 2px var(--cms-border-hi); }

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