<!-- MediaView.svelte — upload, list, delete media files -->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import Icon              from './Icon.svelte';
  import { isUnlimited }   from '$lib/shared/plans';
  import type { MediaFile } from '../types';
  import type { OrgUsage }  from '$lib/server/services/foundy/UsageService';

  const {
    siteId,
    mediaFiles,
    usage,
  }: {
    siteId:     string | null;
    mediaFiles: MediaFile[];
    usage:      OrgUsage | null;
  } = $props();

  // ── Storage bar ───────────────────────────────────────────────────────────
  const fileBytes      = $derived(usage?.file_bytes       ?? 0);
  const fileLimitBytes = $derived(usage?.file_limit_bytes ?? 0);
  const filePct        = $derived(
    !usage || isUnlimited(fileLimitBytes) || fileLimitBytes === 0
      ? 0
      : Math.min(100, Math.round((fileBytes / fileLimitBytes) * 100))
  );

  function fmtBytes(n: number): string {
    if (isUnlimited(n) || n < 0) return '∞';
    if (n === 0)                  return '0 B';
    if (n < 1_024)                return `${n} B`;
    if (n < 1_048_576)            return `${(n / 1_024).toFixed(1)} KB`;
    if (n < 10_737_418_240)       return `${(n / 1_048_576).toFixed(0)} MB`;
    return `${(n / 1_073_741_824).toFixed(0)} GB`;
  }

  function barColor(p: number): string {
    if (p >= 90) return 'var(--cms-red)';
    if (p >= 70) return 'var(--cms-amber)';
    return 'var(--cms-accent)';
  }

  function isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  // ── Upload state ──────────────────────────────────────────────────────────
  let uploading    = $state(false);
  let uploadError  = $state('');
  let dragOver     = $state(false);
  let uploadQueue  = $state<{ name: string; progress: number; done: boolean; error: string }[]>([]);

  let fileInput: HTMLInputElement;

  function openPicker() {
    fileInput.click();
  }

  async function handleFiles(files: FileList | File[]) {
    if (!siteId || uploading) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    uploadError = '';
    uploading   = true;
    uploadQueue = list.map(f => ({ name: f.name, progress: 0, done: false, error: '' }));

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      try {
        const form = new FormData();
        form.append('file', file);

        const res  = await fetch(`/api/cms/sites/${siteId}/media`, { method: 'POST', body: form });
        const json = await res.json();

        if (!json.ok) {
          uploadQueue[i] = { ...uploadQueue[i], error: json.message, done: true };
          uploadError = json.message;
        } else {
          uploadQueue[i] = { ...uploadQueue[i], done: true, progress: 100 };
        }
      } catch {
        uploadQueue[i] = { ...uploadQueue[i], error: 'Network error', done: true };
      }
    }

    uploading = false;
    await invalidateAll();

    // Clear queue after a short delay so user sees the done state
    setTimeout(() => { uploadQueue = []; }, 2000);
  }

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) handleFiles(input.files);
    input.value = ''; // reset so same file can be re-picked
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files.length) handleFiles(e.dataTransfer.files);
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  let deletingId = $state<string | null>(null);

  async function deleteFile(fileId: string) {
    if (!siteId || deletingId) return;
    deletingId = fileId;
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}/media/${fileId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      await invalidateAll();
    } finally { deletingId = null; }
  }
</script>

<!-- Hidden file input -->
<input
  bind:this={fileInput}
  type="file"
  multiple
  accept="image/*,video/mp4,video/webm,application/pdf,text/plain,text/csv"
  style="display:none"
  onchange={onFileChange}
/>

<div class="media cms-fade-in">

  <!-- Header -->
  <div class="media__header">
    <div>
      <h1 class="media__title">Media</h1>
      <p class="media__subtitle">
        {#if !usage}
          File storage
        {:else if isUnlimited(fileLimitBytes)}
          <span class="media__used">{fmtBytes(fileBytes)}</span> used · unlimited
        {:else}
          <span class="media__used">{fmtBytes(fileBytes)}</span>
          of {fmtBytes(fileLimitBytes)} used
        {/if}
      </p>
    </div>
    <button class="media__upload-btn" onclick={openPicker} disabled={uploading || !siteId}>
      <Icon name="upload" size={15} />
      {uploading ? 'Uploading…' : 'Upload files'}
    </button>
  </div>

  <!-- Storage bar -->
  <div class="media__storage"
    role="progressbar"
    aria-valuenow={filePct}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div class="media__storage-bar">
      <div
        class="media__storage-fill"
        style="width:{filePct}%; background:{barColor(filePct)}"
      ></div>
    </div>
    <span class="media__storage-label cms-mono">
      {#if !usage}— / —{:else}{fmtBytes(fileBytes)} / {fmtBytes(fileLimitBytes)}{/if}
    </span>
  </div>

  <!-- Upload queue -->
  {#if uploadQueue.length > 0}
    <div class="media__queue">
      {#each uploadQueue as item}
        <div class="media__queue-item" class:media__queue-item--error={!!item.error}>
          <span class="media__queue-name">{item.name}</span>
          {#if item.error}
            <span class="media__queue-status media__queue-status--error">{item.error}</span>
          {:else if item.done}
            <span class="media__queue-status media__queue-status--done">✓ Done</span>
          {:else}
            <span class="media__queue-status">Uploading…</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- Error banner -->
  {#if uploadError && uploadQueue.length === 0}
    <div class="media__error">{uploadError}</div>
  {/if}

  <!-- Drop zone / empty state -->
  {#if mediaFiles.length === 0 && uploadQueue.length === 0}
    <div
      class="media__drop"
      class:media__drop--over={dragOver}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => { dragOver = false; }}
      ondrop={onDrop}
      role="button"
      tabindex={0}
      aria-label="Drop files here or click to upload"
      onclick={openPicker}
      onkeydown={(e) => e.key === 'Enter' && openPicker()}
    >
      <Icon name="upload" size={28} />
      <p class="media__drop-title">
        {dragOver ? 'Drop to upload' : 'Drag files here or click to upload'}
      </p>
      <p class="media__drop-sub">
        Images, video, PDF, CSV · Max 50 MB per file
      </p>
    </div>

  {:else}
    <!-- Drop overlay when dragging over existing grid -->
    <div
      class="media__grid-wrap"
      class:media__grid-wrap--over={dragOver}
      ondragover={(e) => { e.preventDefault(); dragOver = true; }}
      ondragleave={() => { dragOver = false; }}
      ondrop={onDrop}
    >
      {#if dragOver}
        <div class="media__drop-overlay">
          <Icon name="upload" size={28} />
          <span>Drop to upload</span>
        </div>
      {/if}

      <ul class="media__grid" aria-label="Media files">
        {#each mediaFiles as file (file.id)}
          {@const isDeleting = deletingId === file.id}
          <li class="media__card" class:media__card--deleting={isDeleting}>
            <div class="media__thumb" aria-hidden="true">
              {#if file.url && isImage(file.mime_type ?? '')}
                <img src={file.url} alt={file.name} class="media__img" />
              {:else}
                <div class="media__file-icon">
                  <Icon name="media" size={22} />
                  <span class="media__mime">{(file.mime_type ?? '').split('/')[1]?.toUpperCase() ?? 'FILE'}</span>
                </div>
              {/if}
            </div>
            <div class="media__info">
              <p class="media__name" title={file.name}>{file.name}</p>
              <div class="media__meta">
                <span class="media__size cms-mono">{fmtBytes(file.size ?? Math.round((file.size_mb ?? 0) * 1_048_576))}</span>
                <button
                  class="media__delete-btn"
                  onclick={() => deleteFile(file.id)}
                  disabled={isDeleting}
                  aria-label="Delete {file.name}"
                >
                  {isDeleting ? '…' : '×'}
                </button>
              </div>
            </div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

</div>

<style>
  .media { padding: 28px; height: 100%; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }

  .media__header   { display: flex; align-items: flex-start; justify-content: space-between; }
  .media__title    { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .media__subtitle { font-size: 12px; color: var(--cms-text-dim); margin-top: 3px; }
  .media__used     { color: var(--cms-accent); }

  .media__upload-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--cms-accent); color: #06090f;
    border: none; border-radius: 8px; padding: 8px 14px;
    font-size: 13px; font-weight: 600; transition: all 0.12s; cursor: pointer;
  }
  .media__upload-btn:hover:not(:disabled) { filter: brightness(1.1); }
  .media__upload-btn:disabled             { opacity: 0.5; cursor: not-allowed; }

  /* Storage bar */
  .media__storage {
    display: flex; align-items: center; gap: 14px;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 10px; padding: 12px 16px; flex-shrink: 0;
  }
  .media__storage-bar   { flex: 1; height: 4px; background: var(--cms-border); border-radius: 4px; overflow: hidden; }
  .media__storage-fill  { height: 100%; border-radius: 4px; transition: width 0.5s cubic-bezier(0.16,1,0.3,1); }
  .media__storage-label { font-size: 12px; color: var(--cms-text-dim); white-space: nowrap; }

  /* Upload queue */
  .media__queue { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .media__queue-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 12px; background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 8px; font-size: 12px;
  }
  .media__queue-item--error   { border-color: rgba(255,64,96,0.3); }
  .media__queue-name          { color: var(--cms-text-mid); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
  .media__queue-status        { color: var(--cms-text-dim); flex-shrink: 0; margin-left: 12px; }
  .media__queue-status--done  { color: var(--cms-green); }
  .media__queue-status--error { color: var(--cms-red); }

  /* Error banner */
  .media__error {
    padding: 10px 14px; background: rgba(255,64,96,0.08);
    border: 1px solid rgba(255,64,96,0.25); border-radius: 8px;
    color: var(--cms-red); font-size: 13px; flex-shrink: 0;
  }

  /* Drop zone (empty state) */
  .media__drop {
    flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 10px; border: 2px dashed var(--cms-border); border-radius: 14px;
    color: var(--cms-text-dim); cursor: pointer; transition: all 0.15s;
    padding: 40px; min-height: 200px;
  }
  .media__drop:hover,
  .media__drop--over { border-color: var(--cms-accent); color: var(--cms-accent); background: rgba(0,212,255,0.03); }
  .media__drop-title { font-size: 14px; font-weight: 600; }
  .media__drop-sub   { font-size: 12px; opacity: 0.7; }

  /* Grid wrap with drop overlay */
  .media__grid-wrap          { position: relative; flex: 1; }
  .media__grid-wrap--over    { outline: 2px dashed var(--cms-accent); outline-offset: 4px; border-radius: 10px; }
  .media__drop-overlay {
    position: absolute; inset: 0; z-index: 10;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
    background: rgba(7,11,18,0.85); border-radius: 10px;
    color: var(--cms-accent); font-size: 14px; font-weight: 600;
    backdrop-filter: blur(4px);
  }

  /* Grid */
  .media__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; list-style: none; }
  .media__card {
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 10px; overflow: hidden; transition: border-color 0.15s;
  }
  .media__card:hover          { border-color: var(--cms-border-hi); }
  .media__card--deleting      { opacity: 0.4; pointer-events: none; }

  .media__thumb {
    height: 120px;
    background: linear-gradient(135deg, var(--cms-border) 0%, var(--cms-surface) 100%);
    display: flex; align-items: center; justify-content: center;
    color: var(--cms-border-hi); overflow: hidden;
  }
  .media__img       { width: 100%; height: 100%; object-fit: cover; }
  .media__file-icon { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .media__mime      { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: var(--cms-text-dim); }

  .media__info { padding: 10px 12px; }
  .media__name { font-size: 12px; font-weight: 500; color: var(--cms-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 4px; }
  .media__meta { display: flex; align-items: center; justify-content: space-between; }
  .media__size { font-size: 11px; color: var(--cms-text-dim); }

  .media__delete-btn {
    background: none; border: none; color: var(--cms-text-dim);
    font-size: 16px; line-height: 1; cursor: pointer; padding: 0 2px;
    border-radius: 4px; transition: all 0.1s;
  }
  .media__delete-btn:hover { color: var(--cms-red); background: rgba(255,64,96,0.08); }
</style>