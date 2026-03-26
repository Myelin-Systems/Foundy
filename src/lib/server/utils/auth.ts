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
import { AuthError }         from '../services/auth/AuthService';
import { bus }               from '../framework/services/bus/BusService';
import type { TokenService } from '../services/auth/TokenService';
import type { AuthService }  from '../services/auth/AuthService';
import type { SessionPayload } from '../services/auth/TokenService';

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

import { redirect, error } from '@sveltejs/kit'; // Use these instead of json

export async function requireSession(cookies: Cookies): Promise<SessionPayload> {
  const tokenSvc = bus.get<TokenService>('token');
  const authSvc  = bus.get<AuthService>('auth');

  // 1. Safety check: Is the bus actually booted?
  if (!tokenSvc || !authSvc) {
    console.error('[auth] Services not found on bus. Is the bus booted?');
    throw error(503, 'System is starting up... please refresh.');
  }

  const raw = cookies.get(tokenSvc.cookieName());

  // 2. If no cookie, redirect to login (don't throw JSON)
  if (!raw) {
    throw redirect(303, '/login');
  }

  try {
    return await authSvc.getSession(raw);
  } catch (err) {
    console.error("[getSession] JWT Verification failed:", err.message);
    // 3. ONLY delete cookie if it's a genuine AuthError from the service
    // This prevents deleting cookies if the DB is just temporarily down.
    if (err instanceof AuthError && (err.status === 401 || err.status === 403)) {
      cookies.delete(tokenSvc.cookieName(), { path: '/' });
      throw redirect(303, '/login');
    }

    // If it's a 500 or 503, just show the error page so they can refresh
    throw error(500, 'Session validation failed. Please try again.');
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
