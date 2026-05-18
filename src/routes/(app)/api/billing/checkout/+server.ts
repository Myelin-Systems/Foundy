// =============================================================================
// src/routes/(app)/api/billing/checkout/+server.ts
// =============================================================================
// POST /api/billing/checkout
//
// Creates a Mollie checkout session for the given plan.
// Requires an active authenticated session — user must be in an org.
//
// Body:    { planSlug: string, billingCycle?: 'month' | 'year', orgName?: string }
// Success: { ok: true, checkoutUrl: string, paymentId: string, invoiceId: string }
// Error:   { ok: false, code: string, message: string }
//
// BILLING_INCOMPLETE (422) → client should redirect to /onboarding/billing
// =============================================================================

import type { RequestHandler }  from '@sveltejs/kit';
import { json }                  from '@sveltejs/kit';
import { bus }                   from '$lib/server/framework/services/bus/BusService';
import { requireSession }        from '$lib/server/utils/auth';
import type { MollieService }    from '$lib/server/services/payment/MollieService';
import { PaymentError }          from '$lib/server/services/payment/MollieService';

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const session = await requireSession(cookies);

    if (!session.oid) {
      return json(
        { ok: false, code: 'NO_ORG', message: 'You must be part of an organisation to subscribe.' },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.planSlug !== 'string') {
      return json(
        { ok: false, code: 'VALIDATION_ERROR', message: 'planSlug is required.' },
        { status: 400 },
      );
    }

    const mollie = bus.get<MollieService>('mollie');
    const result = await mollie.createCheckout({
      orgId:        session.oid,
      orgName:      body.orgName ?? 'Foundiq Organisation',
      planSlug:     body.planSlug,
      userEmail:    session.email,
      billingCycle: body.billingCycle ?? 'month',
      billingCountry: body.billingCountry ?? null,
    });

    return json({ ok: true, ...result });

  } catch (err) {
    if (err instanceof PaymentError) {
      return json(
        { ok: false, code: err.code, message: err.message },
        { status: err.status },
      );
    }
    console.error('[billing/checkout] Unexpected error:', err);
    return json(
      { ok: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
};