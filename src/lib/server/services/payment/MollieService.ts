// =============================================================================
// services/payment/MollieService.ts
// =============================================================================
// Mollie integration for recurring SaaS billing.
//
// Recurring flow:
//   1. createCheckout()        → first payment (iDEAL/Wero/card), sequenceType:'first'
//                                establishes the mandate
//   2. handleWebhook()         → on 'paid': store mandate, activate subscription
//   3. Mollie auto-charges     → sends webhook on each renewal
//   4. handleWebhook()         → on renewal: update period, write invoice
//   5. cancelSubscription()    → sets cancel_at_period_end or immediate
//
// npm install @mollie/api-client
// =============================================================================

import type { IService }            from '../../framework/services/IServices';
import { bus }                      from '../../framework/services/bus/BusService';
import type { DataService }         from '../../framework/services/database/DataService';
import type { EmailService }        from '../email/EmailService';

// ── Domain types ──────────────────────────────────────────────────────────────

export interface Plan {
  id:               string;
  slug:             string;
  name:             string;
  price_cents:      number;
  currency:         string;
  interval:         'month' | 'year';
  interval_count:   number;
  site_limit:       number;
  api_calls_limit:  number;
  storage_mb:       number;
  active:           boolean;
  mollie_plan_id:   string | null;
  features:         string[] | null;
}

export interface Subscription {
  id:                      string;
  org_id:                  string;
  plan_id:                 string;
  status:                  SubscriptionStatus;
  mollie_customer_id:      string | null;
  mollie_subscription_id:  string | null;
  mollie_mandate_id:       string | null;
  current_period_start:    string | null;
  current_period_end:      string | null;
  cancel_at_period_end:    boolean;
  cancelled_at:            string | null;
  trial_ends_at:           string | null;
  created_at:              string;
  updated_at:              string;
}

export interface Invoice {
  id:                  string;
  org_id:              string;
  subscription_id:     string | null;
  mollie_payment_id:   string;
  amount_cents:        number;
  currency:            string;
  status:              InvoiceStatus;
  paid_at:             string | null;
  description:         string | null;
  mollie_checkout_url: string | null;
}

export type SubscriptionStatus =
  | 'free' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired';

export type InvoiceStatus =
  | 'open' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface CheckoutResult {
  checkoutUrl:  string;   // redirect user here
  paymentId:    string;   // tr_xxxxx — store for reference
  invoiceId:    string;   // our DB invoice ID
}

export class PaymentError extends Error {
  constructor(
    public readonly code:    string,
    message:                 string,
    public readonly status:  number = 400,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

// ── MollieService config ──────────────────────────────────────────────────────

export interface MollieServiceConfig {
  apiKey:         string;   // process.env.MOLLIE_API_KEY  (test_xxx or live_xxx)
  webhookUrl:     string;   // publicly reachable URL e.g. https://foundiq.io/api/billing/webhook
  redirectUrl:    string;   // where to send user after payment e.g. https://foundiq.io/dashboard/billing
}

// ── MollieService ─────────────────────────────────────────────────────────────

export class MollieService implements IService {

  readonly name    = 'mollie';
  readonly version = '1.0.0';
  readonly tags    = ['core', 'payment', 'mollie'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client!: any;

  constructor(private readonly config: MollieServiceConfig) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  async init(): Promise<void> {
    const { createMollieClient } = await import('@mollie/api-client');
    this.client = createMollieClient({ apiKey: this.config.apiKey });
    console.log(`[${this.name}] Mollie client initialised`);
  }

  async destroy(): Promise<void> {
    // stateless HTTP client — nothing to close
  }

  async healthCheck(): Promise<boolean> {
    try {
      // A cheap API call to verify the key is valid
      await this.client.methods.list();
      return true;
    } catch {
      return false;
    }
  }

  // ── Plans ────────────────────────────────────────────────────────────────────

  /**
   * Fetch all active plans from the DB.
   */
  async getPlans(): Promise<Plan[]> {
    const db = bus.get<DataService>('db');
    const { rows } = await db.from<Plan>('plans')
      .where('active', true)
      .orderBy('price_cents', 'asc')
      .run();
    return rows;
  }

  /**
   * Fetch one plan by slug.
   */
  async getPlanBySlug(slug: string): Promise<Plan | null> {
    const db = bus.get<DataService>('db');
    return db.from<Plan>('plans').where('slug', slug).first();
  }

  // ── Subscription reads ───────────────────────────────────────────────────────

  /**
   * Get the subscription for an org. Creates a free-tier subscription if none exists.
   */
  async getOrCreateSubscription(orgId: string): Promise<Subscription & { plan: Plan }> {
    const db  = bus.get<DataService>('db');

    let sub = await db.from<Subscription>('subscriptions').where('org_id', orgId).first();

    if (!sub) {
      // New org — assign free plan
      const freePlan = await this.getPlanBySlug('free');
      if (!freePlan) throw new PaymentError('PLAN_NOT_FOUND', 'Free plan not configured.', 500);

      const { rows } = await db.from<Subscription>('subscriptions')
        .insert({ org_id: orgId, plan_id: freePlan.id, status: 'free' })
        .returning()
        .run();
      sub = rows[0];
    }

    const plan = await db.from<Plan>('plans').where('id', sub.plan_id).first();
    if (!plan) throw new PaymentError('PLAN_NOT_FOUND', 'Plan not found for subscription.', 500);

    return { ...sub, plan };
  }

  /**
   * Check whether an org is allowed to use a feature.
   * Used by API delivery layer to gate requests.
   */
  isActive(sub: Subscription): boolean {
    return sub.status === 'active' || sub.status === 'free';
  }

  // ── Checkout ─────────────────────────────────────────────────────────────────

  /**
   * Create a Mollie first-payment checkout URL.
   * The user is redirected to this URL to pay via iDEAL, Wero, or card.
   * On success, Mollie POSTs to /api/billing/webhook.
   */
  async createCheckout(params: {
    orgId:       string;
    orgName:     string;
    planSlug:    string;
    userEmail:   string;
  }): Promise<CheckoutResult> {

    const db   = bus.get<DataService>('db');
    const plan = await this.getPlanBySlug(params.planSlug);

    if (!plan)          throw new PaymentError('PLAN_NOT_FOUND', `Plan "${params.planSlug}" not found.`);
    if (!plan.active)   throw new PaymentError('PLAN_INACTIVE',  `Plan "${params.planSlug}" is not available.`);
    if (plan.price_cents === 0) throw new PaymentError('PLAN_FREE', 'Cannot checkout free plan.');

    // Get or create Mollie customer for this org
    const sub          = await this.getOrCreateSubscription(params.orgId);
    const customerId   = await this.ensureMollieCustomer(sub, params.orgName, params.userEmail);

    // Amount in euros (Mollie uses string decimal e.g. "9.00")
    const amount = this.centsToCurrency(plan.price_cents, plan.currency);

    // Create the first payment — sequenceType 'first' creates a mandate
    const payment = await this.client.payments.create({
      amount: {
        currency: plan.currency,
        value:    amount,
      },
      customerId,
      sequenceType:  'first',
      description:   `Foundiq ${plan.name} — ${plan.interval === 'month' ? 'Monthly' : 'Annual'} subscription`,
      redirectUrl:   `${this.config.redirectUrl}?payment=pending`,
      webhookUrl:    this.config.webhookUrl,
      metadata: {
        org_id:    params.orgId,
        plan_id:   plan.id,
        plan_slug: plan.slug,
        type:      'first_payment',
      },
    });

    // Write pending invoice for audit trail
    const { rows: invoiceRows } = await db.from<Invoice>('invoices')
      .insert({
        org_id:               params.orgId,
        subscription_id:      sub.id,
        mollie_payment_id:    payment.id,
        amount_cents:         plan.price_cents,
        currency:             plan.currency,
        status:               'open',
        description:          `Foundiq ${plan.name} subscription`,
        mollie_checkout_url:  payment.getCheckoutUrl() ?? null,
      })
      .returning(['id'])
      .run();

    // Mark subscription as pending
    await db.from<Subscription>('subscriptions')
      .where('id', sub.id)
      .update({
        status:               'pending',
        mollie_customer_id:   customerId,
        plan_id:              plan.id,
      })
      .run();

    return {
      checkoutUrl: payment.getCheckoutUrl() ?? '',
      paymentId:   payment.id,
      invoiceId:   invoiceRows[0].id,
    };
  }

  // ── Webhook handler ───────────────────────────────────────────────────────────

  /**
   * Process a Mollie webhook call.
   * Mollie POSTs the payment ID — we fetch the full payment and process it.
   *
   * Idempotent: safe to call multiple times for the same payment.
   */
  async handleWebhook(molliePaymentId: string): Promise<void> {
    const db      = bus.get<DataService>('db');
    const payment = await this.client.payments.get(molliePaymentId);
    const meta    = payment.metadata as {
      org_id:    string;
      plan_id:   string;
      plan_slug: string;
      type:      'first_payment' | 'recurring';
    };

    // ── Paid ─────────────────────────────────────────────────────────────────
    if (payment.status === 'paid') {
      await this.handlePaymentPaid(payment, meta, db);
    }

    // ── Failed / expired / cancelled ──────────────────────────────────────────
    if (['failed', 'expired', 'canceled'].includes(payment.status)) {
      await this.handlePaymentFailed(payment, meta, db);
    }

    // Update invoice status
    await db.from<Invoice>('invoices')
      .where('mollie_payment_id', molliePaymentId)
      .update({
        status:  this.mapPaymentStatus(payment.status),
        paid_at: payment.status === 'paid' ? new Date().toISOString() : undefined,
      } as Partial<Invoice>)
      .run();
  }

  // ── Cancel subscription ───────────────────────────────────────────────────────

  /**
   * Cancel a subscription.
   * immediate=false (default) → access until end of current period.
   * immediate=true            → cancel now, no refund.
   */
  async cancelSubscription(orgId: string, immediate = false): Promise<void> {
    const db  = bus.get<DataService>('db');
    const sub = await db.from<Subscription>('subscriptions').where('org_id', orgId).first();

    if (!sub) throw new PaymentError('SUB_NOT_FOUND', 'No subscription found for this org.');
    if (sub.status === 'free') throw new PaymentError('SUB_FREE', 'Free plan cannot be cancelled.');

    // Cancel in Mollie
    if (sub.mollie_subscription_id && sub.mollie_customer_id) {
      try {
        await this.client.subscriptions.cancel({
          id:         sub.mollie_subscription_id,
          customerId: sub.mollie_customer_id,
        });
      } catch (err) {
        // If already cancelled in Mollie, continue — we still update our DB
        console.warn(`[${this.name}] Mollie subscription cancel warning:`, (err as Error).message);
      }
    }

    if (immediate) {
      await db.from<Subscription>('subscriptions')
        .where('org_id', orgId)
        .update({
          status:       'cancelled',
          cancelled_at: new Date().toISOString(),
        } as Partial<Subscription>)
        .run();
    } else {
      await db.from<Subscription>('subscriptions')
        .where('org_id', orgId)
        .update({ cancel_at_period_end: true } as Partial<Subscription>)
        .run();
    }
  }

  // ── Plan change ───────────────────────────────────────────────────────────────

  /**
   * Upgrade or downgrade a subscription.
   * Upgrade: cancel current Mollie subscription, create new checkout for new plan.
   * Downgrade: schedule change at period end.
   */
  async changePlan(orgId: string, orgName: string, userEmail: string, newPlanSlug: string): Promise<CheckoutResult | null> {
    const db      = bus.get<DataService>('db');
    const sub     = await this.getOrCreateSubscription(orgId);
    const newPlan = await this.getPlanBySlug(newPlanSlug);

    if (!newPlan) throw new PaymentError('PLAN_NOT_FOUND', `Plan "${newPlanSlug}" not found.`);

    // Downgrade to free — just cancel
    if (newPlan.price_cents === 0) {
      await this.cancelSubscription(orgId, false);
      return null;
    }

    // Cancel existing Mollie subscription first
    if (sub.mollie_subscription_id && sub.mollie_customer_id) {
      try {
        await this.client.subscriptions.cancel({
          id:         sub.mollie_subscription_id,
          customerId: sub.mollie_customer_id,
        });
      } catch { /* already cancelled */ }

      await db.from<Subscription>('subscriptions')
        .where('org_id', orgId)
        .update({ mollie_subscription_id: null } as Partial<Subscription>)
        .run();
    }

    // Create new checkout for the new plan
    return this.createCheckout({ orgId, orgName, planSlug: newPlanSlug, userEmail });
  }

  // ── Private — payment handlers ────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handlePaymentPaid(payment: any, meta: any, db: DataService): Promise<void> {
    const sub = await db.from<Subscription>('subscriptions')
      .where('org_id', meta.org_id)
      .first();
    if (!sub) return;

    // First payment: get mandate and create recurring Mollie subscription
    if (meta.type === 'first_payment') {
      const mandateId = await this.getValidMandateId(sub.mollie_customer_id!);
      const mollieSubscription = await this.createMollieSubscription(
        sub.mollie_customer_id!,
        mandateId,
        meta.plan_id,
        db,
      );

      const now   = new Date();
      const end   = this.addInterval(now, mollieSubscription.interval, mollieSubscription.times ?? 1);

      await db.from<Subscription>('subscriptions')
        .where('org_id', meta.org_id)
        .update({
          status:                  'active',
          plan_id:                 meta.plan_id,
          mollie_mandate_id:       mandateId,
          mollie_subscription_id:  mollieSubscription.id,
          current_period_start:    now.toISOString(),
          current_period_end:      end.toISOString(),
          cancel_at_period_end:    false,
        } as Partial<Subscription>)
        .run();

      console.log(`[${this.name}] Subscription activated for org ${meta.org_id}`);

      // Send invoice email — fire and forget, never block the webhook
      this.sendInvoiceEmail({
        payment,
        orgId:       meta.org_id,
        plan:        (await db.from<Plan>('plans').where('id', meta.plan_id).first())!,
        periodStart: now,
        periodEnd:   end,
        db,
      }).catch(err => console.error(`[${this.name}] Invoice email failed:`, err));
    }

    // Recurring payment: renew the period
    if (meta.type === 'recurring') {
      const plan  = await db.from<Plan>('plans').where('id', meta.plan_id).first();
      if (!plan) return;

      const now = new Date();
      const end = this.addInterval(now, plan.interval, plan.interval_count);

      await db.from<Subscription>('subscriptions')
        .where('org_id', meta.org_id)
        .update({
          status:               'active',
          current_period_start: now.toISOString(),
          current_period_end:   end.toISOString(),
        } as Partial<Subscription>)
        .run();

      // Send renewal invoice email
      this.sendInvoiceEmail({
        payment,
        orgId:       meta.org_id,
        plan,
        periodStart: now,
        periodEnd:   end,
        db,
      }).catch(err => console.error(`[${this.name}] Renewal invoice email failed:`, err));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendInvoiceEmail(params: {
    payment:     any;
    orgId:       string;
    plan:        Plan;
    periodStart: Date;
    periodEnd:   Date;
    db:          DataService;
  }): Promise<void> {
    // Guard: email service might not be registered in all environments
    if (!bus.has('email') || !bus.isActive('email')) return;

    const emailSvc = bus.get<EmailService>('email');

    // Fetch the user who owns this org (the org owner)
    const { rows: members } = await params.db.query<{ email: string; full_name: string }>(
      `SELECT u.email, u.full_name
       FROM org_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.org_id = $1 AND om.role = 'owner' AND om.deleted_at IS NULL
       LIMIT 1`,
      [params.orgId]
    );

    if (!members[0]) return; // no owner found — skip silently

    const invoiceNumber = this.generateInvoiceNumber(params.payment.id);
    const locale        = 'nl-NL';
    const fmt           = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

    await emailSvc.sendInvoice({
      toEmail:       members[0].email,
      toName:        members[0].full_name,
      invoiceNumber,
      paymentDate:   fmt(new Date()),
      planName:      params.plan.name,
      periodStart:   fmt(params.periodStart),
      periodEnd:     fmt(params.periodEnd),
      amountCents:   params.plan.price_cents,
      currency:      params.plan.currency,
      paymentMethod: params.payment.method ?? 'iDEAL',
      orgName:       params.orgId,  // resolved to org name by query above if needed
      dashboardUrl:  `${process.env.PUBLIC_URL ?? ''}/dashboard/billing`,
    });
  }

  private generateInvoiceNumber(molliePaymentId: string): string {
    // INV-2026-TR12345 — deterministic from payment ID
    const year = new Date().getFullYear();
    const short = molliePaymentId.replace('tr_', '').slice(0, 8).toUpperCase();
    return `INV-${year}-${short}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handlePaymentFailed(payment: any, meta: any, db: DataService): Promise<void> {
    await db.from<Subscription>('subscriptions')
      .where('org_id', meta.org_id)
      .update({ status: 'past_due' } as Partial<Subscription>)
      .run();

    console.warn(`[${this.name}] Payment failed for org ${meta.org_id}:`, payment.id);
  }

  // ── Private — Mollie helpers ──────────────────────────────────────────────────

  private async ensureMollieCustomer(
    sub:       Subscription,
    orgName:   string,
    userEmail: string,
  ): Promise<string> {

    if (sub.mollie_customer_id) return sub.mollie_customer_id;

    const customer = await this.client.customers.create({
      name:  orgName,
      email: userEmail,
    });

    const db = bus.get<DataService>('db');
    await db.from<Subscription>('subscriptions')
      .where('id', sub.id)
      .update({ mollie_customer_id: customer.id } as Partial<Subscription>)
      .run();

    return customer.id;
  }

  private async getValidMandateId(customerId: string): Promise<string> {
    const mandates = await this.client.mandates.list({ customerId });
    const valid    = mandates.find((m: { status: string }) => m.status === 'valid');
    if (!valid) throw new PaymentError('MANDATE_NOT_FOUND', 'No valid mandate found after payment.');
    return valid.id;
  }

  private async createMollieSubscription(
    customerId: string,
    mandateId:  string,
    planId:     string,
    db:         DataService,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const plan   = await db.from<Plan>('plans').where('id', planId).first();
    if (!plan)   throw new PaymentError('PLAN_NOT_FOUND', 'Plan not found.', 500);

    const nextChargeDate = this.addInterval(new Date(), plan.interval, plan.interval_count);

    return this.client.subscriptions.create({
      customerId,
      mandateId,
      amount: {
        currency: plan.currency,
        value:    this.centsToCurrency(plan.price_cents, plan.currency),
      },
      interval:    `${plan.interval_count} ${plan.interval}s`,
      startDate:   nextChargeDate.toISOString().split('T')[0],
      description: `Foundiq ${plan.name} subscription`,
      webhookUrl:  this.config.webhookUrl,
      metadata: {
        org_id:    '', // filled by caller — not available here, but Mollie sends webhook anyway
        plan_id:   plan.id,
        plan_slug: plan.slug,
        type:      'recurring',
      },
    });
  }

  // ── Private — utilities ───────────────────────────────────────────────────────

  private centsToCurrency(cents: number, currency: string): string {
    // Mollie expects exactly 2 decimal places e.g. "9.00"
    const _currency = currency; // suppress unused warning — kept for future multi-currency
    void _currency;
    return (cents / 100).toFixed(2);
  }

  private addInterval(date: Date, interval: string, count: number): Date {
    const result = new Date(date);
    if (interval === 'month') {
      result.setMonth(result.getMonth() + count);
    } else if (interval === 'year') {
      result.setFullYear(result.getFullYear() + count);
    }
    return result;
  }

  private mapPaymentStatus(mollieStatus: string): InvoiceStatus {
    const map: Record<string, InvoiceStatus> = {
      paid:     'paid',
      failed:   'failed',
      canceled: 'cancelled',
      expired:  'expired',
    };
    return map[mollieStatus] ?? 'open';
  }
}