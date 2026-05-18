// =============================================================================
// adapter/organisation/schema.ts
// =============================================================================
// The OrganisationAdapter owns these tables — nothing else does.
// Can be dropped into any project that needs multi-tenancy.
//
// Design:
//   organisations  — a workspace/team/company. Has billing info for invoicing.
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
        { name: 'description', type: 'text' },
        { name: 'logo_url',    type: 'text' },
        { name: 'domain',      type: 'varchar', length: 255 },
        { name: 'white_label', type: 'boolean', notNull: true, default: 'false' },
        { name: 'meta',        type: 'jsonb',   default: "'{}'" },
        // application-specific extra data — adapters can store things here

        // ── Billing / VAT ────────────────────────────────────────────────────
        // Collected during onboarding before first paid checkout.
        // Required by Dutch law to issue a legally compliant invoice.
        {
          name:   'billing_name',
          type:   'varchar',
          length: 255,
          // Legal entity name — may differ from org display name.
          // e.g. "Acme B.V." vs display name "Acme"
        },
        {
          name:   'billing_country',
          type:   'varchar',
          length: 2,
          // ISO 3166-1 alpha-2 (e.g. 'NL', 'DE', 'GB').
          // Required before first checkout — enforced at application layer.
          // Drives VAT logic: EU B2B vs EU B2C vs non-EU.
        },
        {
          name:   'billing_address',
          type:   'varchar',
          length: 255,
          // Street + number. Optional but printed on invoice when present.
        },
        {
          name:   'billing_postal_code',
          type:   'varchar',
          length: 20,
        },
        {
          name:   'billing_city',
          type:   'varchar',
          length: 100,
        },
        {
          name:   'vat_number',
          type:   'varchar',
          length: 50,
          // EU BTW-nummer (e.g. 'NL123456789B01').
          // Presence = B2B customer → 0% VAT reverse charge applies.
          // Absence  = B2C customer → Dutch 21% (below OSS €10k threshold).
          // Non-EU billing_country + null = 0% no VAT.
        },
      ],
      indexes: [
        { columns: ['slug'],            unique: true  },
        { columns: ['billing_country'], unique: false },
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
        { name: 'deleted_at', type: 'timestamp', notNull: false, },
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