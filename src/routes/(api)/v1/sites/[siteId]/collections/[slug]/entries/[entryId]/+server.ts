// src/routes/v1/sites/[siteId]/collections/[slug]/entries/[entryId]/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { bus }  from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';
import { requireDeliveryToken, assertSite, DELIVERY_CORS } from '$lib/server/utils/delivery-auth';

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: DELIVERY_CORS });

export const GET: RequestHandler = async ({ request, params }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;

  const db = bus.get<DataService>('db');
  const { rows } = await db.query<{ id: string; collection_id: string; status: string; data: unknown; created_at: string; updated_at: string }>(`
    SELECT e.id, e.collection_id, e.status, e.data, e.created_at, e.updated_at
    FROM   entries e JOIN collections c ON c.id = e.collection_id
    WHERE  e.id = $1 AND e.site_id = $2 AND (c.name = $3 OR c.id::text = $3)
      AND  e.status = 'published' AND e.deleted_at IS NULL AND c.deleted_at IS NULL
  `, [params.entryId, params.siteId, params.slug]);

  if (!rows[0]) {
    return json({ ok: false, code: 'NOT_FOUND', message: 'Entry not found or not published.' },
      { status: 404, headers: DELIVERY_CORS });
  }

  const r = rows[0];
  return json({
    ok: true,
    data: {
      id: r.id, collection_id: r.collection_id, status: r.status,
      data:       typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
      created_at: r.created_at, updated_at: r.updated_at,
    },
  }, { headers: DELIVERY_CORS });
};