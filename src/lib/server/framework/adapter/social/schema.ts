import type { AdapterSchema } from '$lib/server/framework/adapter/AdapterSchema';

export const socialSchema: AdapterSchema = {
  tables: [
    {
      name: 'social_accounts', timestamps: true,
      columns: [
        { name: 'id',           type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'org_id',       type: 'uuid',    notNull: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'platform',     type: 'varchar', length: 30,  notNull: true },
        { name: 'platform_id',  type: 'varchar', length: 255, notNull: true },
        { name: 'username',     type: 'varchar', length: 255, notNull: true },
        { name: 'display_name', type: 'varchar', length: 255 },
        { name: 'avatar_url',   type: 'text' },
        { name: 'access_token', type: 'text',    notNull: true },
        { name: 'token_expiry', type: 'timestamp' },
        { name: 'active',       type: 'boolean', notNull: true, default: 'true' },
        { name: 'meta',         type: 'jsonb',   default: "'{}'" },
      ],
      indexes: [
        { columns: ['org_id'],                              unique: false },
        { columns: ['org_id', 'platform', 'platform_id'],  unique: true  },
      ],
    },
    {
      name: 'social_posts', timestamps: true,
      columns: [
        { name: 'id',               type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'org_id',           type: 'uuid', notNull: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'created_by',       type: 'uuid', notNull: true },
        { name: 'content',          type: 'text', notNull: true },
        { name: 'media_urls',       type: 'jsonb', notNull: true, default: "'[]'" },
        { name: 'account_ids',      type: 'jsonb', notNull: true, default: "'[]'" },
        { name: 'status',           type: 'varchar', length: 20, notNull: true, default: "'draft'" },
        { name: 'scheduled_at',     type: 'timestamp' },
        { name: 'published_at',     type: 'timestamp' },
        { name: 'platform_results', type: 'jsonb', default: "'{}'" },
        { name: 'tags',             type: 'jsonb', notNull: true, default: "'[]'" },
        { name: 'notes',            type: 'text' },
      ],
      indexes: [
        { columns: ['org_id'],           unique: false },
        { columns: ['org_id', 'status'], unique: false },
        { columns: ['scheduled_at'],     unique: false },
      ],
    },
  ],
};
