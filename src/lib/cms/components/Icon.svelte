<!-- =============================================================================
     lib/cms/components/Icon.svelte
     Single source of truth for all CMS icons.
     Usage: <Icon name="content" size={18} />
     ============================================================================= -->
<script lang="ts">
  const { name, size = 18 }: { name: string; size?: number } = $props();

  // Each value is the inner SVG path/shape markup (injected into a shared <svg> wrapper)
  const paths: Record<string, string> = {
    content:  `<rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>`,

    media:    `<rect x="3" y="3" width="18" height="18" rx="2.5"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>`,

    social:   `<circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>`,

    settings: `<circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83
                         M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>`,

    api:      `<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>`,

    plus:     `<path d="M12 5v14M5 12h14"/>`,

    search:   `<circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>`,

    more:     `<circle cx="12" cy="12" r="1"/>
                <circle cx="19" cy="12" r="1"/>
                <circle cx="5" cy="12" r="1"/>`,

    'chev-down': `<path d="m6 9 6 6 6-6"/>`,

    close:    `<path d="M18 6 6 18M6 6l12 12"/>`,

    upload:   `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>`,

    globe:    `<circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10
                          15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>`,

    stock:    `<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
                <path d="M2 7h20"/>`,

    sun:      `<circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41
                         M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>`,

    moon:     `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>`,

    copy:     `<rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>`,

    check:    `<polyline points="20 6 9 17 4 12"/>`,

    usage: `<path d="M12 20V10"/>
        <path d="M18 20V4"/>
        <path d="M6 20v-4"/>`,
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {@html paths[name] ?? ''}
</svg>