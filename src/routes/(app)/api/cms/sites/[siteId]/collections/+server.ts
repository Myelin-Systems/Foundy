// POST /api/cms/sites/[siteId]/collections
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

  const { name, label, color = '#00d4ff' } = body as Record<string, string>;
  if (!name?.trim())  return json({ ok: false, message: 'Name is required.',  field: 'name'  }, { status: 400 });
  if (!label?.trim()) return json({ ok: false, message: 'Label is required.', field: 'label' }, { status: 400 });

  // ── Tier limit: collections per site ─────────────────────────────────────
  const { rows: limitRows } = await db.query<{ plan: string; col_count: string }>(
    `SELECT COALESCE(p.slug, 'cms_starter') AS plan, COUNT(c.id) AS col_count
FROM organisations o
LEFT JOIN subscriptions s ON s.org_id = o.id
LEFT JOIN plans p ON p.id = s.plan_id
LEFT JOIN sites       st ON st.org_id  = o.id AND st.id = $2 AND st.deleted_at IS NULL
LEFT JOIN collections c  ON c.site_id  = st.id AND c.deleted_at IS NULL
WHERE o.id = $1 AND o.deleted_at IS NULL
GROUP BY p.slug`,
    [session.oid, params.siteId]
  );

  const plan     = getPlan(limitRows[0]?.plan ?? 'cms_starter');
  const colCount = parseInt(limitRows[0]?.col_count ?? '0', 10);

  if (!isUnlimited(plan.limits.collections) && colCount >= plan.limits.collections) {
    return json({
      ok: false, code: 'LIMIT_REACHED',
      message: `Your ${plan.name} plan allows up to ${plan.limits.collections} collections per site. Upgrade to add more.`,
      limit: plan.limits.collections, current: colCount,
    }, { status: 403 });
  }

  // ── Name unique per site ──────────────────────────────────────────────────
  const { rows: dup } = await db.query(
    `SELECT id FROM collections WHERE site_id = $1 AND name = $2 AND deleted_at IS NULL`,
    [params.siteId, name.trim()]
  );
  if (dup[0]) return json({
    ok: false, message: 'A collection with this name already exists.', field: 'name',
  }, { status: 409 });

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO collections (site_id, name, label, color, fields)
     VALUES ($1, $2, $3, $4, '[]'::jsonb) RETURNING id`,
    [params.siteId, name.trim(), label.trim(), color]
  );

  // ── Track usage ───────────────────────────────────────────────────────────
  await trackUsage(db, session.oid, { collection_count: 1 });

  return json({ ok: true, collection: rows[0] }, { status: 201 });
};