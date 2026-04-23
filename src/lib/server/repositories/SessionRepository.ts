// src/lib/server/repositories/SessionRepository.ts
import { Repository }   from '$lib/server/framework/services/database/Repository';
import type { DataService } from '$lib/server/framework/services/database/DataService';

export interface SessionRow {
  id:          string;
  user_id:     string;
  ip_address:  string | null;
  user_agent:  string | null;
  expires_at:  string;
  created_at:  string;
}

export class SessionRepository extends Repository<SessionRow> {
  constructor(db: DataService) { super(db, 'sessions'); }

  async findByUserId(userId: string): Promise<SessionRow[]> {
    const { rows } = await this.db.from<SessionRow>('sessions')
      .where('user_id', userId).run();
    return rows;
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.db.from<SessionRow>('sessions').where('user_id', userId).delete().run();
  }

  async deleteExpired(): Promise<void> {
    await this.db.query(`DELETE FROM sessions WHERE expires_at < NOW()`, []);
  }
}
