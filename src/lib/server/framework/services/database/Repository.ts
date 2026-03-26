// =============================================================================
// database/Repository.ts
// =============================================================================
// Generic base repository. Extend this for every table in your app.
//
// Usage:
//   class UserRepository extends Repository<User> {
//     protected readonly table = 'users';
//   }
//
//   const repo = new UserRepository(db);
//   const user = await repo.findById('uuid-here');
// =============================================================================

import type { DataService }                          from './DataService';
import type { IQueryBuilder, QueryResult, WhereValue, WhereOperator } from './QueryBuilder/IQueryBuilder';

export abstract class Repository<T extends Record<string, unknown>> {

  protected abstract readonly table: string;

  constructor(protected readonly db: DataService) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  /**
   * Find a single row by primary key (assumes column 'id').
   * Returns null if not found or soft-deleted.
   */
  async findById(id: string): Promise<T | null> {
    return this.db.from<T>(this.table).where('id', id).first();
  }

  /**
   * Find the first row matching a simple equality filter.
   */
  async findOneBy(column: string, value: WhereValue): Promise<T | null> {
    return this.db.from<T>(this.table).where(column, value).first();
  }

  /**
   * Find all rows matching a simple equality filter.
   */
  async findBy(column: string, value: WhereValue): Promise<T[]> {
    const { rows } = await this.db.from<T>(this.table).where(column, value).run();
    return rows;
  }

  /**
   * Find all rows in the table (respects soft-delete by default).
   */
  async findAll(options: {
    limit?:   number;
    offset?:  number;
    orderBy?: { column: string; direction?: 'asc' | 'desc' };
  } = {}): Promise<T[]> {
    let qb = this.db.from<T>(this.table).select();

    if (options.orderBy) {
      qb = qb.orderBy(options.orderBy.column, options.orderBy.direction ?? 'asc');
    }

    if (options.limit !== undefined) {
      qb = qb.limit(options.limit);
      if (options.offset !== undefined) {
        qb = qb.offset(options.offset);
      }
    }

    const { rows } = await qb.run();
    return rows;
  }

  /**
   * Check whether a row with the given id exists.
   */
  async existsById(id: string): Promise<boolean> {
    return this.db.from<T>(this.table).where('id', id).exists();
  }

  /**
   * Return a raw query builder for this table.
   * Use when findBy / findAll aren't expressive enough.
   */
  query(): IQueryBuilder<T> {
    return this.db.from<T>(this.table);
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /**
   * Insert one row and return it.
   */
  async create(data: Omit<Partial<T>, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<T> {
    const { rows } = await this.db
      .from<T>(this.table)
      .insert(data as Partial<T>)
      .returning()
      .run();

    if (!rows[0]) throw new Error(`[${this.table}] insert returned no rows.`);
    return rows[0];
  }

  /**
   * Insert multiple rows and return them.
   */
  async createMany(data: Partial<T>[]): Promise<T[]> {
    const { rows } = await this.db
      .from<T>(this.table)
      .insert(data)
      .returning()
      .run();
    return rows;
  }

  /**
   * Update a row by id and return the updated row.
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    const { rows } = await this.db
      .from<T>(this.table)
      .where('id', id)
      .update(data)
      .returning()
      .run();
    return rows[0] ?? null;
  }

  /**
   * Hard delete a row by id.
   */
  async delete(id: string): Promise<void> {
    await this.db.from<T>(this.table).where('id', id).withDeleted().delete().run();
  }

  /**
   * Soft delete a row by id (sets deleted_at = NOW()).
   * The row is excluded from all future queries unless .withDeleted() is used.
   */
  async softDelete(id: string): Promise<void> {
    await this.db.from<T>(this.table).where('id', id).softDelete().run();
  }

  /**
   * Hard delete all rows matching a column value.
   * Use with care — this bypasses soft-delete.
   */
  async deleteBy(column: string, value: WhereValue): Promise<number> {
    const { affected } = await this.db
      .from<T>(this.table)
      .where(column, value)
      .withDeleted()
      .delete()
      .run();
    return affected ?? 0;
  }

  // ── Count ─────────────────────────────────────────────────────────────────

  /**
   * Count all non-deleted rows.
   */
  async count(): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE deleted_at IS NULL`
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }

  /**
   * Count rows matching a condition.
   */
  async countWhere(column: string, value: WhereValue): Promise<number> {
    const exists = await this.db.from<T>(this.table).where(column, value).exists();
    // For exact counts, fall back to raw SQL
    const { rows } = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.table} WHERE ${column} = $1 AND deleted_at IS NULL`,
      [value]
    );
    return parseInt(rows[0]?.count ?? '0', 10);
  }
}
