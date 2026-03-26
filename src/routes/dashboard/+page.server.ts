// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await requireSession(cookies);

  // Example: fetch user's active session count
  const db = bus.get<DataService>('db');
  const { rows: sessionRows } = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND expires_at > NOW()`,
    [session.sub]
  );

  const busStatus = bus.status().map(s => ({
    name:    s.name,
    state:   s.state,
    runtime: s.runtime,
    version: s.version,
    uptime:  s.activatedAt ? Math.round((Date.now() - s.activatedAt) / 1_000) : 0,
  }));
  return {
    session,
    activeSessions: parseInt(sessionRows[0]?.count ?? '1', 10),
    busStatus,
  };
};
