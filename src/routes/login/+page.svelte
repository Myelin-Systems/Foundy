<script lang="ts">
  import { goto } from '$app/navigation';

  let mode = $state<'login' | 'register'>('login');
  let loading = $state(false);
  let error   = $state('');

  let loginEmail    = $state('');
  let loginPassword = $state('');

  let regEmail    = $state('');
  let regPassword = $state('');
  let regName     = $state('');

  function clearError() { error = ''; }

  async function handleLogin() {
    if (!loginEmail || !loginPassword) { error = 'Please fill in all fields.'; return; }
    loading = true; error = '';
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!data.ok) { error = data.message; return; }
      goto('/dashboard');
    } catch { error = 'Network error. Please try again.'; }
    finally  { loading = false; }
  }

  async function handleRegister() {
    if (!regEmail || !regPassword || !regName) { error = 'Please fill in all fields.'; return; }
    loading = true; error = '';
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: regEmail, password: regPassword, fullName: regName }),
      });
      const data = await res.json();
      if (!data.ok) { error = data.message; return; }
      goto('/dashboard');
    } catch { error = 'Network error. Please try again.'; }
    finally  { loading = false; }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') mode === 'login' ? handleLogin() : handleRegister();
  }

  function switchMode(m: 'login' | 'register') {
    mode = m; error = '';
  }
</script>

<svelte:head><title>{mode === 'login' ? 'Sign in' : 'Create account'} — Myelin</title></svelte:head>

<div class="page" onkeydown={handleKeydown} role="presentation">
  <div class="bg-grid" aria-hidden="true"></div>
  <div class="bg-glow"  aria-hidden="true"></div>

  <div class="card">
    <div class="logo">
      <div class="logo-mark"></div>
      <span class="logo-text">Myelin</span>
    </div>

    <div class="tabs" role="tablist">
      <button role="tab" aria-selected={mode === 'login'}
        class="tab" class:active={mode === 'login'}
        onclick={() => switchMode('login')}>Sign in</button>
      <button role="tab" aria-selected={mode === 'register'}
        class="tab" class:active={mode === 'register'}
        onclick={() => switchMode('register')}>Create account</button>
    </div>

    {#if error}
      <div class="error" role="alert">{error}</div>
    {/if}

    {#if mode === 'login'}
      <div class="form" role="tabpanel">
        <label class="field">
          <span class="field-label">Email</span>
          <input class="input" type="email" placeholder="you@example.com"
            autocomplete="email" bind:value={loginEmail}
            oninput={clearError} disabled={loading} />
        </label>
        <label class="field">
          <span class="field-label">Password</span>
          <input class="input" type="password" placeholder="••••••••"
            autocomplete="current-password" bind:value={loginPassword}
            oninput={clearError} disabled={loading} />
        </label>
        <button class="btn" onclick={handleLogin} disabled={loading}>
          {#if loading}<span class="spinner" aria-hidden="true"></span>{/if}
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </div>
    {:else}
      <div class="form" role="tabpanel">
        <label class="field">
          <span class="field-label">Full name</span>
          <input class="input" type="text" placeholder="Ada Lovelace"
            autocomplete="name" bind:value={regName}
            oninput={clearError} disabled={loading} />
        </label>
        <label class="field">
          <span class="field-label">Email</span>
          <input class="input" type="email" placeholder="you@example.com"
            autocomplete="email" bind:value={regEmail}
            oninput={clearError} disabled={loading} />
        </label>
        <label class="field">
          <span class="field-label">Password <span class="hint">min 8 characters</span></span>
          <input class="input" type="password" placeholder="••••••••"
            autocomplete="new-password" bind:value={regPassword}
            oninput={clearError} disabled={loading} />
        </label>
        <button class="btn" onclick={handleRegister} disabled={loading}>
          {#if loading}<span class="spinner" aria-hidden="true"></span>{/if}
          {loading ? 'Creating account…' : 'Create account'}
        </button>
        <p class="terms">
          By creating an account you agree to our
          <a href="/terms">Terms of Service</a> and
          <a href="/privacy">Privacy Policy</a>.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }
  .bg-grid {
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
    background-size: 48px 48px;
    pointer-events: none;
  }
  .bg-glow {
    position: fixed; top: -20%; left: 50%; transform: translateX(-50%);
    width: 600px; height: 400px;
    background: radial-gradient(ellipse, rgba(0,212,255,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
  .card {
    position: relative; width: 100%; max-width: 400px;
    background: #0d1420; border: 1px solid #1e2d42; border-radius: 16px;
    padding: 36px 32px 32px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
  .logo-mark {
    width: 30px; height: 30px; background: #00d4ff; border-radius: 7px;
    opacity: 0.9; box-shadow: 0 0 16px rgba(0,212,255,0.35);
  }
  .logo-text { font-size: 17px; font-weight: 600; color: #00d4ff; letter-spacing: 0.02em; }
  .tabs {
    display: flex; margin-bottom: 24px;
    background: #111927; border-radius: 8px; padding: 3px;
  }
  .tab {
    flex: 1; padding: 8px 12px; border-radius: 6px; border: none;
    background: transparent; color: #5a7a9a; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: all 0.15s; font-family: inherit;
  }
  .tab:hover { color: #c8d8eb; }
  .tab.active { background: #1e2d42; color: #c8d8eb; box-shadow: 0 1px 4px rgba(0,0,0,0.4); }
  .error {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 14px; margin-bottom: 18px;
    background: rgba(255,68,102,0.08); border: 1px solid rgba(255,68,102,0.25);
    border-radius: 8px; color: #ff6680; font-size: 13px;
  }
  .form  { display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 13px; font-weight: 500; color: #8aa8c4; display: flex; align-items: center; gap: 6px; }
  .hint { font-weight: 400; color: #3d5a78; font-size: 11px; }
  .input {
    padding: 10px 14px; background: #111927; border: 1px solid #1e2d42;
    border-radius: 8px; color: #c8d8eb; font-size: 14px; font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s; outline: none; width: 100%;
  }
  .input::placeholder { color: #3d5a78; }
  .input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .input:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn {
    margin-top: 4px; padding: 11px 20px; background: #00d4ff; color: #070b12;
    border: none; border-radius: 8px; font-size: 14px; font-weight: 600;
    font-family: inherit; cursor: pointer; transition: all 0.15s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .btn:hover:not(:disabled) { background: #33ddff; box-shadow: 0 4px 20px rgba(0,212,255,0.3); }
  .btn:active:not(:disabled) { transform: translateY(1px); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    width: 14px; height: 14px; border: 2px solid rgba(7,11,18,0.3);
    border-top-color: #070b12; border-radius: 50%;
    animation: spin 0.6s linear infinite; flex-shrink: 0;
  }
  .terms { font-size: 11px; color: #3d5a78; line-height: 1.6; text-align: center; }
  .terms a { color: #5a7a9a; text-decoration: underline; }
</style>
