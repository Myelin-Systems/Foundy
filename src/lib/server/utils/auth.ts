// =============================================================================
// server/utils/auth.ts
// =============================================================================
// Shared helpers for all auth API routes and guarded pages.
//
// ── handleAuthError(err)     — converts any error → consistent JSON response
// ── requireSession(cookies)  — guards routes that need a logged-in user
// ── optionalSession(cookies) — reads session if present, null if not
// =============================================================================

import { json }              from '@sveltejs/kit';
import type { Cookies }      from '@sveltejs/kit';
import { AuthError }         from '$lib/server/services/auth/AuthService';
import { bus }               from '$lib/server/framework/services/bus/BusService';
import type { TokenService } from '$lib/server/services/auth/TokenService';
import type { AuthService }  from '$lib/server/services/auth/AuthService';
import type { SessionPayload } from '$lib/server/services/auth/TokenService';

// ── handleAuthError ───────────────────────────────────────────────────────────
// Converts any error thrown by AuthService into a typed JSON response.
// Use this in every auth +server.ts catch block.
//
// Usage:
//   try {
//     ...
//   } catch (err) {
//     return handleAuthError(err);
//   }

export function handleAuthError(err: unknown): Response {
  if (err instanceof AuthError) {
    return json(
      { ok: false, code: err.code, message: err.message },
      { status: err.status }
    );
  }

  // Never leak internal errors to the client
  console.error('[auth] Unexpected error:', err);
  return json(
    { ok: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    { status: 500 }
  );
}

// ── requireSession ────────────────────────────────────────────────────────────
// Guards any route that requires a logged-in user.
// - Verifies the cookie JWT (signature + expiry)
// - Validates the session still exists in the DB
// - Throws a 401 Response if anything is missing or invalid
//
// Usage in +page.server.ts:
//   export async function load({ cookies }) {
//     const session = await requireSession(cookies);
//     // session.sub   → user_id (UUID)
//     // session.email → user email
//     // session.role  → current role
//     // session.oid   → active org_id (may be undefined)
//     // session.sid   → DB session ID
//   }

export async function requireSession(cookies: Cookies): Promise<SessionPayload> {
  const token = bus.get<TokenService>('token');
  const raw   = cookies.get(token.cookieName());

  if (!raw) {
    throw json(
      { ok: false, code: 'AUTH_REQUIRED', message: 'You must be logged in.' },
      { status: 401 }
    );
  }

  try {
    const auth = bus.get<AuthService>('auth');
    return await auth.getSession(raw);
  } catch {
    // Clear a broken/expired cookie so the browser stops sending it
    cookies.delete(token.cookieName(), { path: '/' });
    throw json(
      { ok: false, code: 'SESSION_INVALID', message: 'Session expired. Please log in again.' },
      { status: 401 }
    );
  }
}

// ── optionalSession ───────────────────────────────────────────────────────────
// Like requireSession but returns null instead of throwing.
// Use for routes that behave differently when logged in (e.g. home page).

export async function optionalSession(cookies: Cookies): Promise<SessionPayload | null> {
  try {
    return await requireSession(cookies);
  } catch {
    return null;
  }
}

// ── setSessionCookie ──────────────────────────────────────────────────────────
// Set the session cookie after login/register.
// Always use this — never set the cookie manually in a route.

export function setSessionCookie(cookies: Cookies, token: string): void {
  const tokenSvc = bus.get<TokenService>('token');

  cookies.set(tokenSvc.cookieName(), token, {
    path:     '/',
    httpOnly: true,             // not readable by JS
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   tokenSvc.expirySeconds(),
  });
}

// ── clearSessionCookie ────────────────────────────────────────────────────────

export function clearSessionCookie(cookies: Cookies): void {
  const tokenSvc = bus.get<TokenService>('token');
  cookies.delete(tokenSvc.cookieName(), { path: '/' });
}
