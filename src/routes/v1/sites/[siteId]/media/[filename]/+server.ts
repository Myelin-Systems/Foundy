// src/routes/v1/sites/[siteId]/media/[filename]/+server.ts
// GET /v1/sites/:siteId/media/:filename

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { bus }  from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import type { StorageService } from '$lib/server/services/foundy/StorageService';
import { requireDeliveryToken, assertSite, DELIVERY_CORS } from '$lib/server/utils/delivery-auth';

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: DELIVERY_CORS });

export const GET: RequestHandler = async ({ request, params }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;

  const db      = bus.get<DataService>('db');
  const storage = bus.get<StorageService>('storage');

  const { rows } = await db.query<{ id: string; name: string; key: string; mime_type: string; size: number; created_at: string }>(
    `SELECT id, name, key, mime_type, size, created_at
     FROM   media_files
     WHERE  site_id = $1 AND name = $2 AND deleted_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [params.siteId, params.filename]
  );

  if (!rows[0]) {
    return json({ ok: false, code: 'NOT_FOUND', message: `Media file "${params.filename}" not found.` },
      { status: 404, headers: DELIVERY_CORS });
  }

  const r = rows[0];
  return json({
    ok:   true,
    data: { id: r.id, name: r.name, url: storage.buildUrl(r.key), mime_type: r.mime_type, size: Number(r.size), created_at: r.created_at },
  }, { headers: DELIVERY_CORS });
};