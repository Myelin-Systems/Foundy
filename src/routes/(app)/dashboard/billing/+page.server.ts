// src/routes/dashboard/billing/+page.server.ts
import { redirect }        from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const payment = url.searchParams.get('payment'); // 'pending' | null

  // Mollie lands here after checkout. The webhook activates the subscription
  // async — we just forward the status to the CMS so it can show a banner.
  if (payment === 'pending') {
    throw redirect(303, '/dashboard/cms?payment=pending');
  }

  // Any other landing (e.g. someone navigates directly)
  throw redirect(303, '/dashboard/cms');
};