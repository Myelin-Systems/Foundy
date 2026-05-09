<!-- PricingView.svelte — plan cards -->
<script lang="ts">
  import { getAllPlans, isUnlimited } from '$lib/shared/plans';
  import type { Plan }      from '$lib/shared/plans';
  import type { OrgUsage }       from '$lib/server/services/foundiq/UsageService';
  const {
    plans,
    usage,
  }: {
    plans: Plan[];
    usage: OrgUsage;
  } = $props();

  let billing = $state<'month' | 'year'>('month');

  function fmtBytes(n: number): string {
    if (isUnlimited(n))            return '∞';
    if (n === 0)                   return '—';
    if (n >= 1_073_741_824)        return `${(n / 1_073_741_824).toFixed(0)} GB`;
    if (n >= 1_048_576)            return `${(n / 1_048_576).toFixed(0)} MB`;
    return `${(n / 1_024).toFixed(0)} KB`;
  }

  function fmtLimit(n: number): string {
    if (isUnlimited(n)) return '∞';
    if (n === 0)        return '—';
    return n.toLocaleString();
  }

  // Only show CMS limits if plan has CMS, social limits if plan has social
  function hasCms(plan: Plan):    boolean { return plan.features.includes('cms');    }
  function hasSocial(plan: Plan): boolean { return plan.features.includes('social'); }

  const currentPlanId = $derived(usage.plan.id);
</script>

<div class="pricing">

  <!-- Billing toggle -->
  <div class="pricing__top">
    <div class="pricing__toggle" role="group" aria-label="Billing period">
      <button
        class="pricing__toggle-btn"
        class:pricing__toggle-btn--active={billing === 'month'}
        onclick={() => (billing = 'month')}
      >Monthly</button>
      <button
        class="pricing__toggle-btn"
        class:pricing__toggle-btn--active={billing === 'year'}
        onclick={() => (billing = 'year')}
      >
        Annual
        <span class="pricing__save-badge">Save ~17%</span>
      </button>
    </div>
  </div>

  <!-- Plan grid -->
  <div class="pricing__grid">
    {#each plans as plan (plan.id)}
      {@const isCurrent    = plan.id === currentPlanId}
      {@const isEnterprise = plan.id === 'enterprise'}
      {@const price        = billing === 'year' ? plan.price_year : plan.price_month}

      <div
        class="pricing__card"
        class:pricing__card--highlighted={plan.highlighted}
        class:pricing__card--current={isCurrent}
        class:pricing__card--enterprise={isEnterprise}
      >
        {#if plan.highlighted && !isCurrent}
          <div class="pricing__badge pricing__badge--popular">Most popular</div>
        {/if}
        {#if isCurrent}
          <div class="pricing__badge pricing__badge--current">Current plan</div>
        {/if}

        <!-- Name + tagline -->
        <div class="pricing__card-header">
          <span class="pricing__plan-name">{plan.name}</span>
          <p class="pricing__plan-tagline">{plan.tagline}</p>
        </div>

        <!-- Feature chips -->
        <div class="pricing__chips">
          {#if hasCms(plan)}
            <span class="pricing__chip pricing__chip--cms">CMS</span>
          {/if}
          {#if hasSocial(plan)}
            <span class="pricing__chip pricing__chip--social">Social</span>
          {/if}
        </div>

        <!-- Price -->
        <div class="pricing__price-row">
          {#if isEnterprise}
            <span class="pricing__price pricing__price--contact">Custom</span>
          {:else if price === 0}
            <span class="pricing__price">$0</span>
            <span class="pricing__period">forever</span>
          {:else}
            <span class="pricing__price">${price}</span>
            <span class="pricing__period">
              /mo{billing === 'year' ? ', billed annually' : ''}
            </span>
          {/if}
        </div>

        <!-- Key limits -->
        <div class="pricing__limits">
          {#if hasCms(plan)}
            <div class="pricing__limit-row">
              <span class="pricing__limit-label">Sites</span>
              <span class="pricing__limit-val">{fmtLimit(plan.limits.sites)}</span>
            </div>
            <div class="pricing__limit-row">
              <span class="pricing__limit-label">Collections / site</span>
              <span class="pricing__limit-val">{fmtLimit(plan.limits.collections)}</span>
            </div>
            <div class="pricing__limit-row">
              <span class="pricing__limit-label">Entries</span>
              <span class="pricing__limit-val">{fmtLimit(plan.limits.entries)}</span>
            </div>
            <div class="pricing__limit-row">
              <span class="pricing__limit-label">Database</span>
              <span class="pricing__limit-val">{fmtBytes(plan.limits.db_bytes)}</span>
            </div>
          {/if}
          {#if hasSocial(plan)}
            <div class="pricing__limit-row">
              <span class="pricing__limit-label">Social accounts</span>
              <span class="pricing__limit-val">{fmtLimit(plan.limits.socialAccounts)}</span>
            </div>
            <div class="pricing__limit-row">
              <span class="pricing__limit-label">Scheduled posts</span>
              <span class="pricing__limit-val">{fmtLimit(plan.limits.scheduledPosts)}</span>
            </div>
          {/if}
          <div class="pricing__limit-row">
            <span class="pricing__limit-label">File storage</span>
            <span class="pricing__limit-val">{fmtBytes(plan.limits.file_bytes)}</span>
          </div>
        </div>

        <div class="pricing__divider"></div>

        <!-- Bullets — marketing copy from plan.bullets -->
        <ul class="pricing__features">
          {#each plan.bullets as bullet}
            <li class="pricing__feature">
              <svg class="pricing__check" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {bullet}
            </li>
          {/each}
        </ul>

        <!-- CTA -->
        <div class="pricing__cta">
          {#if isCurrent}
            <button class="pricing__btn pricing__btn--current" disabled>
              Current plan
            </button>
          {:else if isEnterprise}
            <a class="pricing__btn pricing__btn--enterprise" href="mailto:hello@pando.io">
              Contact sales →
            </a>
          {:else}
            <button
              class="pricing__btn"
              class:pricing__btn--highlighted={plan.highlighted}
            >
              {price === 0 ? 'Get started free' : `Upgrade to ${plan.name}`} →
            </button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Enterprise note -->
  <div class="pricing__enterprise-note">
    <span class="pricing__note-icon">🏢</span>
    <span>
      Need a custom setup?
      <a href="mailto:hello@pando.io" class="pricing__note-link">Talk to us</a>
      — we'll build a plan around your infrastructure and volume.
    </span>
  </div>
</div>

<style>
  .pricing { padding: 4px 0 8px; }

  /* Toggle */
  .pricing__top { display: flex; justify-content: flex-end; margin-bottom: 20px; }
  .pricing__toggle {
    display: flex; background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 8px; padding: 3px; gap: 2px;
  }
  .pricing__toggle-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 6px; border: none;
    background: transparent; color: var(--cms-text-dim);
    font-size: 13px; font-weight: 500; font-family: inherit;
    cursor: pointer; transition: all 0.12s; white-space: nowrap;
  }
  .pricing__toggle-btn--active { background: var(--cms-surface); color: var(--cms-text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .pricing__save-badge {
    font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 20px;
    background: rgba(0,255,157,0.1); color: var(--cms-green); border: 1px solid rgba(0,255,157,0.2);
  }

  /* Grid */
  .pricing__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 10px; align-items: start; margin-bottom: 20px;
  }

  /* Card */
  .pricing__card {
    position: relative; background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 14px; padding: 20px 18px;
    display: flex; flex-direction: column; gap: 14px;
    transition: border-color 0.15s;
  }
  .pricing__card:hover                { border-color: var(--cms-border-hi); }
  .pricing__card--highlighted         {
    border-color: rgba(0,212,255,0.35);
    background: linear-gradient(160deg, rgba(0,212,255,0.04) 0%, var(--cms-card) 60%);
    box-shadow: 0 0 0 1px rgba(0,212,255,0.1), 0 8px 32px rgba(0,0,0,0.3);
  }
  .pricing__card--current             {
    border-color: rgba(0,255,157,0.3);
    background: linear-gradient(160deg, rgba(0,255,157,0.03) 0%, var(--cms-card) 60%);
  }
  .pricing__card--enterprise          { border-style: dashed; }

  /* Badges */
  .pricing__badge {
    position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 3px 12px; border-radius: 20px; white-space: nowrap;
  }
  .pricing__badge--popular { background: var(--cms-accent); color: #06090f; }
  .pricing__badge--current { background: var(--cms-green);  color: #06090f; }

  /* Header */
  .pricing__card-header { display: flex; flex-direction: column; gap: 3px; }
  .pricing__plan-name   { font-size: 14px; font-weight: 700; color: var(--cms-text); }
  .pricing__plan-tagline { font-size: 11px; color: var(--cms-text-dim); line-height: 1.4; }

  /* Feature chips */
  .pricing__chips { display: flex; gap: 5px; flex-wrap: wrap; }
  .pricing__chip  {
    font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 2px 7px; border-radius: 20px;
  }
  .pricing__chip--cms    { background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); color: var(--cms-accent); }
  .pricing__chip--social { background: rgba(136,85,255,0.08); border: 1px solid rgba(136,85,255,0.2); color: var(--cms-purple); }

  /* Price */
  .pricing__price-row { display: flex; align-items: baseline; gap: 5px; }
  .pricing__price {
    font-size: 26px; font-weight: 800; color: var(--cms-text);
    font-variant-numeric: tabular-nums; letter-spacing: -0.02em;
  }
  .pricing__price--contact { font-size: 20px; color: var(--cms-text-dim); }
  .pricing__period { font-size: 11px; color: var(--cms-text-dim); }

  /* Limits */
  .pricing__limits { display: flex; flex-direction: column; gap: 5px; }
  .pricing__limit-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 3px 0; border-bottom: 1px solid var(--cms-border);
  }
  .pricing__limit-row:last-child { border-bottom: none; }
  .pricing__limit-label { font-size: 11px; color: var(--cms-text-dim); }
  .pricing__limit-val   { font-size: 11px; font-weight: 600; color: var(--cms-text); font-family: var(--mono); }

  .pricing__divider { height: 1px; background: var(--cms-border); }

  /* Bullets */
  .pricing__features { display: flex; flex-direction: column; gap: 6px; list-style: none; flex: 1; }
  .pricing__feature  {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 11px; color: var(--cms-text-mid); line-height: 1.4;
  }
  .pricing__check { color: var(--cms-green); flex-shrink: 0; margin-top: 1px; }

  /* CTA */
  .pricing__cta { margin-top: auto; }
  .pricing__btn {
    display: block; width: 100%; padding: 9px 16px; text-align: center;
    border-radius: 8px; font-size: 12px; font-weight: 600; font-family: inherit;
    cursor: pointer; transition: all 0.12s; text-decoration: none;
    border: 1px solid var(--cms-border); background: var(--cms-surface); color: var(--cms-text);
  }
  .pricing__btn:hover:not(:disabled)         { border-color: var(--cms-border-hi); }
  .pricing__btn--highlighted                 { background: var(--cms-accent); color: #06090f; border-color: var(--cms-accent); }
  .pricing__btn--highlighted:hover           { filter: brightness(1.1); box-shadow: 0 4px 20px rgba(0,212,255,0.25); }
  .pricing__btn--current                     { opacity: 0.4; cursor: not-allowed; border-style: dashed; }
  .pricing__btn--enterprise:hover            { background: var(--cms-surface); }

  /* Enterprise note */
  .pricing__enterprise-note {
    display: flex; align-items: center; gap: 10px; padding: 12px 16px;
    background: var(--cms-card); border: 1px solid var(--cms-border); border-radius: 10px;
    font-size: 12px; color: var(--cms-text-dim); line-height: 1.5;
  }
  .pricing__note-icon { font-size: 16px; flex-shrink: 0; }
  .pricing__note-link { color: var(--cms-accent); text-decoration: underline; }
</style>