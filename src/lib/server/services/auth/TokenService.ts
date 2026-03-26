// =============================================================================
// services/auth/TokenService.ts
// =============================================================================
// JWT token signing, verification, and cookie name management.
// Registered on the bus by AuthAdapter before AuthService.
// AuthService depends on this — always activate 'token' first.
//
// npm install jsonwebtoken @types/jsonwebtoken
// =============================================================================

import type { IService } from '../../framework/services/IServices';

// ── Payload shape ─────────────────────────────────────────────────────────────

export interface SessionPayload {
  sub:    string;           // user_id (UUID)
  email:  string;           // user email
  role:   string;           // role in active org / global role
  oid?:   string;           // active org_id (null until org assigned)
  sid:    string;           // session_id — used to validate against DB
  iat?:   number;           // issued at — set by jwt.sign
  exp?:   number;           // expires at — set by jwt.sign
}

export interface TokenConfig {
  secret:        string;
  expirySeconds?: number;   // default: 604800 (7 days)
}

// ── TokenService ──────────────────────────────────────────────────────────────

export class TokenService implements IService {

  readonly name    = 'token';
  readonly version = '1.0.4';
  readonly tags    = ['core', 'auth'];

  private secret!: string;
  private expiry!: number;
  private jwt!:    typeof import('jsonwebtoken');

  constructor(private readonly config: TokenConfig) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    if (!this.config.secret || this.config.secret.length < 32) {
      throw new Error(
        `[${this.name}] JWT_SECRET must be at least 32 characters. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
      );
    }
    const jwtModule = await import('jsonwebtoken');
    this.jwt    = (jwtModule.default || jwtModule) as any;
    this.secret = this.config.secret;
    this.expiry = this.config.expirySeconds ?? 604_800; // 7 days
  }

  async destroy(): Promise<void> {
    // stateless — nothing to clean up
  }

  async healthCheck(): Promise<boolean> {
    // Quick smoke-test: sign and verify a dummy token
    try {
      const token  = this.sign({ sub: 'test', email: 'test@test.com', role: 'viewer', sid: 'test' });
      const result = this.verify(token);
      return result.sub === 'test';
    } catch {
      return false;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Sign a session payload into a JWT.
   * Returns a compact string suitable for storing in an HTTP-only cookie.
   */
  sign(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
    const token = this.jwt.sign(payload, this.secret, {
      expiresIn: this.expiry,
    });
    return token;
  }

  /**
   * Verify and decode a token.
   * Throws if the token is expired, tampered with, or malformed.
   */
  verify(token: string): SessionPayload {
    try {
      return this.jwt.verify(token, this.secret) as SessionPayload;
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('expired')) {
        throw new Error('TOKEN_EXPIRED: Session has expired. Please log in again.');
      }
      throw new Error(`TOKEN_INVALID: ${msg}`);
    }
  }

  /**
   * The cookie name used to store the session token.
   * Consistent across TokenService and auth utilities.
   */
  cookieName(): string {
    return 'myelin_session';
  }

  /**
   * Returns the expiry in seconds — useful for setting cookie maxAge.
   */
  expirySeconds(): number {
    return this.expiry;
  }
}
