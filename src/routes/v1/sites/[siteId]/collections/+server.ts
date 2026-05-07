// COLLECTIONS — src/routes/v1/sites/[siteId]/collections/+server.ts
import type { RequestHandler as RH } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { bus }  from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';
import { requireDeliveryToken, assertSite, DELIVERY_CORS } from '$lib/server/utils/delivery-auth';

export const OPTIONS: RH = async () => new Response(null, { status: 204, headers: DELIVERY_CORS });

export const GET: RH = async ({ request, params }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;

  const db = bus.get<DataService>('db');
  const { rows } = await db.query<{ id: string; name: string; label: string; color: string; fields: unknown; entry_count: string }>(`
    SELECT c.id, c.name, c.label, c.color, c.fields, COUNT(e.id) AS entry_count
    FROM   collections c
    LEFT JOIN entries e ON e.collection_id = c.id AND e.deleted_at IS NULL AND e.status = 'published'
    WHERE  c.site_id = $1 AND c.deleted_at IS NULL
    GROUP BY c.id ORDER BY c.created_at ASC
  `, [params.siteId]);

  return json({
    ok: true,
    data: rows.map(r => ({
      id: r.id, name: r.name, label: r.label, color: r.color,
      fields:      typeof r.fields === 'string' ? JSON.parse(r.fields) : r.fields,
      entry_count: parseInt(r.entry_count, 10),
    })),
  }, { headers: DELIVERY_CORS });
};