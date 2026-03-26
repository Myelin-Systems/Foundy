// =============================================================================
// server/framework/Bootstrap.ts
// =============================================================================
// Called ONCE in hooks.server.ts on server startup.
// Register every service/adapter here, then bus.boot().
//
// Order matters:
//   1. Register core services (db, web) — no dependencies
//   2. bus.boot()  — activates all 'always' services
//   3. Init adapters (they call bus.get('db') during init to run migrations)
//
// After bootstrap() resolves, bus.get('auth') / bus.get('db') etc. are safe.
// =============================================================================

import { bus }           from './services/bus/BusService';
import { DataService }   from './services/database/DataService';
import { WebService }    from '../../shared/web/WebService';
import { AuthAdapter }   from '../framework/adapter/auth/AuthAdapter';

let booted = false;

export async function bootstrap(): Promise<void> {

  // Guard against SvelteKit calling hooks multiple times during dev HMR
  if (booted) return;

  // ── 1. Register core services ───────────────────────────────────────────────

  bus
    .register(new DataService(), { runtime: 'always', requires: [] })
    .register(new WebService(),  { runtime: 'always', requires: [] });

  // ── 2. Boot core services ────────────────────────────────────────────────────

  await bus.boot();

  // ── 3. Init adapters ─────────────────────────────────────────────────────────
  // Adapters run migrations and register their own sub-services (token, auth).
  // Safe to call bus.get('db') here — boot() has already completed.

  const authAdapter = new AuthAdapter({
    jwtSecret:          requireEnv('JWT_SECRET'),
    tokenExpirySeconds: parseInt(requireEnv('TOKEN_EXPIRY_SECONDS'))
  });

  await authAdapter.init();

  // ── 4. Done ──────────────────────────────────────────────────────────────────

  booted = true;

  const active = bus.status().filter(s => s.state === 'active').map(s => s.name);
  console.log(`[bootstrap] ✓ Online — active: [${active.join(', ')}]`);
}

export async function shutdown(): Promise<void> {
  await bus.shutdown();
  booted = false;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(
    `[bootstrap] Missing required env var: ${key}\n` +
    `Copy infra/.env.example to .env and fill it in.`
  );
  return val;
}
