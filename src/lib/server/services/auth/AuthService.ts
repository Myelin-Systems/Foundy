// =============================================================================
// services/auth/AuthService.ts
// =============================================================================
// Business logic for authentication: register, login, logout, session validation.
// All DB access goes through the bus (db service) — no direct driver access.
// All token ops go through TokenService.
//
// npm install bcrypt @types/bcrypt
// =============================================================================

import type { IService }      from '../../framework/services/IServices';
import { bus }                from '../../framework/services/bus/BusService';
import type { TokenService, SessionPayload } from './TokenService';
import type { DataService }   from '../../framework/services/database/DataService';

// ── Domain types ──────────────────────────────────────────────────────────────

export interface User {
  id:              string;
  email:           string;
  password_hash:   string;
  full_name:       string;
  role:            'viewer' | 'editor' | 'admin' | 'owner';
  company_id:      string | null;
  verified_at:     string | null;
  active_org_id:   string | null;
  created_at:      string;
  updated_at:      string;
  deleted_at:      string | null;
}

export interface Session {
  id:          string;
  user_id:     string;
  org_id:      string | null;
  ip_address:  string | null;
  user_agent:  string | null;
  expires_at:  string;
  created_at:  string;
  deleted_at:  string | null;
}

export type PublicUser = Omit<User, 'password_hash'>;

// ── AuthError ─────────────────────────────────────────────────────────────────
// Thrown by all AuthService methods. handleAuthError() in utils/auth.ts
// catches this and converts it to a typed JSON response.

export class AuthError extends Error {
  constructor(
    public readonly code:    string,
    message:                 string,
    public readonly status:  number = 400,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ── AuthService ───────────────────────────────────────────────────────────────

export class AuthService implements IService {

  readonly name    = 'auth';
  readonly version = '1.0.1';
  readonly tags    = ['core', 'auth'];

  private bcrypt!: typeof import('bcryptjs');

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    this.bcrypt = await import('bcryptjs');
  }

  async destroy(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return !!this.bcrypt;
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Register a new user and return a session token.
   */
  async register(params: {
    email:      string;
    password:   string;
    fullName:   string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; user: PublicUser }> {

    const db       = bus.get<DataService>('db');
    const tokenSvc = bus.get<TokenService>('token');

    this.validatePassword(params.password);

    // Check for duplicate email (include soft-deleted rows to prevent re-registration)
    const existing = await db.from<User>('users')
      .where('email', params.email.toLowerCase().trim())
      .withDeleted()
      .first();

    if (existing) {
      throw new AuthError('EMAIL_TAKEN',
        'An account with this email already exists.', 409);
    }

    const passwordHash = await this.bcrypt.hash(params.password, 12);

    const { rows } = await db.from<User>('users')
      .insert({
        email:         params.email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name:     params.fullName.trim(),
        role:          'viewer',
      })
      .returning()
      .run();

    const user  = rows[0];
    const token = await this.issueSession(user, tokenSvc, db, {
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { token, user: this.toPublicUser(user) };
  }

  /**
   * Log in with email + password and return a session token.
   */
  async login(params: {
    email:      string;
    password:   string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ token: string; user: PublicUser }> {

    const db       = bus.get<DataService>('db');
    const tokenSvc = bus.get<TokenService>('token');

    const user = await db.from<User>('users')
      .where('email', params.email.toLowerCase().trim())
      .first();

    // Use a constant-time message to prevent user enumeration
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
    }

    const valid = await this.bcrypt.compare(params.password, user.password_hash);
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.', 401);
    }

    const token = await this.issueSession(user, tokenSvc, db, {
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return { token, user: this.toPublicUser(user) };
  }

  /**
   * Invalidate the session associated with the given token.
   * Silently succeeds if the token is already invalid.
   */
  async logout(rawToken: string): Promise<void> {
    const db       = bus.get<DataService>('db');
    const tokenSvc = bus.get<TokenService>('token');

    try {
      const payload = tokenSvc.verify(rawToken);
      await db.from<Session>('sessions')
        .where('id', payload.sid)
        .withDeleted()
        .delete()
        .run();
    } catch {
      // Token was invalid or already expired — nothing to delete
    }
  }

  /**
   * Verify a token and validate the session against the DB.
   * Returns the decoded payload or throws AuthError.
   * Called by requireSession() in utils/auth.ts.
   */
  async getSession(rawToken: string): Promise<SessionPayload> {
    const db       = bus.get<DataService>('db');
    const tokenSvc = bus.get<TokenService>('token');

    // 1. Verify JWT signature + expiry
    let payload: SessionPayload;
    try {
      payload = tokenSvc.verify(rawToken);
    } catch (err) {
      throw new AuthError('SESSION_INVALID',
        'Session is invalid or has expired. Please log in again.', 401);
    }

    // 2. Confirm the session still exists in the DB
    const session = await db.from<Session>('sessions')
      .where('id', payload.sid)
      .first();
    console.log(session)
    if (!session) {
      throw new AuthError('SESSION_NOT_FOUND',
        'Session not found. Please log in again.', 401);
    }

    // 3. Check DB-level expiry (belt-and-suspenders)
    if (new Date(session.expires_at) < new Date()) {
      await db.from<Session>('sessions').where('id', session.id).delete().run();
      throw new AuthError('SESSION_EXPIRED',
        'Session has expired. Please log in again.', 401);
    }

    return payload;
  }

  /**
   * Change a user's password.
   * Requires the current password for verification.
   */
  async changePassword(params: {
    userId:          string;
    currentPassword: string;
    newPassword:     string;
  }): Promise<void> {

    const db = bus.get<DataService>('db');

    const user = await db.from<User>('users').where('id', params.userId).first();
    if (!user) throw new AuthError('USER_NOT_FOUND', 'User not found.', 404);

    const valid = await this.bcrypt.compare(params.currentPassword, user.password_hash);
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 'Current password is incorrect.', 401);
    }

    this.validatePassword(params.newPassword);

    const newHash = await this.bcrypt.hash(params.newPassword, 12);
    await db.from<User>('users')
      .where('id', params.userId)
      .update({ password_hash: newHash })
      .run();

    // Invalidate all existing sessions to force re-login
    await db.from<Session>('sessions').where('user_id', params.userId).delete().run();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async issueSession(
    user:      User,
    tokenSvc:  TokenService,
    db:        DataService,
    meta:      { ipAddress?: string; userAgent?: string },
  ): Promise<string> {

    const expiryMs  = tokenSvc.expirySeconds() * 1000;
    const expiresAt = new Date(Date.now() + expiryMs).toISOString();

    const { rows } = await db.from<Session>('sessions')
      .insert({
        user_id:    user.id,
        expires_at: expiresAt,
        ip_address: meta.ipAddress ?? null,
        user_agent: meta.userAgent ?? null,
      })
      .returning(['id'])
      .run();

    const sessionId = rows[0].id;

    return tokenSvc.sign({
      sub:   user.id,
      email: user.email,
      role:  user.role,
      oid:   user.active_org_id ?? undefined,
      sid:   sessionId,
    });
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new AuthError('WEAK_PASSWORD',
        'Password must be at least 8 characters.', 422);
    }
  }

  private toPublicUser(user: User): PublicUser {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...rest } = user;
    return rest;
  }
}
