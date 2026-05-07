// src/routes/api/org/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const session = await requireSession(cookies);

  // Already has an org — don't create another
  if (session.oid) {
    return json({ ok: false, message: 'You already have an organisation.' }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const { name } = body as { name?: string };
  if (!name?.trim()) {
    return json({ ok: false, message: 'Organisation name is required.' }, { status: 400 });
  }

  const db = bus.get<DataService>('db');

  // Create the org
  const { rows: orgRows } = await db.query<{ id: string }>(
    `INSERT INTO organisations (name, slug)
     VALUES ($1, $2)
     RETURNING id`,
    [name.trim(), name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')]
  );
  const orgId = orgRows[0].id;

  // Add user as owner
  await db.query(
    `INSERT INTO org_members (org_id, user_id, role)
     VALUES ($1, $2, 'owner')`,
    [orgId, session.sub]
  );

  // Set as active org on the user
  await db.query(
    `UPDATE users SET active_org_id = $1 WHERE id = $2`,
    [orgId, session.sub]
  );

  // Seed the usage row so it's never null
  await db.query(
    `INSERT INTO org_usage (org_id, site_count, collection_count, entry_count, db_bytes, file_bytes)
     VALUES ($1, 0, 0, 0, 0, 0)
     ON CONFLICT (org_id) DO NOTHING`,
    [orgId]
  );

  return json({ ok: true, orgId }, { status: 201 });
};