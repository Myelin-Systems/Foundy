<script lang="ts">
  import '../app.css';
  import { goto } from '$app/navigation';
  import type { SessionPayload } from '$lib/server/services/auth/TokenService';

  const { data, children } = $props<{
    data: { session: SessionPayload | null };
    children: any;
  }>();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    goto('/login');
  }
</script>

<div class="shell">
  {#if data.session}
    <nav class="nav">
      <a href="/dashboard" class="nav-logo">
        <span class="logo-box"></span>
        <span>Myelin</span>
      </a>
      <div class="nav-right">
        <span class="nav-user">{data.session.email}</span>
        <button class="nav-logout" onclick={logout}>Sign out</button>
      </div>
    </nav>
  {/if}

  <main class="main" class:has-nav={!!data.session}>
    {@render children()}
  </main>
</div>

<style>
  .shell   { display: flex; flex-direction: column; min-height: 100vh; }

  .nav {
    height: 56px;
    border-bottom: 1px solid #1e2d42;
    display: flex;
    align-items: center;
    padding: 0 28px;
    gap: 16px;
    position: sticky;
    top: 0;
    z-index: 50;
    background: rgba(7,11,18,0.92);
    backdrop-filter: blur(12px);
  }
  .nav-logo {
    display: flex; align-items: center; gap: 10px;
    font-weight: 600; font-size: 15px;
    color: #00d4ff;
  }
  .logo-box {
    width: 24px; height: 24px;
    background: #00d4ff;
    border-radius: 5px;
    opacity: 0.9;
  }
  .nav-right {
    margin-left: auto;
    display: flex; align-items: center; gap: 16px;
  }
  .nav-user  { font-size: 13px; color: #5a7a9a; }
  .nav-logout {
    font-size: 13px; font-weight: 500;
    color: #5a7a9a;
    background: none; border: none; cursor: pointer;
    padding: 4px 0;
    transition: color 0.15s;
  }
  .nav-logout:hover { color: #c8d8eb; }

  .main         { flex: 1; }
  .main.has-nav { padding-top: 0; }
</style>
