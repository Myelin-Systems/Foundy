<!-- APIView.svelte — public + secret keys -->
<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import Icon from './Icon.svelte';
  import ConfirmDialog from '../dialog/ConfirmDialog.svelte';

  const {
    siteId, publicToken, secretToken,
  }: {
    siteId:       string | null;
    publicToken:  string | null;
    secretToken:  string | null;
  } = $props();

  // ── Local state per token type ────────────────────────────────────────────
  let pubRevealed  = $state(false);
  let secRevealed  = $state(false);
  let pubCopied    = $state(false);
  let secCopied    = $state(false);
  let generating   = $state<'public' | 'secret' | null>(null);
  let rotating     = $state<'public' | 'secret' | null>(null);
  let confirmRotate = $state<'public' | 'secret' | null>(null);

  let localPub = $state<string | null>(publicToken);
  let localSec = $state<string | null>(secretToken);

  async function generate(type: 'public' | 'secret') {
    if (!siteId) return;
    generating = type;
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}/tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      if (type === 'public') { localPub = json.token; pubRevealed = true; }
      else                   { localSec = json.token; secRevealed = true; }
      await invalidateAll();
    } finally { generating = null; }
  }

  async function rotate(type: 'public' | 'secret') {
    if (!siteId) return;
    rotating = type;
    try {
      const res  = await fetch(`/api/cms/sites/${siteId}/tokens`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!json.ok) { alert(json.message); return; }
      if (type === 'public') { localPub = json.token; pubRevealed = true; }
      else                   { localSec = json.token; secRevealed = true; }
      confirmRotate = null;
      await invalidateAll();
    } finally { rotating = null; }
  }

  function copy(type: 'public' | 'secret') {
    const token = type === 'public' ? localPub : localSec;
    if (!token) return;
    navigator.clipboard.writeText(token).catch(() => {});
    if (type === 'public') { pubCopied = true; setTimeout(() => pubCopied = false, 2000); }
    else                   { secCopied = true; setTimeout(() => secCopied = false, 2000); }
  }

  function mask(token: string): string {
    const prefix = token.startsWith('pnd_pub_') ? 'pnd_pub_' : 'pnd_sec_';
    return `${prefix}${'•'.repeat(20)}`;
  }
</script>

<div class="api cms-fade-in">
  <div class="api__inner">
    <h1 class="api__title">API Access</h1>
    <p class="api__subtitle">
      Connect any frontend using the delivery API.
      Use your <strong>public key</strong> in browser code and your
      <strong>secret key</strong> only on your server.
    </p>

    <!-- ── Public key ─────────────────────────────────────────────────────── -->
    <section class="api__section">
      <h2 class="api__section-title">Public key</h2>
      <div class="api__key-meta">
        <span class="api__key-badge api__key-badge--pub">pnd_pub_</span>
        <span class="api__key-desc">Safe to use in browser JavaScript. Read-only + stock decrement.</span>
      </div>

      <div class="api__token-row">
        <span class="api__token-value cms-mono">
          {localPub ? (pubRevealed ? localPub : mask(localPub)) : 'No public key — generate one below'}
        </span>
        <div class="api__token-actions">
          {#if localPub}
            <button class="api__token-btn" onclick={() => pubRevealed = !pubRevealed}>
              {pubRevealed ? 'Hide' : 'Reveal'}
            </button>
            <button class="api__token-btn" onclick={() => copy('public')}>
              {#if pubCopied}<Icon name="check" size={13} /> Copied{:else}<Icon name="copy" size={13} /> Copy{/if}
            </button>
            <button class="api__token-btn api__token-btn--warn" onclick={() => confirmRotate = 'public'}>
              Rotate
            </button>
          {:else}
            <button class="api__token-btn api__token-btn--primary" onclick={() => generate('public')} disabled={generating === 'public'}>
              {generating === 'public' ? 'Generating…' : 'Generate public key'}
            </button>
          {/if}
        </div>
      </div>
      {#if localPub && pubRevealed}
        <p class="api__token-warning">⚠ Copy this key now — it won't be shown in full again after you leave this page.</p>
      {/if}
    </section>

    <!-- ── Secret key ─────────────────────────────────────────────────────── -->
    <section class="api__section">
      <h2 class="api__section-title">Secret key</h2>
      <div class="api__key-meta">
        <span class="api__key-badge api__key-badge--sec">pnd_sec_</span>
        <span class="api__key-desc api__key-desc--warn">
          ⚠ Never expose in client-side code. Server-side only. Grants write access.
        </span>
      </div>

      <div class="api__token-row">
        <span class="api__token-value cms-mono">
          {localSec ? (secRevealed ? localSec : mask(localSec)) : 'No secret key — generate one below'}
        </span>
        <div class="api__token-actions">
          {#if localSec}
            <button class="api__token-btn" onclick={() => secRevealed = !secRevealed}>
              {secRevealed ? 'Hide' : 'Reveal'}
            </button>
            <button class="api__token-btn" onclick={() => copy('secret')}>
              {#if secCopied}<Icon name="check" size={13} /> Copied{:else}<Icon name="copy" size={13} /> Copy{/if}
            </button>
            <button class="api__token-btn api__token-btn--warn" onclick={() => confirmRotate = 'secret'}>
              Rotate
            </button>
          {:else}
            <button class="api__token-btn api__token-btn--primary" onclick={() => generate('secret')} disabled={generating === 'secret'}>
              {generating === 'secret' ? 'Generating…' : 'Generate secret key'}
            </button>
          {/if}
        </div>
      </div>
      {#if localSec && secRevealed}
        <p class="api__token-warning api__token-warning--sec">⚠ Copy this key now. Store it in your server environment variables, never in source code.</p>
      {/if}
    </section>

    <!-- ── Base URL ───────────────────────────────────────────────────────── -->
    <section class="api__section">
      <h2 class="api__section-title">Base URL</h2>
      <div class="api__code-block">
        <span class="api__code cms-mono">https://api.foundiq.nl/v1</span>
      </div>
    </section>

    <!-- ── Endpoints ─────────────────────────────────────────────────────── -->
    <section class="api__section">
      <h2 class="api__section-title">Endpoints</h2>
      <div class="api__snippets">

        <div class="api__snippet">
          <div class="api__snippet-header">
            <span class="api__snippet-label">Fetch all entries in a collection</span>
            <div class="api__snippet-badges">
              <span class="api__method api__method--get">GET</span>
              <span class="api__key-chip api__key-chip--pub">Public</span>
            </div>
          </div>
          <pre class="api__pre cms-mono">Authorization: Bearer {localPub ?? 'pnd_pub_YOUR_KEY'}
GET /v1/sites/{siteId ?? ':siteId'}/collections/:name/entries</pre>
        </div>

        <div class="api__snippet">
          <div class="api__snippet-header">
            <span class="api__snippet-label">Submit a contact form / external data</span>
            <div class="api__snippet-badges">
              <span class="api__method api__method--post">POST</span>
              <span class="api__key-chip api__key-chip--sec">Secret</span>
            </div>
          </div>
          <pre class="api__pre cms-mono">Authorization: Bearer {localSec ?? 'pnd_sec_YOUR_KEY'}
POST /v1/sites/{siteId ?? ':siteId'}/collections/:name/entries
{"{"}"data": {"{"}"email": "user@example.com"{"}"}{"}"}</pre>
        </div>

        <div class="api__snippet">
          <div class="api__snippet-header">
            <span class="api__snippet-label">Decrement stock (webshop checkout webhook)</span>
            <div class="api__snippet-badges">
              <span class="api__method api__method--post">POST</span>
              <span class="api__key-chip api__key-chip--pub">Public</span>
            </div>
          </div>
          <pre class="api__pre cms-mono">Authorization: Bearer {localPub ?? 'pnd_pub_YOUR_KEY'}
POST /v1/sites/{siteId ?? ':siteId'}/collections/:name/entries/:id/decrement
{"{"}"order_id": "ch_stripe_xxx", "quantity": 1{"}"}</pre>
        </div>

        <div class="api__snippet">
          <div class="api__snippet-header">
            <span class="api__snippet-label">Fetch media files</span>
            <div class="api__snippet-badges">
              <span class="api__method api__method--get">GET</span>
              <span class="api__key-chip api__key-chip--pub">Public</span>
            </div>
          </div>
          <pre class="api__pre cms-mono">Authorization: Bearer {localPub ?? 'pnd_pub_YOUR_KEY'}
GET /v1/sites/{siteId ?? ':siteId'}/media?mime_type=image/</pre>
        </div>

      </div>
    </section>
  </div>
</div>

<!-- Rotate confirms -->
<ConfirmDialog
  open={confirmRotate === 'public'}
  title="Rotate public key"
  message="This will immediately revoke the current public key. Any frontend using it will stop working until updated."
  confirmLabel="Rotate public key"
  loading={rotating === 'public'}
  onconfirm={() => rotate('public')}
  oncancel={() => confirmRotate = null}
/>
<ConfirmDialog
  open={confirmRotate === 'secret'}
  title="Rotate secret key"
  message="This will immediately revoke the current secret key. Any server using it will fail until updated."
  confirmLabel="Rotate secret key"
  loading={rotating === 'secret'}
  onconfirm={() => rotate('secret')}
  oncancel={() => confirmRotate = null}
/>

<style>
  .api { padding: 28px; height: 100%; overflow-y: auto; }
  .api__inner    { max-width: 760px; }
  .api__title    { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
  .api__subtitle { font-size: 13px; color: var(--cms-text-mid); margin-top: 6px; line-height: 1.6; margin-bottom: 4px; }
  .api__subtitle strong { color: var(--cms-text); }

  .api__section       { margin-top: 28px; }
  .api__section-title { font-size: 11px; font-weight: 600; color: var(--cms-text-dim); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 10px; }

  /* Key type metadata */
  .api__key-meta  { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
  .api__key-badge {
    font-size: 11px; font-weight: 700; font-family: var(--mono);
    padding: 2px 8px; border-radius: 5px;
  }
  .api__key-badge--pub { background: rgba(0,212,255,0.1); color: var(--cms-accent); border: 1px solid rgba(0,212,255,0.2); }
  .api__key-badge--sec { background: rgba(255,187,0,0.1); color: var(--cms-amber); border: 1px solid rgba(255,187,0,0.2); }
  .api__key-desc      { font-size: 12px; color: var(--cms-text-dim); }
  .api__key-desc--warn { color: var(--cms-amber); }

  /* Token row */
  .api__token-row {
    display: flex; align-items: center; gap: 10px;
    background: var(--cms-card); border: 1px solid var(--cms-border);
    border-radius: 8px; padding: 10px 14px;
  }
  .api__token-value   { flex: 1; font-size: 13px; color: var(--cms-text-dim); word-break: break-all; }
  .api__token-actions { display: flex; gap: 6px; flex-shrink: 0; }

  .api__token-warning { margin-top: 8px; font-size: 12px; color: var(--cms-amber); background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2); border-radius: 6px; padding: 8px 12px; }
  .api__token-warning--sec { color: var(--cms-red); background: rgba(255,68,102,0.06); border-color: rgba(255,68,102,0.2); }

  .api__token-btn {
    display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--cms-accent);
    background: none; border: 1px solid var(--cms-border); border-radius: 6px;
    padding: 4px 10px; white-space: nowrap; transition: all 0.12s; font-family: inherit; cursor: pointer;
  }
  .api__token-btn:hover:not(:disabled)          { border-color: var(--cms-accent); }
  .api__token-btn:disabled                      { opacity: 0.5; cursor: not-allowed; }
  .api__token-btn--primary                      { background: var(--cms-accent); color: #06090f; border-color: var(--cms-accent); }
  .api__token-btn--primary:hover:not(:disabled) { filter: brightness(1.1); }
  .api__token-btn--warn                         { color: var(--cms-amber); }
  .api__token-btn--warn:hover                   { border-color: var(--cms-amber); }

  /* Code block */
  .api__code-block { background: var(--cms-card); border: 1px solid var(--cms-border); border-radius: 8px; padding: 10px 14px; }
  .api__code       { font-size: 13px; color: var(--cms-accent); }

  /* Snippets */
  .api__snippets { display: flex; flex-direction: column; gap: 12px; }
  .api__snippet  { background: var(--cms-card); border: 1px solid var(--cms-border); border-radius: 12px; overflow: hidden; }
  .api__snippet-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 0; gap: 12px; }
  .api__snippet-label  { font-size: 12px; font-weight: 600; color: var(--cms-text-mid); }
  .api__snippet-badges { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

  .api__method       { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 8px; border-radius: 4px; }
  .api__method--get  { background: rgba(0,232,150,0.1); color: var(--cms-green); }
  .api__method--post { background: rgba(0,212,255,0.1); color: var(--cms-accent); }

  .api__key-chip      { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; }
  .api__key-chip--pub { background: rgba(0,212,255,0.08); color: var(--cms-accent); }
  .api__key-chip--sec { background: rgba(255,187,0,0.08); color: var(--cms-amber); }

  .api__pre { padding: 12px 16px; font-size: 11px; color: var(--cms-text-dim); line-height: 1.7; white-space: pre-wrap; word-break: break-all; }
</style>