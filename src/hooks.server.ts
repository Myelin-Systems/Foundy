// =============================================================================
// src/hooks.server.ts
// =============================================================================
// SvelteKit server hooks — runs once on startup and wraps every request.
// This is the ONLY file that calls bootstrap().
//
// Host-based routing:
//   foundiq.nl        → landing page only
//   app.foundiq.nl    → dashboard, auth, onboarding
//   api.foundiq.nl    → v1/* delivery API only
//
// Dashboard guard (app.foundiq.nl only):
//   /dashboard/*  — requires session + org membership
//                   no session      → /login
//                   session, no org → /onboarding
//                   session + org   → allow (resolve to /dashboard/cms if root)
// =============================================================================

import type { Handle }       from '@sveltejs/kit';
import { bootstrap }         from '$lib/server/framework/Bootstrap';
import { bus }               from '$lib/server/framework/services/bus/BusService';
import type { AuthService } from '$lib/server/services/auth/AuthService';
import type { OrgService }  from '$lib/server/services/organisation/OrgService';
import type { TokenService } from '$lib/server/services/auth/TokenService';

await bootstrap();




// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redirect(location: string, status: 301 | 302 = 302): Response {
  return new Response(null, { status, headers: { Location: location } });
}

function notFound(json = false): Response {
  if (json) {
    return new Response(
      JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Not found.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return new Response('Not found.', { status: 404 });
}

function extractToken(request: Request): string | null {
  const cookieName = bus.get<TokenService>('token').cookieName();
  
  const cookie = request.headers.get('cookie') ?? '';
  const match  = cookie.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  if (match) return decodeURIComponent(match[1]);

  const auth = request.headers.get('authorization') ?? '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  return null;
}

function withSecurityHeaders(response: Response): Response {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options',        'SAMEORIGIN');
  response.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin');
  return response;
}

// ---------------------------------------------------------------------------
// Dashboard guard
//
// Called for every request that targets /dashboard/* on app.foundiq.nl.
// Returns a redirect Response when the request must be bounced, or null when
// it should be allowed to proceed normally.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Onboarding guard
//
// /onboarding is only reachable when the user is authenticated.
// If they already have an org, skip onboarding and send them to the dashboard.
// ---------------------------------------------------------------------------
async function dashboardGuard(
  event: Parameters<Handle>[0]['event'],
): Promise<Response | null> {
  const token = extractToken(event.request);

  if (!token) {
    const next = encodeURIComponent(event.url.pathname + event.url.search);
    return redirect(`/login?next=${next}`);
  }

  let session: SessionPayload;
  try {
    const auth = bus.get<AuthService>('auth');
    session = await auth.getSession(token);
  } catch {
    // Covers both SERVICE_IDLE and auth errors (expired, invalid, etc.)
    const next = encodeURIComponent(event.url.pathname + event.url.search);
    return redirect(`/login?next=${next}`);
  }

  event.locals.session = session;

  let orgs: Array<Organisation & { role: string }>;
  try {
    const org = bus.get<OrgService>('org');
    orgs = await org.listForUser(session.sub);
  } catch {
    // org service down — fail safe, send to login
    return redirect('/login');
  }

  if (orgs.length === 0) return redirect('/onboarding');

  event.locals.memberships = orgs;

  if (event.url.pathname === '/dashboard' || event.url.pathname === '/dashboard/') {
    return redirect('/dashboard/cms');
  }

  return null;
}

async function onboardingGuard(
  event: Parameters<Handle>[0]['event'],
): Promise<Response | null> {
  const token = extractToken(event.request);

  if (!token) {
    const next = encodeURIComponent(event.url.pathname + event.url.search);
    return redirect(`/login?next=${next}`);
  }

  let session: SessionPayload;
  try {
    const auth = bus.get<AuthService>('auth');
    session = await auth.getSession(token);
  } catch {
    const next = encodeURIComponent(event.url.pathname + event.url.search);
    return redirect(`/login?next=${next}`);
  }

  event.locals.session = session;

  try {
    const org  = bus.get<OrgService>('org');
    const orgs = await org.listForUser(session.sub);

    if (orgs.length > 0) {
      event.locals.memberships = orgs;
      return redirect('/dashboard/cms');
    }
  } catch {
    // org service down — still allow onboarding page to render
    // the onboarding action itself will fail safely when it tries to create the org
  }

  return null;
}
// ---------------------------------------------------------------------------
// Main handle
// ---------------------------------------------------------------------------

export const handle: Handle = async ({ event, resolve }) => {

  event.locals.requestId = crypto.randomUUID();
  event.locals.requestAt = Date.now();

  const host     = event.request.headers.get('host') ?? '';
  const pathname = event.url.pathname;

  // ── Development — skip host routing ───────────────────────────────────────
  const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost');
  if (isDev) {
    // Still run the dashboard guard in dev so the flow is testable locally
    if (pathname.startsWith('/dashboard')) {
      const bounce = await dashboardGuard(event);
      if (bounce) return withSecurityHeaders(bounce);
    }
    return withSecurityHeaders(await resolve(event));
  }

  // ── api.foundiq.nl — only /v1/* ───────────────────────────────────────────
  if (host.startsWith('api.')) {
    if (!pathname.startsWith('/v1')) {
      return notFound(true);
    }
    return withSecurityHeaders(await resolve(event));
  }

  // ── app.foundiq.nl — dashboard, auth, onboarding, internal API ────────────
  if (host.startsWith('app.')) {
  const allowed = ['/dashboard', '/api', '/login', '/logout', '/register', '/onboarding'];
  const isAllowed = pathname === '/' || allowed.some(p => pathname.startsWith(p));
  if (!isAllowed) {
    return notFound(true);
  }

  // Guard runs before the root redirect so unauthenticated users
  // go straight to /login rather than /dashboard/cms → /login
  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    const bounce = await dashboardGuard(event);
    if (bounce) return withSecurityHeaders(bounce);
    // Authenticated + org: land on /dashboard/cms
    if (pathname === '/') return redirect('/dashboard/cms');
  }

  if (pathname.startsWith('/onboarding')) {
    const bounce = await onboardingGuard(event);
    if (bounce) return withSecurityHeaders(bounce);
  }

  return withSecurityHeaders(await resolve(event));
}

  // ── foundiq.nl — landing only, block internal paths ──────────────────────
  const blocked = ['/dashboard', '/onboarding', '/v1', '/api'];
  if (blocked.some(p => pathname.startsWith(p))) {
    return redirect('https://app.foundiq.nl');
  }

  return withSecurityHeaders(await resolve(event));
};