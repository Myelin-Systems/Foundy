// =============================================================================
// src/hooks.server.ts
// =============================================================================
// SvelteKit server hooks — runs once on startup and wraps every request.
// This is the ONLY file that calls bootstrap().
//
// Place this file at:  src/hooks.server.ts
// =============================================================================

import type { Handle }  from '@sveltejs/kit';
import { bootstrap }    from '$lib/server/framework/Bootstrap';

// ── One-time startup ──────────────────────────────────────────────────────────
// bootstrap() is guarded internally so it only runs once even if this
// module is hot-reloaded during development.

await bootstrap();

// ── Per-request handler ───────────────────────────────────────────────────────
// Runs for every incoming HTTP request.
// Add global middleware here (e.g. CORS headers, request IDs, rate limiting).

export const handle: Handle = async ({ event, resolve }) => {

  // Attach request metadata for logging / tracing
  event.locals.requestId  = crypto.randomUUID();
  event.locals.requestAt  = Date.now();

  const response = await resolve(event);

  // Security headers on every response
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options',        'SAMEORIGIN');
  response.headers.set('Referrer-Policy',        'strict-origin-when-cross-origin');

  return response;
};


// ── SvelteKit app.d.ts additions ──────────────────────────────────────────────
// Add these to src/app.d.ts:
//
// declare global {
//   namespace App {
//     interface Locals {
//       requestId:  string;
//       requestAt:  number;
//     }
//   }
// }
