// PUT    /api/cms/sites/[siteId]
// DELETE /api/cms/sites/[siteId]

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import { requireSession }      from '$lib/server/utils/auth';
import { trackUsage }          from '$lib/server/utils/usage-tracker';

// ── PUT — update name + domain ────────────────────────────────────────────────

export const PUT: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const { name, domain } = body as { name?: string; domain?: string };
  if (!name?.trim()) {
    return json({ ok: false, message: 'Site name is required.' }, { status: 400 });
  }

  const db = bus.get<DataService>('db');

  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [params.siteId, session.oid]
  );
  if (!rows[0]) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  await db.query(
    `UPDATE sites SET name = $1, domain = $2, updated_at = NOW() WHERE id = $3`,
    [name.trim(), domain?.trim() ?? null, params.siteId]
  );

  // Name/domain change doesn't affect usage counters

  return json({ ok: true });
};

// ── DELETE — cascade soft delete + decrement all counters ─────────────────────

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db = bus.get<DataService>('db');

  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [params.siteId, session.oid]
  );
  if (!rows[0]) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  // Aggregate everything we're about to delete in one query
  const { rows: aggRows } = await db.query<{
    collection_count: string;
    entry_count:      string;
    db_bytes:         string;
    file_bytes:       string;
  }>(`
    SELECT
      COUNT(DISTINCT c.id)                   AS collection_count,
      COUNT(DISTINCT e.id)                   AS entry_count,
      COALESCE(SUM(e.data_bytes),  0)        AS db_bytes,
      COALESCE(SUM(m.size),        0)        AS file_bytes
    FROM   collections c
    LEFT JOIN entries     e ON e.collection_id = c.id AND e.deleted_at IS NULL
    LEFT JOIN media_files m ON m.site_id       = $1   AND m.deleted_at IS NULL
    WHERE  c.site_id    = $1
      AND  c.deleted_at IS NULL
  `, [params.siteId]);

  const agg = aggRows[0];
  const now = new Date().toISOString();

  // Cascade soft delete — entries first, then collections, then site
  await db.query(
    `UPDATE entries
     SET    deleted_at = $1
     WHERE  collection_id IN (
       SELECT id FROM collections WHERE site_id = $2 AND deleted_at IS NULL
     )
     AND    deleted_at IS NULL`,
    [now, params.siteId]
  );

  await db.query(
    `UPDATE collections SET deleted_at = $1 WHERE site_id = $2 AND deleted_at IS NULL`,
    [now, params.siteId]
  );

  await db.query(
    `UPDATE media_files SET deleted_at = $1 WHERE site_id = $2 AND deleted_at IS NULL`,
    [now, params.siteId]
  );

  await db.query(
    `UPDATE sites SET deleted_at = $1 WHERE id = $2`,
    [now, params.siteId]
  );

  // Decrement all counters in one call
  await trackUsage(db, session.oid, {
    site_count:       -1,
    collection_count: -parseInt(agg?.collection_count ?? '0', 10),
    entry_count:      -parseInt(agg?.entry_count      ?? '0', 10),
    db_bytes:         -parseInt(agg?.db_bytes         ?? '0', 10),
    file_bytes:       -parseInt(agg?.file_bytes       ?? '0', 10),
  });

  return json({ ok: true });
};