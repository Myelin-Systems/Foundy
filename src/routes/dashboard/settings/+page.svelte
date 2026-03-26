<script lang="ts">
  const { data } = $props<{ data: { session: { email: string; role: string } } }>();

  let currentPassword = $state('');
  let newPassword     = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error   = $state('');
  let success = $state('');

  function clearMessages() { error = ''; success = ''; }

  async function changePassword() {
    clearMessages();
    if (!currentPassword || !newPassword || !confirmPassword) { error = 'Please fill in all fields.'; return; }
    if (newPassword !== confirmPassword) { error = 'New passwords do not match.'; return; }
    if (newPassword.length < 8) { error = 'New password must be at least 8 characters.'; return; }

    loading = true;
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!json.ok) { error = json.message; return; }
      success = 'Password changed. Redirecting to login…';
      setTimeout(() => { window.location.href = '/login'; }, 2000);
    } catch { error = 'Network error. Please try again.'; }
    finally  { loading = false; }
  }
</script>

<svelte:head><title>Settings — Myelin</title></svelte:head>

<div class="page">
  <div class="breadcrumb">
    <a href="/dashboard">Dashboard</a>
    <span class="sep">/</span>
    <span>Settings</span>
  </div>

  <h1 class="title">Account settings</h1>
  <p class="subtitle">Managing <strong>{data.session.email}</strong></p>

  <div class="cards">
    <div class="card">
      <div class="card-title">Account info</div>
      <div class="info-row">
        <span class="info-label">Email</span>
        <span class="info-value">{data.session.email}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Role</span>
        <span class="info-value role-badge">{data.session.role}</span>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Change password</div>
      {#if error}  <div class="msg error">{error}</div>   {/if}
      {#if success}<div class="msg success">{success}</div>{/if}
      <div class="form">
        <label class="field">
          <span class="field-label">Current password</span>
          <input class="input" type="password" bind:value={currentPassword}
            oninput={clearMessages} autocomplete="current-password" disabled={loading} />
        </label>
        <label class="field">
          <span class="field-label">New password</span>
          <input class="input" type="password" bind:value={newPassword}
            oninput={clearMessages} autocomplete="new-password" disabled={loading} />
        </label>
        <label class="field">
          <span class="field-label">Confirm new password</span>
          <input class="input" type="password" bind:value={confirmPassword}
            oninput={clearMessages} autocomplete="new-password" disabled={loading} />
        </label>
        <button class="btn" onclick={changePassword} disabled={loading || !!success}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .page { max-width: 640px; margin: 0 auto; padding: 40px 28px 80px; }
  .breadcrumb { font-size: 13px; color: #5a7a9a; margin-bottom: 24px; display: flex; gap: 6px; }
  .breadcrumb a:hover { color: #c8d8eb; }
  .sep { opacity: 0.4; }
  .title    { font-size: 26px; font-weight: 300; color: #c8d8eb; margin-bottom: 6px; }
  .subtitle { font-size: 14px; color: #5a7a9a; margin-bottom: 32px; }
  .subtitle strong { color: #8aa8c4; font-weight: 500; }
  .cards { display: flex; flex-direction: column; gap: 16px; }
  .card { background: #0d1420; border: 1px solid #1e2d42; border-radius: 12px; padding: 24px; }
  .card-title { font-size: 14px; font-weight: 600; color: #8aa8c4; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid #1a2535; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #111927; }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 13px; color: #5a7a9a; }
  .info-value { font-size: 14px; color: #c8d8eb; }
  .role-badge { font-size: 11px; padding: 2px 10px; background: rgba(0,212,255,0.08); border: 1px solid rgba(0,212,255,0.2); border-radius: 20px; color: #00d4ff; }
  .msg { padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }
  .msg.error   { background: rgba(255,68,102,0.08); border: 1px solid rgba(255,68,102,0.25); color: #ff6680; }
  .msg.success { background: rgba(0,255,157,0.06); border: 1px solid rgba(0,255,157,0.2);  color: #00cc7a; }
  .form  { display: flex; flex-direction: column; gap: 14px; }
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field-label { font-size: 13px; font-weight: 500; color: #8aa8c4; }
  .input { padding: 10px 14px; background: #111927; border: 1px solid #1e2d42; border-radius: 8px; color: #c8d8eb; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; width: 100%; }
  .input::placeholder { color: #3d5a78; }
  .input:focus { border-color: rgba(0,212,255,0.4); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
  .input:disabled { opacity: 0.5; }
  .btn { padding: 11px; background: #00d4ff; color: #070b12; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.15s; margin-top: 4px; }
  .btn:hover:not(:disabled) { background: #33ddff; box-shadow: 0 4px 20px rgba(0,212,255,0.25); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
</style>
