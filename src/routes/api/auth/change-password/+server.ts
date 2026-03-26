// =============================================================================
// src/routes/api/auth/change-password/+server.ts
// =============================================================================
// POST /api/auth/change-password
//
// Body:  { currentPassword, newPassword }
// Requires: active session cookie
// Invalidates ALL existing sessions on success (forces re-login on other devices).
//
// Success 200:  { ok: true }
// Error   401:  { ok: false, code: 'INVALID_CREDENTIALS' }
// Error   422:  { ok: false, code: 'WEAK_PASSWORD' }
// =============================================================================

import type { RequestHandler }  from '@sveltejs/kit';
import { json }                 from '@sveltejs/kit';
import { bus }                  from '$lib/server/framework/services/bus/BusService';
import type { AuthService }     from '$lib/server/services/auth/AuthService';
import { requireSession, handleAuthError, clearSessionCookie } from '$lib/server/utils/auth';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const session = await requireSession(cookies);

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Request body must be JSON.' }, { status: 400 });
    }

    const { currentPassword, newPassword } = body as Record<string, unknown>;

    if (typeof currentPassword !== 'string' || !currentPassword) {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Current password is required.', field: 'currentPassword' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || !newPassword) {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'New password is required.', field: 'newPassword' }, { status: 400 });
    }
    if (currentPassword === newPassword) {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'New password must be different from your current password.', field: 'newPassword' }, { status: 400 });
    }

    const auth = bus.get<AuthService>('auth');
    await auth.changePassword({
      userId:          session.sub,
      currentPassword,
      newPassword,
    });

    // All sessions were invalidated — clear this one too so client re-logs in
    clearSessionCookie(cookies);

    return json({ ok: true, message: 'Password changed. Please log in again.' });

  } catch (err) {
    return handleAuthError(err);
  }
};
