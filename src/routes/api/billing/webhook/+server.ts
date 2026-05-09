// =============================================================================
// src/routes/api/billing/webhook/+server.ts
// =============================================================================
// POST /api/billing/webhook
//
// Receives all payment status updates from Mollie.
// Mollie sends: { id: 'tr_xxxxx' } — we fetch the full payment ourselves.
//
// This endpoint MUST return 200 quickly — Mollie will retry on non-200.
// All heavy processing is fire-and-forget after returning 200.
//
// Mollie retries on failure: 5min, 10min, 30min, 1h, 2h, 4h, 8h, 16h, 24h
//
// Security: Mollie does not sign webhooks — verification is done by fetching
// the payment directly from their API (if we can get it, it's legitimate).
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { bus }                  from '$lib/server/framework/services/bus/BusService';
import type { MollieService }   from '$lib/server/services/payment/MollieService';

export const POST: RequestHandler = async ({ request }) => {
  // Parse the form-encoded body Mollie sends
  let paymentId: string | null = null;

  try {
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text   = await request.text();
      const params = new URLSearchParams(text);
      paymentId    = params.get('id');
    } else {
      // Some Mollie test calls send JSON
      const body = await request.json().catch(() => null);
      paymentId  = body?.id ?? null;
    }
  } catch {
    // Return 200 even on parse error — Mollie will retry otherwise
    console.error('[billing/webhook] Failed to parse webhook body');
    return new Response('ok', { status: 200 });
  }

  if (!paymentId) {
    console.warn('[billing/webhook] No payment ID in webhook');
    return new Response('ok', { status: 200 });
  }

  // Process async — return 200 immediately so Mollie doesn't retry
  processWebhook(paymentId).catch(err => {
    console.error(`[billing/webhook] Error processing payment ${paymentId}:`, err);
  });

  return new Response('ok', { status: 200 });
};

async function processWebhook(paymentId: string): Promise<void> {
  try {
    const mollie = bus.get<MollieService>('mollie');
    await mollie.handleWebhook(paymentId);
    console.log(`[billing/webhook] Processed payment: ${paymentId}`);
  } catch (err) {
    // Log but don't throw — the 200 was already sent
    console.error(`[billing/webhook] handleWebhook failed for ${paymentId}:`, err);
  }
}