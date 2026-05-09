// =============================================================================
// src/routes/api/cms/sites/[siteId]/media/+server.ts
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';
import type { StorageService } from '$lib/server/services/foundiq/StorageService';
import { ALLOWED_MIME_TYPES, MAX_FILE_BYTES } from '$lib/server/services/foundiq/StorageService';
import { getPlan }             from '$lib/shared/plans';
import { trackUsage }          from '$lib/server/utils/usage-tracker';

// ── GET — list files, build URLs at read time ─────────────────────────────────

export const GET: RequestHandler = async ({ cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db = bus.get<DataService>('db');

  const { rows: siteRows } = await db.query(
    `SELECT id FROM sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [params.siteId, session.oid]
  );
  if (!siteRows[0]) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  const { rows } = await db.query<{
    id: string; name: string; key: string; mime_type: string; size: string; created_at: string;
  }>(
    `SELECT id, name, key, mime_type, size, created_at
     FROM   media_files
     WHERE  site_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [params.siteId]
  );

  // Build URL at read time — never stored in DB
  const storage = bus.get<StorageService>('storage');

  return json({
    ok:    true,
    files: rows.map(r => ({
      id:        r.id,
      name:      r.name,
      key:       r.key,
      url:       storage.buildUrl(r.key),   // ← constructed here, not from DB
      mimeType:  r.mime_type,
      size:      parseInt(r.size, 10),
      size_mb:   parseInt(r.size, 10) / 1_048_576,
      createdAt: r.created_at,
    })),
  });
};

// ── POST — upload file, store key only, track usage ───────────────────────────

export const POST: RequestHandler = async ({ request, cookies, params }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const db = bus.get<DataService>('db');

  const { rows: siteRows } = await db.query(
    `SELECT id FROM sites WHERE id = $1 AND org_id = $2 AND deleted_at IS NULL`,
    [params.siteId, session.oid]
  );
  if (!siteRows[0]) return json({ ok: false, message: 'Site not found.' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ ok: false, message: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return json({ ok: false, message: 'No file provided. Use field name "file".' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return json({
      ok: false, message: `File type "${file.type}" is not allowed.`,
    }, { status: 415 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return json({
      ok: false, message: `File exceeds the 50 MB limit (${(file.size / 1_048_576).toFixed(1)} MB uploaded).`,
    }, { status: 413 });
  }

  // ── Tier limit check using pre-computed org_usage ─────────────────────────
  const { rows: usageRows } = await db.query<{ plan: string; file_bytes: string }>(
    `SELECT o.plan, COALESCE(u.file_bytes, 0) AS file_bytes
     FROM   organisations o
     LEFT JOIN org_usage u ON u.org_id = o.id
     WHERE  o.id = $1 AND o.deleted_at IS NULL`,
    [session.oid]
  );

  const usageRow  = usageRows[0];
  const plan      = getPlan(usageRow?.plan ?? 'cms_starter');
  const usedBytes = parseInt(usageRow?.file_bytes ?? '0', 10);
  const fileLimit = plan.limits.file_bytes;

  if (fileLimit !== -1 && usedBytes + file.size > fileLimit) {
    const remainingMb = Math.max(0, (fileLimit - usedBytes) / 1_048_576);
    return json({
      ok: false, code: 'STORAGE_LIMIT_REACHED',
      message: `Not enough storage. You have ${remainingMb.toFixed(0)} MB remaining on your ${plan.name} plan.`,
    }, { status: 403 });
  }

  // ── Upload to MinIO ───────────────────────────────────────────────────────
  const storage = bus.get<StorageService>('storage');
  const buffer  = Buffer.from(await file.arrayBuffer());

  let uploaded;
  try {
    uploaded = await storage.upload(params.siteId!, file.name, buffer, file.type);
  } catch (err) {
    console.error('[media POST] MinIO upload failed:', err);
    return json({ ok: false, message: 'File upload failed. Please try again.' }, { status: 500 });
  }

  // ── Save record — key only, no url ────────────────────────────────────────
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO media_files (site_id, name, key, mime_type, size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [params.siteId, file.name, uploaded.key, uploaded.mimeType, uploaded.size]
  );

  // ── Increment org usage ───────────────────────────────────────────────────
  await trackUsage(db, session.oid, { file_bytes: uploaded.size });

  return json({
    ok:   true,
    file: {
      id:       rows[0].id,
      name:     file.name,
      key:      uploaded.key,
      url:      uploaded.url,    // built in StorageService, not from DB
      mimeType: uploaded.mimeType,
      size:     uploaded.size,
      size_mb:  uploaded.size / 1_048_576,
    },
  }, { status: 201 });
};