// =============================================================================
// src/routes/api/cms/sites/[siteId]/tokens/+server.ts
// =============================================================================
// POST   /api/cms/sites/[siteId]/tokens  — generate token (public or secret)
// DELETE /api/cms/sites/[siteId]/tokens  — revoke active token of a type
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import { randomBytes }         from 'crypto';

type TokenType = 'public' | 'secret';

async function verifySite(db: DataService, siteId: string, orgId: string) {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [siteId, orgId]
  );
  return rows[0] ?? null;
}

export const POST: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db   = bus.get<DataService>('db');
  const site = await verifySite(db, params.siteId!, session.oid);
  if (!site) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { type?: string };
  const type: TokenType = body.type === 'secret' ? 'secret' : 'public';

  // Revoke all existing tokens of this type for this site
  await db.query(
    `UPDATE site_tokens SET revoked = true
     WHERE  site_id = $1 AND type = $2 AND revoked = false`,
    [params.siteId, type]
  );

  // Generate new token with type-specific prefix
  const prefix = type === 'secret' ? 'pnd_sec_' : 'pnd_pub_';
  const token  = `${prefix}${randomBytes(32).toString('hex')}`;

  await db.query(
    `INSERT INTO site_tokens (site_id, token, type, revoked)
     VALUES ($1, $2, $3, false)`,
    [params.siteId, token, type]
  );

  return json({ ok: true, token, type }, { status: 201 });
};

export const DELETE: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db   = bus.get<DataService>('db');
  const site = await verifySite(db, params.siteId!, session.oid);
  if (!site) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  const body = await request.json().catch(() => ({})) as { type?: string };
  const type: TokenType = body.type === 'secret' ? 'secret' : 'public';

  await db.query(
    `UPDATE site_tokens SET revoked = true
     WHERE  site_id = $1 AND type = $2 AND revoked = false`,
    [params.siteId, type]
  );

  return json({ ok: true });
};