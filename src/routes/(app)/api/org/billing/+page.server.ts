// =============================================================================
// src/routes/dashboard/billing/+page.server.ts
// =============================================================================
// Landing pad for Mollie's post-payment redirect.
//
// Mollie redirects here with ?payment=pending after checkout.
// The webhook (/api/billing/webhook) handles the actual DB activation async.
// This page just forwards the status to the CMS so it can show a banner.
// =============================================================================

import { redirect }            from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const payment = url.searchParams.get('payment'); // 'pending' | null

  if (payment === 'pending') {
    throw redirect(303, '/dashboard/cms?payment=pending');
  }

  throw redirect(303, '/dashboard/cms');
};