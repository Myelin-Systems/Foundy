// =============================================================================
// Bootstrap.ts
// =============================================================================
// Boot order matters:
//   1. Core services (db, web, plan) — no dependencies
//   2. bus.boot() — activates all 'always' services
//   3. AuthAdapter     — creates users + sessions tables
//   4. OrgAdapter      — creates organisations + org_members (refs users)
//   5. FoundiqAdapter   — creates sites + content (refs organisations)
//   6. SocialAdapter   — creates social_accounts + social_posts (refs organisations)
// =============================================================================

import { WebService }             from '$lib/shared/web/WebService';
import { bus }                    from '$lib/server/framework/services/bus/BusService';
import { DataService }            from '$lib/server/framework/services/database/DataService';
import { AuthAdapter }            from '$lib/server/framework/adapter/auth/AuthAdapter';
import { PaymentAdapter }         from '$lib/server/framework/adapter/payment/PaymentAdapter';
import { OrganisationAdapter }    from '$lib/server/framework/adapter/organisation/OrganisationAdapter';
import { FoundiqAdapter }          from '$lib/server/framework/adapter/foundiq/FoundiqAdapter';
import { SocialAdapter }          from '$lib/server/framework/adapter/social/SocialAdapter';

// let booted = false;

export async function bootstrap(): Promise<void> {
  if (bus.isActive('db')) return;

  bus
    .register(new DataService(), { runtime: 'always', requires: [] })
    .register(new WebService(),  { runtime: 'always', requires: [] })

  await bus.boot();
    
  await new AuthAdapter({
      jwtSecret:          requireEnv('JWT_SECRET'),
      tokenExpirySeconds: parseInt(requireEnv('TOKEN_EXPIRY_SECONDS'),10)
  }).init();
  
 

  await new OrganisationAdapter().init();
  await new FoundiqAdapter().init();
  await new PaymentAdapter({
    mollieApiKey:  requireEnv('MOLLIE_API_KEY_' + (process.env.NODE_ENV === 'production' ? 'LIVE' : 'TEST')),
    webhookUrl:    requireEnv('PUBLIC_URL') + '/api/billing/webhook',
    redirectUrl:   requireEnv('PUBLIC_URL') + '/dashboard/billing',
  }).init();



  // if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
  //   await new SocialAdapter().init();
  // } else {
  //   console.warn('[bootstrap] META credentials not set — social features disabled');
  // }
        
  const active = bus.status().filter(s => s.state === 'active').map(s => s.name);
  console.log(`[bootstrap] ✓ [${active.join(', ')}]`);
}

export async function shutdown(): Promise<void> {
  await bus.shutdown();
}

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`[bootstrap] Missing required env var: ${key}`);
  return val;
}
