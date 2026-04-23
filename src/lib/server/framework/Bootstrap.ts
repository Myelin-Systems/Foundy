// =============================================================================
// Bootstrap.ts
// =============================================================================
// Boot order matters:
//   1. Core services (db, web, plan) — no dependencies
//   2. bus.boot() — activates all 'always' services
//   3. AuthAdapter     — creates users + sessions tables
//   4. OrgAdapter      — creates organisations + org_members (refs users)
//   5. FoundyAdapter   — creates sites + content (refs organisations)
//   6. SocialAdapter   — creates social_accounts + social_posts (refs organisations)
// =============================================================================

import { bus }                    from '$lib/server/framework/services/bus/BusService';
import { DataService }            from '$lib/server/framework/services/database/DataService';
import { WebService }             from '$lib/shared/web/WebService';
import { PlanService }            from '$lib/server/services/PlanService';
import { AuthAdapter }            from '$lib/server/framework/adapter/auth/AuthAdapter';
import { OrganisationAdapter }    from '$lib/server/framework/adapter/organisation/OrganisationAdapter';
import { FoundyAdapter }          from '$lib/server/framework/adapter/foundy/FoundyAdapter';
import { SocialAdapter }          from '$lib/server/framework/adapter/social/SocialAdapter';

let booted = false;

export async function bootstrap(): Promise<void> {
  if (booted) return;

  bus
    .register(new DataService(), { runtime: 'always', requires: [] })
    .register(new WebService(),  { runtime: 'always', requires: [] })
    .register(new PlanService(), { runtime: 'always', requires: [] });

  await bus.boot();
    
  await new AuthAdapter({
      jwtSecret:          requireEnv('JWT_SECRET'),
      tokenExpirySeconds: parseInt(requireEnv('TOKEN_EXPIRY_SECONDS'),10)
  }).init();
    
  // await new OrganisationAdapter().init();
  // await new FoundyAdapter().init();
    
  // if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
  //   await new SocialAdapter().init();
  // } else {
  //   console.warn('[bootstrap] META credentials not set — social features disabled');
  // }
        
  booted = true;
  const active = bus.status().filter(s => s.state === 'active').map(s => s.name);
  console.log(`[bootstrap] ✓ [${active.join(', ')}]`);
}

export async function shutdown(): Promise<void> {
  await bus.shutdown();
  booted = false;
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`[bootstrap] Missing required env var: ${key}`);
  return val;
}
