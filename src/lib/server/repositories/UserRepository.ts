// src/lib/server/repositories/UserRepository.ts
// Thin query helpers for the users table.
// Only used internally by AuthService. Don't reach in from application code.
import { Repository }   from '$lib/server/framework/services/database/Repository';
import type { DataService } from '$lib/server/framework/services/database/DataService';

export interface UserRow {
  id:            string;
  email:         string;
  password_hash: string;
  full_name:     string;
  verified_at:   string | null;
  created_at:    string;
  updated_at:    string;
  deleted_at:    string | null;
}

export class UserRepository extends Repository<UserRow> {
  constructor(db: DataService) { super(db, 'users'); }

  async findByEmail(email: string): Promise<UserRow | null> {
    return this.findOneBy('email', email.toLowerCase().trim());
  }

  async emailTaken(email: string): Promise<boolean> {
    return !!(await this.findByEmail(email));
  }

  async verifyEmail(id: string): Promise<void> {
    const { rows } = await this.db.from<UserRow>('users')
      .where('id', id)
      .update({ verified_at: new Date().toISOString() } as any)
      .run();
  }
}
