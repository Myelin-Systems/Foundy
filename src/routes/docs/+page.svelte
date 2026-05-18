<!-- src/routes/docs/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  let activeSection = $state('quickstart');

  const sections = [
    { id: 'quickstart',     label: '⚡ Quick start' },
    { id: 'introduction',   label: 'Introduction' },
    { id: 'authentication', label: 'Authentication' },
    { id: 'base-url',       label: 'Base URL' },
    { id: 'collections',    label: 'Collections' },
    { id: 'entries-list',   label: 'List entries' },
    { id: 'entries-single', label: 'Single entry' },
    { id: 'entries-create', label: 'Create entry' },
    { id: 'decrement',      label: 'Decrement stock' },
    { id: 'media-list',     label: 'List media' },
    { id: 'media-single',   label: 'Single media file' },
    { id: 'filtering',      label: 'Filtering & search' },
    { id: 'pagination',     label: 'Pagination' },
    { id: 'errors',         label: 'Error reference' },
  ];

  onMount(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) activeSection = e.target.id;
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  });

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  let copied = $state<string | null>(null);
  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    copied = id;
    setTimeout(() => copied = null, 2000);
  }

  const quickstartCode = `import { useState, useEffect } from 'react';

const SITE_ID  = 'YOUR_SITE_ID';
const PUB_KEY  = 'pnd_pub_YOUR_KEY';
const BASE_URL = 'https://api.foundiq.nl/v1';

function headers() {
  return { 'Authorization': \`Bearer \${PUB_KEY}\` };
}

// 1. Fetch all collections
const res = await fetch(\`\${BASE_URL}/sites/\${SITE_ID}/collections\`, { headers: headers() });
const { data: collections } = await res.json();

// 2. Fetch entries in a collection
const res2 = await fetch(\`\${BASE_URL}/sites/\${SITE_ID}/collections/products/entries\`, { headers: headers() });
const { data: products, meta } = await res2.json();

console.log(\`Loaded \${products.length} of \${meta.total} products\`);`;
</script>

<svelte:head>
  <title>API Reference — Foundiq</title>
  <meta name="description" content="Foundiq delivery API reference. Connect any frontend to your content in minutes." />
</svelte:head>

<div class="docs">

  <!-- ── Sidebar ──────────────────────────────────────────────────────────── -->
  <nav class="docs__nav" aria-label="API reference navigation">
    <div class="docs__nav-logo">
      <a href="/" class="docs__nav-brand">
        <div class="docs__nav-mark"></div>
        <span>Foundiq</span>
      </a>
      <span class="docs__nav-label">API Reference</span>
    </div>

    <ul class="docs__nav-list">
      {#each sections as s}
        <li>
          <button
            class="docs__nav-item"
            class:docs__nav-item--active={activeSection === s.id}
            class:docs__nav-item--qs={s.id === 'quickstart'}
            onclick={() => scrollTo(s.id)}
          >
            {s.label}
          </button>
        </li>
      {/each}
    </ul>

    <div class="docs__nav-footer">
      <a href="/dashboard/cms" class="docs__nav-dash">← Dashboard</a>
    </div>
  </nav>

  <!-- ── Content ──────────────────────────────────────────────────────────── -->
  <main class="docs__content">

    <!-- ── Quick start ──────────────────────────────────────────────────── -->
    <section id="quickstart" class="docs__section">
      <div class="docs__qs-header">
        <div class="docs__qs-eyebrow">Get up and running</div>
        <h1 class="docs__h1">Quick start</h1>
        <p class="docs__lead">
          Make your first API call in under 2 minutes.
          No SDK needed — just <code class="docs__code">fetch</code>.
        </p>
      </div>

      <div class="docs__steps">

        <div class="docs__step">
          <div class="docs__step-num">1</div>
          <div class="docs__step-body">
            <div class="docs__step-title">Get your public key</div>
            <p class="docs__step-desc">
              Go to <strong>Dashboard → select your site → API</strong>.
              Your public key (<code class="docs__code">pnd_pub_...</code>) is already generated.
              Copy it.
            </p>
          </div>
        </div>

        <div class="docs__step">
          <div class="docs__step-num">2</div>
          <div class="docs__step-body">
            <div class="docs__step-title">Find your site ID</div>
            <p class="docs__step-desc">
              It's in the URL when you're in the dashboard:
              <code class="docs__code">dashboard/cms?site=<strong>YOUR_SITE_ID</strong></code>
            </p>
          </div>
        </div>

        <div class="docs__step">
          <div class="docs__step-num">3</div>
          <div class="docs__step-body">
            <div class="docs__step-title">Make your first request</div>
          </div>
        </div>

      </div>

      <div class="docs__example docs__example--qs">
        <div class="docs__example-header">
          <span class="docs__example-label">JavaScript — fetch your content</span>
          <button class="docs__copy" onclick={() => copy(quickstartCode, 'qs')}>
            {copied === 'qs' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">const</span> SITE_ID  = <span class="docs__str">'YOUR_SITE_ID'</span>;
<span class="docs__kw">const</span> PUB_KEY  = <span class="docs__str">'pnd_pub_YOUR_KEY'</span>;
<span class="docs__kw">const</span> BASE_URL = <span class="docs__str">'https://api.foundiq.nl/v1'</span>;

<span class="docs__kw">function</span> <span class="docs__fn">headers</span>() {"{"}
  <span class="docs__kw">return</span> {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">`Bearer <span class="docs__tmpl">${"${"}PUB_KEY{"}"}</span>`</span> {"}"};
{"}"}

<span class="docs__comment">// 1. Fetch all collections</span>
<span class="docs__kw">const</span> res = <span class="docs__kw">await</span> <span class="docs__kw">fetch</span>(<span class="docs__str">`<span class="docs__tmpl">${"${"}BASE_URL{"}"}</span>/sites/<span class="docs__tmpl">${"${"}SITE_ID{"}"}</span>/collections`</span>, {"{"} headers: <span class="docs__fn">headers</span>() {"}"});
<span class="docs__kw">const</span> {"{"} data: collections {"}"} = <span class="docs__kw">await</span> res.json();

<span class="docs__comment">// 2. Fetch entries in a collection</span>
<span class="docs__kw">const</span> res2 = <span class="docs__kw">await</span> <span class="docs__kw">fetch</span>(<span class="docs__str">`<span class="docs__tmpl">${"${"}BASE_URL{"}"}</span>/sites/<span class="docs__tmpl">${"${"}SITE_ID{"}"}</span>/collections/products/entries`</span>, {"{"} headers: <span class="docs__fn">headers</span>() {"}"});
<span class="docs__kw">const</span> {"{"} data: products, meta {"}"} = <span class="docs__kw">await</span> res2.json();

console.log(<span class="docs__str">`Loaded <span class="docs__tmpl">${"${"}products.length{"}"}</span> of <span class="docs__tmpl">${"${"}meta.total{"}"}</span> products`</span>);</pre>
      </div>

      <div class="docs__qs-result">
        <div class="docs__qs-result-label">You'll get back</div>
        <pre class="docs__pre">{"{"}
  <span class="docs__key">"ok"</span>: <span class="docs__bool">true</span>,
  <span class="docs__key">"data"</span>: [
    {"{"} <span class="docs__key">"id"</span>: <span class="docs__str">"..."</span>, <span class="docs__key">"status"</span>: <span class="docs__str">"published"</span>, <span class="docs__key">"data"</span>: {"{"} <span class="docs__key">"name"</span>: <span class="docs__str">"Air Max 90"</span>, <span class="docs__key">"price"</span>: <span class="docs__num">120</span> {"}"} {"}"},
    ...
  ],
  <span class="docs__key">"meta"</span>: {"{"} <span class="docs__key">"total"</span>: <span class="docs__num">42</span>, <span class="docs__key">"limit"</span>: <span class="docs__num">20</span>, <span class="docs__key">"offset"</span>: <span class="docs__num">0</span>, <span class="docs__key">"has_more"</span>: <span class="docs__bool">true</span> {"}"}
{"}"}</pre>
      </div>

      <div class="docs__qs-next">
        <div class="docs__qs-next-label">What next?</div>
        <div class="docs__qs-links">
          <button class="docs__qs-link" onclick={() => scrollTo('authentication')}>
            <span class="docs__qs-link-icon">🔑</span>
            <span>Authentication →</span>
          </button>
          <button class="docs__qs-link" onclick={() => scrollTo('filtering')}>
            <span class="docs__qs-link-icon">🔍</span>
            <span>Filtering & search →</span>
          </button>
          <button class="docs__qs-link" onclick={() => scrollTo('decrement')}>
            <span class="docs__qs-link-icon">🛒</span>
            <span>Stock decrement →</span>
          </button>
          <button class="docs__qs-link" onclick={() => scrollTo('errors')}>
            <span class="docs__qs-link-icon">⚠️</span>
            <span>Error reference →</span>
          </button>
        </div>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Introduction -->
    <section id="introduction" class="docs__section">
      <div class="docs__section-intro">
        <div class="docs__tag">v1</div>
        <h2 class="docs__h2">Introduction</h2>
        <p class="docs__lead">
          The Foundiq delivery API lets you fetch your content from any frontend —
          Next.js, SvelteKit, vanilla JS, mobile apps, anywhere that can make an HTTP request.
          It's read-optimised, CORS-enabled, and cacheable by default.
        </p>
      </div>

      <div class="docs__cards">
        <div class="docs__card">
          <div class="docs__card-icon">🔑</div>
          <div>
            <div class="docs__card-title">Two key types</div>
            <div class="docs__card-desc">Public keys for browsers. Secret keys for servers.</div>
          </div>
        </div>
        <div class="docs__card">
          <div class="docs__card-icon">⚡</div>
          <div>
            <div class="docs__card-title">Cached responses</div>
            <div class="docs__card-desc">60s cache + stale-while-revalidate for fast delivery.</div>
          </div>
        </div>
        <div class="docs__card">
          <div class="docs__card-icon">🌍</div>
          <div>
            <div class="docs__card-title">CORS enabled</div>
            <div class="docs__card-desc">Call from any domain — no proxy needed.</div>
          </div>
        </div>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Authentication -->
    <section id="authentication" class="docs__section">
      <h2 class="docs__h2">Authentication</h2>
      <p class="docs__p">
        Every request requires a Bearer token in the <code class="docs__code">Authorization</code> header.
        Foundiq issues two types of token per site — choose the right one for your context.
      </p>

      <div class="docs__table-wrap">
        <table class="docs__table">
          <thead>
            <tr><th>Key type</th><th>Prefix</th><th>Where to use</th><th>Permissions</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span class="docs__badge docs__badge--pub">Public</span></td>
              <td><code class="docs__code">pnd_pub_</code></td>
              <td>Browser JS, mobile apps, public frontends</td>
              <td>Read published content, decrement stock</td>
            </tr>
            <tr>
              <td><span class="docs__badge docs__badge--sec">Secret</span></td>
              <td><code class="docs__code">pnd_sec_</code></td>
              <td>Server-side only — never in client code</td>
              <td>All public permissions + write entries</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Authorization header</span>
          <button class="docs__copy" onclick={() => copy('Authorization: Bearer pnd_pub_your_key_here', 'auth')}>
            {copied === 'auth' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="docs__pre">Authorization: Bearer pnd_pub_your_key_here</pre>
      </div>

      <div class="docs__callout docs__callout--warn">
        <strong>⚠ Never expose your secret key in client-side code.</strong>
        If compromised, rotate it immediately from <strong>Dashboard → API</strong>.
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Base URL -->
    <section id="base-url" class="docs__section">
      <h2 class="docs__h2">Base URL</h2>
      <p class="docs__p">All API requests are made to:</p>
      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Base URL</span>
          <button class="docs__copy" onclick={() => copy('https://api.foundiq.nl/v1', 'base')}>
            {copied === 'base' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="docs__pre">https://api.foundiq.nl/v1</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Collections -->
    <section id="collections" class="docs__section">
      <h2 class="docs__h2">Collections</h2>
      <p class="docs__p">
        Collections are the content types you define in the CMS — products, blog posts, FAQs etc.
        Returns all collections with published entry counts.
      </p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--get">GET</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/collections</code>
        <span class="docs__badge docs__badge--pub">Public</span>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Request</span>
          <button class="docs__copy" onclick={() => copy(`fetch('https://api.foundiq.nl/v1/sites/SITE_ID/collections', {
  headers: { 'Authorization': 'Bearer pnd_pub_YOUR_KEY' }
})`, 'col-req')}>{copied === 'col-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">fetch</span>(<span class="docs__str">'https://api.foundiq.nl/v1/sites/SITE_ID/collections'</span>, {"{"}
  headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">'Bearer pnd_pub_YOUR_KEY'</span> {"}"}
{"}"})</pre>
      </div>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Response 200</span></div>
        <pre class="docs__pre">{"{"}
  <span class="docs__key">"ok"</span>: <span class="docs__bool">true</span>,
  <span class="docs__key">"data"</span>: [
    {"{"}
      <span class="docs__key">"id"</span>: <span class="docs__str">"bbc36e1f-..."</span>,  <span class="docs__key">"name"</span>: <span class="docs__str">"products"</span>,
      <span class="docs__key">"label"</span>: <span class="docs__str">"Products"</span>,  <span class="docs__key">"color"</span>: <span class="docs__str">"#00d4ff"</span>,
      <span class="docs__key">"fields"</span>: [...],  <span class="docs__key">"entry_count"</span>: <span class="docs__num">42</span>
    {"}"}
  ]
{"}"}</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Entries list -->
    <section id="entries-list" class="docs__section">
      <h2 class="docs__h2">List entries</h2>
      <p class="docs__p">
        Returns published entries in a collection. Supports filtering, search, and pagination.
        Drafts are never returned.
      </p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--get">GET</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/collections/<em>:name</em>/entries</code>
        <span class="docs__badge docs__badge--pub">Public</span>
      </div>

      <div class="docs__params">
        <div class="docs__params-title">Query parameters</div>
        <div class="docs__table-wrap">
          <table class="docs__table">
            <thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code class="docs__code">limit</code></td><td>integer</td><td>20</td><td>Max entries. Maximum 100.</td></tr>
              <tr><td><code class="docs__code">offset</code></td><td>integer</td><td>0</td><td>Entries to skip.</td></tr>
              <tr><td><code class="docs__code">order</code></td><td>string</td><td>created_at</td><td><code class="docs__code">created_at</code> or <code class="docs__code">updated_at</code></td></tr>
              <tr><td><code class="docs__code">dir</code></td><td>string</td><td>desc</td><td><code class="docs__code">asc</code> or <code class="docs__code">desc</code></td></tr>
              <tr><td><code class="docs__code">search</code></td><td>string</td><td>—</td><td>Full-text search across all data fields.</td></tr>
              <tr><td><code class="docs__code">[field]</code></td><td>string</td><td>—</td><td>Filter by any data field. e.g. <code class="docs__code">?category=shoes</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Request</span>
          <button class="docs__copy" onclick={() => copy(`fetch('https://api.foundiq.nl/v1/sites/SITE_ID/collections/products/entries?limit=10&category=shoes', {
  headers: { 'Authorization': 'Bearer pnd_pub_YOUR_KEY' }
})`, 'list-req')}>{copied === 'list-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__comment">// Fetch 10 products in the "shoes" category</span>
<span class="docs__kw">fetch</span>(<span class="docs__str">'https://api.foundiq.nl/v1/sites/SITE_ID/collections/products/entries?limit=10&category=shoes'</span>, {"{"}
  headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">'Bearer pnd_pub_YOUR_KEY'</span> {"}"}
{"}"})</pre>
      </div>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Response 200</span></div>
        <pre class="docs__pre">{"{"}
  <span class="docs__key">"ok"</span>: <span class="docs__bool">true</span>,
  <span class="docs__key">"data"</span>: [
    {"{"}
      <span class="docs__key">"id"</span>: <span class="docs__str">"191b2302-..."</span>,  <span class="docs__key">"status"</span>: <span class="docs__str">"published"</span>,
      <span class="docs__key">"data"</span>: {"{"} <span class="docs__key">"name"</span>: <span class="docs__str">"Air Max 90"</span>, <span class="docs__key">"price"</span>: <span class="docs__num">120</span>, <span class="docs__key">"stock"</span>: <span class="docs__num">8</span> {"}"},
      <span class="docs__key">"created_at"</span>: <span class="docs__str">"2025-05-01T10:00:00Z"</span>
    {"}"}
  ],
  <span class="docs__key">"meta"</span>: {"{"} <span class="docs__key">"total"</span>: <span class="docs__num">42</span>, <span class="docs__key">"limit"</span>: <span class="docs__num">10</span>, <span class="docs__key">"offset"</span>: <span class="docs__num">0</span>, <span class="docs__key">"has_more"</span>: <span class="docs__bool">true</span> {"}"}
{"}"}</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Single entry -->
    <section id="entries-single" class="docs__section">
      <h2 class="docs__h2">Single entry</h2>
      <p class="docs__p">Returns a single published entry by ID.</p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--get">GET</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/collections/<em>:name</em>/entries/<em>:entryId</em></code>
        <span class="docs__badge docs__badge--pub">Public</span>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Request</span>
          <button class="docs__copy" onclick={() => copy(`fetch('https://api.foundiq.nl/v1/sites/SITE_ID/collections/products/entries/ENTRY_ID', {
  headers: { 'Authorization': 'Bearer pnd_pub_YOUR_KEY' }
})`, 'single-req')}>{copied === 'single-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">fetch</span>(<span class="docs__str">'https://api.foundiq.nl/v1/sites/SITE_ID/collections/products/entries/ENTRY_ID'</span>, {"{"}
  headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">'Bearer pnd_pub_YOUR_KEY'</span> {"}"}
{"}"})</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Create entry -->
    <section id="entries-create" class="docs__section">
      <h2 class="docs__h2">Create entry</h2>
      <p class="docs__p">
        Write an entry from an external system — contact forms, newsletter signups,
        order records, reviews, or any structured data you want in the CMS.
        Requires a <strong>secret key</strong>. Collection is auto-created if it doesn't exist.
      </p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--post">POST</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/collections/<em>:name</em>/entries</code>
        <span class="docs__badge docs__badge--sec">Secret</span>
      </div>

      <div class="docs__params">
        <div class="docs__params-title">Request body</div>
        <div class="docs__table-wrap">
          <table class="docs__table">
            <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code class="docs__code">data</code></td><td>object</td><td>✓</td><td>Your entry data — any JSON object.</td></tr>
              <tr><td><code class="docs__code">status</code></td><td>string</td><td></td><td><code class="docs__code">"published"</code> (default) or <code class="docs__code">"draft"</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Contact form — server-side handler</span>
          <button class="docs__copy" onclick={() => copy(`await fetch('https://api.foundiq.nl/v1/sites/SITE_ID/collections/contact/entries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer pnd_sec_YOUR_SECRET_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    data: {
      name:    'Ada Lovelace',
      email:   'ada@example.com',
      message: 'Hello, I have a question...',
    }
  })
})`, 'create-req')}>{copied === 'create-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">await</span> <span class="docs__kw">fetch</span>(<span class="docs__str">'https://api.foundiq.nl/v1/sites/SITE_ID/collections/contact/entries'</span>, {"{"}
  method: <span class="docs__str">'POST'</span>,
  headers: {"{"}
    <span class="docs__str">'Authorization'</span>: <span class="docs__str">'Bearer pnd_sec_YOUR_SECRET_KEY'</span>,
    <span class="docs__str">'Content-Type'</span>: <span class="docs__str">'application/json'</span>,
  {"}"},
  body: <span class="docs__kw">JSON</span>.stringify({"{"}
    data: {"{"}
      name:    <span class="docs__str">'Ada Lovelace'</span>,
      email:   <span class="docs__str">'ada@example.com'</span>,
      message: <span class="docs__str">'Hello, I have a question...'</span>,
    {"}"}
  {"}"})
{"}"})</pre>
      </div>

      <div class="docs__callout">
        The submission instantly appears in your CMS dashboard under the <strong>contact</strong> collection.
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Decrement -->
    <section id="decrement" class="docs__section">
      <h2 class="docs__h2">Decrement stock</h2>
      <p class="docs__p">
        Atomically decrements a numeric field — typically <code class="docs__code">stock</code>.
        Call this from your payment webhook after a successful checkout.
        Idempotent — passing the same <code class="docs__code">order_id</code> twice never double-decrements.
      </p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--post">POST</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/collections/<em>:name</em>/entries/<em>:entryId</em>/decrement</code>
        <span class="docs__badge docs__badge--pub">Public</span>
      </div>

      <div class="docs__params">
        <div class="docs__params-title">Request body</div>
        <div class="docs__table-wrap">
          <table class="docs__table">
            <thead><tr><th>Field</th><th>Type</th><th>Required</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code class="docs__code">order_id</code></td><td>string</td><td>✓</td><td>Your payment provider's charge ID. Used for idempotency.</td></tr>
              <tr><td><code class="docs__code">quantity</code></td><td>integer</td><td></td><td>How much to decrement. Default: 1.</td></tr>
              <tr><td><code class="docs__code">field</code></td><td>string</td><td></td><td>Which field to decrement. Default: <code class="docs__code">"stock"</code>.</td></tr>
              <tr><td><code class="docs__code">order_data</code></td><td>object</td><td></td><td>Extra data stored on the order record.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Stripe webhook handler</span>
          <button class="docs__copy" onclick={() => copy(`const charge = event.data.object;

const res = await fetch(
  \`https://api.foundiq.nl/v1/sites/\${SITE_ID}/collections/products/entries/\${productId}/decrement\`,
  {
    method: 'POST',
    headers: { 'Authorization': \`Bearer \${PUB_KEY}\`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id:   charge.id,
      quantity:   1,
      order_data: { customer_email: charge.billing_details.email, amount: charge.amount }
    })
  }
);

const { ok, remaining, code } = await res.json();
if (!ok && code === 'OUT_OF_STOCK') { /* refund */ }`, 'dec-req')}>{copied === 'dec-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">const</span> charge = event.data.object;

<span class="docs__kw">const</span> res = <span class="docs__kw">await</span> <span class="docs__kw">fetch</span>(
  <span class="docs__str">`https://api.foundiq.nl/v1/sites/<span class="docs__tmpl">${"${"}SITE_ID{"}"}</span>/collections/products/entries/<span class="docs__tmpl">${"${"}productId{"}"}</span>/decrement`</span>,
  {"{"}
    method: <span class="docs__str">'POST'</span>,
    headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">`Bearer <span class="docs__tmpl">${"${"}PUB_KEY{"}"}</span>`</span>, <span class="docs__str">'Content-Type'</span>: <span class="docs__str">'application/json'</span> {"}"},
    body: <span class="docs__kw">JSON</span>.stringify({"{"}
      order_id:   charge.id,
      quantity:   <span class="docs__num">1</span>,
      order_data: {"{"} customer_email: charge.billing_details.email, amount: charge.amount {"}"}
    {"}"})
  {"}"}
);

<span class="docs__kw">const</span> {"{"} ok, remaining, code {"}"} = <span class="docs__kw">await</span> res.json();
<span class="docs__kw">if</span> (!ok && code === <span class="docs__str">'OUT_OF_STOCK'</span>) {"{"} <span class="docs__comment">/* refund */</span> {"}"}</pre>
      </div>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Response 200 — success</span></div>
        <pre class="docs__pre">{"{"} <span class="docs__key">"ok"</span>: <span class="docs__bool">true</span>, <span class="docs__key">"remaining"</span>: <span class="docs__num">7</span> {"}"}</pre>
      </div>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Response 409 — out of stock</span></div>
        <pre class="docs__pre">{"{"} <span class="docs__key">"ok"</span>: <span class="docs__bool">false</span>, <span class="docs__key">"code"</span>: <span class="docs__str">"OUT_OF_STOCK"</span>, <span class="docs__key">"remaining"</span>: <span class="docs__num">0</span> {"}"}</pre>
      </div>

      <div class="docs__callout">
        Every successful decrement creates an order record in an <strong>_orders</strong> collection
        visible in your CMS dashboard.
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Media list -->
    <section id="media-list" class="docs__section">
      <h2 class="docs__h2">List media files</h2>
      <p class="docs__p">Returns media files uploaded to a site. Filter by MIME type prefix.</p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--get">GET</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/media</code>
        <span class="docs__badge docs__badge--pub">Public</span>
      </div>

      <div class="docs__params">
        <div class="docs__params-title">Query parameters</div>
        <div class="docs__table-wrap">
          <table class="docs__table">
            <thead><tr><th>Parameter</th><th>Description</th></tr></thead>
            <tbody>
              <tr><td><code class="docs__code">mime_type</code></td><td>Filter by MIME type. <code class="docs__code">image/</code> matches all images.</td></tr>
              <tr><td><code class="docs__code">name</code></td><td>Filter by exact filename.</td></tr>
              <tr><td><code class="docs__code">limit</code>, <code class="docs__code">offset</code></td><td>Pagination.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Fetch all images</span>
          <button class="docs__copy" onclick={() => copy(`fetch('https://api.foundiq.nl/v1/sites/SITE_ID/media?mime_type=image/', {
  headers: { 'Authorization': 'Bearer pnd_pub_YOUR_KEY' }
})`, 'media-req')}>{copied === 'media-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">fetch</span>(<span class="docs__str">'https://api.foundiq.nl/v1/sites/SITE_ID/media?mime_type=image/'</span>, {"{"}
  headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">'Bearer pnd_pub_YOUR_KEY'</span> {"}"}
{"}"})</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Media single -->
    <section id="media-single" class="docs__section">
      <h2 class="docs__h2">Single media file</h2>
      <p class="docs__p">Fetch a single media file by its filename.</p>

      <div class="docs__endpoint">
        <span class="docs__method docs__method--get">GET</span>
        <code class="docs__path">/v1/sites/<em>:siteId</em>/media/<em>:filename</em></code>
        <span class="docs__badge docs__badge--pub">Public</span>
      </div>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Request</span>
          <button class="docs__copy" onclick={() => copy(`fetch('https://api.foundiq.nl/v1/sites/SITE_ID/media/hero-banner.jpg', {
  headers: { 'Authorization': 'Bearer pnd_pub_YOUR_KEY' }
})`, 'msingle-req')}>{copied === 'msingle-req' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">fetch</span>(<span class="docs__str">'https://api.foundiq.nl/v1/sites/SITE_ID/media/hero-banner.jpg'</span>, {"{"}
  headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">'Bearer pnd_pub_YOUR_KEY'</span> {"}"}
{"}"})</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Filtering -->
    <section id="filtering" class="docs__section">
      <h2 class="docs__h2">Filtering & search</h2>
      <p class="docs__p">
        Filter entries by any field in their <code class="docs__code">data</code> object.
        Multiple filters combine with AND.
      </p>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Field filter</span></div>
        <pre class="docs__pre"><span class="docs__comment">// ?category=shoes&brand=nike → data.category = 'shoes' AND data.brand = 'nike'</span>
GET /v1/sites/SITE_ID/collections/products/entries?category=shoes&brand=nike</pre>
      </div>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Full-text search</span></div>
        <pre class="docs__pre"><span class="docs__comment">// Searches across ALL fields in data</span>
GET /v1/sites/SITE_ID/collections/products/entries?search=running+shoe</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Pagination -->
    <section id="pagination" class="docs__section">
      <h2 class="docs__h2">Pagination</h2>
      <p class="docs__p">
        All list endpoints return a <code class="docs__code">meta</code> object.
        Use <code class="docs__code">has_more</code> to know when to stop.
      </p>

      <div class="docs__example">
        <div class="docs__example-header">
          <span class="docs__example-label">Fetch all entries</span>
          <button class="docs__copy" onclick={() => copy(`async function fetchAll(siteId, collection, token) {
  const results = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(
      \`https://api.foundiq.nl/v1/sites/\${siteId}/collections/\${collection}/entries?limit=\${limit}&offset=\${offset}\`,
      { headers: { 'Authorization': \`Bearer \${token}\` } }
    );
    const { data, meta } = await res.json();
    results.push(...data);
    if (!meta.has_more) break;
    offset += limit;
  }
  return results;
}`, 'pagination')}>{copied === 'pagination' ? '✓ Copied' : 'Copy'}</button>
        </div>
        <pre class="docs__pre"><span class="docs__kw">async function</span> <span class="docs__fn">fetchAll</span>(siteId, collection, token) {"{"}
  <span class="docs__kw">const</span> results = [];
  <span class="docs__kw">let</span> offset = <span class="docs__num">0</span>;
  <span class="docs__kw">const</span> limit  = <span class="docs__num">100</span>;

  <span class="docs__kw">while</span> (<span class="docs__bool">true</span>) {"{"}
    <span class="docs__kw">const</span> res = <span class="docs__kw">await</span> <span class="docs__kw">fetch</span>(
      <span class="docs__str">`https://api.foundiq.nl/v1/sites/<span class="docs__tmpl">${"${"}siteId{"}"}</span>/collections/<span class="docs__tmpl">${"${"}collection{"}"}</span>/entries?limit=<span class="docs__tmpl">${"${"}limit{"}"}</span>&offset=<span class="docs__tmpl">${"${"}offset{"}"}</span>`</span>,
      {"{"} headers: {"{"} <span class="docs__str">'Authorization'</span>: <span class="docs__str">`Bearer <span class="docs__tmpl">${"${"}token{"}"}</span>`</span> {"}"} {"}"}
    );
    <span class="docs__kw">const</span> {"{"} data, meta {"}"} = <span class="docs__kw">await</span> res.json();
    results.push(...data);
    <span class="docs__kw">if</span> (!meta.has_more) <span class="docs__kw">break</span>;
    offset += limit;
  {"}"}
  <span class="docs__kw">return</span> results;
{"}"}</pre>
      </div>
    </section>

    <div class="docs__divider"></div>

    <!-- Errors -->
    <section id="errors" class="docs__section">
      <h2 class="docs__h2">Error reference</h2>
      <p class="docs__p">All errors return a consistent shape with a <code class="docs__code">code</code> you can match on.</p>

      <div class="docs__example">
        <div class="docs__example-header"><span class="docs__example-label">Error shape</span></div>
        <pre class="docs__pre">{"{"} <span class="docs__key">"ok"</span>: <span class="docs__bool">false</span>, <span class="docs__key">"code"</span>: <span class="docs__str">"NOT_FOUND"</span>, <span class="docs__key">"message"</span>: <span class="docs__str">"Collection \"products\" not found."</span> {"}"}</pre>
      </div>

      <div class="docs__table-wrap">
        <table class="docs__table">
          <thead><tr><th>HTTP</th><th>Code</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td>401</td><td><code class="docs__code">MISSING_TOKEN</code></td><td>No Authorization header.</td></tr>
            <tr><td>401</td><td><code class="docs__code">INVALID_TOKEN</code></td><td>Token invalid or revoked.</td></tr>
            <tr><td>403</td><td><code class="docs__code">FORBIDDEN</code></td><td>Token has no access to this site.</td></tr>
            <tr><td>403</td><td><code class="docs__code">SECRET_KEY_REQUIRED</code></td><td>Endpoint requires a secret key.</td></tr>
            <tr><td>404</td><td><code class="docs__code">NOT_FOUND</code></td><td>Collection, entry, or file not found.</td></tr>
            <tr><td>409</td><td><code class="docs__code">OUT_OF_STOCK</code></td><td>Insufficient stock for decrement.</td></tr>
            <tr><td>200</td><td><code class="docs__code">ALREADY_PROCESSED</code></td><td>order_id already decremented.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <div class="docs__footer">
      <p>Something missing or wrong? <a href="mailto:info@myelinsystems.com">info@myelinsystems.com</a></p>
    </div>

  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Geist:wght@300;400;500;600;700&display=swap');

  :root {
    --bg:       #080c14;
    --surface:  #0d1320;
    --border:   #1a2640;
    --border-hi:#243550;
    --text:     #d4e4f7;
    --text-2:   #7a9cbd;
    --text-3:   #3d5a78;
    --amber:    #f5a623;
    --cyan:     #00d4ff;
    --green:    #00e896;
    --red:      #ff4466;
    --mono:     'IBM Plex Mono', monospace;
    --sans:     'Geist', system-ui, sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .docs {
    display: flex; min-height: 100vh;
    background: var(--bg); color: var(--text);
    font-family: var(--sans);
  }

  /* ── Sidebar ── */
  .docs__nav {
    width: 240px; flex-shrink: 0;
    border-right: 1px solid var(--border);
    position: sticky; top: 0; height: 100vh;
    display: flex; flex-direction: column;
    overflow-y: auto; padding: 24px 0;
  }
  .docs__nav-logo  { padding: 0 20px 20px; border-bottom: 1px solid var(--border); }
  .docs__nav-brand { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: var(--text); text-decoration: none; margin-bottom: 6px; }
  .docs__nav-mark  { width: 22px; height: 22px; background: var(--amber); border-radius: 5px; flex-shrink: 0; box-shadow: 0 0 12px rgba(245,166,35,0.4); }
  .docs__nav-label { font-size: 11px; color: var(--text-3); font-weight: 500; letter-spacing: 0.06em; }

  .docs__nav-list { flex: 1; list-style: none; padding: 16px 12px; display: flex; flex-direction: column; gap: 2px; }

  .docs__nav-item {
    display: block; width: 100%; padding: 7px 10px; border-radius: 7px;
    background: none; border: none; text-align: left;
    font-size: 13px; color: var(--text-2); font-family: var(--sans); cursor: pointer; transition: all 0.12s;
  }
  .docs__nav-item:hover        { background: rgba(255,255,255,0.04); color: var(--text); }
  .docs__nav-item--active      { background: rgba(245,166,35,0.08); color: var(--amber); font-weight: 500; }
  .docs__nav-item--qs          { font-weight: 600; }

  .docs__nav-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
  .docs__nav-dash   { font-size: 12px; color: var(--text-3); text-decoration: none; transition: color 0.12s; }
  .docs__nav-dash:hover { color: var(--text-2); }

  /* ── Content ── */
  .docs__content { flex: 1; max-width: 820px; padding: 60px 64px 120px; overflow-y: auto; }
  .docs__section  { margin-bottom: 0; }

  /* Quick start */
  .docs__qs-header   { margin-bottom: 32px; }
  .docs__qs-eyebrow  { font-size: 11px; font-weight: 600; color: var(--amber); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 10px; }

  .docs__steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 24px; }
  .docs__step  {
    display: flex; gap: 16px; align-items: flex-start;
    padding: 16px 0; border-bottom: 1px solid var(--border);
  }
  .docs__step:last-child { border-bottom: none; }
  .docs__step-num {
    width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
    background: rgba(245,166,35,0.12); border: 1px solid rgba(245,166,35,0.3);
    color: var(--amber); font-size: 12px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
  }
  .docs__step-title { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .docs__step-desc  { font-size: 13px; color: var(--text-2); line-height: 1.6; }

  .docs__example--qs { border-color: rgba(245,166,35,0.2); }

  .docs__qs-result { margin-top: 16px; }
  .docs__qs-result-label { font-size: 11px; font-weight: 600; color: var(--text-3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }

  .docs__qs-next { margin-top: 24px; }
  .docs__qs-next-label { font-size: 11px; font-weight: 600; color: var(--text-3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 12px; }
  .docs__qs-links { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .docs__qs-link {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 14px; background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; font-size: 13px; color: var(--text-2); font-family: var(--sans);
    cursor: pointer; transition: all 0.12s; text-align: left;
  }
  .docs__qs-link:hover { border-color: var(--amber); color: var(--text); }
  .docs__qs-link-icon  { font-size: 16px; }

  /* Typography */
  .docs__section-intro { margin-bottom: 32px; }
  .docs__tag  { display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 3px 8px; border-radius: 4px; background: rgba(245,166,35,0.1); color: var(--amber); border: 1px solid rgba(245,166,35,0.2); margin-bottom: 16px; }
  .docs__h1   { font-size: 36px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 16px; }
  .docs__h2   { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 16px; }
  .docs__lead { font-size: 16px; color: var(--text-2); line-height: 1.7; }
  .docs__p    { font-size: 14px; color: var(--text-2); line-height: 1.8; margin-bottom: 20px; }
  .docs__divider { height: 1px; background: var(--border); margin: 48px 0; }

  /* Cards */
  .docs__cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; margin-top: 28px; }
  .docs__card  { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; }
  .docs__card-icon  { font-size: 20px; flex-shrink: 0; }
  .docs__card-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .docs__card-desc  { font-size: 12px; color: var(--text-2); line-height: 1.5; }

  /* Endpoint */
  .docs__endpoint { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 20px; font-family: var(--mono); }
  .docs__method     { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; padding: 3px 8px; border-radius: 4px; flex-shrink: 0; }
  .docs__method--get  { background: rgba(0,232,150,0.1); color: var(--green); }
  .docs__method--post { background: rgba(0,212,255,0.1); color: var(--cyan); }
  .docs__path { font-size: 13px; color: var(--text); flex: 1; }
  .docs__path em { color: var(--text-2); font-style: normal; }

  /* Badges */
  .docs__badge      { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
  .docs__badge--pub { background: rgba(0,212,255,0.08); color: var(--cyan); border: 1px solid rgba(0,212,255,0.2); }
  .docs__badge--sec { background: rgba(245,166,35,0.08); color: var(--amber); border: 1px solid rgba(245,166,35,0.2); }

  /* Code */
  .docs__code { font-family: var(--mono); font-size: 12px; background: rgba(255,255,255,0.06); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; color: var(--cyan); }

  /* Examples */
  .docs__example        { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
  .docs__example-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 16px; border-bottom: 1px solid var(--border); background: rgba(255,255,255,0.02); }
  .docs__example-label  { font-size: 11px; font-weight: 600; color: var(--text-3); letter-spacing: 0.06em; text-transform: uppercase; }
  .docs__copy           { font-size: 11px; color: var(--text-3); background: none; border: none; cursor: pointer; font-family: var(--sans); transition: color 0.12s; }
  .docs__copy:hover     { color: var(--text-2); }

  .docs__pre { padding: 18px 20px; font-family: var(--mono); font-size: 12.5px; line-height: 1.8; color: var(--text-2); overflow-x: auto; white-space: pre; }

  /* Syntax */
  .docs__kw      { color: #c792ea; }
  .docs__str     { color: #c3e88d; }
  .docs__num     { color: #f78c6c; }
  .docs__bool    { color: #89ddff; }
  .docs__key     { color: #82aaff; }
  .docs__fn      { color: #82aaff; }
  .docs__comment { color: var(--text-3); font-style: italic; }
  .docs__tmpl    { color: #f78c6c; }

  /* Params */
  .docs__params       { margin-bottom: 20px; }
  .docs__params-title { font-size: 12px; font-weight: 600; color: var(--text-3); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 10px; }

  /* Table */
  .docs__table-wrap { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 20px; }
  .docs__table      { width: 100%; border-collapse: collapse; font-size: 13px; }
  .docs__table thead tr { background: var(--surface); border-bottom: 1px solid var(--border); }
  .docs__table th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-3); letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
  .docs__table td { padding: 11px 14px; border-bottom: 1px solid var(--border); color: var(--text-2); vertical-align: top; }
  .docs__table tr:last-child td { border-bottom: none; }
  .docs__table tr:hover td { background: rgba(255,255,255,0.02); }

  /* Callouts */
  .docs__callout       { padding: 14px 16px; border-radius: 8px; font-size: 13px; line-height: 1.6; background: rgba(0,212,255,0.04); border: 1px solid rgba(0,212,255,0.15); color: var(--text-2); margin-top: 16px; }
  .docs__callout strong { color: var(--text); }
  .docs__callout--warn  { background: rgba(245,166,35,0.04); border-color: rgba(245,166,35,0.2); }

  /* Footer */
  .docs__footer   { margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--border); text-align: center; }
  .docs__footer p { font-size: 13px; color: var(--text-3); }
  .docs__footer a { color: var(--amber); }

  @media (max-width: 900px) {
    .docs__nav      { display: none; }
    .docs__content  { padding: 32px 24px 80px; }
    .docs__cards    { grid-template-columns: 1fr; }
    .docs__qs-links { grid-template-columns: 1fr; }
  }
</style>