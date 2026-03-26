<script lang="ts">
  const { data } = $props<{
    data: {
      session:        { sub: string; email: string; role: string; oid?: string };
      activeSessions: number;
      busStatus:      Array<{ name: string; state: string; runtime: string; version: string; uptime: number }>;
    };
  }>();

  function uptime(secs: number): string {
    if (secs < 60)   return `${secs}s`;
    if (secs < 3600) return `${Math.floor(secs / 60)}m`;
    return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  }

  const stateColor: Record<string, string> = {
    active:     '#00ff9d',
    activating: '#ffbb00',
    idle:       '#5a7a9a',
    error:      '#ff4466',
    registered: '#5a7a9a',
  };
</script>

<svelte:head><title>Dashboard — Myelin</title></svelte:head>

<div class="page">
  <section class="hero">
    <div class="hero-label">Dashboard</div>
    <h1 class="hero-title">Hello, <span class="accent">{data.session.email.split('@')[0]}</span></h1>
    <p class="hero-sub">Logged in as <strong>{data.session.role}</strong>.</p>
  </section>

  <div class="stats">
    <div class="stat">
      <div class="stat-value accent">{data.activeSessions}</div>
      <div class="stat-label">Active sessions</div>
    </div>
    <div class="stat">
      <div class="stat-value">{data.busStatus.filter(s => s.state === 'active').length}</div>
      <div class="stat-label">Services active</div>
    </div>
    <div class="stat">
      <div class="stat-value">{data.session.role}</div>
      <div class="stat-label">Role</div>
    </div>
    <div class="stat">
      <div class="stat-value mono dim" title={data.session.sub}>{data.session.sub.slice(0, 8)}…</div>
      <div class="stat-label">User ID</div>
    </div>
  </div>

  <section class="section">
    <div class="section-header">
      <div class="section-title">Service Bus</div>
      <div class="section-badge">{data.busStatus.length} registered</div>
    </div>
    <div class="service-grid">
      {#each data.busStatus as svc}
        <div class="svc-card" class:active={svc.state === 'active'}>
          <div class="svc-top">
            <div class="svc-dot" style="background:{stateColor[svc.state] ?? '#5a7a9a'}"></div>
            <div class="svc-name">{svc.name}</div>
            <div class="svc-version">{svc.version}</div>
          </div>
          <div class="svc-bottom">
            <span class="svc-state">{svc.state}</span>
            {#if svc.uptime > 0}<span class="svc-uptime">↑ {uptime(svc.uptime)}</span>{/if}
            <span class="svc-runtime">{svc.runtime}</span>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <section class="section">
    <div class="section-header"><div class="section-title">Quick actions</div></div>
    <div class="actions">
      <a href="/dashboard/settings" class="action-card">
        <div class="action-icon">⚙</div>
        <div class="action-text">
          <div class="action-title">Settings</div>
          <div class="action-desc">Change password, manage account</div>
        </div>
        <div class="action-arrow">→</div>
      </a>
      <a href="/api/health" target="_blank" class="action-card">
        <div class="action-icon">◉</div>
        <div class="action-text">
          <div class="action-title">Health check</div>
          <div class="action-desc">View service health endpoint</div>
        </div>
        <div class="action-arrow">↗</div>
      </a>
    </div>
  </section>
</div>

<style>
  .page { max-width: 900px; margin: 0 auto; padding: 40px 28px 80px; display: flex; flex-direction: column; gap: 40px; }
  .hero-label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #3d5a78; margin-bottom: 8px; }
  .hero-title { font-size: clamp(26px, 4vw, 36px); font-weight: 300; color: #c8d8eb; margin-bottom: 8px; }
  .hero-sub   { font-size: 15px; color: #5a7a9a; }
  .accent     { color: #00d4ff; font-weight: 500; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .stat { background: #0d1420; border: 1px solid #1e2d42; border-radius: 12px; padding: 20px 18px; }
  .stat-value { font-size: 22px; font-weight: 600; color: #c8d8eb; margin-bottom: 4px; }
  .stat-label { font-size: 12px; color: #5a7a9a; }
  .mono { font-family: 'Space Mono', monospace; }
  .dim  { color: #5a7a9a !important; font-size: 16px !important; }
  .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .section-title  { font-size: 14px; font-weight: 600; color: #8aa8c4; }
  .section-badge  { font-size: 11px; padding: 2px 8px; background: #111927; border: 1px solid #1e2d42; border-radius: 20px; color: #5a7a9a; }
  .service-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 8px; }
  .svc-card { background: #0d1420; border: 1px solid #1a2535; border-radius: 10px; padding: 14px 14px 12px; }
  .svc-card.active { border-color: #1e3a50; }
  .svc-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .svc-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .svc-name { font-size: 13px; font-weight: 600; color: #c8d8eb; flex: 1; }
  .svc-version { font-size: 10px; color: #3d5a78; }
  .svc-bottom { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .svc-state, .svc-uptime, .svc-runtime { font-size: 10px; padding: 1px 6px; border-radius: 4px; background: #111927; color: #5a7a9a; }
  .svc-uptime { color: #3d8060; }
  .actions { display: flex; flex-direction: column; gap: 8px; }
  .action-card { display: flex; align-items: center; gap: 16px; padding: 16px 18px; background: #0d1420; border: 1px solid #1e2d42; border-radius: 12px; transition: all 0.15s; }
  .action-card:hover { border-color: #2a4060; background: #111927; }
  .action-icon  { font-size: 18px; color: #5a7a9a; width: 24px; text-align: center; }
  .action-text  { flex: 1; }
  .action-title { font-size: 14px; font-weight: 500; color: #c8d8eb; margin-bottom: 2px; }
  .action-desc  { font-size: 12px; color: #5a7a9a; }
  .action-arrow { color: #3d5a78; font-size: 16px; }
</style>
