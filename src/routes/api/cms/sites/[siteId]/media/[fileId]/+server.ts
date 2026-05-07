// =============================================================================
// src/routes/api/cms/sites/[siteId]/media/[fileId]/+server.ts
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import type { StorageService } from '$lib/server/services/foundy/StorageService';
import { trackUsage }          from '$lib/server/utils/usage-tracker';

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db = bus.get<DataService>('db');

  const { rows } = await db.query<{ key: string; size: number }>(
    `SELECT m.key, m.size
     FROM   media_files m
     JOIN   sites       s ON s.id = m.site_id
     WHERE  m.id         = $1
       AND  s.id         = $2
       AND  s.org_id     = $3
       AND  m.deleted_at IS NULL
       AND  s.deleted_at IS NULL`,
    [params.fileId, params.siteId, session.oid]
  );

  const file = rows[0];
  if (!file) return json({ ok: false, message: 'File not found.' }, { status: 404 });

  // Soft delete DB record first
  await db.query(
    `UPDATE media_files SET deleted_at = NOW() WHERE id = $1`,
    [params.fileId]
  );

  // Decrement org usage
  await trackUsage(db, session.oid, { file_bytes: -file.size });

  // Remove from MinIO — soft-delete already done so UI updates immediately.
  // If MinIO removal fails the object becomes orphaned but is not visible.
  try {
    const storage = bus.get<StorageService>('storage');
    await storage.delete(file.key);
  } catch (err) {
    console.error('[media DELETE] MinIO removal failed — record soft-deleted:', err);
  }

  return json({ ok: true });
};