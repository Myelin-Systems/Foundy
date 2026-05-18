// PUT    /api/cms/sites/[siteId]/entries/[entryId]
// DELETE /api/cms/sites/[siteId]/entries/[entryId]
// PATCH  /api/cms/sites/[siteId]/entries/[entryId]

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import { trackUsage }          from '$lib/server/utils/usage-tracker';

async function verifyEntry(db: DataService, entryId: string, siteId: string, orgId: string) {
  const { rows } = await db.query<{ id: string; data_bytes: number }>(
    `SELECT e.id, e.data_bytes FROM entries e
     JOIN   sites s ON s.id = e.site_id
     WHERE  e.id         = $1
       AND  e.site_id    = $2
       AND  s.org_id     = $3
       AND  e.deleted_at IS NULL`,
    [entryId, siteId, orgId]
  );
  return rows[0] ?? null;
}

// ── PUT — update data + status ────────────────────────────────────────────────

export const PUT: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db    = bus.get<DataService>('db');
  const entry = await verifyEntry(db, params.entryId!, params.siteId!, session.oid);
  if (!entry) return json({ ok: false, message: 'Entry not found.' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const { data, status } = body as { data: Record<string, unknown>; status?: string };
  const dataJson = JSON.stringify(data ?? {});

  // Measure new size at write time — same pattern as POST
  const { rows: sizeRows } = await db.query<{ data_bytes: number }>(
    `SELECT pg_column_size($1::jsonb) AS data_bytes`,
    [dataJson]
  );
  const newDataBytes = sizeRows[0]?.data_bytes ?? 0;
  const bytesDelta   = newDataBytes - (entry.data_bytes ?? 0);

  await db.query(
    `UPDATE entries
     SET    data       = $1::jsonb,
            data_bytes = $2,
            status     = COALESCE($3, status),
            updated_at = NOW()
     WHERE  id = $4`,
    [dataJson, newDataBytes, status ?? null, params.entryId]
  );

  // Only track if size actually changed
  if (bytesDelta !== 0) {
    await trackUsage(db, session.oid, { db_bytes: bytesDelta });
  }

  return json({ ok: true });
};

// ── PATCH — toggle status ─────────────────────────────────────────────────────

export const PATCH: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db    = bus.get<DataService>('db');
  const entry = await verifyEntry(db, params.entryId!, params.siteId!, session.oid);
  if (!entry) return json({ ok: false, message: 'Entry not found.' }, { status: 404 });

  const { status } = await request.json().catch(() => ({})) as { status: string };
  if (!['published', 'draft'].includes(status)) {
    return json({ ok: false, message: 'Status must be "published" or "draft".' }, { status: 400 });
  }

  await db.query(
    `UPDATE entries SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, params.entryId]
  );

  // Status change doesn't affect usage counters — no trackUsage needed

  return json({ ok: true });
};

// ── DELETE — soft delete, decrement counters ──────────────────────────────────

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db    = bus.get<DataService>('db');
  const entry = await verifyEntry(db, params.entryId!, params.siteId!, session.oid);
  if (!entry) return json({ ok: false, message: 'Entry not found.' }, { status: 404 });

  await db.query(
    `UPDATE entries SET deleted_at = NOW() WHERE id = $1`,
    [params.entryId]
  );

  await trackUsage(db, session.oid, {
    entry_count: -1,
    db_bytes:    -(entry.data_bytes ?? 0),
  });

  return json({ ok: true });
};