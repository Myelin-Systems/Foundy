<!-- =============================================================================
     lib/cms/components/StatusBadge.svelte
     Pill badge for entry/post status: published | draft | scheduled
     ============================================================================= -->
<script lang="ts">
  import type { EntryStatus } from '../types';

  const { status }: { status: EntryStatus } = $props();

  type BadgeConfig = { label: string; class: string };

  const config: Record<EntryStatus, BadgeConfig> = {
    published: { label: 'Published', class: 'badge--published' },
    draft:     { label: 'Draft',     class: 'badge--draft'     },
    scheduled: { label: 'Scheduled', class: 'badge--scheduled' },
  };

  const badge = $derived(config[status] ?? config.draft);
</script>

<span class="badge {badge.class}">
  <span class="badge__dot" aria-hidden="true"></span>
  {badge.label}
</span>

<style>
  .badge {
    display:        inline-flex;
    align-items:    center;
    gap:            5px;
    padding:        3px 9px;
    border-radius:  20px;
    font-size:      11px;
    font-weight:    500;
    letter-spacing: 0.02em;
    white-space:    nowrap;
  }

  .badge__dot {
    width:         5px;
    height:        5px;
    border-radius: 50%;
    flex-shrink:   0;
    background:    currentColor;
  }

  /* ── Variants ────────────────────────────────────────────────────────────── */
  .badge--published {
    color:      var(--cms-green);
    background: rgba(0, 232, 150, 0.08);
  }

  .badge--draft {
    color:      var(--cms-text-dim);
    background: rgba(74, 106, 138, 0.12);
  }

  .badge--scheduled {
    color:      var(--cms-amber);
    background: rgba(245, 184, 0, 0.08);
  }
</style>