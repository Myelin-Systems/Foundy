// =============================================================================
// framework/adapters/AdapterSchema.ts
// =============================================================================
// Type definitions for declaring database tables inside adapters.
// MigrationRunner reads these to create / migrate actual DB tables.
// =============================================================================

export type ColumnType =
  | 'uuid'
  | 'varchar'
  | 'text'
  | 'boolean'
  | 'integer'
  | 'bigint'
  | 'decimal'
  | 'timestamp'
  | 'jsonb'
  | 'enum';

export interface ColumnDefinition {
  name:        string;
  type:        ColumnType;
  primaryKey?: boolean;
  notNull?:    boolean;
  unique?:     boolean;    // WARNING: full unique — use a partial index instead
                           // when the table has soft-deletes. See IndexDefinition.where
  default?:    string;     // SQL default e.g. 'gen_random_uuid()' / 'NOW()'
  length?:     number;     // for varchar
  enumValues?: string[];   // for enum type
  references?: {
    table:    string;
    column:   string;
    onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  };
}

export interface IndexDefinition {
  columns: string[];
  unique?: boolean;
  where?:  string;  // partial index predicate e.g. 'deleted_at IS NULL'
                    // REQUIRED on any unique index for tables with soft-deletes —
                    // without it, deleted rows block re-use of the same value.
}

export interface TableDefinition {
  name:        string;
  columns:     ColumnDefinition[];
  indexes?:    IndexDefinition[];
  timestamps?: boolean; // auto-adds created_at, updated_at, deleted_at
}

export interface TableExtension {
  table:   string;            // table owned by a dependency adapter
  columns: ColumnDefinition[];
}

export interface AdapterSchema {
  tables?:     TableDefinition[];
  extensions?: TableExtension[]; // columns added to another adapter's table
}