// src/lib/server/services/social/SocialPostService.ts
import type { IService }    from '$lib/server/framework/services/IServices';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';
import { SocialAccountService } from './SocialAccountService';
import {
  postToFacebookPage,
  postToInstagram,
  postCarouselToInstagram,
  MetaApiError,
} from './MetaApiClient';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'partial' | 'failed';

export interface SocialPost {
  id:               string;
  org_id:       string;
  created_by:       string;
  content:          string;
  media_urls:       string[];
  account_ids:      string[];
  status:           PostStatus;
  scheduled_at:     string | null;
  published_at:     string | null;
  platform_results: Record<string, PlatformResult>;
  tags:             string[];
  notes:            string | null;
  created_at:       string;
  updated_at:       string;
}

export interface PlatformResult {
  platform_post_id: string | null;
  url:              string | null;
  error:            string | null;
  published_at:     string | null;
}

export class SocialPostService implements IService {
  readonly name    = 'social-post';
  readonly version = '1.0.0';
  readonly tags    = ['social', 'post'];

  async init():        Promise<void>    {}
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return true; }

  private get db()       { return bus.get<DataService>('db'); }
  private get accounts() { return bus.get<SocialAccountService>('social-account'); }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async list(orgId: string, opts: {
    status?: PostStatus;
    limit?:  number;
  } = {}): Promise<SocialPost[]> {
    let q = this.db.from<SocialPost>('social_posts')
      .where('org_id', orgId)
      .orderBy('created_at', 'desc');
    if (opts.status) q = q.where('status', opts.status);
    if (opts.limit)  q = q.limit(opts.limit);
    const { rows } = await q.run();
    return rows;
  }

  async getById(id: string, orgId: string): Promise<SocialPost | null> {
    return this.db.from<SocialPost>('social_posts')
      .where('id', id)
      .where('org_id', orgId)
      .first();
  }

  async create(orgId: string, userId: string, data: {
    content:      string;
    media_urls:   string[];
    account_ids:  string[];
    scheduled_at: string | null;
    tags:         string[];
    notes:        string | null;
  }): Promise<SocialPost> {
    const status: PostStatus = data.scheduled_at ? 'scheduled' : 'draft';

    const { rows } = await this.db.from<SocialPost>('social_posts')
      .insert({
        org_id:       orgId,
        created_by:       userId,
        content:          data.content,
        media_urls:       data.media_urls as any,
        account_ids:      data.account_ids as any,
        status,
        scheduled_at:     data.scheduled_at,
        platform_results: {} as any,
        tags:             data.tags as any,
        notes:            data.notes,
      })
      .returning()
      .run();
    return rows[0];
  }

  async update(id: string, orgId: string, data: Partial<{
    content:      string;
    media_urls:   string[];
    account_ids:  string[];
    scheduled_at: string | null;
    tags:         string[];
    notes:        string | null;
    status:       PostStatus;
  }>): Promise<SocialPost | null> {
    const { rows } = await this.db.from<SocialPost>('social_posts')
      .where('id', id)
      .where('org_id', orgId)
      .update(data as any)
      .returning()
      .run();
    return rows[0] ?? null;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db.from<SocialPost>('social_posts')
      .where('id', id)
      .where('org_id', orgId)
      .delete()
      .run();
  }

  // ── Publishing ────────────────────────────────────────────────────────────
  // Publishes to ALL targeted accounts in parallel.
  // Updates platform_results with per-account success/failure.
  // Sets status to: published (all ok) | partial (some failed) | failed (all failed)

  async publish(id: string, orgId: string): Promise<SocialPost> {
    const post = await this.getById(id, orgId);
    if (!post) throw new Error('Post not found.');
    if (post.status === 'published') throw new Error('Post is already published.');

    // Mark as publishing
    await this.db.from<SocialPost>('social_posts')
      .where('id', id)
      .update({ status: 'publishing' } as any)
      .run();

    // Publish to each account in parallel
    const results = await Promise.allSettled(
      post.account_ids.map(accountId => this.publishToAccount(post, accountId, orgId))
    );

    // Build platform_results map
    const platformResults: Record<string, PlatformResult> = {};
    let successCount = 0;

    for (let i = 0; i < post.account_ids.length; i++) {
      const accountId = post.account_ids[i];
      const result    = results[i];

      if (result.status === 'fulfilled') {
        platformResults[accountId] = result.value;
        successCount++;
      } else {
        const err = result.reason;
        platformResults[accountId] = {
          platform_post_id: null,
          url:              null,
          error:            err instanceof MetaApiError
            ? (err.userMsg ?? err.message)
            : String(err),
          published_at: null,
        };
      }
    }

    const total  = post.account_ids.length;
    const status: PostStatus =
      successCount === total  ? 'published' :
      successCount === 0      ? 'failed'    : 'partial';

    const { rows } = await this.db.query<SocialPost>(`
      UPDATE social_posts
      SET status           = $1,
          platform_results = $2,
          published_at     = $3,
          updated_at       = NOW()
      WHERE id = $4 AND org_id = $5
      RETURNING *
    `, [
      status,
      JSON.stringify(platformResults),
      status !== 'failed' ? new Date().toISOString() : null,
      id,
      orgId,
    ]);

    return rows[0];
  }

  private async publishToAccount(
    post:      SocialPost,
    accountId: string,
    orgId: string,
  ): Promise<PlatformResult> {
    const account = await this.accounts.getById(accountId, orgId);
    if (!account) throw new Error(`Account ${accountId} not found.`);

    const { platform, access_token, platform_id, meta } = account;
    const hasMedia = post.media_urls.length > 0;
    let result: { id: string };

    if (platform === 'facebook') {
      result = await postToFacebookPage(
        platform_id,
        access_token,
        post.content,
        hasMedia ? post.media_urls[0] : undefined,
      );
      return {
        platform_post_id: result.id,
        url:              `https://facebook.com/${result.id}`,
        error:            null,
        published_at:     new Date().toISOString(),
      };
    }

    if (platform === 'instagram') {
      if (!hasMedia) throw new Error('Instagram requires at least one image.');
      const igUserId = String((meta as any).ig_user_id ?? platform_id);

      if (post.media_urls.length === 1) {
        result = await postToInstagram(igUserId, access_token, post.content, post.media_urls[0]);
      } else {
        result = await postCarouselToInstagram(igUserId, access_token, post.content, post.media_urls);
      }
      return {
        platform_post_id: result.id,
        url:              `https://instagram.com/p/${result.id}`,
        error:            null,
        published_at:     new Date().toISOString(),
      };
    }

    throw new Error(`Unsupported platform: ${platform}`);
  }

  // ── Scheduled post runner ─────────────────────────────────────────────────
  // Call this from a cron job endpoint every minute.
  // Publishes all posts where scheduled_at <= NOW() and status = 'scheduled'.

  async runScheduled(orgId?: string): Promise<number> {
    let sql = `
      SELECT id, org_id FROM social_posts
      WHERE status = 'scheduled'
        AND scheduled_at <= NOW()
    `;
    const params: string[] = [];
    if (orgId) { sql += ` AND org_id = $1`; params.push(orgId); }

    const { rows } = await this.db.query<{ id: string; org_id: string }>(sql, params);
    if (rows.length === 0) return 0;

    await Promise.allSettled(
      rows.map(r => this.publish(r.id, r.org_id))
    );
    return rows.length;
  }
}
