<script lang="ts">
  import { goto } from '$app/navigation';

  let fullName = $state('');
  let email    = $state('');
  let password = $state('');
  let error    = $state('');
  let loading  = $state(false);
  let showPw   = $state(false);

  async function register() {
    if (!fullName || !email || !password) { error = 'Please fill in all fields.'; return; }
    if (password.length < 8) { error = 'Password must be at least 8 characters.'; return; }
    loading = true; error = '';
    try {
      const res  = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password }),
      });
      const data = await res.json();
      if (!data.ok) { error = data.message; return; }
      goto('/onboarding');
    } catch { error = 'Network error.'; }
    finally { loading = false; }
  }
</script>

<svelte:head><title>Create account — Foundiq</title></svelte:head>

<div class="page">
  <div class="grid-bg"></div>
  <div class="glow"></div>

  <div class="wrap">
    <div class="logo">
      <div class="logo-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      </div>
      <span>Foundiq</span>
    </div>

    <div class="card">
      <h1 class="title">Create your account</h1>
      <p class="sub">CMS + Social. One place.</p>

      {#if error}<div class="err">{error}</div>{/if}

      <div class="form">
        <div class="field">
          <label class="field-label" for="fn">Full name</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            <input id="fn" class="input" type="text" placeholder="Ada Lovelace"
              autocomplete="name" bind:value={fullName}
              oninput={() => error = ''} disabled={loading} />
          </div>
        </div>

        <div class="field">
          <label class="field-label" for="em">Email</label>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 7 10-7"/>
            </svg>
            <input id="em" class="input" type="email" placeholder="you@company.com"
              autocomplete="email" bind:value={email}
              oninput={() => error = ''} disabled={loading} />
          </div>
        </div>

        <div class="field">
          <div class="label-row">
            <label class="field-label" for="pw">Password</label>
            <span class="field-hint">min. 8 characters</span>
          </div>
          <div class="input-wrap">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <input id="pw" class="input input--pw" type={showPw ? 'text' : 'password'}
              placeholder="••••••••" autocomplete="new-password"
              bind:value={password} oninput={() => error = ''} disabled={loading}
              onkeydown={(e) => e.key === 'Enter' && register()} />
            <button class="pw-toggle" type="button" aria-label="Toggle password visibility"
              onclick={() => showPw = !showPw} tabindex="-1">
              {#if showPw}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              {:else}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <button class="btn-primary" onclick={register} disabled={loading}>
          {#if loading}<span class="spinner"></span>{/if}
          {loading ? 'Creating…' : 'Create account'}
        </button>
      </div>

      <p class="foot">Already have an account? <a href="/login">Sign in →</a></p>
    </div>
  </div>
</div>

<style>
  .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--bg); position: relative; overflow: hidden; }

  .grid-bg { position: fixed; inset: 0; pointer-events: none; background-image: linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px); background-size: 52px 52px; }

  .glow { position: fixed; top: -15%; left: 50%; transform: translateX(-50%); width: 700px; height: 500px; pointer-events: none; background: radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 65%); filter: blur(40px); }

  .wrap { position: relative; width: 100%; max-width: 380px; display: flex; flex-direction: column; align-items: center; gap: 20px; }

  /* ── Logo ── */
  .logo { display: flex; align-items: center; gap: 9px; font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
  .logo-icon { width: 28px; height: 28px; background: var(--amber); border-radius: 7px; display: flex; align-items: center; justify-content: center; color: #06060f; }

  /* ── Card ── */
  .card { width: 100%; background: var(--surface); border: 1px solid var(--border-hi); border-radius: var(--r-xl); padding: 28px; }

  .title { font-size: 20px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 3px; }
  .sub   { font-size: 13px; color: var(--text-2); margin: 0 0 24px; }

  /* ── Error ── */
  .err { padding: 10px 14px; margin-bottom: 16px; background: var(--error-dim); border: 1px solid rgba(248,113,113,0.2); border-radius: var(--r); color: var(--error); font-size: 13px; }

  /* ── Form ── */
  .form { display: flex; flex-direction: column; gap: 16px; }
  .field { display: flex; flex-direction: column; gap: 6px; }

  .label-row { display: flex; align-items: center; justify-content: space-between; }
  .field-label { font-size: 12px; font-weight: 600; color: var(--text-2); }
  .field-hint  { font-size: 12px; color: var(--text-3); }

  /* ── Inputs ── */
  .input-wrap { position: relative; display: flex; align-items: center; }

  .input-icon { position: absolute; left: 11px; width: 15px; height: 15px; color: var(--text-3); pointer-events: none; flex-shrink: 0; }

  .input {
    width: 100%; padding: 9px 12px 9px 34px;
    font-size: 14px; font-family: inherit;
    background: var(--bg); color: var(--text);
    border: 1px solid var(--border);
    border-radius: var(--r);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input--pw { padding-right: 36px; }
  .input:focus { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(245,158,11,0.12); }
  .input:disabled { opacity: 0.5; cursor: not-allowed; }
  .input::placeholder { color: var(--text-3); }

  .pw-toggle { position: absolute; right: 10px; background: none; border: none; padding: 0; cursor: pointer; color: var(--text-3); display: flex; align-items: center; transition: color 0.15s; }
  .pw-toggle:hover { color: var(--text-2); }
  .pw-toggle svg { width: 15px; height: 15px; }

  /* ── Submit ── */
  .btn-primary {
    width: 100%; margin-top: 4px;
    padding: 10px 20px;
    background: var(--amber); color: #06090f;
    border: none; border-radius: var(--r);
    font-size: 14px; font-weight: 600; font-family: inherit;
    cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: filter 0.15s;
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  /* ── Spinner ── */
  .spinner { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #06090f; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Footer ── */
  .foot { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border); font-size: 13px; color: var(--text-2); text-align: center; }
  .foot a { color: var(--amber); font-weight: 600; text-decoration: none; }
  .foot a:hover { text-decoration: underline; }
</style>