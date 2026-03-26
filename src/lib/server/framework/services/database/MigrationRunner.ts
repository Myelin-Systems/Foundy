// =============================================================================
// database/MigrationRunner.ts
// =============================================================================
// Reads AdapterSchema definitions and creates / migrates actual DB tables.
// Only runs CREATE TABLE IF NOT EXISTS — it never drops columns or tables.
// Safe to call on every boot.
//
// Usage in an adapter's init():
//   const db     = bus.get<DataService>('db');
//   const runner = new MigrationRunner(db);
//   await runner.run([this.schema]);
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

  // ── run() ─────────────────────────────────────────────────────────────────
  // Accepts an array of AdapterSchema objects (one per adapter).
  // Processes all tables, then all extensions.

  async run(schemas: AdapterSchema[]): Promise<void> {
    for (const schema of schemas) {
      if (schema.tables) {
        for (const table of schema.tables) {
          await this.createTable(table);
        }
      }
    }

    // Extensions are applied after all tables exist (they reference other tables)
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

    // Auto-timestamps
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
      case 'enum':      return `${col.name}_enum`;  // created in ensureEnumTypes
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

      // DO $$ ... END $$ so it doesn't fail if type already exists
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
    const name    = `idx_${tableName}_${idx.columns.join('_')}`;
    const unique  = idx.unique ? 'UNIQUE ' : '';
    const cols    = idx.columns.join(', ');
    return `CREATE ${unique}INDEX IF NOT EXISTS ${name} ON ${tableName} (${cols});`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private — extensions (add columns to another adapter's table)
  // ─────────────────────────────────────────────────────────────────────────

  private async applyExtension(ext: TableExtension): Promise<void> {
    for (const col of ext.columns) {
      // ADD COLUMN IF NOT EXISTS (PostgreSQL 9.6+)
      const sql = `
        ALTER TABLE ${ext.table}
        ADD COLUMN IF NOT EXISTS ${this.buildColumnDef(col)};
      `.trim();

      await this.db.query(sql);
      console.log(`[MigrationRunner] ✓  extended ${ext.table}.${col.name}`);
    }
  }
}
