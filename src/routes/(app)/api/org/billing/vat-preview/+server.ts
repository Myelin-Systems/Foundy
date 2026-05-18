import { json }           from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireSession } from '$lib/server/utils/auth';

const EU_VAT_RATES: Record<string, number> = {
  AT: 20, BE: 21, BG: 20, CY: 19, CZ: 21, DE: 19,
  DK: 25, EE: 22, ES: 21, FI: 25, FR: 20, GR: 24,
  HR: 25, HU: 27, IE: 23, IT: 22, LT: 21, LU: 17,
  LV: 21, MT: 18, NL: 21, PL: 23, PT: 23, RO: 19,
  SE: 25, SI: 22, SK: 20,
};

const OSS_REGISTERED = process.env.OSS_REGISTERED === 'true';

export const POST: RequestHandler = async ({ request, cookies }) => {
  await requireSession(cookies);

  const body       = await request.json();
  const country    = ((body.billing_country ?? '') as string).toUpperCase();
  const vatNumber  = ((body.vat_number      ?? '') as string).trim() || null;

  const euRate = EU_VAT_RATES[country];
  const isEu   = euRate !== undefined;

  // B2B EU reverse charge
  if (vatNumber && isEu) {
    return json({ ok: true, vatRate: 0, reverseCharge: true });
  }

  // Non-EU
  if (!isEu) {
    return json({ ok: true, vatRate: 0, reverseCharge: false });
  }

  // EU B2C — OSS aware
  const rate = OSS_REGISTERED ? euRate : 21;
  return json({ ok: true, vatRate: rate, reverseCharge: false });
};