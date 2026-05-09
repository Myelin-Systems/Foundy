// src/lib/server/services/foundiq/CompanyService.ts
import type { IService }      from '$lib/server/framework/services/IServices';
import { bus }                from '$lib/server/framework/services/bus/BusService';
import type { DataService }   from '$lib/server/framework/services/database/DataService';

export interface Company {
  id:          string;
  owner_id:    string;
  name:        string;
  domain:      string | null;
  description: string | null;
  logo_url:    string | null;
  plan:        string;
  white_label: boolean;
  created_at:  string;
  updated_at:  string;
}

export interface CompanyMember {
  id:         string;
  company_id: string;
  user_id:    string;
  role:       'owner' | 'editor' | 'viewer';
  joined_at:  string;
}

export class CompanyService implements IService {
  readonly name    = 'company';
  readonly version = '1.0.0';
  readonly tags    = ['foundiq', 'company'];

  async init():        Promise<void>    {}
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return true; }

  private get db() { return bus.get<DataService>('db'); }

  // ── Company CRUD ─────────────────────────────────────────────────────────

  async create(ownerId: string, data: { name: string; domain?: string; description?: string }): Promise<Company> {
    const { rows } = await this.db.from<Company>('companies')
      .insert({ owner_id: ownerId, name: data.name, domain: data.domain ?? null, description: data.description ?? null })
      .returning()
      .run();

    const company = rows[0];

    // Auto-add owner as member
    await this.db.from<CompanyMember>('company_members')
      .insert({ company_id: company.id, user_id: ownerId, role: 'owner' })
      .run();

    return company;
  }

  async getByUserId(userId: string): Promise<Company | null> {
    // Find company where user is a member
    const { rows: memberships } = await this.db.query<{ company_id: string }>(
      `SELECT company_id FROM company_members WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (!memberships[0]) return null;

    return this.db.from<Company>('companies')
      .where('id', memberships[0].company_id)
      .first();
  }

  async getById(id: string): Promise<Company | null> {
    return this.db.from<Company>('companies').where('id', id).first();
  }

  async update(id: string, data: Partial<Pick<Company, 'name' | 'domain' | 'description' | 'logo_url' | 'white_label'>>): Promise<Company | null> {
    const { rows } = await this.db.from<Company>('companies')
      .where('id', id)
      .update(data)
      .returning()
      .run();
    return rows[0] ?? null;
  }

  // ── Membership ───────────────────────────────────────────────────────────

  async getMemberRole(companyId: string, userId: string): Promise<'owner' | 'editor' | 'viewer' | null> {
    const { rows } = await this.db.query<{ role: string }>(
      `SELECT role FROM company_members WHERE company_id = $1 AND user_id = $2 LIMIT 1`,
      [companyId, userId]
    );
    return (rows[0]?.role as any) ?? null;
  }

  async getMembers(companyId: string): Promise<Array<CompanyMember & { email: string; full_name: string }>> {
    const { rows } = await this.db.query<CompanyMember & { email: string; full_name: string }>(
      `SELECT cm.*, u.email, u.full_name
       FROM company_members cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.company_id = $1
       ORDER BY cm.joined_at ASC`,
      [companyId]
    );
    return rows;
  }

  async addMember(companyId: string, userId: string, role: 'editor' | 'viewer'): Promise<void> {
    await this.db.from<CompanyMember>('company_members')
      .insert({ company_id: companyId, user_id: userId, role })
      .run();
  }

  async removeMember(companyId: string, userId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM company_members WHERE company_id = $1 AND user_id = $2`,
      [companyId, userId]
    );
  }

  // ── Plan limits ──────────────────────────────────────────────────────────

  static siteLimits: Record<string, number> = {
    'starter':      1,
    'pro':          3,
    'business':     5,
    'agency-basic': 10,
    'agency-plus':  30,
    'agency-max':   Infinity,
  };

  maxSites(plan: string): number {
    return CompanyService.siteLimits[plan] ?? 1;
  }
}
