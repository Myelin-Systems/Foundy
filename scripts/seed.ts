// scripts/seed.ts
import { bootstrap, shutdown } from '../src/lib/server/framework/Bootstrap';
import { bus }                 from '../src/lib/server/framework/services/bus/BusService';
import type { DataService }    from '../src/lib/server/framework/services/database/DataService';
import type { AuthService }    from '../src/lib/server/services/auth/AuthService';

async function seed() {
  await bootstrap();

  const db   = bus.get<DataService>('db');
  const auth = bus.get<AuthService>('auth');

  // Idempotent — skip if already seeded
  const existing = await db.from('users').where('email', 'admin@myelin.dev').first();
  if (existing) {
    console.log('[seed] Already seeded — skipping.');
    return;
  }

  await auth.register({
    email:    'admin@myelin.dev',
    password: 'password123',
    fullName: 'Admin User',
  });

  console.log('[seed] ✓ Done');
}

seed()
  .catch(console.error)
  .finally(() => shutdown());