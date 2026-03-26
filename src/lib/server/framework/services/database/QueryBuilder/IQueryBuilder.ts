// =============================================================================
// database/QueryBuilder/IQueryBuilder.ts
// =============================================================================
// All shared types and the QueryBuilder interface.
// Every QueryBuilder implementation must implement this.
// DataService and Repository only ever reference this — never a concrete class.
// =============================================================================

// ── Primitive types ───────────────────────────────────────────────────────────

export type OrderDirection = 'asc' | 'desc';

export type WhereValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[];

export type WhereOperator =
  | 'eq'        // =
  | 'neq'       // !=
  | 'gt'        // >
  | 'gte'       // >=
  | 'lt'        // <
  | 'lte'       // <=
  | 'like'      // LIKE
  | 'ilike'     // ILIKE  (case-insensitive)
  | 'in'        // IN (array)
  | 'nin'       // NOT IN (array)
  | 'is_null'   // IS NULL
  | 'not_null'; // IS NOT NULL

// ── Internal clause shape ─────────────────────────────────────────────────────
// Used by concrete implementations to store where conditions

export interface WhereClause {
  column:   string;
  operator: WhereOperator;
  value?:   WhereValue;
}

// ── Query result ──────────────────────────────────────────────────────────────
// Every .run() / .first() / .exists() returns one of these shapes

export interface QueryResult<T> {
  rows:      T[];      // typed rows returned by the query
  count:     number;   // number of rows in this result
  affected?: number;   // rows affected — set on INSERT / UPDATE / DELETE
}

// ── IQueryBuilder ─────────────────────────────────────────────────────────────
// The abstraction every implementation must satisfy.
// Repository and DataService depend only on this interface.

export interface IQueryBuilder<T> {

  // ── SELECT ──────────────────────────────────────────────────────────────────
  select(columns?: string[]): this;
  // select()               → SELECT *
  // select(['id','email'])  → SELECT id, email

  where(column: string, value: WhereValue): this;
  // Shorthand for eq — most common case
  // .where('id', userId)   → WHERE id = $1

  whereOp(column: string, operator: WhereOperator, value?: WhereValue): this;
  // Full operator control
  // .whereOp('age', 'gte', 18)        → WHERE age >= $1
  // .whereOp('deleted_at', 'is_null') → WHERE deleted_at IS NULL

  orWhere(column: string, value: WhereValue): this;
  // .where('role','admin').orWhere('role','owner')
  // → WHERE role = $1 OR role = $2

  orderBy(column: string, direction?: OrderDirection): this;
  limit(n: number): this;
  offset(n: number): this;
  // offset() requires limit() to be called first

  withDeleted(): this;
  // By default all queries add WHERE deleted_at IS NULL automatically.
  // .withDeleted() removes that filter — includes soft-deleted rows.

  // ── INSERT ──────────────────────────────────────────────────────────────────
  insert(data: Partial<T> | Partial<T>[]): this;
  // Single row or bulk insert — both handled the same way

  returning(columns?: string[]): this;
  // .insert(data).returning()        → INSERT ... RETURNING *
  // .insert(data).returning(['id'])  → INSERT ... RETURNING id

  // ── UPDATE ──────────────────────────────────────────────────────────────────
  update(data: Partial<T>): this;
  // .where('id', id).update({ name: 'Bob' })

  // ── DELETE ──────────────────────────────────────────────────────────────────
  delete(): this;
  // Hard delete — permanent removal
  // .where('id', id).delete()

  softDelete(): this;
  // Sets deleted_at = NOW() — row excluded from future queries automatically
  // .where('id', id).softDelete()

  // ── Execute ──────────────────────────────────────────────────────────────────
  run():    Promise<QueryResult<T>>;
  first():  Promise<T | null>;   // adds LIMIT 1, returns first row or null
  exists(): Promise<boolean>;    // efficient — checks existence without fetching rows
}