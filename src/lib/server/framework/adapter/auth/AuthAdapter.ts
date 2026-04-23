// =============================================================================
// adapters/auth/AuthAdapter.ts
// =============================================================================
// Wiring shell for the auth module.
// Responsibilities:
//   1. Declares which tables it owns (schema)
//   2. Declares which services it needs (requires)
//   3. Runs migrations to create/update its tables
//   4. Registers AuthService + TokenService on the bus
//
// No business logic here — that lives in services/auth/.
// =============================================================================

import type { IAdapter }          from '../IAdapter';
import type { AdapterSchema }     from '../AdapterSchema';
import { authSchema }             from './schema';
import { AuthService }            from '$lib/server/services/auth/AuthService';
import { TokenService }           from '$lib/server/services/auth/TokenService';
import { MigrationRunner }        from '$lib/server/framework/services/database/MigrationRunner';
import { bus }                    from '$lib/server/framework/services/bus/BusService';
import type { DataService }       from '$lib/server/framework/services/database/DataService';

export interface AuthAdapterConfig {
  jwtSecret:      string;   // process.env.JWT_SECRET
  tokenExpirySeconds?: number; // default: 604800 (7 days)
}

export class AuthAdapter implements IAdapter {

  readonly name     = 'auth-adapter';
  readonly version  = '1.0.0';
  readonly tags     = ['core', 'auth'];
  readonly requires = ['web', 'db'];
  readonly schema:  AdapterSchema = authSchema;

  constructor(private readonly config: AuthAdapterConfig) {}

  async init(): Promise<void> {
    const db     = bus.get<DataService>('db');
    const runner = new MigrationRunner(db);
    await runner.run([this.schema]);

    bus.register(
      new TokenService({
        secret:        this.config.jwtSecret,
        expirySeconds: this.config.tokenExpirySeconds,
      }),
      {
        runtime:  'always',
        requires: [],
      }
    );

    bus.register(
      new AuthService(),
      {
        runtime:  'always',
        requires: ['db', 'token'],
      }
    );

    await bus.bootService('auth');
  }

  async destroy(): Promise<void> {
    // Nothing to clean up — services manage their own lifecycle
  }

  async healthCheck(): Promise<boolean> {
    return bus.isActive('auth') && bus.isActive('token');
  }
}