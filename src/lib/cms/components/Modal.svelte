<!-- Modal.svelte — generic modal, close on overlay click or Escape -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  const {
    open, title, onclose, children, size = 'md',
  }: {
    open: boolean; title: string; onclose: () => void;
    children: Snippet; size?: 'sm' | 'md' | 'lg';
  } = $props();

  function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onclose(); }
</script>

<svelte:window onkeydown={handleKey} />

{#if open}
  <div class="overlay" onclick={onclose} role="dialog" aria-modal="true" aria-label={title}>
    <div class="modal modal--{size}" onclick={(e) => e.stopPropagation()} role="presentation">
      <div class="modal__header">
        <h2 class="modal__title">{title}</h2>
        <button class="modal__close" onclick={onclose} aria-label="Close"><Icon name="close" size={16} /></button>
      </div>
      <div class="modal__body">{@render children()}</div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px); display: flex; align-items: center;
    justify-content: center; z-index: 100; padding: 24px;
    animation: fadeOverlay 0.15s ease;
  }
  @keyframes fadeOverlay { from { opacity: 0; } to { opacity: 1; } }

  .modal {
    background: var(--cms-card); border: 1px solid var(--cms-border); border-radius: 14px;
    width: 100%; box-shadow: var(--cms-shadow); max-height: 90vh;
    display: flex; flex-direction: column;
    animation: slideModal 0.2s cubic-bezier(.16,1,.3,1);
  }
  @keyframes slideModal { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }

  .modal--sm { max-width: 420px; }
  .modal--md { max-width: 560px; }
  .modal--lg { max-width: 760px; }

  .modal__header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px 16px; border-bottom: 1px solid var(--cms-border); flex-shrink: 0;
  }
  .modal__title { font-size: 16px; font-weight: 700; color: var(--cms-text); letter-spacing: -0.01em; }

  .modal__close {
    width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--cms-border);
    background: transparent; color: var(--cms-text-dim);
    display: flex; align-items: center; justify-content: center; transition: all 0.12s;
  }
  .modal__close:hover { background: var(--cms-border); color: var(--cms-text); }

  .modal__body { padding: 24px; overflow-y: auto; }
</style>