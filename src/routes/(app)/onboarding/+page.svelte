<!-- src/routes/onboarding/+page.svelte -->
<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { getAllPlans, can, PLAN_GROUPS } from '$lib/shared/plans';
  import type { Plan } from '$lib/shared/plans';

  const { data } = $props<{ data: { session: { email: string }; hasOrg: boolean } }>();

  const allPlans = getAllPlans();
  const planById = Object.fromEntries(allPlans.map(p => [p.id, p]));

  // Max plans in any group — used to build rows
  const maxRows = Math.max(...PLAN_GROUPS.map(g => g.ids.length));

  // ── Step state ─────────────────────────────────────────────────────────────
  let step = $state(data.hasOrg ? 2 : 1);

  // ── Step 1 — Organisation ──────────────────────────────────────────────────
  let orgName   = $state('');
  let orgSaving = $state(false);
  let orgError  = $state('');

  async function createOrg() {
    if (!orgName.trim()) { orgError = 'Organisation name is required.'; return; }
    orgSaving = true; orgError = '';
    try {
      const res  = await fetch('/api/org', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: orgName.trim() }),
      });
      const json = await res.json();
      if (!json.ok) { orgError = json.message; return; }
      await invalidateAll();
      step = 2;
    } catch { orgError = 'Network error. Please try again.'; }
    finally  { orgSaving = false; }
  }

  // ── Step 2 — Plan ──────────────────────────────────────────────────────────
  let selectedPlan = $state('cms_starter');

  const isPaidPlan  = $derived((planById[selectedPlan]?.price_month ?? 0) > 0);

  // totalSteps:
  //   Social-only plan  → 2 (org + plan, then dashboard)
  //   Free CMS plan     → 3 (org + plan + site)
  //   Paid CMS plan     → 4 (org + plan + billing + site)
  const totalSteps = $derived(
    !can(selectedPlan, 'cms') ? 2 :
    isPaidPlan                ? 4 :
    3
  );

  const progress = $derived(Math.round((step / totalSteps) * 100));

  function fmtPrice(p: Plan): string {
    if (p.price_month === 0)    return 'Free';
    if (p.price_month === null) return 'Custom';
    return `$${p.price_month}/mo`;
  }

  function confirmPlan() {
    const hasCms = can(selectedPlan, 'cms');
    if (!hasCms) {
      goto('/dashboard/cms');
      return;
    }
    step = 3;  // billing step for paid, site step for free — template differentiates
  }

  // ── Step 3 — Billing info (paid plans only) ────────────────────────────────
  let billingName    = $state('');
  let billingCountry = $state('');
  let billingAddress = $state('');
  let billingPostal  = $state('');
  let billingCity    = $state('');
  let vatNumber      = $state('');
  let billingSaving  = $state(false);
  let billingError   = $state('');

  // Live VAT feedback from API
  // Replace the static derived hints with API-driven ones
  let vatRate:       number | null = $state(null);
  let reverseCharge: boolean       = $state(false);
  let vatHintLoading: boolean      = $state(false);

  // Call this whenever country or vatNumber changes
  async function refreshVatHint() {
    if (!billingCountry) { vatRate = null; return; }
    vatHintLoading = true;
    try {
      const res  = await fetch('/api/org/billing/vat-preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          billing_country: billingCountry,
          vat_number:      vatNumber.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        vatRate       = json.vatRate;
        reverseCharge = json.reverseCharge;
      }
    } finally { vatHintLoading = false; }
  }

  // Trigger on changes
  $effect(() => { billingCountry; vatNumber; refreshVatHint(); });

  async function saveBilling() {
    if (!billingCountry.trim()) { billingError = 'Country is required.'; return; }
    billingSaving = true; billingError = '';
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
      vatRate       = json.vatRate;
      reverseCharge = json.reverseCharge;
      step = 4;
    } catch { billingError = 'Network error. Please try again.'; }
    finally  { billingSaving = false; }
  }

  // ── Step 3/4 — First site ──────────────────────────────────────────────────
  let siteName   = $state('');
  let siteSlug   = $state('');
  let siteSaving = $state(false);
  let siteError  = $state('');

  $effect(() => {
    siteSlug = siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  });

  async function createSite() {
    if (!siteName.trim()) { siteError = 'Site name is required.'; return; }
    siteSaving = true; siteError = '';
    try {
      const res  = await fetch('/api/cms/sites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: siteName.trim(), slug: siteSlug }),
      });
      const json = await res.json();
      if (!json.ok) { siteError = json.message; return; }

      // Paid plan → redirect to Mollie checkout
      const plan = planById[selectedPlan];
      if (plan && (plan.price_month ?? 0) > 0) {
        const checkoutRes  = await fetch('/api/billing/checkout', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ planSlug: selectedPlan, billingCycle: 'month' }),
        });
        const checkoutJson = await checkoutRes.json();

        if (checkoutJson.ok) {
          window.location.href = checkoutJson.checkoutUrl;
          return;
        }
        // BILLING_INCOMPLETE shouldn't happen here since we already collected it in step 3,
        // but handle it gracefully just in case
        if (checkoutJson.code === 'BILLING_INCOMPLETE') {
          step = 3;
          billingError = 'Billing details are required before checkout.';
          return;
        }
        console.error('[onboarding] Checkout failed:', checkoutJson.message);
      }

      goto(`/dashboard/cms?site=${json.site.id}`);
    } catch { siteError = 'Network error. Please try again.'; }
    finally  { siteSaving = false; }
  }
</script>

<svelte:head><title>Get started — Foundiq</title></svelte:head>

<div class="ob">
  <div class="ob__bg"></div>
  <div class="ob__glow"></div>

  <div class="ob__progress-wrap">
    <div class="ob__progress-bar" style="width:{progress}%"></div>
  </div>

  <div class="ob__inner">

    <div class="ob__logo">
      <div class="ob__logo-mark"></div>
      <span>Foundiq</span>
    </div>

    <!-- Dynamic step indicator -->
    <div class="ob__steps">
      {#each Array.from({ length: totalSteps }, (_, i) => i + 1) as s}
        <div class="ob__step" class:ob__step--done={step > s} class:ob__step--active={step === s}>
          {#if step > s}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          {:else}{s}{/if}
        </div>
        {#if s < totalSteps}
          <div class="ob__step-line" class:ob__step-line--done={step > s}></div>
        {/if}
      {/each}
    </div>

    <!-- ── Step 1 — Organisation ───────────────────────────────────────────── -->
    {#if step === 1}
      <div class="ob__card ob__card--anim">
        <div class="ob__step-label">Step 1 of {totalSteps}</div>
        <h1 class="ob__title">Name your organisation</h1>
        <p class="ob__sub">This is your workspace — everything you build lives under it. You can change it later.</p>
        {#if orgError}<div class="ob__error">{orgError}</div>{/if}
        <div class="ob__form">
          <div class="ob__field">
            <label class="ob__label" for="org-name">Organisation name</label>
            <input id="org-name" class="ob__input" type="text" placeholder="Acme Corp"
              bind:value={orgName} oninput={() => orgError = ''} disabled={orgSaving}
              onkeydown={(e) => e.key === 'Enter' && createOrg()} />
          </div>
          <button class="ob__btn" onclick={createOrg} disabled={orgSaving || !orgName.trim()}>
            {#if orgSaving}<span class="ob__spinner"></span>{/if}
            {orgSaving ? 'Creating…' : 'Continue →'}
          </button>
        </div>
      </div>

    <!-- ── Step 2 — Plan ──────────────────────────────────────────────────── -->
    {:else if step === 2}
      <div class="ob__card ob__card--xl ob__card--anim">
        <div class="ob__step-label">Step 2 of {totalSteps}</div>
        <h1 class="ob__title">Choose your plan</h1>
        <p class="ob__sub">Start free — upgrade anytime from settings. Paid plans launch soon.</p>

        <div class="ob__grid">
          {#each PLAN_GROUPS as group}
            <div class="ob__col-header">{group.label}</div>
          {/each}

          {#each Array.from({ length: maxRows }, (_, i) => i) as rowIdx}
            {#each PLAN_GROUPS as group}
              {#if group.ids[rowIdx]}
                {@const planId     = group.ids[rowIdx]}
                {@const plan       = planById[planId]}
                {@const isSelected = selectedPlan === planId}
                {@const isSocial   = !can(planId, 'cms')}

                <button
                  class="ob__plan"
                  class:ob__plan--selected={isSelected}
                  class:ob__plan--paid={isSocial}
                  onclick={() => { if (!isSocial) selectedPlan = planId; }}
                  disabled={isSocial}
                >
                  {#if plan.highlighted}
                    <span class="ob__badge ob__badge--popular">Popular</span>
                  {/if}
                  {#if isSocial}
                    <span class="ob__badge ob__badge--soon">Coming soon</span>
                  {/if}

                  <div class="ob__plan-name">{plan.name}</div>
                  <div class="ob__plan-price">{fmtPrice(plan)}</div>
                  <div class="ob__plan-tagline">{plan.tagline}</div>

                  <ul class="ob__plan-features">
                    {#each plan.bullets.slice(0, 3) as bullet}
                      <li>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        {bullet}
                      </li>
                    {/each}
                  </ul>

                  {#if isSelected}
                    <div class="ob__plan-check" aria-hidden="true">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  {/if}
                </button>

              {:else}
                <div class="ob__plan-empty"></div>
              {/if}
            {/each}
          {/each}
        </div>

        <button class="ob__btn ob__btn--full" onclick={confirmPlan}>
          Continue with {planById[selectedPlan]?.name} →
        </button>
      </div>

    <!-- ── Step 3 — Billing info (paid plans only) ────────────────────────── -->
    {:else if step === 3 && isPaidPlan}
      <div class="ob__card ob__card--anim">
        <div class="ob__step-label">Step 3 of {totalSteps}</div>
        <h1 class="ob__title">Billing details</h1>
        <p class="ob__sub">Required for your invoice. Agencies with an EU VAT number pay 0% VAT (reverse charge).</p>
        {#if billingError}<div class="ob__error">{billingError}</div>{/if}
        <div class="ob__form">

          <div class="ob__field">
            <label class="ob__label" for="b-name">
              Legal name <span class="ob__label-hint">company or your full name</span>
            </label>
            <input id="b-name" class="ob__input" type="text" placeholder="Acme B.V."
              bind:value={billingName} disabled={billingSaving} />
          </div>

          <div class="ob__field">
            <label class="ob__label" for="b-country">Country <span class="ob__label-hint">required</span></label>
            <select id="b-country" class="ob__input" bind:value={billingCountry}
              disabled={billingSaving} oninput={() => billingError = ''}>
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

          <div class="ob__field">
            <label class="ob__label" for="b-vat">
              EU VAT number <span class="ob__label-hint">optional — B2B customers</span>
            </label>
            <input id="b-vat" class="ob__input" type="text" placeholder="NL123456789B01"
              bind:value={vatNumber} disabled={billingSaving}
              oninput={() => billingError = ''} />
            {#if vatNumber.trim() && billingCountry}
              <span class="ob__vat-hint">
                ✓ Reverse charge applies — you'll be invoiced at 0% VAT (BTW verlegd)
              </span>
            {:else if billingCountry && !vatNumber.trim()}
              {#if vatHintLoading}
  <span class="ob__vat-hint">Checking…</span>
{:else if reverseCharge}
  <span class="ob__vat-hint">
    ✓ Reverse charge — 0% VAT (BTW verlegd)
  </span>
{:else if vatRate !== null && vatRate > 0}
  <span class="ob__vat-hint ob__vat-hint--tax">
    {vatRate}% VAT will be applied
  </span>
{:else if vatRate === 0 && billingCountry}
  <span class="ob__vat-hint">
    0% VAT — outside EU
  </span>
{/if}
            {/if}
          </div>

          <div class="ob__field">
            <label class="ob__label" for="b-address">
              Address <span class="ob__label-hint">optional — printed on invoice</span>
            </label>
            <input id="b-address" class="ob__input" type="text" placeholder="Herengracht 1"
              bind:value={billingAddress} disabled={billingSaving} />
          </div>

          <div class="ob__field ob__field--row">
            <div class="ob__field">
              <label class="ob__label" for="b-postal">Postal code</label>
              <input id="b-postal" class="ob__input" type="text" placeholder="1017 BN"
                bind:value={billingPostal} disabled={billingSaving} />
            </div>
            <div class="ob__field ob__field--grow">
              <label class="ob__label" for="b-city">City</label>
              <input id="b-city" class="ob__input" type="text" placeholder="Amsterdam"
                bind:value={billingCity} disabled={billingSaving} />
            </div>
          </div>

          <button class="ob__btn" onclick={saveBilling} disabled={billingSaving || !billingCountry.trim()}>
            {#if billingSaving}<span class="ob__spinner"></span>{/if}
            {billingSaving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>

    <!-- ── Step 3 (free) or Step 4 (paid) — First site ───────────────────── -->
    {:else if (step === 3 && !isPaidPlan) || step === 4}
      <div class="ob__card ob__card--anim">
        <div class="ob__step-label">Step {step} of {totalSteps}</div>
        <h1 class="ob__title">Create your first site</h1>
        <p class="ob__sub">A site holds your collections, entries and media. You can create more later.</p>
        {#if siteError}<div class="ob__error">{siteError}</div>{/if}
        <div class="ob__form">
          <div class="ob__field">
            <label class="ob__label" for="site-name">Site name</label>
            <input id="site-name" class="ob__input" type="text" placeholder="My awesome project"
              bind:value={siteName} oninput={() => siteError = ''} disabled={siteSaving} />
          </div>
          <div class="ob__field">
            <label class="ob__label" for="site-slug">
              Slug <span class="ob__label-hint">used in API paths</span>
            </label>
            <div class="ob__slug-wrap">
              <span class="ob__slug-prefix">api/sites/</span>
              <input id="site-slug" class="ob__input ob__input--slug" type="text"
                bind:value={siteSlug} disabled={siteSaving}
                onkeydown={(e) => e.key === 'Enter' && createSite()} />
            </div>
          </div>
          <button class="ob__btn" onclick={createSite} disabled={siteSaving || !siteName.trim()}>
            {#if siteSaving}<span class="ob__spinner"></span>{/if}
            {siteSaving ? 'Creating…' : 'Launch my workspace →'}
          </button>
        </div>
      </div>
    {/if}

  </div>
</div>

<style>
  .ob {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 24px; background: var(--bg); position: relative; overflow: hidden;
  }

  .ob__bg {
    position: fixed; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px);
    background-size: 52px 52px;
  }
  .ob__glow {
    position: fixed; top: -15%; left: 50%; transform: translateX(-50%);
    width: 700px; height: 500px; pointer-events: none;
    background: radial-gradient(ellipse, rgba(245,158,11,0.08) 0%, transparent 65%);
    filter: blur(40px);
  }

  .ob__progress-wrap { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: var(--border); z-index: 100; }
  .ob__progress-bar  { height: 100%; background: linear-gradient(90deg, var(--amber), #f97316); transition: width 0.4s cubic-bezier(0.16,1,0.3,1); border-radius: 0 2px 2px 0; }

  .ob__inner { position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 28px; }

  .ob__logo      { display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 800; color: var(--text); letter-spacing: -0.02em; }
  .ob__logo-mark { width: 28px; height: 28px; background: var(--amber); border-radius: 7px; box-shadow: 0 0 16px var(--amber-glow); }

  .ob__steps           { display: flex; align-items: center; }
  .ob__step            { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--border); background: var(--surface); color: var(--text-dim); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; }
  .ob__step--active    { border-color: var(--amber); color: var(--amber); }
  .ob__step--done      { border-color: var(--amber); background: var(--amber); color: #06060f; }
  .ob__step-line       { width: 48px; height: 2px; background: var(--border); transition: background 0.3s; }
  .ob__step-line--done { background: var(--amber); }

  .ob__card {
    width: 100%; max-width: 480px;
    background: var(--surface); border: 1px solid var(--border-hi);
    border-radius: var(--r-xl); padding: 36px 32px;
    box-shadow: 0 32px 80px rgba(0,0,0,0.5);
  }
  .ob__card--xl { max-width: 1000px; }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ob__card--anim { animation: cardIn 0.25s ease; }

  .ob__step-label { font-size: 11px; font-weight: 600; color: var(--amber); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 10px; }
  .ob__title      { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 6px; }
  .ob__sub        { font-size: 13px; color: var(--text-dim); line-height: 1.6; margin-bottom: 24px; }
  .ob__error      { padding: 10px 14px; margin-bottom: 16px; background: var(--error-dim); border: 1px solid rgba(248,113,113,0.2); border-radius: var(--r); color: var(--error); font-size: 13px; }

  .ob__form           { display: flex; flex-direction: column; gap: 16px; }
  .ob__field          { display: flex; flex-direction: column; gap: 6px; }
  .ob__field--row     { flex-direction: row; gap: 10px; align-items: flex-start; }
  .ob__field--grow    { flex: 1; }
  .ob__label          { font-size: 12px; font-weight: 600; color: var(--text-dim); display: flex; align-items: center; gap: 6px; }
  .ob__label-hint     { font-weight: 400; opacity: 0.7; font-size: 11px; }
  .ob__vat-hint       { font-size: 11px; color: #00cc7a; margin-top: 2px; }
  .ob__vat-hint--tax  { color: var(--amber); }

  .ob__input {
    padding: 10px 14px; background: var(--bg); border: 1px solid var(--border-hi);
    border-radius: var(--r); color: var(--text); font-size: 14px;
    font-family: inherit; outline: none; width: 100%;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .ob__input:focus    { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
  .ob__input:disabled { opacity: 0.5; }

  .ob__slug-wrap        { display: flex; align-items: center; background: var(--bg); border: 1px solid var(--border-hi); border-radius: var(--r); overflow: hidden; transition: border-color 0.15s, box-shadow 0.15s; }
  .ob__slug-wrap:focus-within { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
  .ob__slug-prefix      { padding: 10px 0 10px 14px; font-size: 13px; color: var(--text-dim); white-space: nowrap; flex-shrink: 0; }
  .ob__input--slug      { border: none !important; padding-left: 4px; flex: 1; box-shadow: none !important; }

  .ob__btn {
    padding: 12px 20px; background: var(--amber); color: #06060f;
    border: none; border-radius: var(--r); font-size: 14px; font-weight: 700;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .ob__btn:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 4px 20px rgba(245,158,11,0.35); }
  .ob__btn:disabled  { opacity: 0.45; cursor: not-allowed; }
  .ob__btn--full     { width: 100%; margin-top: 20px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .ob__spinner { width: 14px; height: 14px; border: 2px solid rgba(6,6,15,0.3); border-top-color: #06060f; border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0; }

  .ob__grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 10px; margin-bottom: 4px; align-items: stretch;
  }
  .ob__col-header {
    font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--amber);
    padding-bottom: 6px; border-bottom: 1px solid rgba(245,158,11,0.25);
  }
  .ob__plan {
    position: relative; display: flex; flex-direction: column;
    padding: 14px; border-radius: var(--r-lg);
    background: var(--bg); border: 2px solid var(--border);
    text-align: left; cursor: pointer; transition: all 0.15s;
    font-family: inherit; width: 100%; height: 100%;
  }
  .ob__plan:hover:not(:disabled)  { border-color: var(--border-hi); }
  .ob__plan--selected              { border-color: var(--amber); background: rgba(245,158,11,0.05); }
  .ob__plan--paid                  { opacity: 0.4; cursor: not-allowed; }
  .ob__plan-empty { height: 100%; min-height: 40px; }

  .ob__badge {
    position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 2px 8px; border-radius: 20px; white-space: nowrap;
  }
  .ob__badge--popular { background: var(--amber); color: #06060f; }
  .ob__badge--soon    { background: var(--border-hi); color: var(--text-dim); }

  .ob__plan-name    { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 3px; }
  .ob__plan-price   { font-size: 18px; font-weight: 800; color: var(--amber); letter-spacing: -0.02em; margin-bottom: 4px; }
  .ob__plan-tagline { font-size: 10px; color: var(--text-dim); line-height: 1.4; margin-bottom: 10px; }
  .ob__plan-features { list-style: none; display: flex; flex-direction: column; gap: 4px; margin-top: auto; }
  .ob__plan-features li  { display: flex; align-items: flex-start; gap: 5px; font-size: 10px; color: var(--text-dim); line-height: 1.4; }
  .ob__plan-features svg { color: var(--amber); flex-shrink: 0; margin-top: 2px; }
  .ob__plan-check {
    position: absolute; top: 8px; right: 8px; width: 18px; height: 18px; border-radius: 50%;
    background: var(--amber); color: #06060f; display: flex; align-items: center; justify-content: center;
  }

  @media (max-width: 760px) { .ob__grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 480px) {
    .ob__grid      { grid-template-columns: 1fr; }
    .ob__card--xl  { padding: 24px 16px; }
    .ob__field--row { flex-direction: column; }
  }
</style>