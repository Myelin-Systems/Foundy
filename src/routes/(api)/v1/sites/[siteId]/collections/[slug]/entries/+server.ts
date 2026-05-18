// =============================================================================
// src/routes/v1/sites/[siteId]/collections/[slug]/entries/+server.ts
// GET  — public key, list entries with filtering + search + pagination
// POST — secret key only, create entry (contact forms, webhooks etc)
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import {
  requireDeliveryToken, assertSite, requireSecretToken,
  parsePagination, DELIVERY_CORS, NO_CACHE_CORS,
} from '$lib/server/utils/delivery-auth';

const RESERVED = new Set(['limit', 'offset', 'order', 'dir', 'search']);

export const OPTIONS: RequestHandler = async () =>
  new Response(null, { status: 204, headers: DELIVERY_CORS });

// ── GET ───────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ request, params, url }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;

  const db   = bus.get<DataService>('db');
  const page = parsePagination(url);

  const { rows: colRows } = await db.query<{ id: string }>(
    `SELECT id FROM collections
     WHERE  site_id = $1 AND (name = $2 OR id::text = $2) AND deleted_at IS NULL`,
    [params.siteId, params.slug]
  );
  if (!colRows[0]) {
    return json({ ok: false, code: 'NOT_FOUND', message: `Collection "${params.slug}" not found.` },
      { status: 404, headers: DELIVERY_CORS });
  }

  const collectionId = colRows[0].id;
  const conditions: string[] = [`collection_id = $1`, `status = 'published'`, `deleted_at IS NULL`];
  const queryParams: unknown[] = [collectionId];
  let   paramIdx = 2;

  const search = url.searchParams.get('search')?.trim();
  if (search) {
    conditions.push(`data::text ILIKE $${paramIdx}`);
    queryParams.push(`%${search}%`);
    paramIdx++;
  }

  for (const [key, value] of url.searchParams.entries()) {
    if (RESERVED.has(key)) continue;
    conditions.push(`data->>'${key.replace(/[^a-z0-9_]/gi, '')}' = $${paramIdx}`);
    queryParams.push(value);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const { rows: countRows } = await db.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM entries ${whereClause}`, queryParams
  );
  const total = parseInt(countRows[0]?.count ?? '0', 10);

  const { rows } = await db.query<{
    id: string; collection_id: string; status: string;
    data: unknown; created_at: string; updated_at: string;
  }>(
    `SELECT id, collection_id, status, data, created_at, updated_at
     FROM   entries ${whereClause}
     ORDER BY ${page.order} ${page.dir}
     LIMIT  $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...queryParams, page.limit, page.offset]
  );

  return json({
    ok:   true,
    data: rows.map(r => ({
      id:            r.id,
      collection_id: r.collection_id,
      status:        r.status,
      data:          typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
      created_at:    r.created_at,
      updated_at:    r.updated_at,
    })),
    meta: { total, limit: page.limit, offset: page.offset, has_more: page.offset + page.limit < total },
  }, { headers: DELIVERY_CORS });
};

// ── POST — secret key only ────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, params }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;
  const notSecret = requireSecretToken(auth);
  if (notSecret) return notSecret;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ ok: false, code: 'INVALID_BODY', message: 'Request body must be a JSON object.' },
      { status: 400, headers: NO_CACHE_CORS });
  }

  const { data, status = 'published' } = body as { data: Record<string, unknown>; status?: string };

  if (!data || typeof data !== 'object') {
    return json({ ok: false, code: 'MISSING_DATA', message: 'data field is required.' },
      { status: 400, headers: NO_CACHE_CORS });
  }

  if (!['draft', 'published'].includes(status)) {
    return json({ ok: false, code: 'INVALID_STATUS', message: 'status must be "draft" or "published".' },
      { status: 400, headers: NO_CACHE_CORS });
  }

  const db = bus.get<DataService>('db');

  // Resolve collection — auto-create if it doesn't exist
  // Useful for contact forms and webhooks where collection may not be pre-created
  const { rows: colRows } = await db.query<{ id: string }>(
    `INSERT INTO collections (site_id, name, label, color, fields)
     VALUES ($1, $2, $2, '#00d4ff', '[]'::jsonb)
     ON CONFLICT (site_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [params.siteId, params.slug]
  );
  const collectionId = colRows[0].id;

  const dataJson = JSON.stringify(data);
  const { rows: sizeRows } = await db.query<{ data_bytes: number }>(
    `SELECT pg_column_size($1::jsonb) AS data_bytes`, [dataJson]
  );
  const dataBytes = sizeRows[0]?.data_bytes ?? 0;

  const { rows } = await db.query<{ id: string; created_at: string }>(
    `INSERT INTO entries (site_id, collection_id, status, data, data_bytes)
     VALUES ($1, $2, $3, $4::jsonb, $5)
     RETURNING id, created_at`,
    [params.siteId, collectionId, status, dataJson, dataBytes]
  );

  return json({
    ok: true,
    data: { id: rows[0].id, collection_id: collectionId, status, data, created_at: rows[0].created_at },
  }, { status: 201, headers: NO_CACHE_CORS });
};