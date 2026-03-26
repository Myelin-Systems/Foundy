// =============================================================================
// repositories/UserRepository.ts
// =============================================================================
// Repository for the users table.
// Wraps all DB access patterns used by AuthService and other services.
// =============================================================================

import { Repository }       from '../framework/services/database/Repository';
import type { DataService } from '../framework/services/database/DataService';
import type { User }        from '../services/auth/AuthService';

export class UserRepository extends Repository<User> {

  protected readonly table = 'users';

  constructor(db: DataService) {
    super(db);
  }

  // ── Finders ───────────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<User | null> {
    return this.findOneBy('email', email.toLowerCase().trim());
  }

  async findByEmailWithDeleted(email: string): Promise<User | null> {
    return this.db
      .from<User>(this.table)
      .where('email', email.toLowerCase().trim())
      .withDeleted()
      .first();
  }

  async findByCompany(companyId: string): Promise<User[]> {
    return this.findBy('company_id', companyId);
  }

  async findByOrg(orgId: string): Promise<User[]> {
    return this.findBy('active_org_id', orgId);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  async verifyEmail(userId: string): Promise<User | null> {
    return this.update(userId, {
      verified_at: new Date().toISOString(),
    } as Partial<User>);
  }

  async setActiveOrg(userId: string, orgId: string | null): Promise<User | null> {
    return this.update(userId, { active_org_id: orgId } as Partial<User>);
  }

  async setRole(userId: string, role: User['role']): Promise<User | null> {
    return this.update(userId, { role } as Partial<User>);
  }

  async updatePasswordHash(userId: string, hash: string): Promise<void> {
    await this.update(userId, { password_hash: hash } as Partial<User>);
  }

  // ── Exists checks ─────────────────────────────────────────────────────────

  async emailTaken(email: string): Promise<boolean> {
    return this.db
      .from<User>(this.table)
      .where('email', email.toLowerCase().trim())
      .withDeleted()
      .exists();
  }
}
