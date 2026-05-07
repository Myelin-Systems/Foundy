// src/lib/server/services/social/SocialAccountService.ts
import type { IService }    from '$lib/server/framework/services/IServices';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';
import {
  exchangeCode, getLongLivedToken,
  getPages, getIgAccount,
  buildOAuthUrl,
  type FacebookPage,
} from './MetaApiClient';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export type Platform = 'facebook' | 'instagram';

export interface SocialAccount {
  id:           string;
  org_id:   string;
  platform:     Platform;
  platform_id:  string;
  username:     string;
  display_name: string | null;
  avatar_url:   string | null;
  access_token: string;   // encrypted in DB
  token_expiry: string | null;
  active:       boolean;
  meta:         Record<string, unknown>;
  created_at:   string;
  updated_at:   string;
}

// Public shape — no token exposed to the frontend
export type PublicAccount = Omit<SocialAccount, 'access_token'>;

export class SocialAccountService implements IService {
  readonly name    = 'social-account';
  readonly version = '1.0.0';
  readonly tags    = ['social', 'account'];

  private encKey!: Buffer;  // 32-byte AES-256 key from env

  async init(): Promise<void> {
    const raw = process.env.TOKEN_ENCRYPTION_KEY;
    if (!raw || raw.length < 32) throw new Error(
      '[social-account] TOKEN_ENCRYPTION_KEY must be at least 32 chars. ' +
      'Generate: openssl rand -hex 32'
    );
    this.encKey = Buffer.from(raw.slice(0, 32));
  }

  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return !!this.encKey; }

  private get db() { return bus.get<DataService>('db'); }

  // ── Encryption ────────────────────────────────────────────────────────────
  // Tokens are encrypted at rest. The IV is prepended to the ciphertext.

  private encrypt(plain: string): string {
    const iv     = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encKey, iv);
    const enc    = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + enc.toString('hex');
  }

  private decrypt(stored: string): string {
    const [ivHex, encHex] = stored.split(':');
    const iv      = Buffer.from(ivHex, 'hex');
    const enc     = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.encKey, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  // ── OAuth helpers ─────────────────────────────────────────────────────────

  buildConnectUrl(state: string): string {
    return buildOAuthUrl(
      process.env.META_APP_ID!,
      process.env.META_REDIRECT_URI!,
      state,
    );
  }

  // Called from the OAuth callback route.
  // Exchanges the code for tokens, fetches all pages + linked IG accounts,
  // upserts them all into social_accounts.
  async handleCallback(orgId: string, code: string): Promise<PublicAccount[]> {
    const appId     = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const redirect  = process.env.META_REDIRECT_URI!;

    // Step 1 — short-lived → long-lived user token
    const shortToken = await exchangeCode(appId, appSecret, redirect, code);
    const longToken  = await getLongLivedToken(appId, appSecret, shortToken.access_token);
    const userToken  = longToken.access_token;

    // Step 2 — list all pages the user manages
    const pages = await getPages(userToken);
    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. Make sure you have admin access to at least one Page.');
    }

    const upserted: PublicAccount[] = [];

    for (const page of pages) {
      // Upsert the Facebook Page account
      const fbAccount = await this.upsert(orgId, {
        platform:     'facebook',
        platform_id:  page.id,
        username:     page.name,
        display_name: page.name,
        avatar_url:   page.picture?.data?.url ?? null,
        access_token: page.access_token,
        token_expiry: null,  // page tokens can be non-expiring
        meta: { category: page.category, fan_count: page.fan_count },
      });
      upserted.push(fbAccount);

      // Check for linked Instagram Business account
      const ig = await getIgAccount(page.id, page.access_token);
      if (ig) {
        const igAccount = await this.upsert(orgId, {
          platform:     'instagram',
          platform_id:  ig.id,
          username:     ig.username,
          display_name: ig.name,
          avatar_url:   ig.profile_picture_url ?? null,
          access_token: page.access_token,  // Instagram uses the page token
          token_expiry: null,
          meta: {
            ig_user_id:      ig.id,
            facebook_page_id: page.id,
            followers_count:  ig.followers_count,
          },
        });
        upserted.push(igAccount);
      }
    }

    return upserted;
  }

  private async upsert(orgId: string, data: {
    platform:     Platform;
    platform_id:  string;
    username:     string;
    display_name: string | null;
    avatar_url:   string | null;
    access_token: string;
    token_expiry: string | null;
    meta:         Record<string, unknown>;
  }): Promise<PublicAccount> {
    const encrypted = this.encrypt(data.access_token);

    const { rows } = await this.db.query<SocialAccount>(`
      INSERT INTO social_accounts
        (org_id, platform, platform_id, username, display_name, avatar_url,
         access_token, token_expiry, active, meta)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)
      ON CONFLICT (org_id, platform, platform_id)
      DO UPDATE SET
        username     = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url   = EXCLUDED.avatar_url,
        access_token = EXCLUDED.access_token,
        token_expiry = EXCLUDED.token_expiry,
        active       = true,
        meta         = EXCLUDED.meta,
        updated_at   = NOW()
      RETURNING *
    `, [
      orgId, data.platform, data.platform_id,
      data.username, data.display_name, data.avatar_url,
      encrypted, data.token_expiry, JSON.stringify(data.meta),
    ]);

    return this.toPublic(rows[0]);
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async listByOrg(orgId: string): Promise<PublicAccount[]> {
    const { rows } = await this.db.from<SocialAccount>('social_accounts')
      .where('org_id', orgId)
      .where('active', true)
      .orderBy('platform', 'asc')
      .run();
    return rows.map(r => this.toPublic(r));
  }

  async getById(id: string, orgId: string): Promise<SocialAccount | null> {
    const account = await this.db.from<SocialAccount>('social_accounts')
      .where('id', id)
      .where('org_id', orgId)
      .first();
    if (!account) return null;
    // Decrypt for internal use
    account.access_token = this.decrypt(account.access_token);
    return account;
  }

  async disconnect(id: string, orgId: string): Promise<void> {
    await this.db.from<SocialAccount>('social_accounts')
      .where('id', id)
      .where('org_id', orgId)
      .update({ active: false } as any)
      .run();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private toPublic(account: SocialAccount): PublicAccount {
    const { access_token, ...rest } = account;
    return rest;
  }
}
