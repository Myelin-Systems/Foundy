// =============================================================================
// src/routes/(api)/v1/billing/plans/+server.ts
// =============================================================================
// GET /v1/billing/plans  (api.foundiq.nl/v1/billing/plans)
//
// PUBLIC — no auth required.
// Returns all active plans. Used by the landing page pricing section
// and the onboarding plan picker.
//
// Success: { ok: true, plans: Plan[] }
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { MollieService }  from '$lib/server/services/payment/MollieService';

export const GET: RequestHandler = async () => {
  try {
    const mollie = bus.get<MollieService>('mollie');
    const plans  = await mollie.getPlans();

    return json({
      ok: true,
      plans: plans.map(p => ({
        slug:              p.slug,
        name:              p.name,
        price_month_cents: p.price_month_cents,
        price_year_cents:  p.price_year_cents,
        currency:          'EUR',
        interval:          p.interval,
        site_limit:        p.site_limit,
        api_calls_limit:   p.api_calls_limit,
        storage_mb:        p.storage_mb,
        features:          p.features,
      })),
    });

  } catch (err) {
    console.error('[billing/plans] Error:', err);
    return json(
      { ok: false, code: 'INTERNAL_ERROR', message: 'Failed to load plans.' },
      { status: 500 },
    );
  }
};