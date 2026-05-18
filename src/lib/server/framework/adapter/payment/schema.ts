// =============================================================================
// adapters/payment/schema.ts
// =============================================================================
// Tables owned by the PaymentAdapter.
// Tables: plans, subscriptions, invoices
//
// Extensions: adds billing columns to the organisations table owned by
// OrganisationAdapter — billing address, VAT, country etc.
//
// Plans are seeded from src/lib/shared/plans.ts on every boot (upsert by slug).
// The slug column IS the PlanId from shared/plans.ts — the two are always in sync.
// =============================================================================

import type { AdapterSchema } from '../AdapterSchema';

export const paymentSchema: AdapterSchema = {
  tables: [

    // ── plans ─────────────────────────────────────────────────────────────────
    {
      name: 'plans', timestamps: true,
      columns: [
        { name: 'id',                type: 'uuid',    primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'slug',              type: 'varchar', length: 64,  notNull: true, unique: true },
        { name: 'name',              type: 'varchar', length: 128, notNull: true },
        { name: 'tagline',           type: 'varchar', length: 255, notNull: true },
        { name: 'price_month_cents', type: 'integer' },
        { name: 'price_year_cents',  type: 'integer' },
        { name: 'highlighted',       type: 'boolean', notNull: true, default: 'false' },
        { name: 'active',            type: 'boolean', notNull: true, default: 'true'  },
        { name: 'features',          type: 'jsonb',   notNull: true, default: "'[]'::jsonb" },
        { name: 'limits',            type: 'jsonb',   notNull: true, default: "'{}'::jsonb" },
        { name: 'bullets',           type: 'jsonb',   notNull: true, default: "'[]'::jsonb" },
      ],
      indexes: [
        { columns: ['slug'],        unique: true  },
        { columns: ['active'],      unique: false },
        { columns: ['highlighted'], unique: false },
      ],
    },

    // ── subscriptions ─────────────────────────────────────────────────────────
    {
      name: 'subscriptions', timestamps: true,
      columns: [
        { name: 'id',     type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'org_id', type: 'uuid', notNull: true, unique: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'plan_id', type: 'uuid', notNull: true,
          references: { table: 'plans', column: 'id', onDelete: 'RESTRICT' } },
        { name: 'status', type: 'enum', notNull: true, default: "'free'",
          enumValues: ['free', 'pending', 'active', 'past_due', 'cancelled', 'expired'] },
        { name: 'mollie_customer_id',     type: 'varchar', length: 128 },
        { name: 'mollie_subscription_id', type: 'varchar', length: 128 },
        { name: 'mollie_mandate_id',      type: 'varchar', length: 128 },
        { name: 'current_period_start',   type: 'timestamp' },
        { name: 'current_period_end',     type: 'timestamp' },
        { name: 'cancel_at_period_end',   type: 'boolean', notNull: true, default: 'false' },
        { name: 'cancelled_at',           type: 'timestamp' },
        { name: 'trial_ends_at',          type: 'timestamp' },
      ],
      indexes: [
        { columns: ['org_id'],                unique: true  },
        { columns: ['mollie_customer_id'],     unique: false },
        { columns: ['mollie_subscription_id'], unique: false },
        { columns: ['status'],                 unique: false },
      ],
    },

    // ── invoices ──────────────────────────────────────────────────────────────
    { name: 'invoices', timestamps: true,
      columns: [
        { name: 'id',     type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
        { name: 'org_id', type: 'uuid', notNull: true,
          references: { table: 'organisations', column: 'id', onDelete: 'CASCADE' } },
        { name: 'subscription_id', type: 'uuid',
          references: { table: 'subscriptions', column: 'id', onDelete: 'SET NULL' } },
        { name: 'mollie_payment_id',   type: 'varchar', length: 128, notNull: true, unique: true },
        { name: 'amount_cents',        type: 'integer',  notNull: true },
        { name: 'subtotal_cents',      type: 'integer' },
        { name: 'vat_rate_pct',        type: 'integer' },
        { name: 'vat_amount_cents',    type: 'integer' },
        { name: 'vat_reverse_charge',  type: 'boolean', notNull: true, default: 'false' },
        { name: 'mollie_fee_cents',    type: 'integer' },
        { name: 'net_revenue_cents',   type: 'integer' },
        { name: 'currency',            type: 'varchar',  length: 3, notNull: true, default: "'EUR'" },
        { name: 'status', type: 'enum', notNull: true,
          enumValues: ['open', 'paid', 'failed', 'cancelled', 'expired', 'refunded'] },
        { name: 'paid_at',             type: 'timestamp' },
        { name: 'description',         type: 'text' },
        { name: 'mollie_checkout_url', type: 'text' },
      ],
      indexes: [
        { columns: ['org_id'],            unique: false },
        { columns: ['mollie_payment_id'], unique: true  },
        { columns: ['status'],            unique: false },
      ],
    },
  ],

  // ── Extensions ──────────────────────────────────────────────────────────────
  // PaymentAdapter owns billing metadata — stored on the organisations row.
  // Uses ADD COLUMN IF NOT EXISTS so it's safe to run on every boot.
  extensions: [
    {
      table: 'organisations',
      columns: [
        { name: 'billing_name',        type: 'varchar', length: 255 },
        { name: 'billing_country',     type: 'varchar', length: 2   },
        { name: 'billing_address',     type: 'text'                 },
        { name: 'billing_postal_code', type: 'varchar', length: 20  },
        { name: 'billing_city',        type: 'varchar', length: 100 },
        { name: 'vat_number',          type: 'varchar', length: 40  },
      ],
    },
  ],
};