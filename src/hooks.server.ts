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
// =============================================================================

import type { Handle }  from '@sveltejs/kit';
import { bootstrap }    from '$lib/server/framework/Bootstrap';

await bootstrap();

export const handle: Handle = async ({ event, resolve }) => {

  // Attach request metadata for logging / tracing
  event.locals.requestId = crypto.randomUUID();
  event.locals.requestAt = Date.now();

  // ── Host-based routing ─────────────────────────────────────────────────────
  const host     = event.request.headers.get('host') ?? '';
  const pathname = event.url.pathname;

  // In development — skip host routing, alles is toegestaan
  const isDev = process.env.NODE_ENV === 'development' || host.includes('localhost');
  if (isDev) {
    const response = await resolve(event);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options',        'SAMEORIGIN');
    response.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin');
    return response;
  }

  // ... rest van de host routing
  // api.foundiq.nl — only v1/* delivery routes allowed
  if (host.startsWith('api.')) {
    if (!pathname.startsWith('/v1')) {
      return new Response(
        JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // app.foundiq.nl — dashboard, auth, onboarding, internal API only
  if (host.startsWith('app.')) {
    const allowed = [
      '/dashboard',
      '/api',
      '/login',
      '/logout',
      '/register',
      '/onboarding',
    ];
    const isAllowed = allowed.some(p => pathname.startsWith(p));
    if (!isAllowed) {
      // Redirect root to dashboard
      if (pathname === '/') {
        return new Response(null, {
          status: 302,
          headers: { Location: '/dashboard' },
        });
      }
      return new Response(
        JSON.stringify({ ok: false, code: 'NOT_FOUND', message: 'Not found.' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // foundiq.nl — landing page only, block dashboard/api/v1
  if (!host.startsWith('app.') && !host.startsWith('api.')) {
    const blocked = ['/dashboard', '/onboarding', '/v1'];
    const isBlocked = blocked.some(p => pathname.startsWith(p));
    if (isBlocked) {
      return new Response(null, {
        status: 302,
        headers: { Location: 'https://app.foundiq.nl' },
      });
    }
  }

  // ── Per-request handler ────────────────────────────────────────────────────
  const response = await resolve(event);

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options',        'SAMEORIGIN');
  response.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin');

  return response;
};   