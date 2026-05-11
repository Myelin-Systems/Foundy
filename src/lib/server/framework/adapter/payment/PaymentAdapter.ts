// =============================================================================
// adapters/payment/PaymentAdapter.ts
// =============================================================================
// Wiring shell for the payment module.
//
// Plan source of truth: src/lib/shared/plans.ts
// On every boot, ALL plans are upserted into the plans table.
// Change a price or limit in shared/plans.ts → redeploy → DB updates on boot.
// No separate seed script. No duplication.
// =============================================================================

import type { IAdapter }       from '../IAdapter';
import type { AdapterSchema }  from '../AdapterSchema';
import { paymentSchema }       from './schema';
import { MollieService }       from '../../../services/payment/MollieService';
import { MigrationRunner }     from '../../services/database/MigrationRunner';
import { bus }                 from '../../services/bus/BusService';
import type { DataService }    from '../../services/database/DataService';
import { PLANS }               from '$lib/shared/plans';

export interface PaymentAdapterConfig {
  mollieApiKey:  string;
  webhookUrl:    string;
  redirectUrl:   string;
}

export class PaymentAdapter implements IAdapter {

  readonly name     = 'payment-adapter';
  readonly version  = '1.0.0';
  readonly tags     = ['core', 'payment'];
  readonly requires = ['db', 'web'];
  readonly schema:  AdapterSchema = paymentSchema;

  constructor(private readonly config: PaymentAdapterConfig) {}

  async init(): Promise<void> {
    const db = bus.get<DataService>('db');

    // 1. Run migrations
    const runner = new MigrationRunner(db);
    await runner.run([this.schema]);

    // 2. Sync all plans from shared/plans.ts into the DB
    await this.syncPlans(db);

    // 3. Register MollieService
    bus.register(
      new MollieService({
        apiKey:      this.config.mollieApiKey,
        webhookUrl:  this.config.webhookUrl,
        redirectUrl: this.config.redirectUrl,
      }),
      {
        runtime:  'always',
        requires: ['db'],
        tags:     ['core', 'payment'],
      }
    );

    await bus.bootService('mollie');
  }

  async destroy(): Promise<void> {}

  async healthCheck(): Promise<boolean> {
    return bus.isActive('mollie');
  }

  private async syncPlans(db: DataService): Promise<void> {
    const plans = Object.values(PLANS);

    for (const plan of plans) {
      const priceMonthCents = plan.price_month !== null ? plan.price_month * 100 : null;
      const priceYearCents = plan.price_month !== null 
        ? Math.round(plan.price_month * 12 * 0.87 * 100) 
        : null;
      await db.query(
        `INSERT INTO plans (
           slug, name, tagline,
           price_month_cents, price_year_cents,
           highlighted, active,
           features, limits, bullets
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (slug) DO UPDATE SET
           name               = EXCLUDED.name,
           tagline            = EXCLUDED.tagline,
           price_month_cents  = EXCLUDED.price_month_cents,
           price_year_cents   = EXCLUDED.price_year_cents,
           highlighted        = EXCLUDED.highlighted,
           active             = EXCLUDED.active,
           features           = EXCLUDED.features,
           limits             = EXCLUDED.limits,
           bullets            = EXCLUDED.bullets,
           updated_at         = NOW()`,
        [
          plan.id,
          plan.name,
          plan.tagline,
          priceMonthCents,
          priceYearCents,
          plan.highlighted,
          true,
          JSON.stringify(plan.features),
          JSON.stringify(plan.limits),
          JSON.stringify(plan.bullets),
        ]
      );

      console.log(`[PaymentAdapter] ✓  synced plan: ${plan.id}`);
    }

    console.log(`[PaymentAdapter] ✓  ${plans.length} plans synced from shared/plans.ts`);
  }
}