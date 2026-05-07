// =============================================================================
// adapter/foundy/schema.ts
// =============================================================================

import type { AdapterSchema } from '$lib/server/framework/adapter/AdapterSchema';

export const foundySchema: AdapterSchema = {
  tables: [

    // ── sites ─────────────────────────────────────────────────────────────────
    {
      name: 'sites', timestamps: true,
      columns: [
        { name: 'id',     type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'org_id', type: 'uuid',    notNull: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'name',   type: 'varchar', length: 255, notNull: true },
        { name: 'slug',   type: 'varchar', length: 100, notNull: true },
        { name: 'domain', type: 'varchar', length: 255 },
      ],
      indexes: [
        { columns: ['org_id'],         unique: false },
        { columns: ['org_id', 'slug'], unique: true  },
        { columns: ['domain'],         unique: true  },
      ],
    },

    // ── site_tokens ───────────────────────────────────────────────────────────
    // type = 'public'  → pnd_pub_ prefix — safe in browser, read + decrement
    // type = 'secret'  → pnd_sec_ prefix — server-side only, read + write
    {
      name: 'site_tokens', timestamps: true,
      columns: [
        { name: 'id',      type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'site_id', type: 'uuid',    notNull: true,
          references: { table: 'sites', column: 'id', onDelete: 'CASCADE' } },
        { name: 'token',   type: 'text',    notNull: true, unique: true },
        { name: 'type',    type: 'varchar', length: 10, notNull: true, default: "'public'" },
        { name: 'revoked', type: 'boolean', notNull: true, default: 'false' },
      ],
      indexes: [
        { columns: ['site_id'], unique: false },
        { columns: ['token'],   unique: true  },
        { columns: ['type'],    unique: false },
      ],
    },

    // ── collections ───────────────────────────────────────────────────────────
    {
      name: 'collections', timestamps: true,
      columns: [
        { name: 'id',      type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'site_id', type: 'uuid',    notNull: true,
          references: { table: 'sites', column: 'id', onDelete: 'CASCADE' } },
        { name: 'name',    type: 'varchar', length: 100, notNull: true },
        { name: 'label',   type: 'varchar', length: 100, notNull: true },
        { name: 'color',   type: 'varchar', length: 20,  notNull: true, default: "'#00d4ff'" },
        { name: 'fields',  type: 'jsonb',   notNull: true, default: "'[]'::jsonb" },
      ],
      indexes: [
        { columns: ['site_id'],         unique: false },
        { columns: ['site_id', 'name'], unique: true  },
      ],
    },

    // ── entries ───────────────────────────────────────────────────────────────
    {
      name: 'entries', timestamps: true,
      columns: [
        { name: 'id',            type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'site_id',       type: 'uuid',    notNull: true,
          references: { table: 'sites',       column: 'id', onDelete: 'CASCADE' } },
        { name: 'collection_id', type: 'uuid',    notNull: true,
          references: { table: 'collections', column: 'id', onDelete: 'CASCADE' } },
        { name: 'status',        type: 'varchar', length: 20, notNull: true, default: "'draft'" },
        { name: 'data',          type: 'jsonb',   notNull: true, default: "'{}'" },
        { name: 'data_bytes',    type: 'integer', notNull: true, default: '0' },
      ],
      indexes: [
        { columns: ['site_id'],                             unique: false },
        { columns: ['collection_id'],                       unique: false },
        { columns: ['site_id', 'collection_id', 'status'], unique: false },
      ],
    },

    // ── media_files ───────────────────────────────────────────────────────────
    {
      name: 'media_files', timestamps: true,
      columns: [
        { name: 'id',        type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'site_id',   type: 'uuid',    notNull: true,
          references: { table: 'sites', column: 'id', onDelete: 'CASCADE' } },
        { name: 'name',      type: 'varchar', length: 255, notNull: true },
        { name: 'key',       type: 'text',    notNull: true, unique: true },
        { name: 'mime_type', type: 'varchar', length: 127,  notNull: true },
        { name: 'size',      type: 'integer', notNull: true },
      ],
      indexes: [
        { columns: ['site_id'],   unique: false },
        { columns: ['key'],       unique: true  },
        { columns: ['mime_type'], unique: false },
      ],
    },

    // ── org_usage ─────────────────────────────────────────────────────────────
    {
      name: 'org_usage', timestamps: false,
      columns: [
        { name: 'org_id',           type: 'uuid',      primaryKey: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'site_count',       type: 'integer',   notNull: true, default: '0' },
        { name: 'collection_count', type: 'integer',   notNull: true, default: '0' },
        { name: 'entry_count',      type: 'integer',   notNull: true, default: '0' },
        { name: 'db_bytes',         type: 'bigint',    notNull: true, default: '0' },
        { name: 'file_bytes',       type: 'bigint',    notNull: true, default: '0' },
        { name: 'updated_at',       type: 'timestamp', notNull: true, default: 'NOW()' },
      ],
      indexes: [],
    },

  ],

  extensions: [
    {
      table: 'organisations',
      columns: [
        { name: 'plan', type: 'varchar', length: 30, notNull: true, default: "'cms_starter'" },
      ],
    },
  ],
};