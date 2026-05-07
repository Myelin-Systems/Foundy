// src/lib/server/services/foundy/SiteService.ts
import type { IService }    from '$lib/server/framework/services/IServices';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';
import jwt                  from 'jsonwebtoken';

export interface Site {
  id:         string;
  org_id: string;
  domain:     string;
  created_at: string;
  updated_at: string;
}

export interface SiteToken {
  id:      string;
  site_id: string;
  token:   string;
  revoked: boolean;
}

export class SiteService implements IService {
  readonly name    = 'site';
  readonly version = '1.0.0';
  readonly tags    = ['foundy', 'site'];

  private jwtSecret!: string;

  async init(): Promise<void> {
    this.jwtSecret = process.env.JWT_SECRET!;
  }
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return !!this.jwtSecret; }

  private get db() { return bus.get<DataService>('db'); }

  // ── Sites ────────────────────────────────────────────────────────────────

  async listByOrg(orgId: string): Promise<Site[]> {
    const { rows } = await this.db.from<Site>('sites')
      .where('org_id', orgId)
      .orderBy('created_at', 'asc')
      .run();
    return rows;
  }

  async getById(id: string, orgId: string): Promise<Site | null> {
    return this.db.from<Site>('sites')
      .where('id', id)
      .where('org_id', orgId)
      .first();
  }

  async create(orgId: string, domain: string): Promise<{ site: Site; token: SiteToken }> {
    const { rows } = await this.db.from<Site>('sites')
      .insert({ org_id: orgId, domain: domain.toLowerCase().trim() })
      .returning()
      .run();

    const site = rows[0];
    const token = await this.issueToken(site);
    return { site, token };
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db.from<Site>('sites')
      .where('id', id)
      .where('org_id', orgId)
      .delete()
      .run();
  }

  // ── Tokens ───────────────────────────────────────────────────────────────

  async getToken(siteId: string): Promise<SiteToken | null> {
    return this.db.from<SiteToken>('site_tokens')
      .where('site_id', siteId)
      .where('revoked', false)
      .first();
  }

  async rotateToken(siteId: string, domain: string): Promise<SiteToken> {
    // Revoke existing tokens
    await this.db.from<SiteToken>('site_tokens')
      .where('site_id', siteId)
      .update({ revoked: true })
      .run();

    // Issue new one
    const site: Partial<Site> = { id: siteId, domain };
    return this.issueToken(site as Site);
  }

  async verifyToken(raw: string): Promise<{ siteId: string; domain: string; permissions: string[] } | null> {
    try {
      const payload = jwt.verify(raw, this.jwtSecret) as any;
      // Confirm token is not revoked
      const token = await this.db.from<SiteToken>('site_tokens')
        .where('token', raw)
        .where('revoked', false)
        .first();
      if (!token) return null;
      return { siteId: payload.siteId, domain: payload.domain, permissions: payload.permissions };
    } catch {
      return null;
    }
  }

  private async issueToken(site: Site): Promise<SiteToken> {
    const raw = jwt.sign(
      { siteId: site.id, domain: site.domain, permissions: ['read:content'] },
      this.jwtSecret,
      { expiresIn: '365d' }
    );

    const { rows } = await this.db.from<SiteToken>('site_tokens')
      .insert({ site_id: site.id, token: raw, revoked: false })
      .returning()
      .run();

    return rows[0];
  }
}
