// =============================================================================
// database/drivers/IDataDriver.ts
// =============================================================================
// Internal interface each database driver must implement.
// DataService depends on this — never on a concrete driver.
// Nothing outside the database/ folder ever sees this interface.
// =============================================================================

import type { IQueryBuilder, QueryResult } from '../QueryBuilder/IQueryBuilder';

export interface IDataDriver {
  connect():    Promise<void>;
  disconnect(): Promise<void>;
  ping():       Promise<boolean>;

  from<T>(table: string): IQueryBuilder<T>;

  query<T>(
    sql:     string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;

  transaction<T>(
    fn: (driver: IDataDriver) => Promise<T>
  ): Promise<T>;
}