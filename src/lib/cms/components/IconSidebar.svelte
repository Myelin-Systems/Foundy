<!-- =============================================================================
     lib/cms/components/IconSidebar.svelte
     Vertical icon-only navigation rail.
     ============================================================================= -->
<script lang="ts">
  import Icon            from './Icon.svelte';
  import { NAV_ITEMS }   from '../data';
  import type { NavSection } from '../types';

  const {
    active,
    onselect,
  }: {
    active:   NavSection;
    onselect: (section: NavSection) => void;
  } = $props();
</script>

<nav class="icon-nav" aria-label="Main navigation">
  {#each NAV_ITEMS as item (item.id)}
    <button
      class="icon-nav__btn"
      class:icon-nav__btn--active={active === item.id}
      onclick={() => onselect(item.id)}
      title={item.label}
      aria-label={item.label}
      aria-current={active === item.id ? 'page' : undefined}
    >
      <Icon name={item.icon} size={18} />
    </button>
  {/each}
</nav>

<style>
  .icon-nav {
    width:          60px;
    border-right:   1px solid var(--cms-border);
    display:        flex;
    flex-direction: column;
    align-items:    center;
    padding:        12px 0;
    gap:            4px;
    flex-shrink:    0;
  }

  .icon-nav__btn {
    width:           40px;
    height:          40px;
    border-radius:   9px;
    background:      transparent;
    border:          1px solid transparent;
    color:           var(--cms-text-dim);
    display:         flex;
    align-items:     center;
    justify-content: center;
    transition:      all 0.13s;
  }

  .icon-nav__btn:hover {
    background:   var(--cms-accent-glow);
    color:        var(--cms-text-mid);
  }

  .icon-nav__btn--active {
    background:   var(--cms-accent-dim);
    border-color: rgba(0, 212, 255, 0.2);
    color:        var(--cms-accent);
  }

  .icon-nav__btn--active:hover {
    background: var(--cms-accent-dim);
    color:      var(--cms-accent);
  }
</style>