// =============================================================================
// lib/server/utils/usage-tracker.ts
// =============================================================================
// Single function every endpoint calls when data changes.
// Uses INSERT ... ON CONFLICT DO UPDATE so the row is created on first use
// and updated atomically on every subsequent call.
//
// All deltas can be negative (for deletes).
//
// Usage:
//   await trackUsage(db, orgId, { entry_count: 1, db_bytes: 2048 });
//   await trackUsage(db, orgId, { entry_count: -1, db_bytes: -2048 });
// =============================================================================

import type { DataService } from '$lib/server/framework/services/database/DataService';

export interface UsageDelta {
  site_count?:       number;
  collection_count?: number;
  entry_count?:      number;
  db_bytes?:         number;
  file_bytes?:       number;
}

export async function trackUsage(
  db:    DataService,
  orgId: string,
  delta: UsageDelta,
): Promise<void> {
  // Build the SET clause dynamically from whichever fields are provided
  const fields = Object.entries(delta).filter(([, v]) => v !== undefined && v !== 0);
  if (fields.length === 0) return;

  const setClauses = fields
    .map(([col]) => `${col} = GREATEST(0, org_usage.${col} + EXCLUDED.${col})`)
    .join(', ');

  const insertCols   = ['org_id', ...fields.map(([col]) => col)].join(', ');
  const insertVals   = ['$1',     ...fields.map((_, i) => `$${i + 2}`)].join(', ');
  const insertParams = [orgId,    ...fields.map(([, v]) => v)];

  await db.query(
    `INSERT INTO org_usage (${insertCols}, updated_at)
     VALUES (${insertVals}, NOW())
     ON CONFLICT (org_id) DO UPDATE
     SET ${setClauses},
         updated_at = NOW()`,
    insertParams
  );
}