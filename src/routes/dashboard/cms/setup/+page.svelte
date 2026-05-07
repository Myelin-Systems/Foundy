<script lang="ts">
  import { goto } from '$app/navigation';

  let name    = $state('');
  let slug    = $state('');
  let saving  = $state(false);
  let error   = $state('');

  // Auto-generate slug from name
  $effect(() => {
    slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });

  async function create() {
    if (!name.trim()) { error = 'Site name is required.'; return; }
    saving = true; error = '';
    try {
      const res  = await fetch('/api/cms/sites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, slug }),
      });
      const json = await res.json();
      if (!json.ok) { error = json.message; return; }
      goto(`/dashboard/cms?site=${json.site.id}`);
    } catch { error = 'Network error. Please try again.'; }
    finally  { saving = false; }
  }
</script>

<div class="setup">
  <div class="setup__card">
    <div class="setup__logo">
      <div class="setup__logo-mark"></div>
      <span>Foundy</span>
    </div>

    <h1 class="setup__title">Create your first site</h1>
    <p class="setup__sub">
      A site is the home for your content — collections, entries and media all live under it.
    </p>

    {#if error}
      <div class="setup__error">{error}</div>
    {/if}

    <div class="setup__form">
      <label class="setup__field">
        <span class="setup__label">Site name</span>
        <input class="setup__input" type="text" placeholder="My awesome project"
          bind:value={name} disabled={saving} />
      </label>

      <label class="setup__field">
        <span class="setup__label">Slug <span class="setup__hint">used in API paths</span></span>
        <input class="setup__input" type="text" placeholder="my-awesome-project"
          bind:value={slug} disabled={saving} />
      </label>

      <button class="setup__btn" onclick={create} disabled={saving || !name.trim()}>
        {saving ? 'Creating…' : 'Create site →'}
      </button>
    </div>
  </div>
</div>

<style>
  .setup {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    background: var(--bg); padding: 24px;
  }
  .setup__card {
    width: 100%; max-width: 440px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; padding: 40px 36px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.4);
  }
  .setup__logo {
    display: flex; align-items: center; gap: 10px;
    font-size: 17px; font-weight: 700; color: var(--cyan);
    margin-bottom: 32px;
  }
  .setup__logo-mark {
    width: 28px; height: 28px; background: var(--cyan);
    border-radius: 7px; opacity: 0.9;
    box-shadow: 0 0 16px rgba(0,212,255,0.35);
  }
  .setup__title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 8px; }
  .setup__sub   { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-bottom: 28px; }

  .setup__error {
    padding: 10px 14px; margin-bottom: 20px;
    background: rgba(255,68,102,0.08); border: 1px solid rgba(255,68,102,0.25);
    border-radius: 8px; color: #ff6680; font-size: 13px;
  }

  .setup__form  { display: flex; flex-direction: column; gap: 16px; }
  .setup__field { display: flex; flex-direction: column; gap: 6px; }
  .setup__label { font-size: 12px; font-weight: 600; color: var(--text-dim); display: flex; align-items: center; gap: 6px; }
  .setup__hint  { font-weight: 400; color: var(--text-dim); opacity: 0.6; font-size: 11px; }
  .setup__input {
    padding: 10px 14px; background: var(--card); border: 1px solid var(--border);
    border-radius: 8px; color: var(--text); font-size: 14px; font-family: inherit; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .setup__input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .setup__input:disabled { opacity: 0.5; }
  .setup__btn {
    margin-top: 8px; padding: 12px; background: var(--cyan); color: #070b12;
    border: none; border-radius: 8px; font-size: 14px; font-weight: 700;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
  }
  .setup__btn:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 20px rgba(0,212,255,0.3); }
  .setup__btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>