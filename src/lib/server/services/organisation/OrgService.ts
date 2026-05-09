// =============================================================================
// services/organisation/OrgService.ts
// =============================================================================
// Standalone organisation management service.
// Usable in any project — no Foundiq-specific logic.
// =============================================================================

import type { IService }    from '$lib/server/framework/services/IServices';
import { bus }              from '$lib/server/framework/services/bus/BusService';
import type { DataService } from '$lib/server/framework/services/database/DataService';

export interface Organisation {
  id:          string;
  name:        string;
  slug:        string;
  plan:        string;
  description: string | null;
  logo_url:    string | null;
  domain:      string | null;
  white_label: boolean;
  meta:        Record<string, unknown>;
  created_at:  string;
  updated_at:  string;
  deleted_at:  string | null;
}

export interface OrgMember {
  id:        string;
  org_id:    string;
  user_id:   string;
  role:      string;
  joined_at: string;
}

export interface OrgMemberWithUser extends OrgMember {
  email:     string;
  full_name: string;
}

export class OrgService implements IService {
  readonly name    = 'org';
  readonly version = '1.0.0';
  readonly tags    = ['organisation'];

  async init():        Promise<void>    {}
  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return true; }

  private get db() { return bus.get<DataService>('db'); }

  // ── Organisation CRUD ─────────────────────────────────────────────────────

  /**
   * Create an organisation and immediately attach the creator as owner.
   * Sets active_org_id on the user in the same transaction.
   * All three writes are atomic — if any fail, nothing is created.
   */
  async create(data: {
    name:         string;
    plan?:        string;
    description?: string;
    domain?:      string;
  }, ownerUserId: string): Promise<Organisation> {
    const slug = await this.uniqueSlug(data.name);

    return this.db.transaction(async (tx) => {
      // 1. Create the organisation
      const { rows: orgRows } = await tx.from<Organisation>('organisations')
        .insert({
          name:        data.name.trim(),
          slug,
          plan:        data.plan        ?? 'starter',
          description: data.description ?? null,
          domain:      data.domain      ?? null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          meta:        {} as any,
        })
        .returning().run();

      const org = orgRows[0];

      // 2. Create the owner membership
      await tx.from<OrgMember>('org_members')
        .insert({ org_id: org.id, user_id: ownerUserId, role: 'owner' })
        .run();

      // 3. Set active_org_id on the user so getSession() picks it up immediately
      await tx.query(
        `UPDATE users SET active_org_id = $1 WHERE id = $2`,
        [org.id, ownerUserId]
      );

      return org;
    });
  }

  async getById(id: string): Promise<Organisation | null> {
    return this.db.from<Organisation>('organisations').where('id', id).first();
  }

  async getBySlug(slug: string): Promise<Organisation | null> {
    return this.db.from<Organisation>('organisations').where('slug', slug).first();
  }

  async update(id: string, data: Partial<{
    name:        string;
    plan:        string;
    description: string;
    domain:      string;
    logo_url:    string;
    white_label: boolean;
    meta:        Record<string, unknown>;
  }>): Promise<Organisation | null> {
    const { rows } = await this.db.from<Organisation>('organisations')
      .where('id', id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(data as any)
      .returning().run();
    return rows[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await this.db.from<Organisation>('organisations').where('id', id).delete().run();
  }

  // ── Membership ────────────────────────────────────────────────────────────

  async listForUser(userId: string): Promise<Array<Organisation & { role: string }>> {
    const { rows } = await this.db.query<Organisation & { role: string }>(`
      SELECT o.*, m.role
      FROM   organisations o
      JOIN   org_members   m ON m.org_id  = o.id
      WHERE  m.user_id  = $1
        AND  o.deleted_at IS NULL
      ORDER BY m.joined_at ASC
    `, [userId]);
    return rows;
  }

  async getForUser(userId: string): Promise<(Organisation & { role: string }) | null> {
    const orgs = await this.listForUser(userId);
    return orgs[0] ?? null;
  }

  async getRole(orgId: string, userId: string): Promise<string | null> {
    const { rows } = await this.db.query<{ role: string }>(
      `SELECT role FROM org_members WHERE org_id = $1 AND user_id = $2 LIMIT 1`,
      [orgId, userId]
    );
    return rows[0]?.role ?? null;
  }

  async listMembers(orgId: string): Promise<OrgMemberWithUser[]> {
    const { rows } = await this.db.query<OrgMemberWithUser>(`
      SELECT m.*, u.email, u.full_name
      FROM   org_members m
      JOIN   users       u ON u.id = m.user_id
      WHERE  m.org_id = $1
      ORDER BY m.joined_at ASC
    `, [orgId]);
    return rows;
  }

  async addMember(orgId: string, userId: string, role: string): Promise<OrgMember> {
    const { rows } = await this.db.from<OrgMember>('org_members')
      .insert({ org_id: orgId, user_id: userId, role })
      .returning().run();
    return rows[0];
  }

  async updateRole(orgId: string, userId: string, role: string): Promise<void> {
    await this.db.query(
      `UPDATE org_members SET role = $1 WHERE org_id = $2 AND user_id = $3`,
      [role, orgId, userId]
    );
  }

  async removeMember(orgId: string, userId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM org_members WHERE org_id = $1 AND user_id = $2`,
      [orgId, userId]
    );
  }

  /**
   * Switch the user's active org.
   * Call this when a user switches workspace in the UI.
   */
  async switchActiveOrg(userId: string, orgId: string): Promise<void> {
    // Verify membership before switching
    const role = await this.getRole(orgId, userId);
    if (!role) throw new Error('User is not a member of this organisation.');

    await this.db.query(
      `UPDATE users SET active_org_id = $1 WHERE id = $2`,
      [orgId, userId]
    );
  }

  async findUserByEmail(email: string): Promise<{ id: string; email: string; full_name: string } | null> {
    const { rows } = await this.db.query<{ id: string; email: string; full_name: string }>(
      `SELECT id, email, full_name FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    return rows[0] ?? null;
  }

  // ── Role helpers ──────────────────────────────────────────────────────────

  static readonly roleOrder = ['viewer', 'editor', 'admin', 'owner'] as const;

  static hasMinRole(userRole: string, minRole: string): boolean {
    const i = OrgService.roleOrder.indexOf(userRole as never);
    const j = OrgService.roleOrder.indexOf(minRole as never);
    return i !== -1 && j !== -1 && i >= j;
  }

  // ── Slug generation ───────────────────────────────────────────────────────

  private async uniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 50);

    let slug = base;
    let n    = 0;

    while (true) {
      const existing = await this.db
        .from<Organisation>('organisations')
        .where('slug', slug)
        .withDeleted()
        .first();
      if (!existing) return slug;
      slug = `${base}-${++n}`;
    }
  }
}