// =============================================================================
// database/DataService.ts
// =============================================================================
// The public database service registered on the bus.
// Reads DATABASE_PROVIDER from .env, picks the right driver,
// and exposes a clean query API to repositories.
//
// This file only orchestrates — all query logic lives in:
//   drivers/PostgresDriver.ts
//   drivers/SupabaseDriver.ts
//   QueryBuilder/PostgresQueryBuilder.ts
//   QueryBuilder/SupabaseQueryBuilder.ts
//
// .env setup:
//   DATABASE_PROVIDER=postgres
//   DATABASE_URL=postgres://user:pass@localhost:5432/mydb
//   DATABASE_DEBUG=false
//
//   --- or ---
//
//   DATABASE_PROVIDER=supabase
//   SUPABASE_URL=https://xyz.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...
//   DATABASE_DEBUG=false
// =============================================================================

import type { IService }               from '../IServices';
import type { IDataDriver }            from './drivers/IDataDriver';
import type { IQueryBuilder, QueryResult } from './QueryBuilder/IQueryBuilder';
import { PostgresDriver }              from './drivers/PostgresDriver';
import { SupabaseDriver }              from './drivers/SupabaseDriver';
import { env }                         from '$lib/server/utils/env';

export type DatabaseProvider = 'postgres' | 'supabase';


// ── DataService ───────────────────────────────────────────────────────────────

export class DataService implements IService {

  readonly name    = 'db';
  readonly version = '1.0.0';
  readonly tags    = ['core', 'database'];

  private driver!:     IDataDriver;
  private provider!:   DatabaseProvider;
  private _connected = false;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    const provider = env('DATABASE_PROVIDER', this) as DatabaseProvider;
    const debug    = process.env.DATABASE_DEBUG === 'true';

    if (provider !== 'postgres' && provider !== 'supabase') {
      throw new Error(
        `[${this.name}] DATABASE_PROVIDER must be "postgres" or "supabase". Got: "${provider}"`
      );
    }

    this.provider = provider;

    if (provider === 'postgres') {
      this.driver = new PostgresDriver({
        connectionString: env('DATABASE_URL', this),
        debug,
      });
    }

    if (provider === 'supabase') {
      this.driver = new SupabaseDriver({
        url:   env('SUPABASE_URL',this),
        key:   env('SUPABASE_SERVICE_KEY',this),
        debug,
      });
    }

    await this.driver.connect();
    this._connected = true;

    console.log(`[${this.name}] Connected — provider: ${this.provider}`);
  }

  async destroy(): Promise<void> {
    await this.driver?.disconnect();
    this._connected = false;
    console.log(`[${this.name}] Disconnected`);
  }

  async healthCheck(): Promise<boolean> {
    return this.driver?.ping() ?? false;
  }

  // ── Query API ───────────────────────────────────────────────────────────────
  // Repositories call these — they never see the driver or query builder directly

  from<T = Record<string, unknown>>(table: string): IQueryBuilder<T> {
    this.assertConnected();
    return this.driver.from<T>(table);
  }

  query<T = Record<string, unknown>>(
    sql:    string,
    params: unknown[] = []
  ): Promise<QueryResult<T>> {
    this.assertConnected();
    return this.driver.query<T>(sql, params);
  }

  transaction<T>(fn: (db: DataService) => Promise<T>): Promise<T> {
    this.assertConnected();
    return this.driver.transaction(driver => {
      // Wrap the transaction driver in a DataService proxy
      // so fn() receives the same DataService interface
      const proxy        = Object.create(this) as DataService;
      proxy.driver       = driver;
      proxy._connected   = true;
      return fn(proxy);
    });
  }

  // ── Info ─────────────────────────────────────────────────────────────────────

  isConnected(): boolean {
    return this._connected;
  }

  get activeProvider(): DatabaseProvider {
    return this.provider;
  }

  // ── Private ───────────────────────────────────────────────────────────────────

  private assertConnected(): void {
    if (!this._connected) throw new Error(
      `[${this.name}] Not connected. Did bootstrap() complete before this call?\n` +
      `Make sure ${this.name} is registered on the bus and boot() has run.`
    );
  }
}