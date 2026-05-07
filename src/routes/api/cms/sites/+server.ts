// POST /api/cms/sites
import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import { getPlan, isUnlimited } from '$lib/shared/plans';
import { trackUsage }           from '$lib/server/utils/usage-tracker';
import { randomBytes }          from 'crypto';

export const POST: RequestHandler = async ({ request, cookies }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const { name, slug, domain } = body as Record<string, string>;
  if (!name?.trim()) return json({ ok: false, message: 'Name is required.',  field: 'name' }, { status: 400 });
  if (!slug?.trim()) return json({ ok: false, message: 'Slug is required.',  field: 'slug' }, { status: 400 });
  if (!/^[a-z0-9-]+$/.test(slug)) return json({ ok: false, message: 'Invalid slug format.' }, { status: 400 });

  const db = bus.get<DataService>('db');

  // ── Tier limit ────────────────────────────────────────────────────────────
  const { rows: usageRows } = await db.query<{ plan: string; site_count: string }>(
    `SELECT o.plan, COALESCE(u.site_count, 0) AS site_count
     FROM   organisations o
     LEFT JOIN org_usage u ON u.org_id = o.id
     WHERE  o.id = $1 AND o.deleted_at IS NULL`,
    [session.oid]
  );

  const plan      = getPlan(usageRows[0]?.plan ?? 'cms_starter');
  const siteCount = parseInt(usageRows[0]?.site_count ?? '0', 10);

  if (!isUnlimited(plan.limits.sites) && siteCount >= plan.limits.sites) {
    return json({
      ok: false, code: 'LIMIT_REACHED',
      message: `Your ${plan.name} plan allows up to ${plan.limits.sites} site${plan.limits.sites === 1 ? '' : 's'}. Upgrade to add more.`,
      limit: plan.limits.sites, current: siteCount,
    }, { status: 403 });
  }

  // ── Slug unique per org ───────────────────────────────────────────────────
  const { rows: existing } = await db.query(
    `SELECT id FROM sites WHERE org_id = $1 AND slug = $2 AND deleted_at IS NULL`,
    [session.oid, slug.trim()]
  );
  if (existing[0]) return json({
    ok: false, message: 'A site with this slug already exists.', field: 'slug',
  }, { status: 409 });

  // ── Create site ───────────────────────────────────────────────────────────
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO sites (org_id, name, slug, domain)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [session.oid, name.trim(), slug.trim(), domain?.trim() || null]
  );
  const siteId = rows[0].id;

  // ── Auto-generate public + secret tokens ──────────────────────────────────
  // Generated immediately so the API view never shows a null state.
  // The secret key is hidden by default in the UI until explicitly revealed.
  const publicToken = `pnd_pub_${randomBytes(32).toString('hex')}`;
  const secretToken = `pnd_sec_${randomBytes(32).toString('hex')}`;

  await db.query(
    `INSERT INTO site_tokens (site_id, token, type, revoked)
     VALUES ($1, $2, 'public', false),
            ($1, $3, 'secret', false)`,
    [siteId, publicToken, secretToken]
  );

  // ── Track usage ───────────────────────────────────────────────────────────
  await trackUsage(db, session.oid, { site_count: 1 });

  return json({ ok: true, site: rows[0] }, { status: 201 });
};