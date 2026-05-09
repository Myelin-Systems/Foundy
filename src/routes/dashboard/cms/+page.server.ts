import type { PageServerLoad }  from './$types';
import { requireSession }       from '$lib/server/utils/auth';
import { bus }                  from '$lib/server/framework/services/bus/BusService';
import type { DataService }     from '$lib/server/framework/services/database/DataService';
import type { UsageService }    from '$lib/server/services/foundiq/UsageService';
import type { OrgUsage }        from '$lib/server/services/foundiq/UsageService';
import type { Collection, Entry, Site, NavSection, SocialPost, MediaFile, CollectionField } from '$lib/cms/types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireSession(cookies);
  const db      = bus.get<DataService>('db');
  const usageSvc = bus.get<UsageService>('usage');

  
  const section      = (url.searchParams.get('section') ?? 'content') as NavSection;
  const collectionId =  url.searchParams.get('col')     ?? null;
  const siteParam    =  url.searchParams.get('site')    ?? null;
  const usage = await usageSvc.getOrgUsage(session.oid!);
  
  if (!session.oid) {
   return {
     session, sites: [], activeSiteId: null, activeSiteName: '', activeSiteDomain: '',
     collections: [] as Collection[], activeCollectionId: null,
     entries: [] as Entry[], mediaFiles: [] as MediaFile[],
     posts: [] as SocialPost[], apiToken: null as string | null,
     usage,
     section,
   };
  }

  // ── Usage ─────────────────────────────────────────────────────────────────
  
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

  const activeSiteId = activeSiteRow?.id ?? null;

  if (!activeSiteId) {
    throw redirect(302, '/dashboard/cms/setup');
  }

  // ── Collections ───────────────────────────────────────────────────────────
  const { rows: colRows } = await db.query<{
    id: string; name: string; color: string; fields: CollectionField[]; count: string;
  }>(
    `SELECT   c.id, c.name, c.color, c.fields, COUNT(e.id) AS count
     FROM     collections c
     LEFT JOIN entries    e ON e.collection_id = c.id AND e.deleted_at IS NULL
     WHERE    c.site_id = $1 AND c.deleted_at IS NULL
     GROUP BY c.id
     ORDER BY c.created_at ASC`,
    [activeSiteId]
  );

  const collections: Collection[] = colRows.map(r => ({
    id:     r.id,
    name:   r.name,
    color:  r.color,
    fields: Array.isArray(r.fields)
      ? r.fields
      : typeof r.fields === 'string' && r.fields
        ? JSON.parse(r.fields)
        : [],
    count:  parseInt(r.count, 10),
  }));

  const activeCollectionId =
    (collectionId && collections.some(c => c.id === collectionId))
      ? collectionId
      : (collections[0]?.id ?? null);

  // ── Section-specific data ─────────────────────────────────────────────────
  let entries:    Entry[]       = [];
  let mediaFiles: MediaFile[]   = [];
  let posts:      SocialPost[]  = [];
  let publicToken: string | null = null;
  let secretToken: string | null = null;


  if (section === 'content' && activeCollectionId) {
    const { rows } = await db.query<Entry>(
      `SELECT id, collection_id, status, data, updated_at
       FROM   entries
       WHERE  collection_id = $1 AND site_id = $2 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [activeCollectionId, activeSiteId]
    );
    entries = rows.map(e => ({
      ...e,
      data: typeof e.data === 'string' ? JSON.parse(e.data) : e.data,
    }));
  }

 if (section === 'api') {
  const { rows } = await db.query<{ token: string; type: string }>(
    `SELECT token, type FROM site_tokens
     WHERE  site_id = $1 AND revoked = false AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [activeSiteId]
  );
  publicToken = rows.find(r => r.type === 'public')?.token ?? null;
  secretToken = rows.find(r => r.type === 'secret')?.token ?? null;
}

  if (section === 'media') {
    const { rows } = await db.query(
      `SELECT id, name, key, mime_type, size, size/1048576.0 as size_mb
      FROM media_files WHERE site_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC`,
      [activeSiteId]
    );
    mediaFiles = rows;
  }
    

  return {
    session,
    sites,
    activeSiteId,
    activeSiteName:   activeSiteRow?.name   ?? '',
    activeSiteDomain: activeSiteRow?.domain ?? '',
    collections,
    activeCollectionId,
    entries,
    mediaFiles,
    posts,
    publicToken,
    secretToken,
    usage,
    section,
  };
};