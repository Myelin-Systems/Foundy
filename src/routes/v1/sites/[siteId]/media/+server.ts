// src/routes/v1/sites/[siteId]/media/+server.ts
// GET ?limit ?offset ?order ?dir ?mime_type ?name

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { bus }  from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import type { StorageService } from '$lib/server/services/foundy/StorageService';
import { requireDeliveryToken, assertSite, parsePagination, DELIVERY_CORS } from '$lib/server/utils/delivery-auth';

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: DELIVERY_CORS });

export const GET: RequestHandler = async ({ request, params, url }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;

  const db      = bus.get<DataService>('db');
  const storage = bus.get<StorageService>('storage');
  const page    = parsePagination(url);
  const mimeFilter = url.searchParams.get('mime_type') ?? null;
  const nameFilter = url.searchParams.get('name')      ?? null;

  const conditions: string[] = ['site_id = $1', 'deleted_at IS NULL'];
  const qp: unknown[] = [params.siteId];
  let   pi = 2;

  if (mimeFilter) {
    conditions.push(mimeFilter.endsWith('/') ? `mime_type LIKE $${pi}` : `mime_type = $${pi}`);
    qp.push(mimeFilter.endsWith('/') ? `${mimeFilter}%` : mimeFilter);
    pi++;
  }
  if (nameFilter) { conditions.push(`name = $${pi}`); qp.push(nameFilter); pi++; }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const { rows: cr } = await db.query<{ count: string }>(`SELECT COUNT(*) AS count FROM media_files ${where}`, qp);
  const total = parseInt(cr[0]?.count ?? '0', 10);

  const { rows } = await db.query<{ id: string; name: string; key: string; mime_type: string; size: number; created_at: string }>(
    `SELECT id, name, key, mime_type, size, created_at FROM media_files ${where} ORDER BY ${page.order} ${page.dir} LIMIT $${pi} OFFSET $${pi+1}`,
    [...qp, page.limit, page.offset]
  );

  return json({
    ok:   true,
    data: rows.map(r => ({ id: r.id, name: r.name, url: storage.buildUrl(r.key), mime_type: r.mime_type, size: Number(r.size), created_at: r.created_at })),
    meta: { total, limit: page.limit, offset: page.offset, has_more: page.offset + page.limit < total },
  }, { headers: DELIVERY_CORS });
};