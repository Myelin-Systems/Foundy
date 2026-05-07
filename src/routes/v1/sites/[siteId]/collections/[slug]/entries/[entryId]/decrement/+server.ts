// src/routes/v1/sites/[siteId]/collections/[slug]/entries/[entryId]/decrement/+server.ts
// POST — public key allowed (called from payment webhook on their server)
// Body: { field?, quantity?, order_id, order_data? }

import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { bus }  from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';
import { requireDeliveryToken, assertSite, NO_CACHE_CORS } from '$lib/server/utils/delivery-auth';

export const OPTIONS: RequestHandler = async () => new Response(null, { status: 204, headers: NO_CACHE_CORS });

export const POST: RequestHandler = async ({ request, params }) => {
  const auth = await requireDeliveryToken(request);
  if (auth instanceof Response) return auth;
  const forbidden = assertSite(auth, params.siteId!);
  if (forbidden) return forbidden;

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, code: 'INVALID_BODY', message: 'Request body must be JSON.' }, { status: 400, headers: NO_CACHE_CORS });

  const { field = 'stock', quantity = 1, order_id, order_data = {} } = body as {
    field?: string; quantity?: number; order_id: string; order_data?: Record<string, unknown>;
  };

  if (!order_id) return json({ ok: false, code: 'MISSING_ORDER_ID', message: 'order_id is required for idempotency.' }, { status: 400, headers: NO_CACHE_CORS });
  if (!Number.isInteger(quantity) || quantity < 1) return json({ ok: false, code: 'INVALID_QUANTITY', message: 'quantity must be a positive integer.' }, { status: 400, headers: NO_CACHE_CORS });

  const safeField = field.replace(/[^a-z0-9_]/gi, '');
  if (!safeField) return json({ ok: false, code: 'INVALID_FIELD', message: 'Invalid field name.' }, { status: 400, headers: NO_CACHE_CORS });

  const db = bus.get<DataService>('db');

  // Idempotency — check if already processed
  const { rows: existingRows } = await db.query<{ id: string; data: unknown }>(
    `SELECT e.id, e.data FROM entries e JOIN collections c ON c.id = e.collection_id
     WHERE  c.site_id = $1 AND c.name = '_orders'
       AND  e.data->>'order_id' = $2 AND e.data->>'entry_id' = $3 AND e.deleted_at IS NULL`,
    [params.siteId, order_id, params.entryId]
  );

  if (existingRows[0]) {
    const d = typeof existingRows[0].data === 'string' ? JSON.parse(existingRows[0].data) : existingRows[0].data;
    return json({ ok: true, code: 'ALREADY_PROCESSED', message: 'This order has already been processed.', remaining: d.stock_after ?? 0 }, { headers: NO_CACHE_CORS });
  }

  // Atomic decrement
  const { rows } = await db.query<{ stock_after: number }>(
    `UPDATE entries
     SET    data       = jsonb_set(data, '{${safeField}}', to_jsonb(GREATEST(0, (data->>'${safeField}')::int - $1))),
            updated_at = NOW()
     WHERE  id = $2 AND site_id = $3 AND status = 'published' AND deleted_at IS NULL
       AND  (data->>'${safeField}')::int >= $1
     RETURNING (data->>'${safeField}')::int AS stock_after`,
    [quantity, params.entryId, params.siteId]
  );

  if (!rows[0]) {
    const { rows: checkRows } = await db.query<{ stock: string }>(
      `SELECT data->>'${safeField}' AS stock FROM entries WHERE id = $1 AND site_id = $2 AND deleted_at IS NULL`,
      [params.entryId, params.siteId]
    );
    if (!checkRows[0]) return json({ ok: false, code: 'NOT_FOUND', message: 'Entry not found.' }, { status: 404, headers: NO_CACHE_CORS });
    const current = parseInt(checkRows[0].stock ?? '0', 10);
    return json({ ok: false, code: 'OUT_OF_STOCK', message: `Insufficient stock. Requested ${quantity}, available ${current}.`, remaining: current }, { status: 409, headers: NO_CACHE_CORS });
  }

  const stockAfter = rows[0].stock_after;

  // Write order record to _orders collection
  try {
    const { rows: colRows } = await db.query<{ id: string }>(
      `INSERT INTO collections (site_id, name, label, color, fields)
       VALUES ($1, '_orders', 'Orders', '#00ff9d', '[]'::jsonb)
       ON CONFLICT (site_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [params.siteId]
    );
    const dataJson = JSON.stringify({ order_id, entry_id: params.entryId, field: safeField, quantity, stock_after: stockAfter, processed_at: new Date().toISOString(), ...order_data });
    await db.query(
      `INSERT INTO entries (site_id, collection_id, status, data, data_bytes)
       VALUES ($1, $2, 'published', $3::jsonb, pg_column_size($3::jsonb))`,
      [params.siteId, colRows[0].id, dataJson]
    );
  } catch (err) {
    console.error('[decrement] Failed to write order record:', err);
  }

  return json({ ok: true, remaining: stockAfter }, { headers: NO_CACHE_CORS });
};