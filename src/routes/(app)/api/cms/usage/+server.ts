// =============================================================================
// src/routes/api/cms/usage/+server.ts
// =============================================================================
// GET /api/cms/usage
//
// Returns full org-level usage breakdown — all sites, total entries,
// DB bytes consumed, file bytes (stubbed until MinIO lands).
//
// Success 200: { ok: true, usage: OrgUsage }
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { UsageService }        from '$lib/server/services/foundiq/UsageService';

export const GET: RequestHandler = async ({ cookies }) => {
  const session = await requireSession(cookies);
  if (!session.oid) return json({ ok: false, message: 'No active organisation.' }, { status: 403 });

  const svc   = new UsageService();
  const usage = await svc.getOrgUsage(session.oid);

  return json({ ok: true, usage });
};