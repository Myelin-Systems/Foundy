// =============================================================================
// services/foundiq/UsageService.ts
// =============================================================================
// Single source of truth for plans, feature flags, and usage tracking.
// Replaces the old PlanService entirely.
// =============================================================================

import type { IService }    from '../../framework/services/IServices';
import { bus }              from '../../framework/services/bus/BusService';
import type { DataService } from '../../framework/services/database/DataService';
import { getPlan, isUnlimited, type Plan } from '$lib/shared/plans';
export type { Plan, PlanId, ProductFeature } from '$lib/shared/plans';

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtLimit(n: number): string {
  return isUnlimited(n) ? '∞' : n.toLocaleString();
}


// ── Types ─────────────────────────────────────────────────────────────────────

export interface SiteUsage {
  id:          string;
  name:        string;
  collections: number;
  entries:     number;
  db_bytes:    number;
  file_bytes:  number;
}

export interface OrgUsage {
  plan:              Plan;
  sites:             number;
  sites_limit:       number;
  entries:           number;
  entries_limit:     number;
  db_bytes:          number;
  db_limit_bytes:    number;
  file_bytes:        number;
  file_limit_bytes:  number;
  collections_limit: number;
  per_site:          SiteUsage[];
}

// ── UsageService ──────────────────────────────────────────────────────────────
export class UsageService implements IService {
 
  readonly name    = 'usage';
  readonly version = '1.1.0';
  readonly tags    = ['foundiq', 'usage'];
 
  async init():        Promise<void>    {}
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return true; }
 
  async getOrgUsage(orgId: string): Promise<OrgUsage> {
    const db = bus.get<DataService>('db');
 
    // ── Single join: org plan + pre-computed usage counters ───────────────────
    // org_usage is maintained incrementally — this query is O(1) regardless
    // of how many sites, entries, or files the org has.
    const { rows } = await db.query<{
  plan:             string;
  site_count:       string;
  collection_count: string;
  entry_count:      string;
  db_bytes:         string;
  file_bytes:       string;
}>(`
  SELECT
    COALESCE(p.slug, 'cms_starter') AS plan,
    COALESCE(u.site_count,       0) AS site_count,
    COALESCE(u.collection_count, 0) AS collection_count,
    COALESCE(u.entry_count,      0) AS entry_count,
    COALESCE(u.db_bytes,         0) AS db_bytes,
    COALESCE(u.file_bytes,       0) AS file_bytes
  FROM organisations o
  LEFT JOIN subscriptions s ON s.org_id = o.id
  LEFT JOIN plans p ON p.id = s.plan_id
  LEFT JOIN org_usage u ON u.org_id = o.id
  WHERE o.id = $1 AND o.deleted_at IS NULL
`, [orgId]);
 
    const row  = rows[0];
    const plan = getPlan(row?.plan ?? 'cms_starter');
 
    // ── Per-site breakdown — lightweight, just counts ─────────────────────────
    // No pg_column_size here — db_bytes and file_bytes are already in org_usage.
    // We only need per-site entry/collection counts for the breakdown table.
    const { rows: siteRows } = await db.query<{
      id:          string;
      name:        string;
      collections: string;
      entries:     string;
      db_bytes:    string;
      file_bytes:  string;
    }>(`
      SELECT
        s.id,
        s.name,
        COUNT(DISTINCT c.id)           AS collections,
        COUNT(DISTINCT e.id)           AS entries,
        COALESCE(SUM(e.data_bytes), 0) AS db_bytes,
        COALESCE(
          (SELECT SUM(size) FROM media_files
           WHERE site_id = s.id AND deleted_at IS NULL), 0
        )                              AS file_bytes
      FROM sites s
      LEFT JOIN collections c ON c.site_id      = s.id AND c.deleted_at IS NULL
      LEFT JOIN entries     e ON e.collection_id = c.id AND e.deleted_at IS NULL
      WHERE s.org_id     = $1
        AND s.deleted_at IS NULL
      GROUP BY s.id, s.name
      ORDER BY s.created_at ASC
    `, [orgId]);
 
    const per_site: SiteUsage[] = siteRows.map(r => ({
      id:          r.id,
      name:        r.name,
      collections: Number(r.collections) || 0,
      entries:     Number(r.entries) || 0,
      db_bytes:    Number(r.db_bytes) || 0,
      file_bytes:  Number(r.file_bytes) || 0,
    }));
 
    return {
      plan,
      sites:             Number(row?.site_count       ?? '0') || 0,
      sites_limit:       plan.limits.sites,
      entries:           Number(row?.entry_count      ?? '0') || 0,
      entries_limit:     plan.limits.entries,
      db_bytes:          Number(row?.db_bytes         ?? '0') || 0,
      db_limit_bytes:    plan.limits.db_bytes,
      file_bytes:        Number(row?.file_bytes       ?? '0') || 0,
      file_limit_bytes:  plan.limits.file_bytes,
      collections_limit: plan.limits.collections,
      per_site,
    };
  }
}