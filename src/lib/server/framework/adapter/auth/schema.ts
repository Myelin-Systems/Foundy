// =============================================================================
// adapter/auth/schema.ts
// =============================================================================
// The auth adapter owns exactly two tables:
//   users    — who someone is (identity only, nothing more)
//   sessions — their active login tokens
//
// No roles. No organisation references. No application-specific fields.
// Those are the responsibility of the adapter that needs them.
// =============================================================================

import type { AdapterSchema } from '../AdapterSchema';

export const authSchema: AdapterSchema = {
  tables: [
    {
      name:       'users',
      timestamps: true,
      columns: [
        { name: 'id',            type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'email',         type: 'varchar', length: 254, notNull: true, unique: true },
        { name: 'password_hash', type: 'varchar', length: 255, notNull: true },
        { name: 'full_name',     type: 'varchar', length: 255, notNull: true },
        { name: 'verified_at',   type: 'timestamp' },
        // null = email not yet verified — email verification is an optional
        // auth feature, not an org feature
      ],
      indexes: [
        { columns: ['email'], unique: true },
      ],
    },

    {
      name:       'sessions',
      timestamps: false,
      columns: [
        { name: 'id',         type: 'uuid',      primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'user_id',    type: 'uuid',      notNull: true,
          references: { table: 'users', column: 'id', onDelete: 'CASCADE' } },
        { name: 'ip_address', type: 'varchar',   length: 45 },
        { name: 'user_agent', type: 'text' },
        { name: 'deleted_at', type: 'timestamp' },
        { name: 'expires_at', type: 'timestamp', notNull: true },
        { name: 'created_at', type: 'timestamp', notNull: true, default: 'NOW()' },
      ],
      indexes: [
        { columns: ['user_id'],    unique: false },
        { columns: ['expires_at'], unique: false },
      ],
    },
  ],
};
