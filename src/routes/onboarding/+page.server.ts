// src/routes/onboarding/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect }            from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await requireSession(cookies);
  const db      = bus.get<DataService>('db');

  // Already has an org + site = onboarding complete, go to CMS
  if (session.oid) {
    const { rows } = await db.query(
      `SELECT id FROM sites WHERE org_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [session.oid]
    );
    if (rows[0]) throw redirect(302, `/dashboard/cms?site=${rows[0].id}`);
  }

  return {
    session,
    hasOrg: !!session.oid,
  };
};