import type { PageServerLoad } from './$types';
import { redirect }            from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import { can }                 from '$lib/shared/plans';

export const load: PageServerLoad = async ({ cookies }) => {
  const session = await requireSession(cookies);
  const db = bus.get<DataService>('db');

  // If they already have a site, send them to the CMS
  if (session.oid) {
    const { rows: orgRows } = await db.query(
        `SELECT plan FROM organisations WHERE id = $1`, [session.oid]
    );
    const plan = orgRows[0]?.plan ?? 'cms_starter';

    // Social-only plan — CMS not available, redirect to social dashboard
    if (!can(plan, 'cms')) {
        throw redirect(302, '/dashboard/social');
    }
    }

  return { session };
};