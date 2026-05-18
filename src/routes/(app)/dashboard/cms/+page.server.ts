// =============================================================================
// src/routes/dashboard/cms/+page.server.ts
// =============================================================================

import type { PageServerLoad }  from './$types';
import { requireSession }       from '$lib/server/utils/auth';
import { bus }                  from '$lib/server/framework/services/bus/BusService';
import type { DataService }     from '$lib/server/framework/services/database/DataService';
import type { UsageService }    from '$lib/server/services/foundiq/UsageService';
import type { OrgUsage }        from '$lib/server/services/foundiq/UsageService';
import type { Collection, Entry, Site, NavSection, SocialPost, MediaFile, EntryStatus } from '$lib/cms/types';
import type { MollieService }   from '$lib/server/services/payment/MollieService';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session  = await requireSession(cookies);
  const db       = bus.get<DataService>('db');
  const usageSvc = bus.get<UsageService>('usage');

  const section      = (url.searchParams.get('section') ?? 'content') as NavSection;
  const collectionId =  url.searchParams.get('col')     ?? null;
  const siteParam    =  url.searchParams.get('site')    ?? null;
  const usage        = await usageSvc.getOrgUsage(session.oid!);

  if (!session.oid) {
    return {
      session,
      sites:              [] as Site[],
      activeSiteId:       null,
      activeSiteName:     '',
      activeSiteDomain:   '',
      collections:        [] as Collection[],
      activeCollectionId: null,
      entries:            [] as Entry[],
      mediaFiles:         [] as MediaFile[],
      posts:              [] as SocialPost[],
      publicToken:        null as string | null,
      secretToken:        null as string | null,
      usage,
      section,
      planSlug:           'cms_starter',
      planName:           'CMS Starter',
      subscription:       null,
      orgBilling:         null,
    };
  }

  // ── Subscription (ensure row exists, then load with plan name) ─────────────
  const mollie = bus.get<MollieService>('mollie');
  await mollie.getOrCreateSubscription(session.oid);

  const { rows: [subRow] } = await db.query<{
    status:               string;
    current_period_end:   string | null;
    cancel_at_period_end: boolean;
    plan_slug:            string;
    plan_name:            string;
  }>(
    `SELECT s.status,
            s.current_period_end,
            s.cancel_at_period_end,
            p.slug AS plan_slug,
            p.name AS plan_name
     FROM   subscriptions s
     JOIN   plans p ON p.id = s.plan_id
     WHERE  s.org_id = $1`,
    [session.oid]
  );

  const subscription = subRow ? {
    status:               subRow.status,
    current_period_end:   subRow.current_period_end,
    cancel_at_period_end: subRow.cancel_at_period_end,
    plan: { slug: subRow.plan_slug, name: subRow.plan_name },
  } : null;

  // ── Org billing info ──────────────────────────────────────────────────────
  const { rows: [orgRow] } = await db.query<{
    billing_name:        string | null;
    billing_country:     string | null;
    billing_address:     string | null;
    billing_postal_code: string | null;
    billing_city:        string | null;
    vat_number:          string | null;
  }>(
    `SELECT billing_name, billing_country, billing_address,
            billing_postal_code, billing_city, vat_number
     FROM   organisations
     WHERE  id = $1 AND deleted_at IS NULL`,
    [session.oid]
  );

  const orgBilling = orgRow ?? null;

  // ── Sites ─────────────────────────────────────────────────────────────────
  const { rows: siteRows } = await db.query<{
    id: string; name: string; slug: string; domain: string | null;
  }>(
    `SELECT id, name, slug, domain
     FROM   sites
     WHERE  org_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    [session.oid]
  );

  const sites: Site[] = siteRows.map(s => ({
    id: s.id, name: s.name, slug: s.slug, active: false,
  }));

  const activeSiteRow =
    (siteParam && siteRows.find(s => s.id === siteParam))
      ? siteRows.find(s => s.id === siteParam)!
      : siteRows[0] ?? null;

  sites.forEach(s => { s.active = s.id === activeSiteRow?.id; });

  const activeSiteId     = activeSiteRow?.id     ?? null;
  const activeSiteName   = activeSiteRow?.name   ?? '';
  const activeSiteDomain = activeSiteRow?.domain ?? '';

  // ── Collections ───────────────────────────────────────────────────────────
  let collections:        Collection[] = [];
  let activeCollectionId: string | null = null;

  if (activeSiteId) {
    const { rows: colRows } = await db.query<{
      id: string; name: string; color: string | null; fields: [];
    }>(
      `SELECT id, name, color, fields
      FROM   collections
      WHERE  site_id = $1 AND deleted_at IS NULL
      ORDER BY created_at ASC`,
      [activeSiteId]
    );

    collections = colRows.map(c => ({
      id:     c.id,
      name:   c.name,
      color:  c.color ?? '#4a6a8a',
      count:  0,
      fields: c.fields ?? [],
    }));

    const targetColId = collectionId ?? collections[0]?.id ?? null;
    activeCollectionId = targetColId;
  }

  // ── Entries ───────────────────────────────────────────────────────────────
  let entries:    Entry[]     = [];
  let mediaFiles: MediaFile[] = [];
  let publicToken: string | null = null;
  let secretToken: string | null = null;

  if (activeSiteId && activeCollectionId) {
    // const { rows: fieldRows } = await db.query<{
    //   id: string; name: string; type: string; required: boolean;
    //   position: number; options: unknown;
    // }>(
    //   `SELECT id, name, type, required, position, options
    //    FROM   collections
    //    WHERE  collection_id = $1 AND deleted_at IS NULL
    //    ORDER BY position ASC`,
    //   [activeCollectionId]
    // );

    // const activeCol = collections.find(c => c.id === activeCollectionId);
    // if (activeCol) activeCol.fields = fieldRows;

    const { rows: entryRows } = await db.query<{
      id: string; collection_id: string; data: unknown; status: EntryStatus;
      created_at: string; updated_at: string;
    }>(
      `SELECT id, collection_id, data, status, created_at, updated_at
       FROM   entries
       WHERE  collection_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [activeCollectionId]
    );

    entries = entryRows.map(e => ({
      id:            e.id,
      collection_id: e.collection_id,
      status:        e.status,
      data:          typeof e.data === 'string'
                      ? JSON.parse(e.data)
                      : e.data as Record<string, unknown>,
      updated_at:    e.updated_at,
    }));
  }

  if (activeSiteId) {
    // Tokens
    const { rows } = await db.query<{ type: string; token: string }>(
      `SELECT type, token FROM site_tokens WHERE site_id = $1 AND revoked = false`,
      [activeSiteId]
    );
    publicToken = rows.find(r => r.type === 'public')?.token ?? null;
    secretToken = rows.find(r => r.type === 'secret')?.token ?? null;

    // Media (loaded on demand by section, but always include for sidebar counts)
    if (section === 'media') {
      const { rows: mediaRows } = await db.query<{
        id: string; name: string; key: string; mime_type: string; size: number;
      }>(
        `SELECT id, name, key, mime_type, size
         FROM   media_files
         WHERE  site_id = $1 AND deleted_at IS NULL
         ORDER BY created_at DESC`,
        [activeSiteId]
      );
      mediaFiles = mediaRows;
    }
  }

  // ── Social posts ──────────────────────────────────────────────────────────
  const posts: SocialPost[] = [];

  return {
    session,
    sites,
    activeSiteId,
    activeSiteName,
    activeSiteDomain,
    collections,
    activeCollectionId,
    entries,
    mediaFiles,
    posts,
    publicToken,
    secretToken,
    usage,
    section,
    planSlug:     subRow?.plan_slug ?? 'cms_starter',
    planName:     subRow?.plan_name ?? 'CMS Starter',
    subscription,
    orgBilling,
  };
};