// =============================================================================
// adapters/auth/schema.ts
// =============================================================================
// Table definitions owned by the AuthAdapter.
// MigrationRunner reads this to create / update the actual DB tables.
// Tables: users, sessions
// =============================================================================

import type { AdapterSchema } from '../AdapterSchema';

export const authSchema: AdapterSchema = {
  tables: [
    // ── users ─────────────────────────────────────────────────────────────────
    {
      name:       'users',
      timestamps: true, // auto-adds created_at, updated_at, deleted_at
      columns: [
        {
          name:       'id',
          type:       'uuid',
          primaryKey: true,
          default:    'gen_random_uuid()',
        },
        {
          name:    'email',
          type:    'varchar',
          length:  254,
          notNull: true,
          unique:  true,
        },
        {
          name:    'password_hash',
          type:    'varchar',
          length:  255,
          notNull: true,
        },
        {
          name:    'full_name',
          type:    'varchar',
          length:  255,
          notNull: true,
        },
        {
          name:       'role',
          type:       'enum',
          notNull:    true,
          default:    "'viewer'",
          enumValues: ['viewer', 'editor', 'admin', 'owner'],
        },
        {
          name:    'company_id',
          type:    'uuid',
          // null until user is assigned to or creates a company
        },
        {
          name:    'verified_at',
          type:    'timestamp',
          // null = email not yet verified
        },
        {
          name:    'active_org_id',
          type:    'uuid',
          // null until user creates or joins an org (set by UserRoleAdapter)
        },
      ],
      indexes: [
        { columns: ['email'],         unique: true },
        { columns: ['company_id'],    unique: false },
        { columns: ['active_org_id'], unique: false },
      ],
    },

    // ── sessions ──────────────────────────────────────────────────────────────
    {
      name:       'sessions',
      timestamps: false, // sessions are hard-deleted on logout — no soft delete
      columns: [
        {
          name:       'id',
          type:       'uuid',
          primaryKey: true,
          default:    'gen_random_uuid()',
        },
        {
          name:       'user_id',
          type:       'uuid',
          notNull:    true,
          references: { table: 'users', column: 'id', onDelete: 'CASCADE' },
        },
        {
          name:    'org_id',
          type:    'uuid',
          // null until user belongs to an org
        },
        {
          name:   'ip_address',
          type:   'varchar',
          length: 45, // supports IPv6
        },
        {
          name: 'user_agent',
          type: 'text',
        },
        {
          name:    'expires_at',
          type:    'timestamp',
          notNull: true,
        },
        {
          name:    'created_at',
          type:    'timestamp',
          notNull: true,
          default: 'NOW()',
        },
        {
          name:    'deleted_at',
          type:    'timestamp',
          // null until session is soft-deleted on logout or hard-deleted by cleanup job
        },
      ],
      indexes: [
        { columns: ['user_id'],    unique: false },
        { columns: ['expires_at'], unique: false }, // for expired session cleanup
      ],
    },
  ],
};