// =============================================================================
// adapter/organisation/schema.ts
// =============================================================================
// The OrganisationAdapter owns these tables — nothing else does.
// Can be dropped into any project that needs multi-tenancy.
//
// Design:
//   organisations  — a workspace/team/company. Has a plan for feature flagging.
//   org_members    — links users to organisations with a role.
//
// The auth adapter's users table is referenced but NOT modified.
// The org adapter extends user context at the application layer, not the DB layer.
// =============================================================================

import type { AdapterSchema } from '../AdapterSchema';

export const organisationSchema: AdapterSchema = {
  tables: [
    {
      name:       'organisations',
      timestamps: true,
      columns: [
        { name: 'id',          type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'name',        type: 'varchar', length: 255, notNull: true },
        { name: 'slug',        type: 'varchar', length: 255, notNull: true, unique: true },
        // URL-safe identifier — auto-derived from name on create
        // { name: 'plan',        type: 'varchar', length: 60,  notNull: true, default: "'starter'" },
        // plan is a free varchar — validated by PlanService, not the DB
        { name: 'description', type: 'text' },
        { name: 'logo_url',    type: 'text' },
        { name: 'domain',      type: 'varchar', length: 255 },
        { name: 'white_label', type: 'boolean', notNull: true, default: 'false' },
        { name: 'meta',        type: 'jsonb',   default: "'{}'" },
        // application-specific extra data — adapters can store things here
      ],
      indexes: [
        { columns: ['slug'], unique: true },
      ],
    },

    {
      name:       'org_members',
      timestamps: false,
      columns: [
        { name: 'id',      type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'org_id',  type: 'uuid', notNull: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'user_id', type: 'uuid', notNull: true,
          references: { table: 'users', column: 'id', onDelete: 'CASCADE' } },
        { name: 'role',    type: 'varchar', length: 30, notNull: true, default: "'viewer'" },
        // role is a free varchar — application defines what roles exist
        // common values: 'owner' | 'editor' | 'viewer'
        { name: 'joined_at', type: 'timestamp', notNull: true, default: 'NOW()' },
      ],
      indexes: [
        { columns: ['org_id', 'user_id'], unique: true },
        { columns: ['user_id'],           unique: false },
      ],
    },
  ],
  // ── Extensions ─────────────────────────────────────────────────────────────
  // Adds active_org_id to the users table owned by AuthAdapter.
  // Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS — safe to run on every boot.
  extensions: [
    {
      table: 'users',
      columns: [
        {
          name: 'active_org_id',
          type: 'uuid',
          // Nullable — null means user has no org yet (goes to onboarding)
        },
      ],
    },
  ],
};
