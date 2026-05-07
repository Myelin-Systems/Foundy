<!-- ConfirmDialog.svelte — destructive action confirmation -->
<script lang="ts">
  import Modal from '../components/Modal.svelte';

  const {
    open, title, message, confirmLabel = 'Delete', onconfirm, oncancel, loading = false,
  }: {
    open: boolean; title: string; message: string;
    confirmLabel?: string; onconfirm: () => void; oncancel: () => void; loading?: boolean;
  } = $props();
</script>

<Modal {open} {title} onclose={oncancel} size="sm">
  <p class="msg">{message}</p>
  <div class="actions">
    <button class="btn btn--cancel" onclick={oncancel} disabled={loading}>Cancel</button>
    <button class="btn btn--danger" onclick={onconfirm} disabled={loading}>
      {loading ? 'Deleting…' : confirmLabel}
    </button>
  </div>
</Modal>

<style>
  .msg { font-size: 14px; color: var(--cms-text-mid); line-height: 1.6; margin-bottom: 24px; }
  .actions { display: flex; justify-content: flex-end; gap: 10px; }

  .btn {
    padding: 9px 18px; border-radius: 8px; font-size: 13px; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.12s; border: 1px solid var(--cms-border);
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn--cancel { background: transparent; color: var(--cms-text-dim); }
  .btn--cancel:hover:not(:disabled) { color: var(--cms-text); border-color: var(--cms-border-hi); }
  .btn--danger { background: var(--cms-red); color: #fff; border-color: var(--cms-red); }
  .btn--danger:hover:not(:disabled) { filter: brightness(1.1); }
</style>