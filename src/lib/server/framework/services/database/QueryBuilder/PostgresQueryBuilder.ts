// =============================================================================
// database/QueryBuilder/PostgresQueryBuilder.ts
// =============================================================================
// Postgres implementation of IQueryBuilder.
// Builds parameterised SQL strings ($1, $2 ...) and executes via postgres.js.
// Never imported directly outside the database/ folder —
// PostgresDriver creates instances of this and returns them as IQueryBuilder<T>.
// =============================================================================

import type {
  IQueryBuilder,
  QueryResult,
  WhereClause,
  WhereOperator,
  WhereValue,
  OrderDirection,
} from './IQueryBuilder';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlInstance = any; // postgres.js Sql type — avoids hard import coupling

export class PostgresQueryBuilder<T> implements IQueryBuilder<T> {

  private _columns:     string[]       = ['*'];
  private _wheres:      WhereClause[]  = [];
  private _orWheres:    WhereClause[]  = [];
  private _orderCol:    string | null  = null;
  private _orderDir:    OrderDirection = 'asc';
  private _limit:       number | null  = null;
  private _offset:      number | null  = null;
  private _insertData:  Partial<T>[]   = [];
  private _updateData:  Partial<T> | null = null;
  private _returning:   string[]       = [];
  private _withDeleted: boolean        = false;
  private _operation:   'select' | 'insert' | 'update' | 'delete' = 'select';

  constructor(
    private readonly table: string,
    private readonly sql:   SqlInstance,
  ) {}

  // ── SELECT ──────────────────────────────────────────────────────────────────

  select(columns: string[] = ['*']): this {
    this._operation = 'select';
    this._columns   = columns;
    return this;
  }

  where(column: string, value: WhereValue): this {
    this._wheres.push({ column, operator: 'eq', value });
    return this;
  }

  whereOp(column: string, operator: WhereOperator, value?: WhereValue): this {
    this._wheres.push({ column, operator, value });
    return this;
  }

  orWhere(column: string, value: WhereValue): this {
    this._orWheres.push({ column, operator: 'eq', value });
    return this;
  }

  orderBy(column: string, direction: OrderDirection = 'asc'): this {
    this._orderCol = column;
    this._orderDir = direction;
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    if (this._limit === null) {
      throw new Error(
        `[PostgresQueryBuilder] offset() on "${this.table}" requires limit() to be set first.`
      );
    }
    this._offset = n;
    return this;
  }

  withDeleted(): this {
    this._withDeleted = true;
    return this;
  }

  // ── INSERT ──────────────────────────────────────────────────────────────────

  insert(data: Partial<T> | Partial<T>[]): this {
    this._operation  = 'insert';
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  returning(columns: string[] = ['*']): this {
    this._returning = columns;
    return this;
  }

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  update(data: Partial<T>): this {
    this._operation  = 'update';
    this._updateData = data;
    return this;
  }

  // ── DELETE ──────────────────────────────────────────────────────────────────

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  softDelete(): this {
    this._operation  = 'update';
    this._updateData = { deleted_at: new Date().toISOString() } as unknown as Partial<T>;
    return this;
  }

  // ── Execute ──────────────────────────────────────────────────────────────────

  async run(): Promise<QueryResult<T>> {
    const { sql: sqlStr, params } = this.build();
    try {
      const result = await this.sql.unsafe(sqlStr, params);
      const rows   = result as unknown as T[];
      return { rows, count: rows.length, affected: result.count };
    } catch (err) {
      throw new Error(
        `[PostgresQueryBuilder] Query failed on "${this.table}": ${(err as Error).message}\n` +
        `SQL: ${sqlStr}\nParams: ${JSON.stringify(params)}`
      );
    }
  }

  async first(): Promise<T | null> {
    this._limit  = 1;
    const result = await this.run();
    return result.rows[0] ?? null;
  }

  async exists(): Promise<boolean> {
    const { sql: sqlStr, params } = this.build(true);
    const result = await this.sql.unsafe(sqlStr, params);
    const row    = result[0] as { exists: string } | undefined;
    return row?.exists === 'true';
  }

  // ── SQL builder ───────────────────────────────────────────────────────────

  private build(forExists = false): { sql: string; params: unknown[] } {
    const params: unknown[] = [];
    let   i = 1;

    const add = (v: unknown): string => {
      params.push(v);
      return `$${i++}`;
    };

    const buildClauses = (clauses: WhereClause[], join: 'AND' | 'OR'): string =>
      clauses.map(c => {
        switch (c.operator) {
          case 'eq':       return `${c.column} = ${add(c.value)}`;
          case 'neq':      return `${c.column} != ${add(c.value)}`;
          case 'gt':       return `${c.column} > ${add(c.value)}`;
          case 'gte':      return `${c.column} >= ${add(c.value)}`;
          case 'lt':       return `${c.column} < ${add(c.value)}`;
          case 'lte':      return `${c.column} <= ${add(c.value)}`;
          case 'like':     return `${c.column} LIKE ${add(c.value)}`;
          case 'ilike':    return `${c.column} ILIKE ${add(c.value)}`;
          case 'in':       return `${c.column} = ANY(${add(c.value)})`;
          case 'nin':      return `${c.column} != ALL(${add(c.value)})`;
          case 'is_null':  return `${c.column} IS NULL`;
          case 'not_null': return `${c.column} IS NOT NULL`;
          default:         return `${c.column} = ${add(c.value)}`;
        }
      }).join(` ${join} `);

    const where = (): string => {
      const parts: string[] = [];
      if (this._wheres.length)   parts.push(`(${buildClauses(this._wheres, 'AND')})`);
      if (this._orWheres.length) parts.push(`(${buildClauses(this._orWheres, 'OR')})`);
      if (!this._withDeleted)    parts.push(`deleted_at IS NULL`);
      return parts.length ? `WHERE ${parts.join(' AND ')}` : '';
    };

    if (this._operation === 'select') {
      if (forExists) return {
        sql: `SELECT EXISTS(SELECT 1 FROM ${this.table} ${where()}) AS exists`,
        params,
      };
      return {
        sql: [
          `SELECT ${this._columns.join(', ')} FROM ${this.table}`,
          where(),
          this._orderCol ? `ORDER BY ${this._orderCol} ${this._orderDir.toUpperCase()}` : '',
          this._limit    ? `LIMIT ${this._limit}`   : '',
          this._offset   ? `OFFSET ${this._offset}` : '',
        ].filter(Boolean).join(' '),
        params,
      };
    }

    if (this._operation === 'insert') {
      const keys = Object.keys(this._insertData[0] ?? {});
      const vals = this._insertData
        .map(row => `(${keys.map(k => add((row as Record<string, unknown>)[k])).join(', ')})`)
        .join(', ');
      const ret  = this._returning.length ? `RETURNING ${this._returning.join(', ')}` : '';
      return {
        sql: `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES ${vals} ${ret}`,
        params,
      };
    }

    if (this._operation === 'update' && this._updateData) {
      const sets = Object.entries(this._updateData as Record<string, unknown>)
        .map(([k, v]) => `${k} = ${add(v)}`).join(', ');
      const ret  = this._returning.length ? `RETURNING ${this._returning.join(', ')}` : '';
      return {
        sql: `UPDATE ${this.table} SET ${sets} ${where()} ${ret}`,
        params,
      };
    }

    if (this._operation === 'delete') {
      return { sql: `DELETE FROM ${this.table} ${where()}`, params };
    }

    throw new Error(`[PostgresQueryBuilder] Unknown operation on "${this.table}"`);
  }
}