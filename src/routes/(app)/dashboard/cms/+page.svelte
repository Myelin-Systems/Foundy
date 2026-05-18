<!-- src/routes/dashboard/cms/+page.svelte -->
<script lang="ts">
  import '$lib/cms/cms.css';
  import { page }          from '$app/state';
  import { goto }          from '$app/navigation';

  import TopBar            from '$lib/cms/components/TopBar.svelte';
  import IconSidebar       from '$lib/cms/components/IconSidebar.svelte';
  import CollectionSidebar from '$lib/cms/components/CollectionSidebar.svelte';
  import EntriesView       from '$lib/cms/components/EntriesView.svelte';
  import MediaView         from '$lib/cms/components/MediaView.svelte';
  import SocialView        from '$lib/cms/components/SocialView.svelte';
  import APIView           from '$lib/cms/components/APIView.svelte';
  import SettingsView      from '$lib/cms/components/SettingsView.svelte';
  import { cmsTheme }      from '$lib/cms/theme.svelte';

  import type { NavSection, Collection, Site, Entry, MediaFile, SocialPost } from '$lib/cms/types';
  import type { SessionPayload } from '$lib/server/services/auth/TokenService';
  import type { OrgUsage }       from '$lib/server/services/foundiq/UsageService';

  interface PageData {
    session:            SessionPayload;
    sites:              Site[];
    activeSiteId:       string | null;
    activeSiteName:     string;
    activeSiteDomain:   string;
    collections:        Collection[];
    activeCollectionId: string | null;
    entries:            Entry[];
    mediaFiles:         MediaFile[];
    posts:              SocialPost[];
    publicToken:        string | null;
    secretToken:        string | null;
    usage:              OrgUsage;
    section:            NavSection;
    planSlug:           string;
    planName:           string;
    subscription: {
      status:               string;
      current_period_end:   string | null;
      cancel_at_period_end: boolean;
      plan: { slug: string; name: string };
    } | null;
    orgBilling: {
      billing_name:        string | null;
      billing_country:     string | null;
      billing_address:     string | null;
      billing_postal_code: string | null;
      billing_city:        string | null;
      vat_number:          string | null;
    } | null;
  }

  const { data }: { data: PageData } = $props();

  const siteId = $derived(
    page.url.searchParams.get('site') ?? data.activeSiteId ?? ''
  );

  const section = $derived(
    (page.url.searchParams.get('section') ?? 'content') as NavSection
  );

  const activeCollectionId = $derived(
    page.url.searchParams.get('col') ?? data.activeCollectionId ?? ''
  );

  const collection = $derived(
    data.collections.find(c => c.id === activeCollectionId) ??
    data.collections[0] ??
    { id: '', name: 'No collections yet', count: 0, color: '#4a6a8a', fields: [] }
  );

  function sitePrefix(): string {
    return siteId ? `site=${siteId}&` : '';
  }

  function setSection(s: NavSection) {
    const col = s === 'content' ? `col=${activeCollectionId}&` : '';
    goto(`?${sitePrefix()}section=${s}&${col}`.replace(/&$/, ''), { replaceState: false });
  }

  function setCollection(c: Collection) {
    goto(`?${sitePrefix()}section=content&col=${c.id}`, { replaceState: true });
  }

  function handleCollectionDeleted(deleted: Collection) {
    if (activeCollectionId === deleted.id) {
      const next = data.collections.find(c => c.id !== deleted.id) ?? null;
      page.url.searchParams.set('col', next ? next.id : '');
    }
  }
</script>

<svelte:head><title>CMS — Pando</title></svelte:head>

<div class="cms-shell" data-theme={cmsTheme.value}>
  <TopBar
    sites={data.sites}
    activeSiteId={siteId}
    userInitial={data.session.email[0].toUpperCase()}
    planSlug={data.planSlug}
    planName={data.planName}
  />

  <div class="cms-body">
    <IconSidebar active={section} onselect={setSection} />

    {#if section === 'content'}
      <CollectionSidebar
        collections={data.collections}
        active={collection}
        onselect={setCollection}
        ondelete={handleCollectionDeleted}
        siteId={siteId}
        usage={data.usage}
      />
    {/if}

    <main class="cms-main" aria-label="Content area">
      {#if section === 'content'}
        <EntriesView
          {collection}
          entries={data.entries}
          siteId={siteId}
        />
      {:else if section === 'media'}
        <MediaView
          siteId={siteId}
          mediaFiles={data.mediaFiles}
          usage={data.usage}
        />
      {:else if section === 'social'}
        <SocialView
          siteId={siteId}
          posts={data.posts}
        />
      {:else if section === 'api'}
        <APIView
          siteId={siteId}
          publicToken={data.publicToken}
          secretToken={data.secretToken}
        />
      {:else if section === 'settings'}
        <SettingsView
          siteId={siteId}
          session={data.session}
          siteName={data.activeSiteName}
          siteDomain={data.activeSiteDomain}
          usage={data.usage}
          subscription={data.subscription}
          orgBilling={data.orgBilling}
        />
      {/if}
    </main>
  </div>
</div>

<style>
  .cms-body { display: flex; flex: 1; overflow: hidden; }
  .cms-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
</style>