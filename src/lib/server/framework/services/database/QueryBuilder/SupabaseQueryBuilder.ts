// =============================================================================
// database/QueryBuilder/SupabaseQueryBuilder.ts
// =============================================================================
// Supabase implementation of IQueryBuilder.
// Translates the same IQueryBuilder interface into Supabase JS v2 client calls.
// Never imported directly outside the database/ folder —
// SupabaseDriver creates instances and returns them as IQueryBuilder<T>.
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
type SupabaseClient = any; // @supabase/supabase-js SupabaseClient

export class SupabaseQueryBuilder<T> implements IQueryBuilder<T> {

  private _columns:     string[]       = ['*'];
  private _wheres:      WhereClause[]  = [];
  private _orWheres:    WhereClause[]  = [];
  private _orderCol:    string | null  = null;
  private _orderDir:    OrderDirection = 'asc';
  private _limit:       number | null  = null;
  private _offset:      number | null  = null;
  private _insertData:  Partial<T>[]   = [];
  private _updateData:  Partial<T> | null = null;
  private _returning:   string[]       = ['*'];
  private _withDeleted: boolean        = false;
  private _operation:   'select' | 'insert' | 'update' | 'delete' = 'select';

  constructor(
    private readonly table:  string,
    private readonly client: SupabaseClient,
    private readonly debug:  boolean = false,
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
        `[SupabaseQueryBuilder] offset() on "${this.table}" requires limit() to be set first.`
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

  // ── Where clause application ─────────────────────────────────────────────
  // Uses any internally — Supabase builder returns a different class per
  // operation but all accept the same filter methods.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyWheres(query: any): any {
    for (const clause of this._wheres) {
      query = this.applyClause(query, clause);
    }
    if (this._orWheres.length) {
      query = query.or(
        this._orWheres.map(c => `${c.column}.eq.${c.value}`).join(',')
      );
    }
    if (!this._withDeleted) {
      query = query.is('deleted_at', null);
    }
    return query;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyClause(query: any, c: WhereClause): any {
    switch (c.operator) {
      case 'eq':       return query.eq(c.column, c.value);
      case 'neq':      return query.neq(c.column, c.value);
      case 'gt':       return query.gt(c.column, c.value);
      case 'gte':      return query.gte(c.column, c.value);
      case 'lt':       return query.lt(c.column, c.value);
      case 'lte':      return query.lte(c.column, c.value);
      case 'like':     return query.like(c.column, c.value);
      case 'ilike':    return query.ilike(c.column, c.value);
      case 'in':       return query.in(c.column, c.value);
      case 'nin':      return query.not(c.column, 'in', `(${(c.value as string[]).join(',')})`);
      case 'is_null':  return query.is(c.column, null);
      case 'not_null': return query.not(c.column, 'is', null);
      default:         return query.eq(c.column, c.value);
    }
  }

  // ── Execute ──────────────────────────────────────────────────────────────────

  async run(): Promise<QueryResult<T>> {
    if (this.debug) {
      console.log(
        `[SupabaseQueryBuilder] ${this._operation.toUpperCase()} "${this.table}" ` +
        `columns:[${this._columns.join(',')}] wheres:${this._wheres.length}`
      );
    }

    try {

      // ── SELECT ──────────────────────────────────────────────────────────────
      if (this._operation === 'select') {
        let q = this.client.from(this.table).select(this._columns.join(', '));
        q = this.applyWheres(q);

        if (this._orderCol) {
          q = q.order(this._orderCol, { ascending: this._orderDir === 'asc' });
        }
        // range() encodes both limit and offset together
        if (this._offset !== null && this._limit !== null) {
          q = q.range(this._offset, this._offset + this._limit - 1);
        } else if (this._limit !== null) {
          q = q.limit(this._limit);
        }

        const { data, error } = await q;
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as T[];
        return { rows, count: rows.length };
      }

      // ── INSERT ──────────────────────────────────────────────────────────────
      if (this._operation === 'insert') {
        const payload = this._insertData.length === 1
          ? this._insertData[0]
          : this._insertData;

        const { data, error } = await this.client
          .from(this.table)
          .insert(payload)
          .select(this._returning.join(', '));

        if (error) throw new Error(error.message);
        const rows = (data ?? []) as T[];
        return { rows, count: rows.length, affected: rows.length };
      }

      // ── UPDATE ──────────────────────────────────────────────────────────────
      if (this._operation === 'update' && this._updateData) {
        let q = this.client.from(this.table).update(this._updateData);
        q = this.applyWheres(q);
        const { data, error } = await q.select(this._returning.join(', '));
        if (error) throw new Error(error.message);
        const rows = (data ?? []) as T[];
        return { rows, count: rows.length, affected: rows.length };
      }

      // ── DELETE ──────────────────────────────────────────────────────────────
      if (this._operation === 'delete') {
        let q = this.client.from(this.table).delete();
        q = this.applyWheres(q);
        const { error, count } = await q;
        if (error) throw new Error(error.message);
        return { rows: [], count: 0, affected: count ?? 0 };
      }

      throw new Error(
        `[SupabaseQueryBuilder] Unknown operation "${this._operation}" on "${this.table}"`
      );

    } catch (err) {
      throw new Error(
        `[SupabaseQueryBuilder] Query failed on "${this.table}": ${(err as Error).message}`
      );
    }
  }

  async first(): Promise<T | null> {
    this._limit  = 1;
    const result = await this.run();
    return result.rows[0] ?? null;
  }

  async exists(): Promise<boolean> {
    // count + head:true — no row data transferred, just a count
    let q = this.client
      .from(this.table)
      .select('*', { count: 'exact', head: true });
    q = this.applyWheres(q);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }
}