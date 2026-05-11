<!-- TopBar.svelte — working site switcher and add site -->
<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import Icon                    from './Icon.svelte';
  import Modal                   from './Modal.svelte';
  import SiteForm                from '../forms/SiteForm.svelte';
  import { cmsTheme, toggleTheme } from '../theme.svelte';
  import type { Site }           from '../types';

  const {
  sites, activeSiteId, userInitial, planSlug, planName,
}: {
  sites:        Site[];
  activeSiteId: string | null;
  userInitial:  string;
  planSlug:     string;
  planName:     string;
} = $props();
  console.log('TopBar props:', { sites, activeSiteId, userInitial, planSlug, planName });
  let siteOpen   = $state(false);
  let showAddSite = $state(false);
  let creating   = $state(false);

  const activeSite = $derived(sites.find(s => s.id === activeSiteId) ?? sites[0] ?? null);

  function switchSite(site: Site) {
    siteOpen = false;
    goto(`/dashboard/cms?site=${site.id}&section=content`, { replaceState: false });
  }

  async function handleCreateSite(data: { name: string; slug: string; domain: string }) {
    creating = true;
    try {
      const res  = await fetch('/api/cms/sites', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      showAddSite = false;
      await invalidateAll();
    } finally { creating = false; }
  }
</script>

<header class="topbar">
  <!-- Logo -->
  <div class="topbar__logo-wrap">
    <div class="topbar__logo-mark" aria-hidden="true">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <rect x="1"  y="1"  width="6" height="6" rx="1.5" fill="white" fill-opacity="0.9"/>
        <rect x="9"  y="1"  width="6" height="6" rx="1.5" fill="white" fill-opacity="0.5"/>
        <rect x="1"  y="9"  width="6" height="6" rx="1.5" fill="white" fill-opacity="0.5"/>
        <rect x="9"  y="9"  width="6" height="6" rx="1.5" fill="white" fill-opacity="0.9"/>
      </svg>
    </div>
  </div>

  <!-- Site selector -->
  <div class="topbar__site-selector">
    <button class="topbar__site-btn" onclick={() => (siteOpen = !siteOpen)}
      aria-haspopup="listbox" aria-expanded={siteOpen}>
      <span class="topbar__site-dot" aria-hidden="true"></span>
      <span class="topbar__site-name">{activeSite?.name ?? 'No site'}</span>
      <Icon name="chev-down" size={13} />
    </button>

    {#if siteOpen}
      <div class="topbar__dropdown cms-slide-in" role="listbox">
        {#each sites as site (site.id)}
          <button
            class="topbar__site-option"
            class:topbar__site-option--active={site.id === activeSiteId}
            role="option" aria-selected={site.id === activeSiteId}
            onclick={() => switchSite(site)}
          >
            <span class="topbar__site-dot topbar__site-dot--sm"
              class:topbar__site-dot--inactive={site.id !== activeSiteId}
              aria-hidden="true"></span>
            {site.name}
          </button>
        {/each}
        <div class="topbar__divider"></div>
        <button class="topbar__site-option topbar__site-option--add"
          onclick={() => { siteOpen = false; showAddSite = true; }}>
          <Icon name="plus" size={13} /> Add site
        </button>
      </div>
    {/if}
  </div>

  <div class="topbar__spacer"></div>

  <!-- Right cluster -->
  <div class="topbar__right">
    <a href="/docs" class="topbar__docs-link">
      <Icon name="globe" size={13} /> Docs
    </a>
    <span class="topbar__plan">{planName}</span>
    <button class="topbar__theme-btn" onclick={toggleTheme} aria-label="Toggle theme"
      title="Switch to {cmsTheme.value === 'dark' ? 'light' : 'dark'} theme">
      <Icon name={cmsTheme.value === 'dark' ? 'sun' : 'moon'} size={15} />
    </button>
    <button class="topbar__avatar" aria-label="Account">{userInitial}</button>
  </div>
</header>

<!-- Add site modal -->
<Modal open={showAddSite} title="Add site" onclose={() => (showAddSite = false)} size="sm">
  <SiteForm loading={creating} onsubmit={handleCreateSite} oncancel={() => (showAddSite = false)} />
</Modal>

<style>
  .topbar {
    display: flex; align-items: center; height: 52px; padding: 0 16px 0 0;
    border-bottom: 1px solid var(--cms-border); background: var(--cms-bg);
    flex-shrink: 0; position: relative; z-index: 20;
  }
  .topbar__logo-wrap {
    width: 60px; height: 100%; display: flex; align-items: center; justify-content: center;
    border-right: 1px solid var(--cms-border); flex-shrink: 0;
  }
  .topbar__logo-mark {
    width: 28px; height: 28px; border-radius: 7px;
    background: linear-gradient(135deg, var(--cms-accent), var(--cms-purple));
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  .topbar__site-selector { position: relative; height: 100%; display: flex; align-items: center; border-right: 1px solid var(--cms-border); }

  .topbar__site-btn {
    display: flex; align-items: center; gap: 8px; padding: 0 16px; height: 100%;
    background: transparent; border: none; color: var(--cms-text); font-size: 13px; font-weight: 500;
    cursor: pointer; transition: background 0.12s;
  }
  .topbar__site-btn:hover { background: var(--cms-accent-glow); }

  .topbar__site-dot           { width: 7px; height: 7px; border-radius: 50%; background: var(--cms-green); flex-shrink: 0; }
  .topbar__site-dot--sm       { width: 6px; height: 6px; }
  .topbar__site-dot--inactive { background: var(--cms-border-hi); }
  .topbar__site-name          { white-space: nowrap; }

  .topbar__dropdown {
    position: absolute; top: calc(100% + 8px); left: 0;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 10px; padding: 6px; min-width: 220px; z-index: 50;
    box-shadow: var(--cms-shadow);
  }

  .topbar__site-option {
    display: flex; align-items: center; gap: 8px; width: 100%;
    padding: 8px 12px; border-radius: 7px; border: none;
    background: transparent; color: var(--cms-text-mid); font-size: 13px;
    text-align: left; cursor: pointer; transition: all 0.1s;
  }
  .topbar__site-option:hover       { background: var(--cms-accent-glow); color: var(--cms-text); }
  .topbar__site-option--active     { background: var(--cms-border); color: var(--cms-text); }
  .topbar__site-option--add        { color: var(--cms-accent); }
  .topbar__divider                 { height: 1px; background: var(--cms-border); margin: 4px 0; }

  .topbar__spacer { flex: 1; }
  .topbar__right  { display: flex; align-items: center; gap: 8px; }

  .topbar__docs-link {
    display: flex; align-items: center; gap: 6px; padding: 5px 11px;
    border: 1px solid var(--cms-border); border-radius: 7px; font-size: 12px;
    color: var(--cms-text-dim); transition: all 0.12s;
  }
  .topbar__docs-link:hover { color: var(--cms-text); border-color: var(--cms-border-hi); }

  .topbar__plan {
    padding: 4px 10px; border-radius: 20px; background: var(--cms-accent-dim);
    border: 1px solid rgba(0,212,255,0.2); font-size: 11px; font-weight: 600;
    color: var(--cms-accent); letter-spacing: 0.04em;
  }

  .topbar__theme-btn {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--cms-border);
    background: transparent; color: var(--cms-text-dim);
    display: flex; align-items: center; justify-content: center; transition: all 0.12s;
  }
  .topbar__theme-btn:hover { color: var(--cms-text); border-color: var(--cms-border-hi); background: var(--cms-accent-glow); }

  .topbar__avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, var(--cms-accent), var(--cms-purple));
    border: none; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: transform 0.12s;
  }
  .topbar__avatar:hover { transform: scale(1.06); }
</style>