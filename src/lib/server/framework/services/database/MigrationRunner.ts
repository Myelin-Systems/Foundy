// =============================================================================
// database/MigrationRunner.ts
// =============================================================================
// Reads AdapterSchema definitions and creates / migrates actual DB tables.
// Only runs CREATE TABLE IF NOT EXISTS — it never drops columns or tables.
// Safe to call on every boot.
//
// Partial index support:
//   { columns: ['name'], unique: true, where: 'deleted_at IS NULL' }
//   → CREATE UNIQUE INDEX IF NOT EXISTS ... WHERE deleted_at IS NULL
//
//   This is the correct pattern for any unique column on a soft-delete table.
//   Without the WHERE clause, deleted rows permanently block re-use of a value.
// =============================================================================

import type { DataService }   from './DataService';
import type {
  AdapterSchema,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  TableExtension,
} from '../../adapter/AdapterSchema';

export class MigrationRunner {

  constructor(private readonly db: DataService) {}

  async run(schemas: AdapterSchema[]): Promise<void> {
    for (const schema of schemas) {
      if (schema.tables) {
        for (const table of schema.tables) {
          await this.createTable(table);
        }
      }
    }

    for (const schema of schemas) {
      if (schema.extensions) {
        for (const ext of schema.extensions) {
          await this.applyExtension(ext);
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private — table creation
  // ─────────────────────────────────────────────────────────────────────────

  private async createTable(table: TableDefinition): Promise<void> {
    await this.ensureEnumTypes(table);
    await this.db.query(this.buildCreateTable(table));
    if (table.indexes) {
      for (const idx of table.indexes) {
        await this.db.query(this.buildCreateIndex(table.name, idx));
      }
    }
    console.log(`[MigrationRunner] ✓  ${table.name}`);
  }

  private buildCreateTable(table: TableDefinition): string {
    const cols: string[] = [];

    for (const col of table.columns) {
      cols.push(this.buildColumnDef(col));
    }

    if (table.timestamps) {
      cols.push(`created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
      cols.push(`updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
      cols.push(`deleted_at  TIMESTAMPTZ`);
    }

    return `
      CREATE TABLE IF NOT EXISTS ${table.name} (
        ${cols.join(',\n        ')}
      );
    `.trim();
  }

  private buildColumnDef(col: ColumnDefinition): string {
    const parts: string[] = [col.name, this.toSqlType(col)];

    if (col.primaryKey) parts.push('PRIMARY KEY');
    if (col.notNull)    parts.push('NOT NULL');

    // ── unique on the column definition ──────────────────────────────────────
    // Only use this for tables WITHOUT soft-deletes (e.g. a lookup/enum table).
    // For soft-delete tables, declare a partial index instead:
    //   { columns: ['name'], unique: true, where: 'deleted_at IS NULL' }
    if (col.unique)     parts.push('UNIQUE');

    if (col.default)    parts.push(`DEFAULT ${col.default}`);

    if (col.references) {
      const ref = col.references;
      parts.push(
        `REFERENCES ${ref.table}(${ref.column}) ON DELETE ${ref.onDelete}`
      );
    }

    return parts.join(' ');
  }

  private toSqlType(col: ColumnDefinition): string {
    switch (col.type) {
      case 'uuid':      return 'UUID';
      case 'varchar':   return col.length ? `VARCHAR(${col.length})` : 'VARCHAR(255)';
      case 'text':      return 'TEXT';
      case 'boolean':   return 'BOOLEAN';
      case 'integer':   return 'INTEGER';
      case 'bigint':    return 'BIGINT';
      case 'decimal':   return 'DECIMAL';
      case 'timestamp': return 'TIMESTAMPTZ';
      case 'jsonb':     return 'JSONB';
      case 'enum':      return `${col.name}_enum`;
      default:          return 'TEXT';
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private — enum types
  // ─────────────────────────────────────────────────────────────────────────

  private async ensureEnumTypes(table: TableDefinition): Promise<void> {
    for (const col of table.columns) {
      if (col.type !== 'enum' || !col.enumValues?.length) continue;

      const typeName = `${col.name}_enum`;
      const values   = col.enumValues.map(v => `'${v}'`).join(', ');

      await this.db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_type WHERE typname = '${typeName}'
          ) THEN
            CREATE TYPE ${typeName} AS ENUM (${values});
          END IF;
        END
        $$;
      `);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private — indexes
  // ─────────────────────────────────────────────────────────────────────────

  private buildCreateIndex(tableName: string, idx: IndexDefinition): string {
    const name   = `idx_${tableName}_${idx.columns.join('_')}`;
    const unique = idx.unique ? 'UNIQUE ' : '';
    const cols   = idx.columns.join(', ');

    // ── Partial index ─────────────────────────────────────────────────────────
    // Always use WHERE deleted_at IS NULL on unique indexes for soft-delete
    // tables. Without it, a deleted row permanently blocks re-use of its value.
    const where  = idx.where ? ` WHERE ${idx.where}` : '';

    return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON ${tableName} (${cols})${where};`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private — extensions
  // ─────────────────────────────────────────────────────────────────────────

  private async applyExtension(ext: TableExtension): Promise<void> {
    for (const col of ext.columns) {
      const sql = `
        ALTER TABLE ${ext.table}
        ADD COLUMN IF NOT EXISTS ${this.buildColumnDef(col)};
      `.trim();

      await this.db.query(sql);
      console.log(`[MigrationRunner] ✓  extended ${ext.table}.${col.name}`);
    }
  }
}