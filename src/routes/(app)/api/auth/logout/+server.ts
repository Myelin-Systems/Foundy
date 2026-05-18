// =============================================================================
// src/routes/api/auth/logout/+server.ts
// =============================================================================
// POST /api/auth/logout
//
// No body required — reads session from cookie.
// Deletes the DB session + clears the cookie.
//
// Success 200:  { ok: true }
// Always succeeds — even if token is already expired or missing.
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { AuthService }    from '$lib/server/services/auth/AuthService';
import type { TokenService }   from '$lib/server/services/auth/TokenService';
import { clearSessionCookie }  from '$lib/server/utils/auth';

export const POST: RequestHandler = async ({ cookies }) => {
  try {
    const tokenSvc = bus.get<TokenService>('token');
    const raw      = cookies.get(tokenSvc.cookieName());

    if (raw) {
      const auth = bus.get<AuthService>('auth');
      await auth.logout(raw); // silently handles expired/invalid tokens
    }
  } catch {
    // Swallow all errors — logout should always succeed from the client's perspective
  }

  clearSessionCookie(cookies);

  return json({ ok: true });
};
