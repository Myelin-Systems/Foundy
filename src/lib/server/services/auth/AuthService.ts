// =============================================================================
// services/auth/AuthService.ts
// =============================================================================
// Authentication only: register, login, logout, session validation, password.
// No org context. No role management. Pure identity.
// =============================================================================

import type { IService }      from '$lib/server/framework/services/IServices';
import { bus }                from '$lib/server/framework/services/bus/BusService';
import type { TokenService, SessionPayload } from './TokenService';
import type { DataService }   from '$lib/server/framework/services/database/DataService';
import type bcrypt from 'bcryptjs';

export interface User {
  id:            string;
  email:         string;
  password_hash: string;
  full_name:     string;
  verified_at:   string | null;
  active_org_id: string | null;
  created_at:    string;
  updated_at:    string;
  deleted_at:    string | null;
}

export interface Session {
  id:          string;
  user_id:     string;
  ip_address:  string | null;
  user_agent:  string | null;
  expires_at:  string;
  created_at:  string;
}

export type PublicUser = Omit<User, 'password_hash'>;

export class AuthError extends Error {
  constructor(
    public readonly code:   string,
    message:                string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService implements IService {
  readonly name    = 'auth';
  readonly version = '1.0.0';
  readonly tags    = ['core', 'auth'];

  private bcrypt!: bcrypt;

  async init():        Promise<void>    { 
    const mod = await import('bcryptjs');
    this.bcrypt = mod.default ?? mod; 
  }

  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return !!this.bcrypt; }

  async register(params: {
    email:      string;
    password:   string;
    fullName:   string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; user: PublicUser }> {
    const db  = bus.get<DataService>('db');
    const tok = bus.get<TokenService>('token');

    this.validatePassword(params.password);

    const existing = await db.from<User>('users')
      .where('email', params.email.toLowerCase().trim())
      .withDeleted().first();

    if (existing) throw new AuthError('EMAIL_TAKEN', 'An account with this email already exists.', 409);

    const hash = await this.bcrypt.hash(params.password, 12);

    const { rows } = await db.from<User>('users')
      .insert({
        email:         params.email.toLowerCase().trim(),
        password_hash: hash,
        full_name:     params.fullName.trim(),
      })
      .returning().run();

    const user  = rows[0];
    const token = await this.issueSession(user, tok, db, params);
    return { token, user: this.toPublic(user) };
  }

  async login(params: {
    email:      string;
    password:   string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; user: PublicUser }> {
    const db  = bus.get<DataService>('db');
    const tok = bus.get<TokenService>('token');

    const user = await db.from<User>('users')
      .where('email', params.email.toLowerCase().trim()).first();

    if (!user || !await this.bcrypt.compare(params.password, user.password_hash)) {
      throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
    }

    const token = await this.issueSession(user, tok, db, params);
    return { token, user: this.toPublic(user) };
  }

  async logout(rawToken: string): Promise<void> {
    const db  = bus.get<DataService>('db');
    const tok = bus.get<TokenService>('token');
    try {
      const payload = tok.verify(rawToken);
      await db.from<Session>('sessions').where('id', payload.sid).delete().run();
    } catch { /* already expired */ }
  }

  async getSession(rawToken: string): Promise<SessionPayload> {
    const db  = bus.get<DataService>('db');
    const tok = bus.get<TokenService>('token');

    let payload: SessionPayload;
    try { payload = tok.verify(rawToken); }
    catch { throw new AuthError('SESSION_INVALID', 'Session invalid or expired.', 401); }

    const session = await db.from<Session>('sessions').where('id', payload.sid).first();
    if (!session) throw new AuthError('SESSION_NOT_FOUND', 'Session not found.', 401);

    if (new Date(session.expires_at) < new Date()) {
      await db.from<Session>('sessions').where('id', session.id).delete().run();
      throw new AuthError('SESSION_EXPIRED', 'Session expired. Please log in again.', 401);
    }

    // Load fresh org context — never trust the JWT for authority data
    const user = await db.from<User>('users').where('id', payload.sub).first();

    return {
      ...payload,
      oid: user?.active_org_id ?? undefined,
    };
  }

  async changePassword(params: {
    userId:          string;
    currentPassword: string;
    newPassword:     string;
  }): Promise<void> {
    const db   = bus.get<DataService>('db');
    const user = await db.from<User>('users').where('id', params.userId).first();
    if (!user) throw new AuthError('USER_NOT_FOUND', 'User not found.', 404);

    if (!await this.bcrypt.compare(params.currentPassword, user.password_hash)) {
      throw new AuthError('INVALID_CREDENTIALS', 'Current password is incorrect.', 401);
    }

    this.validatePassword(params.newPassword);
    const hash = await this.bcrypt.hash(params.newPassword, 12);

    await db.from<User>('users').where('id', params.userId).update({ password_hash: hash } as any).run();
    await db.from<Session>('sessions').where('user_id', params.userId).delete().run();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async issueSession(
    user: User, tok: TokenService, db: DataService,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + tok.expirySeconds() * 1000).toISOString();

    const { rows } = await db.from<Session>('sessions')
      .insert({
        user_id:    user.id,
        expires_at: expiresAt,
        ip_address: meta.ipAddress ?? null,
        user_agent: meta.userAgent ?? null,
      })
      .returning(['id']).run();

    return tok.sign({ sub: user.id, email: user.email, sid: rows[0].id });
  }

  private validatePassword(p: string): void {
    if (p.length < 8) throw new AuthError('WEAK_PASSWORD', 'Password must be at least 8 characters.', 422);
  }

  private toPublic(user: User): PublicUser {
    const { password_hash, ...rest } = user;
    return rest;
  }
}
