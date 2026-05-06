<script lang="ts">
  import { goto } from '$app/navigation';
  let fullName=$state(''), email=$state(''), password=$state(''), error=$state(''), loading=$state(false);
  async function register() {
    if (!fullName||!email||!password) { error='Please fill in all fields.'; return; }
    if (password.length<8) { error='Password must be at least 8 characters.'; return; }
    loading=true; error='';
    try {
      const res  = await fetch('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({fullName,email,password}) });
      const data = await res.json();
      if (!data.ok) { error=data.message; return; }
      goto('/dashboard/org/sites');
    } catch { error='Network error.'; }
    finally { loading=false; }
  }
</script>
<svelte:head><title>Create account — Foundy</title></svelte:head>
<div class="page">
  <div class="grid-bg"></div><div class="glow"></div>
  <div class="card">
    <div class="logo"><div class="logo-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg></div><span>Foundy</span></div>
    <h1 class="title">Create your account</h1>
    <p class="sub">CMS + Social. One place.</p>
    {#if error}<div class="err">{error}</div>{/if}
    <div class="form">
      <div class="field"><label class="field-label" for="fn">Full name</label><input id="fn" class="input" type="text" placeholder="Ada Lovelace" autocomplete="name" bind:value={fullName} oninput={() => error=''} disabled={loading} /></div>
      <div class="field"><label class="field-label" for="em">Email</label><input id="em" class="input" type="email" placeholder="you@company.com" autocomplete="email" bind:value={email} oninput={() => error=''} disabled={loading} /></div>
      <div class="field"><label class="field-label" for="pw">Password <span style="font-weight:400;color:var(--text-3);text-transform:none">min 8 chars</span></label><input id="pw" class="input" type="password" placeholder="••••••••" autocomplete="new-password" bind:value={password} oninput={() => error=''} disabled={loading} onkeydown={(e) => e.key==='Enter'&&register()} /></div>
      <button class="btn btn-primary" style="width:100%;margin-top:4px" onclick={register} disabled={loading}>
        {#if loading}<span class="spinner"></span>{/if}
        {loading ? 'Creating…' : 'Create account'}
      </button>
    </div>
    <p class="foot">Already have an account? <a href="/login">Sign in →</a></p>
  </div>
</div>
<style>
  .page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; background:var(--bg); position:relative; overflow:hidden; }
  .grid-bg { position:fixed; inset:0; pointer-events:none; background-image:linear-gradient(rgba(245,158,11,0.03)1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,0.03)1px,transparent 1px); background-size:52px 52px; }
  .glow { position:fixed; top:-15%; left:50%; transform:translateX(-50%); width:700px; height:500px; pointer-events:none; background:radial-gradient(ellipse,rgba(245,158,11,0.08)0%,transparent 65%); filter:blur(40px); }
  .card { position:relative; width:100%; max-width:380px; background:var(--surface); border:1px solid var(--border-hi); border-radius:var(--r-xl); padding:32px; box-shadow:0 32px 80px rgba(0,0,0,0.6); }
  .logo { display:flex; align-items:center; gap:10px; margin-bottom:24px; font-size:16px; font-weight:800; color:var(--text); letter-spacing:-0.02em; }
  .logo-icon { width:28px; height:28px; background:var(--amber); border-radius:7px; display:flex; align-items:center; justify-content:center; color:#06060f; box-shadow:0 0 16px var(--amber-glow); flex-shrink:0; }
  .title { font-size:22px; font-weight:700; letter-spacing:-0.02em; margin-bottom:4px; }
  .sub   { font-size:13px; color:var(--text-2); margin-bottom:24px; }
  .err   { padding:10px 14px; margin-bottom:16px; background:var(--error-dim); border:1px solid rgba(248,113,113,0.2); border-radius:var(--r); color:var(--error); font-size:13px; }
  .form  { display:flex; flex-direction:column; gap:14px; }
  .foot  { margin-top:20px; font-size:12px; color:var(--text-2); text-align:center; }
  .foot a { color:var(--amber); font-weight:600; }
</style>
