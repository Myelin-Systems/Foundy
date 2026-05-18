<!-- SettingsView.svelte — site settings, plan + billing side by side, danger zone -->
<script lang="ts">
  import { invalidateAll, goto } from '$app/navigation';
  import ConfirmDialog from '../dialog/ConfirmDialog.svelte';
  import Modal         from './Modal.svelte';
  import PricingView   from './PricingView.svelte';
  import type { SessionPayload } from '$lib/server/services/auth/TokenService';
  import { getAllPlans, isUnlimited } from '$lib/shared/plans';
  import type { OrgUsage } from '$lib/server/services/foundiq/UsageService';

  const {
    siteId, session, siteName: initialName = '', siteDomain: initialDomain = '',
    usage, subscription, orgBilling,
  }: {
    siteId:       string | null;
    session:      SessionPayload;
    siteName?:    string;
    siteDomain?:  string;
    usage:        OrgUsage;
    subscription: {
      status:               string;
      current_period_end:   string | null;
      cancel_at_period_end: boolean;
      plan: { slug: string; name: string; };
    } | null;
    orgBilling: {
      billing_name:        string | null;
      billing_country:     string | null;
      billing_address:     string | null;
      billing_postal_code: string | null;
      billing_city:        string | null;
      vat_number:          string | null;
    } | null;
  } = $props();

  // ── Site settings state ───────────────────────────────────────────────────
  let name   = $state(initialName);
  let domain = $state(initialDomain);
  let saving = $state(false);
  let saved  = $state(false);
  let error  = $state('');

  let showDeleteConfirm = $state(false);
  let deleting          = $state(false);
  let showPlans         = $state(false);

  // ── Billing info state ────────────────────────────────────────────────────
  let billingName    = $state(orgBilling?.billing_name        ?? '');
  let billingCountry = $state(orgBilling?.billing_country     ?? '');
  let billingAddress = $state(orgBilling?.billing_address     ?? '');
  let billingPostal  = $state(orgBilling?.billing_postal_code ?? '');
  let billingCity    = $state(orgBilling?.billing_city        ?? '');
  let vatNumber      = $state(orgBilling?.vat_number          ?? '');

  let billingLoading = $state(false);
  let billingSaved   = $state(false);
  let billingError   = $state('');

  const plans = getAllPlans();

  // ── EU country set (mirrors server resolveVat) ────────────────────────────
  const EU_COUNTRIES = new Set([
    'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR',
    'HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO',
    'SE','SI','SK',
  ]);

  const vatHint = $derived(() => {
    const c = billingCountry.toUpperCase();
    if (!c) return null;
    if (vatNumber.trim() && EU_COUNTRIES.has(c)) return { rate: 0, reverse: true };
    if (EU_COUNTRIES.has(c))                      return { rate: 21, reverse: false };
    return { rate: 0, reverse: false };
  });

  // ── Formatters ────────────────────────────────────────────────────────────
  function fmtBytes(n: number): string {
    if (isUnlimited(n))          return '∞';
    if (n === 0)                 return '0 B';
    if (n < 1_024)               return `${n} B`;
    if (n < 1_048_576)           return `${(n / 1_024).toFixed(1)} KB`;
    if (n < 10_737_418_240)      return `${(n / 1_048_576).toFixed(0)} MB`;
    return `${(n / 1_073_741_824).toFixed(0)} GB`;
  }

  function fmtLimit(n: number): string {
    if (isUnlimited(n)) return '∞';
    return n.toLocaleString();
  }

  function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('nl-NL', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
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

  // ── Subscription status helpers ───────────────────────────────────────────
  const isPaid       = $derived(subscription?.status === 'active');
  const isPending    = $derived(subscription?.status === 'pending');
  const isCancelling = $derived(subscription?.cancel_at_period_end === true);
  const isFree       = $derived(!subscription || subscription.status === 'free');
  const hasBillingInfo = $derived(!!billingCountry.trim());

  // ── Site settings ─────────────────────────────────────────────────────────
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

  // ── Billing info ──────────────────────────────────────────────────────────
  async function saveBillingInfo() {
    if (!billingCountry.trim()) { billingError = 'Country is required.'; return; }
    billingLoading = true; billingError = '';
    try {
      const res  = await fetch('/api/org/billing', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          billing_name:        billingName.trim()    || null,
          billing_country:     billingCountry.trim().toUpperCase(),
          billing_address:     billingAddress.trim() || null,
          billing_postal_code: billingPostal.trim()  || null,
          billing_city:        billingCity.trim()    || null,
          vat_number:          vatNumber.trim()      || null,
        }),
      });
      const json = await res.json();
      if (!json.ok) { billingError = json.message; return; }
      billingSaved = true;
      setTimeout(() => (billingSaved = false), 2500);
      await invalidateAll();
    } finally { billingLoading = false; }
  }

  // ── Subscription actions ──────────────────────────────────────────────────
  async function cancelPlan() {
    if (!confirm('Cancel at end of current billing period?')) return;
    billingLoading = true;
    try {
      const res  = await fetch('/api/billing/portal', { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      await invalidateAll();
    } finally { billingLoading = false; }
  }

  async function resumePlan() {
    billingLoading = true;
    try {
      const res  = await fetch('/api/billing/portal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planSlug: subscription?.plan.slug }),
      });
      const json = await res.json();
      if (json.checkoutUrl) { window.location.href = json.checkoutUrl; return; }
      await invalidateAll();
    } finally { billingLoading = false; }
  }

  async function completePendingPayment() {
    billingLoading = true;
    try {
      const res  = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ planSlug: subscription?.plan.slug ?? 'cms_starter', billingCycle: 'month' }),
      });
      const json = await res.json();
      if (json.ok) { window.location.href = json.checkoutUrl; }
      else alert(json.message);
    } finally { billingLoading = false; }
  }

  async function upgradePlan() {
    if (!hasBillingInfo) {
      billingError = 'Fill in your billing country before upgrading.';
      document.querySelector('.settings__card--billing')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    showPlans = true;
  }
</script>

<div class="settings cms-fade-in">
  <div class="settings__inner">
    <h1 class="settings__title">Settings</h1>
    <p class="settings__subtitle">Manage your site, account and billing.</p>

    <!-- ── Site ──────────────────────────────────────────────────────────── -->
    <section class="settings__section">
      <h2 class="settings__section-title">Site</h2>
      <div class="settings__card">
        {#if error}<div class="settings__error">{error}</div>{/if}
        <div class="settings__field">
          <label class="settings__label" for="site-name">Site name</label>
          <input id="site-name" class="settings__input" type="text"
            bind:value={name} disabled={saving} />
        </div>
        <div class="settings__field">
          <label class="settings__label" for="site-domain">
            Domain <span class="settings__optional">(optional)</span>
          </label>
          <input id="site-domain" class="settings__input" type="text"
            placeholder="myshop.com" bind:value={domain} disabled={saving} />
          <span class="settings__hint">Your frontend domain — used for CORS</span>
        </div>
        <div>
          <button class="settings__save-btn" class:settings__save-btn--saved={saved}
            onclick={saveSettings} disabled={saving}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Account ────────────────────────────────────────────────────────── -->
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

    <!-- ── Plan + Billing side by side ────────────────────────────────────── -->
    <section class="settings__section">
      <div class="settings__two-col">

        <!-- Left: Plan -->
        <div class="settings__col">
          <h2 class="settings__section-title">Plan</h2>
          <div class="settings__card settings__card--plan">
            <div class="settings__plan-header">
              <div class="settings__plan-identity">
                <span class="settings__plan-badge">{usage.plan.name}</span>
                <span class="settings__plan-tagline">{usage.plan.tagline}</span>
              </div>
              <button class="settings__plan-btn" onclick={upgradePlan}>
                View plans →
              </button>
            </div>
            <div class="settings__plan-meters">
              <div class="settings__meter">
                <div class="settings__meter-head">
                  <span class="settings__meter-label">Database</span>
                  <span class="settings__meter-val cms-mono">
                    {fmtBytes(usage.db_bytes)} / {fmtBytes(usage.db_limit_bytes)}
                  </span>
                </div>
                <div class="settings__meter-track">
                  <div class="settings__meter-fill" style="width:{dbPct}%; background:{barColor(dbPct)}"></div>
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
                  <div class="settings__meter-fill" style="width:{entPct}%; background:{barColor(entPct)}"></div>
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
                  <div class="settings__meter-fill" style="width:{sitPct}%; background:{barColor(sitPct)}"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Billing status + invoice details -->
        <div class="settings__col">
          <h2 class="settings__section-title">Billing</h2>
          <div class="settings__card settings__card--billing">

            <!-- Subscription status -->
            {#if isPending}
              <div class="settings__billing-banner settings__billing-banner--warn">
                <div class="settings__billing-banner-icon">⚠</div>
                <div>
                  <div class="settings__billing-banner-title">Incomplete payment</div>
                  <div class="settings__billing-banner-sub">Your checkout was not completed.</div>
                </div>
              </div>
              <div class="settings__billing-actions">
                <button class="settings__billing-btn settings__billing-btn--primary"
                  onclick={completePendingPayment} disabled={billingLoading}>
                  {billingLoading ? 'Loading…' : 'Complete payment →'}
                </button>
                <button class="settings__billing-btn" onclick={() => goto('/dashboard/cms')}>
                  Continue on free plan
                </button>
              </div>
            {:else if isFree}
              <div class="settings__billing-status">
                <span class="settings__billing-label">Status</span>
                <span class="settings__billing-chip settings__billing-chip--free">Free</span>
              </div>
              <p class="settings__billing-desc">Upgrade to unlock more sites, entries and storage.</p>
              <button class="settings__billing-btn settings__billing-btn--primary" onclick={upgradePlan}>
                Upgrade plan →
              </button>
            {:else if isPaid}
              <div class="settings__billing-status">
                <span class="settings__billing-label">Status</span>
                <span class="settings__billing-chip settings__billing-chip--active">
                  {isCancelling ? 'Cancelling' : 'Active'}
                </span>
              </div>
              <div class="settings__billing-row">
                <span class="settings__billing-label">{isCancelling ? 'Access until' : 'Next renewal'}</span>
                <span class="settings__billing-value">{fmtDate(subscription?.current_period_end ?? null)}</span>
              </div>
              <div class="settings__billing-row">
                <span class="settings__billing-label">Plan</span>
                <span class="settings__billing-value">{subscription?.plan.name}</span>
              </div>
              {#if isCancelling}
                <div class="settings__billing-banner settings__billing-banner--info">
                  <div class="settings__billing-banner-icon">ℹ</div>
                  <div class="settings__billing-banner-sub">Cancelled — access continues until period ends.</div>
                </div>
                <button class="settings__billing-btn settings__billing-btn--primary"
                  onclick={resumePlan} disabled={billingLoading}>
                  {billingLoading ? 'Loading…' : 'Resume plan'}
                </button>
              {:else}
                <div class="settings__billing-actions">
                  <button class="settings__billing-btn settings__billing-btn--primary" onclick={upgradePlan}>
                    Change plan
                  </button>
                  <button class="settings__billing-btn settings__billing-btn--cancel"
                    onclick={cancelPlan} disabled={billingLoading}>
                    {billingLoading ? 'Loading…' : 'Cancel plan'}
                  </button>
                </div>
              {/if}
            {/if}

            <!-- Invoice details divider -->
            <div class="settings__billing-divider"><span>Invoice details</span></div>

            {#if billingError}
              <div class="settings__error">{billingError}</div>
            {/if}

            {#if !hasBillingInfo}
              <div class="settings__billing-banner settings__billing-banner--warn">
                <div class="settings__billing-banner-icon">⚠</div>
                <div class="settings__billing-banner-sub">
                  Country required before upgrading or checking out.
                </div>
              </div>
            {/if}

            <div class="settings__field">
              <label class="settings__label" for="b-name">
                Legal name <span class="settings__optional">company or your name</span>
              </label>
              <input id="b-name" class="settings__input settings__input--sm" type="text"
                placeholder="Acme B.V." bind:value={billingName} disabled={billingLoading} />
            </div>

            <div class="settings__field">
              <label class="settings__label" for="b-country">
                Country <span class="settings__required">required</span>
              </label>
              <select id="b-country" class="settings__input settings__input--sm"
                bind:value={billingCountry} disabled={billingLoading}>
                <option value="">Select country…</option>
                <optgroup label="EU">
                  <option value="NL">Netherlands</option>
                  <option value="BE">Belgium</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="AT">Austria</option>
                  <option value="DK">Denmark</option>
                  <option value="ES">Spain</option>
                  <option value="FI">Finland</option>
                  <option value="IE">Ireland</option>
                  <option value="IT">Italy</option>
                  <option value="LU">Luxembourg</option>
                  <option value="PL">Poland</option>
                  <option value="PT">Portugal</option>
                  <option value="SE">Sweden</option>
                  <option value="CZ">Czech Republic</option>
                  <option value="HR">Croatia</option>
                  <option value="HU">Hungary</option>
                  <option value="RO">Romania</option>
                  <option value="SK">Slovakia</option>
                  <option value="SI">Slovenia</option>
                  <option value="BG">Bulgaria</option>
                  <option value="CY">Cyprus</option>
                  <option value="EE">Estonia</option>
                  <option value="GR">Greece</option>
                  <option value="LT">Lithuania</option>
                  <option value="LV">Latvia</option>
                  <option value="MT">Malta</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                  <option value="OTHER">Other</option>
                </optgroup>
              </select>
            </div>

            <div class="settings__field">
              <label class="settings__label" for="b-vat">
                EU VAT number <span class="settings__optional">agencies & B2B</span>
              </label>
              <input id="b-vat" class="settings__input settings__input--sm" type="text"
                placeholder="NL123456789B01" bind:value={vatNumber} disabled={billingLoading} />
              {#if billingCountry}
                {#if vatNumber.trim() && vatHint()?.reverse}
                  <span class="settings__vat-hint settings__vat-hint--ok">✓ Reverse charge — 0% VAT (BTW verlegd)</span>
                {:else if (vatHint()?.rate ?? 0) > 0}
                  <span class="settings__vat-hint settings__vat-hint--tax">{vatHint()?.rate}% VAT will be applied</span>
                {:else}
                  <span class="settings__vat-hint">0% VAT — outside EU</span>
                {/if}
              {/if}
            </div>

            <div class="settings__field">
              <label class="settings__label" for="b-address">
                Address <span class="settings__optional">optional</span>
              </label>
              <input id="b-address" class="settings__input settings__input--sm" type="text"
                placeholder="Herengracht 1" bind:value={billingAddress} disabled={billingLoading} />
            </div>

            <div class="settings__field--row">
              <div class="settings__field">
                <label class="settings__label" for="b-postal">Postal</label>
                <input id="b-postal" class="settings__input settings__input--sm" type="text"
                  placeholder="1017 BN" bind:value={billingPostal} disabled={billingLoading} />
              </div>
              <div class="settings__field settings__field--grow">
                <label class="settings__label" for="b-city">City</label>
                <input id="b-city" class="settings__input settings__input--sm" type="text"
                  placeholder="Amsterdam" bind:value={billingCity} disabled={billingLoading} />
              </div>
            </div>

            <button class="settings__save-btn" class:settings__save-btn--saved={billingSaved}
              onclick={saveBillingInfo} disabled={billingLoading || !billingCountry.trim()}>
              {billingLoading ? 'Saving…' : billingSaved ? '✓ Saved' : 'Save billing info'}
            </button>

          </div>
        </div>

      </div>
    </section>

    <!-- ── Danger zone ────────────────────────────────────────────────────── -->
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
  .settings           { padding: 28px; height: 100%; overflow-y: auto; }
  .settings__inner    { max-width: 860px; }
  .settings__title    { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .settings__subtitle { font-size: 12px; color: var(--cms-text-dim); margin-top: 3px; }

  .settings__section         { margin-top: 32px; }
  .settings__section--danger { margin-top: 40px; }
  .settings__section-title {
    font-size: 11px; font-weight: 600; color: var(--cms-text-dim);
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 12px;
  }
  .settings__section-title--danger { color: var(--cms-red); opacity: 0.7; }

  .settings__two-col {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 16px; align-items: start;
  }
  .settings__col { display: flex; flex-direction: column; }

  .settings__card {
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 14px;
    height: 100%;
  }
  .settings__card--danger  { border-color: rgba(255,64,96,0.25); }
  .settings__card--plan    { gap: 20px; }
  .settings__card--billing { gap: 12px; }

  .settings__error {
    padding: 10px 14px; background: rgba(255,64,96,0.08);
    border: 1px solid rgba(255,64,96,0.25); border-radius: 8px;
    color: var(--cms-red); font-size: 13px;
  }

  .settings__field       { display: flex; flex-direction: column; gap: 5px; }
  .settings__field--row  { display: flex; gap: 8px; align-items: flex-start; }
  .settings__field--grow { flex: 1; }
  .settings__label    { font-size: 11px; font-weight: 600; color: var(--cms-text-mid); letter-spacing: 0.03em; }
  .settings__optional { font-weight: 400; color: var(--cms-text-dim); font-size: 10px; margin-left: 4px; }
  .settings__required { font-weight: 400; color: var(--cms-accent); font-size: 10px; margin-left: 4px; }
  .settings__hint     { font-size: 11px; color: var(--cms-text-dim); }

  .settings__input {
    width: 100%; padding: 10px 14px; background: var(--cms-surface);
    border: 1px solid var(--cms-border); border-radius: 8px;
    color: var(--cms-text); font-size: 14px; font-family: inherit; outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .settings__input--sm   { padding: 7px 10px; font-size: 13px; }
  .settings__input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .settings__input:disabled { opacity: 0.5; }

  .settings__vat-hint      { font-size: 11px; color: var(--cms-text-dim); }
  .settings__vat-hint--ok  { color: var(--cms-green); }
  .settings__vat-hint--tax { color: var(--cms-amber); }

  .settings__info-row         { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; }
  .settings__info-label       { font-size: 13px; color: var(--cms-text-dim); }
  .settings__info-value       { font-size: 13px; color: var(--cms-text); }
  .settings__info-value--mono { font-size: 12px; color: var(--cms-text-dim); }

  .settings__plan-header   { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .settings__plan-identity { display: flex; flex-direction: column; gap: 4px; }
  .settings__plan-badge {
    display: inline-flex; align-self: flex-start;
    font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
    padding: 3px 10px; border-radius: 20px;
    background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); color: var(--cms-accent);
  }
  .settings__plan-tagline { font-size: 12px; color: var(--cms-text-dim); }
  .settings__plan-btn {
    padding: 8px 14px; border-radius: 8px; border: 1px solid var(--cms-border);
    background: var(--cms-surface); color: var(--cms-text);
    font-size: 13px; font-weight: 500; font-family: inherit;
    cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.12s;
  }
  .settings__plan-btn:hover { border-color: var(--cms-border-hi); color: var(--cms-accent); }

  .settings__plan-meters { display: flex; flex-direction: column; gap: 12px; }
  .settings__meter       { display: flex; flex-direction: column; gap: 5px; }
  .settings__meter-head  { display: flex; justify-content: space-between; align-items: baseline; }
  .settings__meter-label { font-size: 11px; color: var(--cms-text-dim); }
  .settings__meter-val   { font-size: 11px; color: var(--cms-text-mid); }
  .settings__meter-track { height: 4px; background: var(--cms-border); border-radius: 99px; overflow: hidden; }
  .settings__meter-fill  { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }

  .settings__billing-status { display: flex; align-items: center; justify-content: space-between; }
  .settings__billing-label  { font-size: 12px; color: var(--cms-text-dim); }
  .settings__billing-value  { font-size: 13px; color: var(--cms-text); font-weight: 500; }
  .settings__billing-desc   { font-size: 12px; color: var(--cms-text-dim); line-height: 1.6; }

  .settings__billing-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 5px 0; border-bottom: 1px solid var(--cms-border);
  }
  .settings__billing-row:last-of-type { border-bottom: none; }

  .settings__billing-chip {
    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
    padding: 2px 10px; border-radius: 20px;
  }
  .settings__billing-chip--active {
    background: rgba(0,212,100,0.1); border: 1px solid rgba(0,212,100,0.25); color: var(--cms-green);
  }
  .settings__billing-chip--free {
    background: var(--cms-surface); border: 1px solid var(--cms-border); color: var(--cms-text-dim);
  }

  .settings__billing-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 14px; border-radius: 8px; font-size: 12px; line-height: 1.5;
  }
  .settings__billing-banner--warn {
    background: rgba(255,180,0,0.08); border: 1px solid rgba(255,180,0,0.2); color: var(--cms-amber);
  }
  .settings__billing-banner--info {
    background: rgba(0,212,255,0.06); border: 1px solid rgba(0,212,255,0.15); color: var(--cms-text-dim);
  }
  .settings__billing-banner-icon  { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .settings__billing-banner-title { font-weight: 600; margin-bottom: 2px; }
  .settings__billing-banner-sub   { opacity: 0.85; }

  .settings__billing-actions { display: flex; gap: 8px; flex-wrap: wrap; }

  .settings__billing-divider {
    display: flex; align-items: center; gap: 8px; margin: 2px 0;
  }
  .settings__billing-divider::before,
  .settings__billing-divider::after { content: ''; flex: 1; height: 1px; background: var(--cms-border); }
  .settings__billing-divider span {
    font-size: 10px; font-weight: 600; color: var(--cms-text-dim);
    letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap;
  }

  .settings__billing-btn {
    padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 500;
    font-family: inherit; cursor: pointer; transition: all 0.12s;
    border: 1px solid var(--cms-border); background: var(--cms-surface); color: var(--cms-text);
  }
  .settings__billing-btn:hover:not(:disabled) { border-color: var(--cms-border-hi); }
  .settings__billing-btn:disabled             { opacity: 0.45; cursor: not-allowed; }
  .settings__billing-btn--primary { background: var(--cms-accent); color: #06090f; border-color: transparent; }
  .settings__billing-btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
  .settings__billing-btn--cancel { border-color: rgba(255,64,96,0.3); color: var(--cms-red); }
  .settings__billing-btn--cancel:hover:not(:disabled) { background: rgba(255,64,96,0.08); border-color: var(--cms-red); }

  .settings__save-btn {
    padding: 9px 20px; background: var(--cms-accent); color: #06090f;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
  }
  .settings__save-btn:hover:not(:disabled) { filter: brightness(1.1); }
  .settings__save-btn:disabled             { opacity: 0.5; cursor: not-allowed; }
  .settings__save-btn--saved               { background: var(--cms-green); }

  .settings__danger-row   { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .settings__danger-label { font-size: 13px; font-weight: 600; color: var(--cms-red); margin-bottom: 4px; }
  .settings__danger-desc  { font-size: 12px; color: var(--cms-text-dim); line-height: 1.5; }
  .settings__delete-btn {
    padding: 8px 16px; background: transparent; border: 1px solid rgba(255,64,96,0.4);
    border-radius: 8px; color: var(--cms-red); font-size: 13px; font-weight: 500;
    white-space: nowrap; flex-shrink: 0; cursor: pointer; transition: all 0.12s;
  }
  .settings__delete-btn:hover { background: rgba(255,64,96,0.08); border-color: var(--cms-red); }

  @media (max-width: 640px) {
    .settings__two-col    { grid-template-columns: 1fr; }
    .settings__inner      { max-width: 100%; }
    .settings__field--row { flex-direction: column; }
  }
</style>