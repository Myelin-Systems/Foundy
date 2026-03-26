// =============================================================================
// database/drivers/PostgresDriver.ts
// =============================================================================
// PostgreSQL driver using the 'postgres' package.
// Manages the connection pool and creates PostgresQueryBuilder instances.
//
// npm install postgres
// =============================================================================

import type { IDataDriver }           from './IDataDriver';
import type { IQueryBuilder, QueryResult } from '../QueryBuilder/IQueryBuilder';
import { PostgresQueryBuilder }        from '../QueryBuilder/PostgresQueryBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlInstance = any;

export interface PostgresDriverConfig {
  connectionString: string;
  maxConnections?:  number;  // default: 10
  idleTimeout?:     number;  // seconds. default: 30
  debug?:           boolean; // log all SQL. default: false
}

export class PostgresDriver implements IDataDriver {

  private sql!: SqlInstance;

  constructor(private readonly config: PostgresDriverConfig) {}

  async connect(): Promise<void> {
    const postgres = (await import('postgres')).default;

    this.sql = postgres(this.config.connectionString, {
      max:          this.config.maxConnections ?? 10,
      idle_timeout: this.config.idleTimeout    ?? 30,
      debug:        this.config.debug
        ? (_conn: unknown, query: string, params: unknown[]) => {
            console.log(`[PostgresDriver] ${query}`, params);
          }
        : undefined,
    });

    await this.sql`SELECT 1`; // verify connection on startup
  }

  async disconnect(): Promise<void> {
    await this.sql?.end();
  }

  async ping(): Promise<boolean> {
    try {
      await this.sql`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  from<T>(table: string): IQueryBuilder<T> {
    return new PostgresQueryBuilder<T>(table, this.sql);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    try {
      const result = await this.sql.unsafe(sql, params);
      const rows   = result as unknown as T[];
      return { rows, count: rows.length, affected: result.count };
    } catch (err) {
      throw new Error(
        `[PostgresDriver] Raw query failed: ${(err as Error).message}\nSQL: ${sql}`
      );
    }
  }

  async transaction<T>(fn: (driver: IDataDriver) => Promise<T>): Promise<T> {
    return this.sql.begin(async (sqlTx: SqlInstance) => {
      return fn(new PostgresTxDriver(sqlTx));
    });
  }
}

// ── Transaction driver ────────────────────────────────────────────────────────
// Wraps a postgres.js transaction sql instance.
// Returned to fn() inside transaction() — same IDataDriver interface.

class PostgresTxDriver implements IDataDriver {

  constructor(private readonly sql: SqlInstance) {}

  async connect():    Promise<void>    { /* no-op inside transaction */ }
  async disconnect(): Promise<void>    { /* no-op inside transaction */ }
  async ping():       Promise<boolean> { return true; }

  from<T>(table: string): IQueryBuilder<T> {
    return new PostgresQueryBuilder<T>(table, this.sql);
  }

  async query<T>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    const result = await this.sql.unsafe(sql, params);
    const rows   = result as unknown as T[];
    return { rows, count: rows.length, affected: result.count };
  }

  async transaction<T>(fn: (driver: IDataDriver) => Promise<T>): Promise<T> {
    // Nested transactions use savepoints automatically in postgres.js
    return this.sql.savepoint(async (sqlSave: SqlInstance) => {
      return fn(new PostgresTxDriver(sqlSave));
    });
  }
}