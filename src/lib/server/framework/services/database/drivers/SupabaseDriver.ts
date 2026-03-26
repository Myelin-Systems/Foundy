// =============================================================================
// database/drivers/SupabaseDriver.ts
// =============================================================================
// Supabase driver using @supabase/supabase-js v2.
// Manages the Supabase client and creates SupabaseQueryBuilder instances.
//
// npm install @supabase/supabase-js
//
// KNOWN LIMITATIONS:
//   query()       — raw SQL not supported via Supabase JS. Use PostgresDriver.
//   transaction() — true transactions not supported via Supabase JS.
//                   Use PostgresDriver, or wrap in a Supabase RPC function.
// =============================================================================

import type { IDataDriver }                from './IDataDriver';
import type { IQueryBuilder, QueryResult } from '../QueryBuilder/IQueryBuilder';
import { SupabaseQueryBuilder }            from '../QueryBuilder/SupabaseQueryBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export interface SupabaseDriverConfig {
  url:    string;   // https://yourproject.supabase.co
  key:    string;   // service role key — NOT the anon key
  debug?: boolean;  // log all queries. default: false
}

export class SupabaseDriver implements IDataDriver {

  private client!: SupabaseClient;

  constructor(private readonly config: SupabaseDriverConfig) {}

  async connect(): Promise<void> {
    const { createClient } = await import('@supabase/supabase-js');

    this.client = createClient(this.config.url, this.config.key, {
      auth: {
        autoRefreshToken: false, // server-side — we manage sessions ourselves
        persistSession:   false,
      },
    });

    await this.ping();
  }

  async disconnect(): Promise<void> {
    await this.client?.auth.signOut();
  }

  async ping(): Promise<boolean> {
    // Query a nonexistent table — PGRST116 means connection works fine
    const { error } = await this.client
      .from('_healthcheck_nonexistent')
      .select('*', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
      throw new Error(
        `[SupabaseDriver] Connection failed: ${error.message} (code: ${error.code})`
      );
    }

    return true;
  }

  from<T>(table: string): IQueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(table, this.client, this.config.debug ?? false);
  }

  async query<T>(_sql: string, _params: unknown[] = []): Promise<QueryResult<T>> {
    throw new Error(
      '[SupabaseDriver] query() — raw SQL is not supported via the Supabase JS client.\n' +
      'Options:\n' +
      '  1. Switch DATABASE_PROVIDER=postgres for raw SQL needs.\n' +
      '  2. Create a Supabase RPC function and call it via from() or client.rpc().\n' +
      '  3. Rewrite using .from(table).whereOp(...).run()'
    );
  }

  async transaction<T>(_fn: (driver: IDataDriver) => Promise<T>): Promise<T> {
    throw new Error(
      '[SupabaseDriver] transaction() — true transactions are not supported via the Supabase JS client.\n' +
      'Options:\n' +
      '  1. Switch DATABASE_PROVIDER=postgres for transaction support.\n' +
      '  2. Create a Supabase RPC function wrapping your operations in BEGIN/COMMIT.'
    );
  }
}