// PATCH  /api/cms/sites/[siteId]/collections/[colId]
// DELETE /api/cms/sites/[siteId]/collections/[colId]

import type { RequestHandler }  from '@sveltejs/kit';
import { json }                 from '@sveltejs/kit';
import { requireSession }       from '$lib/server/utils/auth';
import { bus }                  from '$lib/server/framework/services/bus/BusService';
import type { DataService }     from '$lib/server/framework/services/database/DataService';
import type { CollectionField } from '$lib/cms/types';
import { trackUsage }           from '$lib/server/utils/usage-tracker';

async function verifyCollection(db: DataService, colId: string, siteId: string, orgId: string) {
  const { rows } = await db.query<{ id: string }>(
    `SELECT c.id FROM collections c
     JOIN   sites s ON s.id = c.site_id
     WHERE  c.id         = $1
       AND  c.site_id    = $2
       AND  s.org_id     = $3
       AND  c.deleted_at IS NULL`,
    [colId, siteId, orgId]
  );
  return rows[0] ?? null;
}

// ── PATCH — update fields schema ──────────────────────────────────────────────

export const PATCH: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db  = bus.get<DataService>('db');
  const col = await verifyCollection(db, params.colId!, params.siteId!, session.oid);
  if (!col) {
    console.error(`[collections PATCH] not found — colId:${params.colId} siteId:${params.siteId} oid:${session.oid}`);
    return json({ ok: false, message: 'Collection not found.' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const { fields } = body as { fields: CollectionField[] };
  if (!Array.isArray(fields)) {
    return json({ ok: false, message: 'fields must be an array.' }, { status: 400 });
  }

  const names = new Set<string>();
  for (const f of fields) {
    if (!f.name || !f.label || !f.type) {
      return json({ ok: false, message: 'Each field must have name, label, and type.' }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(f.name)) {
      return json({ ok: false, message: `Invalid field name "${f.name}".` }, { status: 400 });
    }
    if (names.has(f.name)) {
      return json({ ok: false, message: `Duplicate field name "${f.name}".` }, { status: 400 });
    }
    names.add(f.name);
  }

  try {
    const result = await db.query(
      `UPDATE collections
       SET    fields     = $1::text::jsonb,
              updated_at = NOW()
       WHERE  id = $2`,
      [JSON.stringify(fields), params.colId]
    );

    if (!result.affected || result.affected === 0) {
      console.error(`[collections PATCH] UPDATE matched 0 rows — colId:${params.colId}`);
      return json({ ok: false, message: 'Update failed — no rows matched.' }, { status: 500 });
    }
  } catch (err) {
    console.error('[collections PATCH] query error:', err);
    return json({ ok: false, message: (err as Error).message }, { status: 500 });
  }

  // Field schema change doesn't affect usage counters

  return json({ ok: true });
};

// ── DELETE — soft delete collection + its entries, decrement counters ─────────

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db  = bus.get<DataService>('db');
  const col = await verifyCollection(db, params.colId!, params.siteId!, session.oid);
  if (!col) return json({ ok: false, message: 'Collection not found.' }, { status: 404 });

  // Aggregate what we're about to delete so we can decrement accurately
  const { rows: aggRows } = await db.query<{ entry_count: string; db_bytes: string }>(
    `SELECT COUNT(*)            AS entry_count,
            COALESCE(SUM(data_bytes), 0) AS db_bytes
     FROM   entries
     WHERE  collection_id = $1 AND deleted_at IS NULL`,
    [params.colId]
  );

  const entryCount = parseInt(aggRows[0]?.entry_count ?? '0', 10);
  const dbBytes    = parseInt(aggRows[0]?.db_bytes    ?? '0', 10);

  // Soft delete entries first, then collection
  await db.query(
    `UPDATE entries SET deleted_at = NOW()
     WHERE  collection_id = $1 AND deleted_at IS NULL`,
    [params.colId]
  );

  await db.query(
    `UPDATE collections SET deleted_at = NOW() WHERE id = $1`,
    [params.colId]
  );

  await trackUsage(db, session.oid, {
    collection_count: -1,
    entry_count:      -entryCount,
    db_bytes:         -dbBytes,
  });

  return json({ ok: true });
};