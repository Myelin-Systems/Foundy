// POST /api/cms/sites/[siteId]/entries
import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import { getPlan, isUnlimited } from '$lib/shared/plans';
import { trackUsage }           from '$lib/server/utils/usage-tracker';

export const POST: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db = bus.get<DataService>('db');

  const { rows: siteRows } = await db.query(
    `SELECT id FROM sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [params.siteId, session.oid]
  );
  if (!siteRows[0]) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const { collection_id, data } = body as { collection_id: string; data: Record<string, unknown> };
  if (!collection_id) return json({ ok: false, message: 'collection_id is required.' }, { status: 400 });

  const { rows: colRows } = await db.query(
    `SELECT id FROM collections WHERE id = $1 AND site_id = $2 AND deleted_at IS NULL`,
    [collection_id, params.siteId]
  );
  if (!colRows[0]) return json({ ok: false, message: 'Collection not found.' }, { status: 404 });

  // ── Tier limit ────────────────────────────────────────────────────────────
  const { rows: usageRows } = await db.query<{ plan: string; entry_count: string }>(
    `SELECT o.plan, COALESCE(u.entry_count, 0) AS entry_count
     FROM   organisations o
     LEFT JOIN org_usage u ON u.org_id = o.id
     WHERE  o.id = $1 AND o.deleted_at IS NULL`,
    [session.oid]
  );

  const plan       = getPlan(usageRows[0]?.plan ?? 'cms_starter');
  const entryCount = parseInt(usageRows[0]?.entry_count ?? '0', 10);

  if (!isUnlimited(plan.limits.entries) && entryCount >= plan.limits.entries) {
    return json({
      ok: false, code: 'LIMIT_REACHED',
      message: `Your ${plan.name} plan allows up to ${plan.limits.entries.toLocaleString()} entries. Upgrade to add more.`,
      limit: plan.limits.entries, current: entryCount,
    }, { status: 403 });
  }

  // ── Measure data size at write time via pg_column_size ────────────────────
  // Called once here — never again at read time. Result stored in data_bytes.
  const dataJson = JSON.stringify(data ?? {});
  const { rows: sizeRows } = await db.query<{ data_bytes: number }>(
    `SELECT pg_column_size($1::jsonb) AS data_bytes`,
    [dataJson]
  );
  const dataBytes = sizeRows[0]?.data_bytes ?? 0;

  // ── Insert ────────────────────────────────────────────────────────────────
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO entries (site_id, collection_id, status, data, data_bytes)
     VALUES ($1, $2, 'draft', $3::jsonb, $4)
     RETURNING id`,
    [params.siteId, collection_id, dataJson, dataBytes]
  );

  // ── Track usage ───────────────────────────────────────────────────────────
  await trackUsage(db, session.oid, { entry_count: 1, db_bytes: dataBytes });

  return json({ ok: true, entry: rows[0] }, { status: 201 });
};