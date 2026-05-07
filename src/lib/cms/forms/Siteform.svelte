<!-- SiteForm.svelte — create a new site -->
<script lang="ts">
  const {
    loading, onsubmit, oncancel,
  }: {
    loading:  boolean;
    onsubmit: (data: { name: string; slug: string; domain: string }) => void;
    oncancel: () => void;
  } = $props();

  let name   = $state('');
  let slug   = $state('');
  let domain = $state('');
  let error  = $state('');

  $effect(() => {
    if (!slug) {
      slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  });

  function handleSubmit() {
    error = '';
    if (!name.trim()) { error = 'Site name is required.'; return; }
    if (!slug.trim()) { error = 'Slug is required.';      return; }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      error = 'Slug can only contain lowercase letters, numbers and hyphens.';
      return;
    }
    onsubmit({ name: name.trim(), slug: slug.trim(), domain: domain.trim() });
  }
</script>

<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
  {#if error}
    <div class="form-error">{error}</div>
  {/if}

  <div class="field">
    <label class="label" for="site-name">Site name</label>
    <input id="site-name" class="input" type="text" placeholder="My Webshop"
      bind:value={name} disabled={loading} />
  </div>

  <div class="field">
    <label class="label" for="site-slug">Slug</label>
    <input id="site-slug" class="input" type="text" placeholder="my-webshop"
      bind:value={slug} disabled={loading} />
    <span class="hint">Used in API endpoints — e.g. /v1/sites/my-webshop/...</span>
  </div>

  <div class="field">
    <label class="label" for="site-domain">
      Domain <span class="optional">(optional)</span>
    </label>
    <input id="site-domain" class="input" type="text" placeholder="myshop.com"
      bind:value={domain} disabled={loading} />
    <span class="hint">Your frontend domain — you can set this later</span>
  </div>

  <div class="footer">
    <button type="button" class="btn btn--cancel" onclick={oncancel} disabled={loading}>Cancel</button>
    <button type="submit" class="btn btn--primary" disabled={loading}>
      {loading ? 'Creating…' : 'Create site'}
    </button>
  </div>
</form>

<style>
  .form-error {
    padding: 10px 14px; margin-bottom: 18px;
    background: rgba(255,64,96,0.08); border: 1px solid rgba(255,64,96,0.25);
    border-radius: 8px; color: var(--cms-red); font-size: 13px;
  }
  .field    { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
  .label    { font-size: 12px; font-weight: 600; color: var(--cms-text-mid); letter-spacing: 0.03em; }
  .optional { font-weight: 400; color: var(--cms-text-dim); font-size: 11px; }
  .hint     { font-size: 11px; color: var(--cms-text-dim); }

  .input {
    padding: 9px 13px; background: var(--cms-surface); border: 1px solid var(--cms-border);
    border-radius: 8px; color: var(--cms-text); font-size: 14px; font-family: inherit;
    outline: none; width: 100%; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .input:disabled { opacity: 0.5; }

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