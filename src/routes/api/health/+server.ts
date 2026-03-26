// =============================================================================
// src/routes/api/health/+server.ts
// =============================================================================
// GET /api/health
//
// Used by:
//   - Docker HEALTHCHECK
//   - Nginx upstream health probes
//   - Uptime monitors (UptimeRobot, Betterstack, etc.)
//
// Success 200:  { ok: true, status: 'healthy', services: [...] }
// Degraded 207: { ok: false, status: 'degraded', services: [...] }
//
// Returns 207 (Multi-Status) if any core service is not active,
// so nginx / load balancers can detect partial failures.
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';

export const GET: RequestHandler = async () => {
  const services = bus.status().map(s => ({
    name:    s.name,
    state:   s.state,
    runtime: s.runtime,
    version: s.version,
    uptime:  s.activatedAt ? Math.round((Date.now() - s.activatedAt) / 1000) : null,
  }));

  const allHealthy  = services
    .filter(s => s.runtime === 'always')
    .every(s => s.state === 'active');

  const status = allHealthy ? 200 : 207;

  return json(
    {
      ok:        allHealthy,
      status:    allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    },
    { status }
  );
};

// HEAD — Docker healthcheck uses this (cheaper than GET)
export const HEAD: RequestHandler = async () => {
  const allHealthy = bus.status()
    .filter(s => s.runtime === 'always')
    .every(s => s.state === 'active');

  return new Response(null, { status: allHealthy ? 200 : 503 });
};
