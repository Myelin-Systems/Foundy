// =============================================================================
// src/routes/api/auth/login/+server.ts
// =============================================================================
// POST /api/auth/login
//
// Body:  { email, password }
// Sets: httpOnly session cookie
//
// Success 200:  { ok: true, user: PublicUser }
// Error   401:  { ok: false, code: 'INVALID_CREDENTIALS', message }
// Error   400:  { ok: false, code: 'VALIDATION_ERROR', message }
// =============================================================================

import type { RequestHandler }  from '@sveltejs/kit';
import { json }                 from '@sveltejs/kit';
import { bus }                  from '$lib/server/framework/services/bus/BusService';
import type { AuthService }     from '$lib/server/services/auth/AuthService';
import { handleAuthError, setSessionCookie } from '$lib/server/utils/auth';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Request body must be JSON.' }, { status: 400 });
    }

    const { email, password } = body as Record<string, unknown>;

    if (!email || typeof email !== 'string') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Email is required.', field: 'email' }, { status: 400 });
    }
    if (!password || typeof password !== 'string') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'Password is required.', field: 'password' }, { status: 400 });
    }

    const auth   = bus.get<AuthService>('auth');
    const result = await auth.login({
      email,
      password,
      ipAddress: getClientAddress(),
      userAgent: request.headers.get('user-agent') ?? undefined,
    });

    setSessionCookie(cookies, result.token);

    return json({ ok: true, user: result.user });

  } catch (err) {
    return handleAuthError(err);
  }
};
