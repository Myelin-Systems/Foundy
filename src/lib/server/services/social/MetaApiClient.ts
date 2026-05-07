// src/lib/server/services/social/MetaApiClient.ts
// Thin wrapper around the Meta Graph API.
// Every method is typed and throws MetaApiError on failure.
// Never import this outside SocialAccountService or SocialPostService.

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly code:       number,
    public readonly subcode?:   number,
    public readonly userMsg?:   string,
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

const BASE = 'https://graph.facebook.com/v19.0';

async function call<T>(
  path:    string,
  method:  'GET' | 'POST' | 'DELETE' = 'GET',
  params:  Record<string, string | number | boolean> = {},
  token?:  string,
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (token) params['access_token'] = token;

  let init: RequestInit;
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    init = { method: 'GET' };
  } else {
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) body.set(k, String(v));
    init = { method, body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } };
  }

  const res  = await fetch(url.toString(), init);
  const data = await res.json();

  if (data.error) {
    throw new MetaApiError(
      data.error.message,
      data.error.code,
      data.error.error_subcode,
      data.error.error_user_msg,
    );
  }
  return data as T;
}


// ── OAuth ─────────────────────────────────────────────────────────────────────

export function buildOAuthUrl(appId: string, redirectUri: string, state: string): string {
  const scopes = [
    'pages_show_list',
    'pages_manage_posts',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
  ].join(',');

  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id',     appId);
  url.searchParams.set('redirect_uri',  redirectUri);
  url.searchParams.set('scope',         scopes);
  url.searchParams.set('state',         state);
  url.searchParams.set('response_type', 'code');
  return url.toString();
}

export async function exchangeCode(
  appId:       string,
  appSecret:   string,
  redirectUri: string,
  code:        string,
): Promise<{ access_token: string; token_type: string }> {
  return call('/oauth/access_token', 'GET', {
    client_id:     appId,
    client_secret: appSecret,
    redirect_uri:  redirectUri,
    code,
  });
}

export async function getLongLivedToken(
  appId:       string,
  appSecret:   string,
  shortToken:  string,
): Promise<{ access_token: string; token_type: string; expires_in: number }> {
  return call('/oauth/access_token', 'GET', {
    grant_type:        'fb_exchange_token',
    client_id:         appId,
    client_secret:     appSecret,
    fb_exchange_token: shortToken,
  });
}


// ── Pages ─────────────────────────────────────────────────────────────────────

export interface FacebookPage {
  id:           string;
  name:         string;
  access_token: string;  // long-lived page token
  category?:    string;
  fan_count?:   number;
  picture?:     { data: { url: string } };
}

export async function getPages(userToken: string): Promise<FacebookPage[]> {
  const res = await call<{ data: FacebookPage[] }>(
    '/me/accounts',
    'GET',
    { fields: 'id,name,access_token,category,fan_count,picture{url}' },
    userToken,
  );
  return res.data ?? [];
}


// ── Instagram ─────────────────────────────────────────────────────────────────

export interface IgAccount {
  id:       string;
  name:     string;
  username: string;
  profile_picture_url?: string;
  followers_count?:     number;
}

export async function getIgAccount(pageId: string, pageToken: string): Promise<IgAccount | null> {
  try {
    const res = await call<{ instagram_business_account?: IgAccount }>(
      `/${pageId}`,
      'GET',
      { fields: 'instagram_business_account{id,name,username,profile_picture_url,followers_count}' },
      pageToken,
    );
    return res.instagram_business_account ?? null;
  } catch {
    return null;
  }
}


// ── Publishing ────────────────────────────────────────────────────────────────

export interface PublishResult {
  id: string;  // platform post ID
}

// Facebook Page post (text, link, or with image)
export async function postToFacebookPage(
  pageId:    string,
  pageToken: string,
  content:   string,
  mediaUrl?: string,  // optional single image URL
  link?:     string,  // optional link preview
): Promise<PublishResult> {
  const params: Record<string, string> = {
    message: content,
    access_token: pageToken,
  };
  if (link)     params['link']     = link;
  if (mediaUrl) params['url']      = mediaUrl;  // for photos endpoint

  const endpoint = mediaUrl ? `/${pageId}/photos` : `/${pageId}/feed`;
  return call<PublishResult>(endpoint, 'POST', params);
}

// Instagram image post — two steps: create container → publish
export async function postToInstagram(
  igUserId:  string,
  pageToken: string,
  caption:   string,
  imageUrl:  string,   // must be a public HTTPS URL
): Promise<PublishResult> {
  // Step 1: create media container
  const container = await call<{ id: string }>(
    `/${igUserId}/media`,
    'POST',
    { image_url: imageUrl, caption, access_token: pageToken },
  );

  // Step 2: publish the container
  return call<PublishResult>(
    `/${igUserId}/media_publish`,
    'POST',
    { creation_id: container.id, access_token: pageToken },
  );
}

// Instagram carousel (multiple images)
export async function postCarouselToInstagram(
  igUserId:  string,
  pageToken: string,
  caption:   string,
  imageUrls: string[],  // 2–10 images
): Promise<PublishResult> {
  // Step 1: create a container for each image
  const childIds = await Promise.all(
    imageUrls.map(url =>
      call<{ id: string }>(
        `/${igUserId}/media`,
        'POST',
        { image_url: url, is_carousel_item: true, access_token: pageToken },
      ).then(r => r.id)
    )
  );

  // Step 2: create carousel container
  const carousel = await call<{ id: string }>(
    `/${igUserId}/media`,
    'POST',
    {
      media_type:  'CAROUSEL',
      children:    childIds.join(','),
      caption,
      access_token: pageToken,
    },
  );

  // Step 3: publish
  return call<PublishResult>(
    `/${igUserId}/media_publish`,
    'POST',
    { creation_id: carousel.id, access_token: pageToken },
  );
}


// ── Insights ──────────────────────────────────────────────────────────────────

export interface PageInsights {
  impressions: number;
  reach:       number;
  engagements: number;
}

export async function getFacebookPostInsights(
  postId:    string,
  pageToken: string,
): Promise<PageInsights> {
  const metrics = 'post_impressions,post_reach,post_engaged_users';
  const res = await call<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
    `/${postId}/insights`,
    'GET',
    { metric: metrics },
    pageToken,
  );

  const find = (name: string) =>
    res.data.find(m => m.name === name)?.values?.[0]?.value ?? 0;

  return {
    impressions: find('post_impressions'),
    reach:       find('post_reach'),
    engagements: find('post_engaged_users'),
  };
}

export async function getIgMediaInsights(
  mediaId:   string,
  pageToken: string,
): Promise<PageInsights> {
  const res = await call<{ data: Array<{ name: string; values: Array<{ value: number }> }> }>(
    `/${mediaId}/insights`,
    'GET',
    { metric: 'impressions,reach,engagement' },
    pageToken,
  );

  const find = (name: string) =>
    res.data.find(m => m.name === name)?.values?.[0]?.value ?? 0;

  return {
    impressions: find('impressions'),
    reach:       find('reach'),
    engagements: find('engagement'),
  };
}
