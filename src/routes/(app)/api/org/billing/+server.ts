// =============================================================================
// src/routes/api/org/billing/+server.ts
// =============================================================================
// PATCH /api/org/billing
//
// Saves billing metadata (country, VAT, address) on the org row.
// These columns are owned by the PaymentAdapter via schema extensions.
//
// Body: {
//   billing_name?:        string | null,
//   billing_country:      string,        ← required (2-char ISO)
//   billing_address?:     string | null,
//   billing_postal_code?: string | null,
//   billing_city?:        string | null,
//   vat_number?:          string | null,
// }
// =============================================================================

import type { RequestHandler } from '@sveltejs/kit';
import { json }                from '@sveltejs/kit';
import { requireSession }      from '$lib/server/utils/auth';
import { bus }                 from '$lib/server/framework/services/bus/BusService';
import type { DataService }    from '$lib/server/framework/services/database/DataService';

const EU_COUNTRIES = new Set([
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR',
  'HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO',
  'SE','SI','SK',
]);

export const PATCH: RequestHandler = async ({ request, cookies }) => {
  const session = await requireSession(cookies);

  if (!session.oid) {
    return json({ ok: false, code: 'NO_ORG', message: 'No active organisation.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return json({ ok: false, message: 'Invalid JSON.' }, { status: 400 });

  const country = (body.billing_country ?? '').toString().trim().toUpperCase();
  if (!country) {
    return json({ ok: false, message: 'billing_country is required.' }, { status: 400 });
  }

  // Validate VAT format loosely if provided + EU country
  const vat = (body.vat_number ?? '').toString().trim() || null;
  if (vat && EU_COUNTRIES.has(country) && vat.length < 8) {
    return json({ ok: false, message: 'VAT number looks too short.' }, { status: 400 });
  }

  const db = bus.get<DataService>('db');

  await db.query(
    `UPDATE organisations
     SET billing_name        = $1,
         billing_country     = $2,
         billing_address     = $3,
         billing_postal_code = $4,
         billing_city        = $5,
         vat_number          = $6,
         updated_at          = NOW()
     WHERE id = $7 AND deleted_at IS NULL`,
    [
      (body.billing_name        ?? '').toString().trim() || null,
      country,
      (body.billing_address     ?? '').toString().trim() || null,
      (body.billing_postal_code ?? '').toString().trim() || null,
      (body.billing_city        ?? '').toString().trim() || null,
      vat,
      session.oid,
    ]
  );

  return json({ ok: true });
};