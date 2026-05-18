// =============================================================================
// src/routes/api/auth/me/+server.ts
// =============================================================================
// GET /api/auth/me
//
// Returns the authenticated user's session payload.
// Used by the client to check if the session is still valid on page load.
//
// Success 200:  { ok: true, session: SessionPayload }
// Error   401:  { ok: false, code: 'AUTH_REQUIRED' | 'SESSION_INVALID' }
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const session = await requireSession(cookies);
    return json({ ok: true, session });
  } catch (err) {
    // requireSession throws a Response — re-throw it for SvelteKit to handle
    throw err;
  }
};
