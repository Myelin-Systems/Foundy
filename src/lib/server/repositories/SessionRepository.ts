// =============================================================================
// repositories/SessionRepository.ts
// =============================================================================
// Repository for the sessions table.
// Includes session-specific helpers like expiry cleanup.
// =============================================================================

import { Repository }       from '../framework/services/database/Repository';
import type { DataService } from '../framework/services/database/DataService';
import type { Session }     from '../services/auth/AuthService';

export class SessionRepository extends Repository<Session> {

  protected readonly table = 'sessions';

  constructor(db: DataService) {
    super(db);
  }

  // ── Finders ───────────────────────────────────────────────────────────────

  async findByUserId(userId: string): Promise<Session[]> {
    return this.findBy('user_id', userId);
  }

  async findActiveByUserId(userId: string): Promise<Session[]> {
    const { rows } = await this.db
      .from<Session>(this.table)
      .where('user_id', userId)
      .whereOp('expires_at', 'gt', new Date().toISOString())
      .run();
    return rows;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Delete all sessions for a user — e.g. on password change.
   */
  async deleteAllForUser(userId: string): Promise<void> {
    await this.deleteBy('user_id', userId);
  }

  /**
   * Delete all expired sessions across all users.
   * Call this periodically (e.g. daily cron) to keep the table clean.
   */
  async deleteExpired(): Promise<number> {
    const { affected } = await this.db.query<Session>(
      `DELETE FROM sessions WHERE expires_at < NOW()`,
    );
    return affected ?? 0;
  }

  /**
   * Count how many active sessions a user currently has.
   */
  async countActiveForUser(userId: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM sessions WHERE user_id = $1 AND expires_at > NOW()`,
      [userId],
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
