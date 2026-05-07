// =============================================================================
// lib/cms/theme.svelte.ts
// Svelte 5 module-level reactive state for theme.
// Import `cmsTheme` anywhere and mutate `.value` to trigger reactivity.
// =============================================================================

import type { Theme } from './types';

export const cmsTheme = $state<{ value: Theme }>({ value: 'dark' });

export function toggleTheme(): void {
  cmsTheme.value = cmsTheme.value === 'dark' ? 'light' : 'dark';
}