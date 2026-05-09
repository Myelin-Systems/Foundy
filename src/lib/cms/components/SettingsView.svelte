<!-- SettingsView.svelte — save settings, plan overview, delete site -->
<script lang="ts">
  import { invalidateAll, goto } from '$app/navigation';
  import ConfirmDialog from '../dialog/ConfirmDialog.svelte';
  import Modal         from './Modal.svelte';
  import PricingView   from './PricingView.svelte';
  import type { SessionPayload } from '$lib/server/services/auth/TokenService';
  import { getAllPlans, isUnlimited } from '$lib/shared/plans';
  import type { OrgUsage }       from '$lib/server/services/foundiq/UsageService';

  const {
    siteId, session, siteName: initialName = '', siteDomain: initialDomain = '', usage,
  }: {
    siteId:       string | null;
    session:      SessionPayload;
    siteName?:    string;
    siteDomain?:  string;
    usage:        OrgUsage;
  } = $props();

  let name   = $state(initialName);
  let domain = $state(initialDomain);
  let saving = $state(false);
  let saved  = $state(false);
  let error  = $state('');

  let showDeleteConfirm = $state(false);
  let deleting          = $state(false);
  let showPlans         = $state(false);

  const plans = getAllPlans();

  // ── Formatters ────────────────────────────────────────────────────────────

  /** Bytes → human readable. Never shows "0.0 MB" — stays in smaller unit
   *  until value is genuinely >= 1 of the next unit. */
  function fmtBytes(n: number): string {
    if (isUnlimited(n))          return '∞';
    if (n === 0)                 return '0 B';
    if (n < 1_024)               return `${n} B`;
    if (n < 1_048_576)           return `${(n / 1_024).toFixed(1)} KB`;
    if (n < 10_737_418_240)      return `${(n / 1_048_576).toFixed(0)} MB`;
    return `${(n / 1_073_741_824).toFixed(0)} GB`;
  }

  /** Plain number limit (entries, sites). */
  function fmtLimit(n: number): string {
    if (isUnlimited(n)) return '∞';
    return n.toLocaleString();
  }

  function pct(used: number, limit: number): number {
    if (isUnlimited(limit)) return 0;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  function barColor(p: number): string {
    if (p >= 90) return 'var(--cms-red)';
    if (p >= 70) return 'var(--cms-amber)';
    return 'var(--cms-green)';
  }

  const dbPct  = $derived(pct(usage.db_bytes,  usage.db_limit_bytes));
  const entPct = $derived(pct(usage.entries,   usage.entries_limit));
  const sitPct = $derived(pct(usage.sites,     usage.sites_limit));

  async function saveSettings() {
    if (!siteId) return;
    if (!name.trim()) { error = 'Site name is required.'; return; }
    saving = true; error = '';
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name, domain }),
      });
      const json = await res.json();
      if (!json.ok) { error = json.message; return; }
      saved = true;
      setTimeout(() => (saved = false), 2500);
      await invalidateAll();
    } finally { saving = false; }
  }

  async function deleteSite() {
    if (!siteId) return;
    deleting = true;
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      await goto('/dashboard/cms');
      await invalidateAll();
    } finally { deleting = false; }
  }
</script>

<div class="settings cms-fade-in">
  <div class="settings__inner">
    <h1 class="settings__title">Site Settings</h1>
    <p class="settings__subtitle">Configure your site details and access.</p>

    <!-- General -->
    <section class="settings__section">
      <h2 class="settings__section-title">General</h2>
      <div class="settings__card">
        {#if error}
          <div class="settings__error">{error}</div>
        {/if}
        <div class="settings__field">
          <label class="settings__label" for="site-name">Site name</label>
          <input id="site-name" class="settings__input" type="text"
            bind:value={name} disabled={saving} />
        </div>
        <div class="settings__field">
          <label class="settings__label" for="site-domain">
            Domain
            <span class="settings__optional">(optional)</span>
          </label>
          <input id="site-domain" class="settings__input" type="text"
            placeholder="myshop.com" bind:value={domain} disabled={saving} />
          <span class="settings__hint">Your frontend domain — used for CORS</span>
        </div>
      </div>
    </section>

    <!-- Account -->
    <section class="settings__section">
      <h2 class="settings__section-title">Account</h2>
      <div class="settings__card">
        <div class="settings__info-row">
          <span class="settings__info-label">Email</span>
          <span class="settings__info-value">{session.email}</span>
        </div>
        <div class="settings__info-row">
          <span class="settings__info-label">User ID</span>
          <span class="settings__info-value settings__info-value--mono cms-mono">
            {session.sub.slice(0, 16)}…
          </span>
        </div>
      </div>
    </section>

    <!-- Plan -->
    <section class="settings__section">
      <h2 class="settings__section-title">Plan</h2>
      <div class="settings__card settings__card--plan">

        <!-- Plan name + CTA -->
        <div class="settings__plan-header">
          <div class="settings__plan-identity">
            <span class="settings__plan-badge">{usage.plan.name}</span>
            <span class="settings__plan-tagline">{usage.plan.tagline}</span>
          </div>
          <button class="settings__plan-btn" onclick={() => (showPlans = true)}>
            View plans →
          </button>
        </div>

        <!-- Mini usage bars -->
        <div class="settings__plan-meters">

          <div class="settings__meter">
            <div class="settings__meter-head">
              <span class="settings__meter-label">Database</span>
              <span class="settings__meter-val cms-mono">
                {fmtBytes(usage.db_bytes)} / {fmtBytes(usage.db_limit_bytes)}
              </span>
            </div>
            <div class="settings__meter-track">
              <div class="settings__meter-fill"
                style="width:{dbPct}%; background:{barColor(dbPct)}"></div>
            </div>
          </div>

          <div class="settings__meter">
            <div class="settings__meter-head">
              <span class="settings__meter-label">Entries</span>
              <span class="settings__meter-val cms-mono">
                {usage.entries.toLocaleString()} / {fmtLimit(usage.entries_limit)}
              </span>
            </div>
            <div class="settings__meter-track">
              <div class="settings__meter-fill"
                style="width:{entPct}%; background:{barColor(entPct)}"></div>
            </div>
          </div>

          <div class="settings__meter">
            <div class="settings__meter-head">
              <span class="settings__meter-label">Sites</span>
              <span class="settings__meter-val cms-mono">
                {usage.sites} / {fmtLimit(usage.sites_limit)}
              </span>
            </div>
            <div class="settings__meter-track">
              <div class="settings__meter-fill"
                style="width:{sitPct}%; background:{barColor(sitPct)}"></div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <button
      class="settings__save-btn"
      class:settings__save-btn--saved={saved}
      onclick={saveSettings}
      disabled={saving}
    >
      {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
    </button>

    <!-- Danger zone -->
    <section class="settings__section settings__section--danger">
      <h2 class="settings__section-title settings__section-title--danger">Danger zone</h2>
      <div class="settings__card settings__card--danger">
        <div class="settings__danger-row">
          <div>
            <p class="settings__danger-label">Delete this site</p>
            <p class="settings__danger-desc">
              Permanently removes all collections, entries and media. This cannot be undone.
            </p>
          </div>
          <button class="settings__delete-btn" onclick={() => (showDeleteConfirm = true)}>
            Delete site
          </button>
        </div>
      </div>
    </section>
  </div>
</div>

<!-- Plans modal -->
<Modal open={showPlans} title="Plans & Billing" onclose={() => (showPlans = false)} size="xl">
  <PricingView {plans} {usage} />
</Modal>

<ConfirmDialog
  open={showDeleteConfirm}
  title="Delete site"
  message="This will permanently delete the site and all its content — collections, entries, media and API tokens. There is no undo."
  confirmLabel="Yes, delete site"
  loading={deleting}
  onconfirm={deleteSite}
  oncancel={() => (showDeleteConfirm = false)}
/>

<style>
  .settings { padding: 28px; height: 100%; overflow-y: auto; }
  .settings__inner    { max-width: 580px; }
  .settings__title    { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .settings__subtitle { font-size: 12px; color: var(--cms-text-dim); margin-top: 3px; }

  .settings__section         { margin-top: 32px; }
  .settings__section--danger { margin-top: 40px; }
  .settings__section-title   { font-size: 11px; font-weight: 600; color: var(--cms-text-dim); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px; }
  .settings__section-title--danger { color: var(--cms-red); opacity: 0.7; }

  .settings__card {
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px;
  }
  .settings__card--danger { border-color: rgba(255,64,96,0.25); }
  .settings__card--plan   { gap: 20px; }

  .settings__error {
    padding: 10px 14px; background: rgba(255,64,96,0.08);
    border: 1px solid rgba(255,64,96,0.25); border-radius: 8px;
    color: var(--cms-red); font-size: 13px;
  }

  .settings__field    { display: flex; flex-direction: column; gap: 6px; }
  .settings__label    { font-size: 12px; font-weight: 600; color: var(--cms-text-mid); letter-spacing: 0.03em; }
  .settings__optional { font-weight: 400; color: var(--cms-text-dim); font-size: 11px; margin-left: 4px; }
  .settings__hint     { font-size: 11px; color: var(--cms-text-dim); }

  .settings__input {
    width: 100%; padding: 10px 14px; background: var(--cms-surface); border: 1px solid var(--cms-border);
    border-radius: 8px; color: var(--cms-text); font-size: 14px; font-family: inherit; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .settings__input:focus    { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .settings__input:disabled { opacity: 0.5; }

  .settings__info-row         { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
  .settings__info-label       { font-size: 13px; color: var(--cms-text-dim); }
  .settings__info-value       { font-size: 13px; color: var(--cms-text); }
  .settings__info-value--mono { font-size: 12px; color: var(--cms-text-dim); }

  /* ── Plan section ── */
  .settings__plan-header   { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .settings__plan-identity { display: flex; flex-direction: column; gap: 4px; }
  .settings__plan-badge {
    display: inline-flex; align-self: flex-start;
    font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
    padding: 3px 10px; border-radius: 20px;
    background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2);
    color: var(--cms-accent);
  }
  .settings__plan-tagline { font-size: 12px; color: var(--cms-text-dim); }

  .settings__plan-btn {
    padding: 8px 14px; border-radius: 8px; border: 1px solid var(--cms-border);
    background: var(--cms-surface); color: var(--cms-text);
    font-size: 13px; font-weight: 500; font-family: inherit;
    cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.12s;
  }
  .settings__plan-btn:hover { border-color: var(--cms-border-hi); color: var(--cms-accent); }

  /* Mini meters */
  .settings__plan-meters { display: flex; flex-direction: column; gap: 12px; }
  .settings__meter       { display: flex; flex-direction: column; gap: 5px; }
  .settings__meter-head  { display: flex; justify-content: space-between; align-items: baseline; }
  .settings__meter-label { font-size: 11px; color: var(--cms-text-dim); }
  .settings__meter-val   { font-size: 11px; color: var(--cms-text-mid); }

  .settings__meter-track {
    height: 4px; background: var(--cms-border); border-radius: 99px; overflow: hidden;
  }
  .settings__meter-fill {
    height: 100%; border-radius: 99px;
    transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* ── Save button ── */
  .settings__save-btn {
    margin-top: 24px; padding: 10px 24px; background: var(--cms-accent); color: #06090f;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
  }
  .settings__save-btn:hover:not(:disabled) { filter: brightness(1.1); }
  .settings__save-btn:disabled             { opacity: 0.5; cursor: not-allowed; }
  .settings__save-btn--saved               { background: var(--cms-green); }

  /* ── Danger zone ── */
  .settings__danger-row   { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .settings__danger-label { font-size: 13px; font-weight: 600; color: var(--cms-red); margin-bottom: 4px; }
  .settings__danger-desc  { font-size: 12px; color: var(--cms-text-dim); line-height: 1.5; }

  .settings__delete-btn {
    padding: 8px 16px; background: transparent; border: 1px solid rgba(255,64,96,0.4);
    border-radius: 8px; color: var(--cms-red); font-size: 13px; font-weight: 500;
    white-space: nowrap; flex-shrink: 0; transition: all 0.12s;
  }
  .settings__delete-btn:hover { background: rgba(255,64,96,0.08); border-color: var(--cms-red); }
</style>