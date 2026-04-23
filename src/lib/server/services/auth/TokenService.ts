// =============================================================================
// services/auth/TokenService.ts
// =============================================================================
// JWT token signing and verification.
//
// SessionPayload contains ONLY what auth needs to know:
//   sub   — user_id
//   email — for display without a DB roundtrip
//   sid   — session_id for DB validation
//
// Anything application-specific (org role, active org, plan) is loaded
// separately by the adapter that needs it. The JWT is not a context store.
// =============================================================================

import type { IService } from '$lib/server/framework/services/IServices';

export interface SessionPayload {
  sub:   string;   // user_id (UUID)
  email: string;   // user email
  sid:   string;   // session_id — validated against DB on every request
  iat?:  number;
  exp?:  number;
}

export interface TokenConfig {
  secret:         string;
  expirySeconds?: number;
}

export class TokenService implements IService {
  readonly name    = 'token';
  readonly version = '1.0.0';
  readonly tags    = ['core', 'auth'];

  private jwt!:    typeof import('jsonwebtoken');
  private secret!: string;
  private expiry!: number;

  constructor(private readonly config: TokenConfig) {}

  async init(): Promise<void> {
    const mod   = await import('jsonwebtoken');
    this.jwt    = mod.default ?? mod;
    this.secret = this.config.secret;
    this.expiry = this.config.expirySeconds ?? 604_800;

    // Smoke test
    const t = this.sign({ sub: 'test', email: 't@t.com', sid: 'test' });
    this.verify(t);
  }

  async destroy():     Promise<void>    {}
  async healthCheck(): Promise<boolean> { return !!this.jwt; }

  sign(payload: Omit<SessionPayload, 'iat' | 'exp'>): string {
    return this.jwt.sign(payload, this.secret, { expiresIn: this.expiry });
  }

  verify(token: string): SessionPayload {
    try {
      return this.jwt.verify(token, this.secret) as SessionPayload;
    } catch (err) {
      const msg = (err as Error).message;
      throw new Error(msg.includes('expired') ? 'TOKEN_EXPIRED' : `TOKEN_INVALID: ${msg}`);
    }
  }

  cookieName():    string { return 'foundy_session'; }
  expirySeconds(): number { return this.expiry; }
}
