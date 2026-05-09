// =============================================================================
// src/routes/api/billing/portal/+server.ts
// =============================================================================
// GET    /api/billing/portal  → current subscription + plan details
// DELETE /api/billing/portal  → cancel subscription (at period end)
// POST   /api/billing/portal  → change plan
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import { requireSession }      from '$lib/server/utils/auth';
import type { MollieService }  from '$lib/server/services/payment/MollieService';
import { PaymentError }        from '$lib/server/services/payment/MollieService';

// ── GET — current subscription ────────────────────────────────────────────────

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const session = await requireSession(cookies);

    if (!session.oid) {
      return json({ ok: false, code: 'NO_ORG', message: 'No organisation context.' }, { status: 400 });
    }

    const mollie = bus.get<MollieService>('mollie');
    const sub    = await mollie.getOrCreateSubscription(session.oid);

    return json({
      ok:  true,
      subscription: {
        status:               sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end:   sub.current_period_end,
        cancelled_at:         sub.cancelled_at,
      },
      plan: {
        slug:             sub.plan.slug,
        name:             sub.plan.name,
        price_cents:      sub.plan.price_cents,
        currency:         sub.plan.currency,
        interval:         sub.plan.interval,
        site_limit:       sub.plan.site_limit,
        api_calls_limit:  sub.plan.api_calls_limit,
        storage_mb:       sub.plan.storage_mb,
        features:         sub.plan.features,
      },
    });

  } catch (err) {
    return handlePaymentError(err);
  }
};

// ── DELETE — cancel subscription ──────────────────────────────────────────────

export const DELETE: RequestHandler = async ({ cookies, url }) => {
  try {
    const session   = await requireSession(cookies);
    const immediate = url.searchParams.get('immediate') === 'true';

    if (!session.oid) {
      return json({ ok: false, code: 'NO_ORG', message: 'No organisation context.' }, { status: 400 });
    }

    const mollie = bus.get<MollieService>('mollie');
    await mollie.cancelSubscription(session.oid, immediate);

    return json({
      ok:      true,
      message: immediate
        ? 'Subscription cancelled immediately.'
        : 'Subscription will cancel at the end of the current billing period.',
    });

  } catch (err) {
    return handlePaymentError(err);
  }
};

// ── POST — change plan ────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, cookies }) => {
  try {
    const session = await requireSession(cookies);

    if (!session.oid) {
      return json({ ok: false, code: 'NO_ORG', message: 'No organisation context.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.planSlug !== 'string') {
      return json({ ok: false, code: 'VALIDATION_ERROR', message: 'planSlug is required.' }, { status: 400 });
    }

    const mollie = bus.get<MollieService>('mollie');
    const result = await mollie.changePlan(
      session.oid,
      body.orgName ?? 'Foundiq Organisation',
      session.email,
      body.planSlug,
    );

    if (!result) {
      // Downgraded to free — no checkout needed
      return json({ ok: true, downgraded: true });
    }

    return json({ ok: true, checkoutUrl: result.checkoutUrl, paymentId: result.paymentId });

  } catch (err) {
    return handlePaymentError(err);
  }
};

// ── Shared error handler ──────────────────────────────────────────────────────

function handlePaymentError(err: unknown): Response {
  if (err instanceof PaymentError) {
    return json(
      { ok: false, code: err.code, message: err.message },
      { status: err.status }
    );
  }
  console.error('[billing/portal] Unexpected error:', err);
  return json(
    { ok: false, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' },
    { status: 500 }
  );
}