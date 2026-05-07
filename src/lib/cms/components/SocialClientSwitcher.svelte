<!-- SocialClientSwitcher.svelte
     Shown at the top of SocialView when the org has multiple sites.
     Lets agencies switch between client social contexts seamlessly. -->
<script lang="ts">
  import type { Site } from '../types';

  const {
    sites,
    activeSiteId,
    onswitch,
  }: {
    sites:        Site[];
    activeSiteId: string | null;
    onswitch:     (siteId: string) => void;
  } = $props();

  let open = $state(false);

  const active = $derived(sites.find(s => s.id === activeSiteId) ?? sites[0]);

  function select(id: string) {
    open = false;
    if (id !== activeSiteId) onswitch(id);
  }
</script>

<svelte:window onclick={() => { open = false; }} />

{#if sites.length > 1}
  <div class="switcher">
    <div class="switcher__label">Client</div>

    <div class="switcher__wrap">
      <button
        class="switcher__btn"
        class:switcher__btn--open={open}
        onclick={(e) => { e.stopPropagation(); open = !open; }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span class="switcher__dot" style="background:{active?.color ?? 'var(--amber)'}"></span>
        <span class="switcher__name">{active?.name ?? 'Select client'}</span>
        <svg class="switcher__caret" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" style="transform:rotate({open ? 180 : 0}deg);transition:transform 0.15s">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>

      {#if open}
        <div class="switcher__dropdown" role="listbox" onclick={(e) => e.stopPropagation()}>
          <div class="switcher__dropdown-label">Switch client</div>
          {#each sites as site (site.id)}
            <button
              class="switcher__option"
              class:switcher__option--active={site.id === activeSiteId}
              role="option"
              aria-selected={site.id === activeSiteId}
              onclick={() => select(site.id)}
            >
              <span class="switcher__dot" style="background:{site.color ?? 'var(--amber)'}"></span>
              <span class="switcher__option-name">{site.name}</span>
              {#if site.id === activeSiteId}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .switcher {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 20px;
    background: var(--cms-card); border-bottom: 1px solid var(--cms-border);
    flex-shrink: 0;
  }

  .switcher__label {
    font-size: 11px; font-weight: 600; color: var(--cms-text-dim);
    letter-spacing: 0.08em; text-transform: uppercase;
    flex-shrink: 0;
  }

  .switcher__wrap { position: relative; }

  .switcher__btn {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; border-radius: 8px;
    background: var(--cms-surface); border: 1px solid var(--cms-border);
    color: var(--cms-text); font-size: 13px; font-weight: 500;
    font-family: inherit; cursor: pointer; transition: all 0.12s;
    min-width: 160px;
  }
  .switcher__btn:hover,
  .switcher__btn--open { border-color: var(--cms-border-hi); }

  .switcher__dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }

  .switcher__name  { flex: 1; text-align: left; }
  .switcher__caret { color: var(--cms-text-dim); flex-shrink: 0; }

  /* Dropdown */
  .switcher__dropdown {
    position: absolute; top: calc(100% + 6px); left: 0;
    min-width: 220px; z-index: 50;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 10px; padding: 6px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    animation: dropIn 0.12s ease;
  }
  @keyframes dropIn {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .switcher__dropdown-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: var(--cms-text-dim); padding: 4px 10px 8px;
  }

  .switcher__option {
    display: flex; align-items: center; gap: 8px;
    width: 100%; padding: 8px 10px; border-radius: 7px;
    background: none; border: none;
    font-size: 13px; color: var(--cms-text-mid);
    font-family: inherit; cursor: pointer; transition: all 0.1s;
    text-align: left;
  }
  .switcher__option:hover         { background: var(--cms-accent-glow); color: var(--cms-text); }
  .switcher__option--active       { color: var(--cms-text); font-weight: 600; }
  .switcher__option-name          { flex: 1; }
</style>