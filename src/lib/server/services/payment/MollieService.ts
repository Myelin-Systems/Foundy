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
// VAT logic (NL-based SaaS, below OSS €10k threshold):
//   EU B2B + valid VAT number → 0%, reverse charge (BTW verlegd)
//   EU B2C (incl. NL)         → 21% Dutch rate
//   Non-EU                    → 0%, no VAT
//
// npm install @mollie/api-client
// =============================================================================

import type { IService }            from '../../framework/services/IServices';
import { bus }                      from '../../framework/services/bus/BusService';
import type { DataService }         from '../../framework/services/database/DataService';
import type { EmailService }        from '../email/EmailService';

// ── Domain types ──────────────────────────────────────────────────────────────
export interface DbPlan {
  id:                string;
  slug:              string;
  name:              string;
  tagline:           string;        // added — mirrors plans schema
  price_year_cents:  number | null;
  price_month_cents: number | null;
  currency:          string;
  interval:          'month' | 'year';
  interval_count:    number;
  site_limit:        number;
  api_calls_limit:   number;
  storage_mb:        number;
  active:            boolean;
  highlighted:       boolean;       // added — mirrors plans schema
  features:          string[] | null;
  limits:            Record<string, unknown> | null;  // added — mirrors plans schema
  bullets:           string[] | null;                 // added — mirrors plans schema
  mollie_plan_id:    string | null;
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
  currency:            string;
  // Amount breakdown
  subtotal_cents:      number;      // excl. VAT
  vat_rate_pct:        number;      // 0 or 21 (snapshot at payment time)
  vat_amount_cents:    number;      // 0 for reverse charge / non-EU
  vat_reverse_charge:  boolean;     // true = BTW verlegd
  amount_cents:        number;      // total charged (subtotal + vat_amount)
  // Fee tracking
  mollie_fee_cents:    number;      // estimated/corrected transaction fee
  net_revenue_cents:   number;      // subtotal - mollie_fee
  status:              InvoiceStatus;
  paid_at:             string | null;
  description:         string | null;
  mollie_checkout_url: string | null;
  created_at:          string;      // added — timestamps: true in schema
  updated_at:          string;      // added — timestamps: true in schema
}

// Org billing fields fetched at checkout time
export interface OrgBilling {                         // exported — used in +page.server.ts
  name:                string;
  billing_name:        string | null;
  billing_country:     string | null;
  billing_address:     string | null;
  billing_postal_code: string | null;
  billing_city:        string | null;
  vat_number:          string | null;
}

export type SubscriptionStatus =
  | 'free' | 'pending' | 'active' | 'past_due' | 'cancelled' | 'expired';

export type InvoiceStatus =
  | 'open' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';

export interface CheckoutResult {
  checkoutUrl: string;
  paymentId:   string;
  invoiceId:   string;
}

export class PaymentError extends Error {
  constructor(
    public readonly code:   string,
    message:                string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface MollieServiceConfig {
  apiKey:      string;
  webhookUrl:  string;   // https://api.foundiq.nl/v1/billing/webhook
  redirectUrl: string;   // https://app.foundiq.nl/dashboard/billing
}

// ── MollieService ─────────────────────────────────────────────────────────────

export class MollieService implements IService {

  readonly name    = 'mollie';
  readonly version = '1.3.4';
  readonly tags    = ['core', 'payment', 'mollie'];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client!: any;

  // EU member state ISO 3166-1 alpha-2 codes.
  // Used to determine VAT treatment. Update if EU membership changes.
  private static readonly EU_COUNTRIES = new Set([
    'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR',
    'HR','HU','IE','IT','LT','LU','LV','MT','NL','PL','PT','RO',
    'SE','SI','SK',
  ]);

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
      await this.client.methods.list();
      return true;
    } catch {
      return false;
    }
  }

  // ── VAT helpers ───────────────────────────────────────────────────────────────

  /**
   * Resolve the VAT situation for an organisation.
   *
   * Rules (NL-based SaaS, below OSS €10k threshold):
   *   B2B + valid EU VAT number → 0%, reverse charge (BTW verlegd)
   *   EU B2C (including NL)     → 21% Dutch rate
   *   Non-EU                    → 0%, no VAT obligation
   *
   * OSS note: if cross-border EU B2C revenue exceeds €10,000/year you must
   * register for OSS and apply destination-country rates instead of 21%.
   * Confirm the threshold with your boekhouder.
   */
  // Per-country standard VAT rates for digital services (2026)
  private static readonly EU_VAT_RATES: Record<string, number> = {
    AT: 20, BE: 21, BG: 20, CY: 19, CZ: 21, DE: 19,
    DK: 25, EE: 22, ES: 21, FI: 25, FR: 20, GR: 24,
    HR: 25, HU: 27, IE: 23, IT: 22, LT: 21, LU: 17,
    LV: 21, MT: 18, NL: 21, PL: 23, PT: 23, RO: 19,
    SE: 25, SI: 22, SK: 20,
  };

  private static readonly OSS_REGISTERED = process.env.OSS_REGISTERED === 'true';

  private resolveVat(country: string | null, vatNumber: string | null): {
    vatRatePct:    number;
    reverseCharge: boolean;
  } {
    const c = (country ?? '').toUpperCase();

    // B2B EU + valid VAT number → reverse charge, 0% always
    if (vatNumber && MollieService.EU_VAT_RATES[c] !== undefined) {
      return { vatRatePct: 0, reverseCharge: true };
    }

    // Non-EU → 0%, outside scope
    if (MollieService.EU_VAT_RATES[c] === undefined) {
      return { vatRatePct: 0, reverseCharge: false };
    }

    // EU B2C → Dutch 21% until OSS registered, then destination country rate
    const rate = MollieService.OSS_REGISTERED
      ? MollieService.EU_VAT_RATES[c]
      : 21;

    return { vatRatePct: rate, reverseCharge: false };
  }


  /**
   * Estimate the Mollie transaction fee for profit tracking.
   * Figures are approximations — actual fee depends on your Mollie contract tier.
   *
   *   iDEAL:        €0.29 flat
   *   Bancontact:   €0.31 flat
   *   SEPA Direct:  €0.25 + 0.20% (capped €2.25)
   *   Credit/debit: €0.25 + 1.80%
   *   Other:        €0.25 + 0.50% (safe fallback)
   */
  private estimateMollieFee(amountCents: number, method: string): number {
    switch (method) {
      case 'ideal':       return 29;
      case 'bancontact':  return 31;
      case 'directdebit': return Math.min(25 + Math.round(amountCents * 0.002), 225);
      case 'creditcard':
      case 'applepay':
      case 'googlepay':   return 25 + Math.round(amountCents * 0.018);
      default:            return 25 + Math.round(amountCents * 0.005);
    }
  }

  // ── Plans ────────────────────────────────────────────────────────────────────

  async getPlans(): Promise<DbPlan[]> {
    const db = bus.get<DataService>('db');
    const { rows } = await db.from<DbPlan>('plans')
      .where('active', true)
      .orderBy('price_month_cents', 'asc')
      .run();
    return rows;
  }

  async getPlanBySlug(slug: string): Promise<DbPlan | null> {
    const db = bus.get<DataService>('db');
    return db.from<DbPlan>('plans').where('slug', slug).first();
  }

  // ── Subscription reads ───────────────────────────────────────────────────────

  async getOrCreateSubscription(orgId: string): Promise<Subscription & { plan: DbPlan }> {
    const db = bus.get<DataService>('db');

    let sub = await db.from<Subscription>('subscriptions').where('org_id', orgId).first();

    if (!sub) {
      const freePlan = await this.getPlanBySlug('cms_starter');
      if (!freePlan) throw new PaymentError('PLAN_NOT_FOUND', 'Free plan not configured.', 500);

      const { rows } = await db.from<Subscription>('subscriptions')
        .insert({ org_id: orgId, plan_id: freePlan.id, status: 'free' })
        .returning()
        .run();
      sub = rows[0];
    }

    const plan = await db.from<DbPlan>('plans').where('id', sub.plan_id).first();
    if (!plan) throw new PaymentError('PLAN_NOT_FOUND', 'Plan not found for subscription.', 500);

    return { ...sub, plan };
  }

  isActive(sub: Subscription): boolean {
    return sub.status === 'active' || sub.status === 'free';
  }

  // ── Checkout ─────────────────────────────────────────────────────────────────

  private countryToLocale(country: string | null | undefined): string {
    const map: Record<string, string> = {
      NL: 'nl_NL', BE: 'nl_BE', DE: 'de_DE', FR: 'fr_FR',
      AT: 'de_AT', ES: 'es_ES', IT: 'it_IT', PT: 'pt_PT',
      PL: 'pl_PL', FI: 'fi_FI', DK: 'da_DK', SE: 'sv_SE',
      NO: 'nb_NO', HU: 'hu_HU', GB: 'en_GB',
    };
    return map[country?.toUpperCase() ?? ''] ?? 'en_US';
  }

  private countryToCurrency(country: string | null | undefined): string {
    const map: Record<string, string> = {
      GB: 'GBP',
      US: 'USD',
      CA: 'CAD',
      AU: 'AUD',
      CH: 'CHF',
      NO: 'NOK',
      SE: 'SEK',
      DK: 'DKK',
      PL: 'PLN',
      HU: 'HUF',
      CZ: 'CZK',
      RO: 'RON',
    };
    // Everyone else (NL, DE, FR, BE, ES, IT...) pays EUR
    return map[country?.toUpperCase() ?? ''] ?? 'EUR';
  }

  /**
   * Create a Mollie first-payment checkout URL.
   * Requires billing_country to be set on the org — throws BILLING_INCOMPLETE if not.
   */
  async createCheckout(params: {
    orgId:          string;
    orgName:        string;
    planSlug:       string;
    userEmail:      string;
    billingCycle?:  'month' | 'year';
    billingCountry?: string | null;
  }): Promise<CheckoutResult> {

    const db   = bus.get<DataService>('db');
    const plan = await this.getPlanBySlug(params.planSlug);

    if (!plan)        throw new PaymentError('PLAN_NOT_FOUND', `Plan "${params.planSlug}" not found.`);
    if (!plan.active) throw new PaymentError('PLAN_INACTIVE',  `Plan "${params.planSlug}" is not available.`);

    const priceCents = params.billingCycle === 'year'
      ? plan.price_year_cents
      : plan.price_month_cents;

    if (!priceCents || priceCents === 0) {
      throw new PaymentError('PLAN_FREE', 'Cannot checkout free plan.');
    }

    // Fetch org billing info — country required before checkout
    const org = await db.from<OrgBilling>('organisations').where('id', params.orgId).first();

    if (!org?.billing_country) {
      throw new PaymentError(
        'BILLING_INCOMPLETE',
        'Organisation billing country is required before checkout.',
        422,
      );
    }

    // Resolve VAT treatment from country + VAT number
    const { vatRatePct, reverseCharge } = this.resolveVat(
      org.billing_country ?? null,
      org.vat_number ?? null,
    );

    // Price breakdown
    // Assumption: priceCents is the gross (VAT-inclusive) amount shown to users.
    // If your pricing is ex-VAT, swap the formula accordingly.
    const subtotalCents  = vatRatePct > 0
      ? Math.round(priceCents * 100 / (100 + vatRatePct))
      : priceCents;
    const vatAmountCents = priceCents - subtotalCents;

    const sub        = await this.getOrCreateSubscription(params.orgId);
    const customerId = await this.ensureMollieCustomer(sub, params.orgName, params.userEmail);

    const currency = this.countryToCurrency(org.billing_country);
    const amount   = this.centsToCurrency(priceCents, currency);

    const payment = await this.client.payments.create({
      amount:       { currency: currency, value: amount },
      customerId,
      sequenceType: 'first',
      description:  `Foundiq ${plan.name} — ${params.billingCycle === 'year' ? 'Annual' : 'Monthly'} subscription`,
      redirectUrl:  `${this.config.redirectUrl}?payment=pending`,
      webhookUrl:   this.config.webhookUrl,
      locale:       this.countryToLocale(params.billingCountry),   // ← nieuw
      metadata: {
        org_id:    params.orgId,
        plan_id:   plan.id,
        plan_slug: plan.slug,
        type:      'first_payment',
      },
    });

    // Estimate fee at iDEAL rate (method unknown until payment completes)
    const mollieFee    = this.estimateMollieFee(priceCents, 'ideal');
    const netRevenue   = subtotalCents - mollieFee;

    const { rows: invoiceRows } = await db.from<Invoice>('invoices')
      .insert({
        org_id:              params.orgId,
        subscription_id:     sub.id,
        mollie_payment_id:   payment.id,
        amount_cents:        priceCents,
        subtotal_cents:      subtotalCents,
        vat_rate_pct:        vatRatePct,
        vat_amount_cents:    vatAmountCents,
        vat_reverse_charge:  reverseCharge,
        mollie_fee_cents:    mollieFee,
        net_revenue_cents:   netRevenue,
        currency,
        status:              'open',
        description:         `Foundiq ${plan.name} subscription`,
        mollie_checkout_url: payment.getCheckoutUrl() ?? null,
      })
      .returning(['id'])
      .run();

    await db.from<Subscription>('subscriptions')
      .where('id', sub.id)
      .update({
        status:             'pending',
        mollie_customer_id: customerId,
        plan_id:            plan.id,
      } as Partial<Subscription>)
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
   * Idempotent — safe to call multiple times for the same payment.
   */
  async handleWebhook(molliePaymentId: string): Promise<void> {
    const db      = bus.get<DataService>('db');
    const payment = await this.client.payments.get(molliePaymentId);
    const meta    = payment.metadata as {
      org_id:        string;
      plan_id:       string;
      plan_slug:     string;
      billing_cycle: string;
      type:          'first_payment' | 'recurring';
    };
    console.log(`[${this.name}] Webhook received for payment ${molliePaymentId}: status=${payment.status}, type=${meta.type}`);
    // ── Paid ─────────────────────────────────────────────────────────────────
    if (payment.status === 'paid') {
      // Correct the fee estimate now that we know the actual payment method
      const actualFee = this.estimateMollieFee(
        Math.round(parseFloat(payment.amount.value) * 100),
        payment.method ?? 'other',
      );

      const invoice = await db.from<Invoice>('invoices')
        .where('mollie_payment_id', molliePaymentId)
        .first();

      if (invoice) {
        const netRevenue = invoice.subtotal_cents - actualFee;
        await db.from<Invoice>('invoices')
          .where('mollie_payment_id', molliePaymentId)
          .update({
            mollie_fee_cents:  actualFee,
            net_revenue_cents: netRevenue,
          } as Partial<Invoice>)
          .run();
      }

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

  async cancelSubscription(orgId: string, immediate = false): Promise<void> {
    const db  = bus.get<DataService>('db');
    const sub = await db.from<Subscription>('subscriptions').where('org_id', orgId).first();

    if (!sub) throw new PaymentError('SUB_NOT_FOUND', 'No subscription found for this org.');
    if (sub.status === 'free') throw new PaymentError('SUB_FREE', 'Free plan cannot be cancelled.');

    if (sub.mollie_subscription_id && sub.mollie_customer_id) {
      try {
        await this.clientSubscriptions.cancel({
          id:         sub.mollie_subscription_id,
          customerId: sub.mollie_customer_id,
        });
      } catch (err) {
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

  async changePlan(
    orgId:      string,
    orgName:    string,
    userEmail:  string,
    newPlanSlug: string,
  ): Promise<CheckoutResult | null> {
    const db      = bus.get<DataService>('db');
    const sub     = await this.getOrCreateSubscription(orgId);
    const newPlan = await this.getPlanBySlug(newPlanSlug);

    if (!newPlan) throw new PaymentError('PLAN_NOT_FOUND', `Plan "${newPlanSlug}" not found.`);

    // Downgrade to free — just cancel
    const isFree = (newPlan.price_month_cents ?? 0) === 0 && (newPlan.price_year_cents ?? 0) === 0;
    if (isFree) {
      await this.cancelSubscription(orgId, false);
      return null;
    }

    // Cancel existing Mollie subscription first
    if (sub.mollie_subscription_id && sub.mollie_customer_id) {
      try {
        await this.clientSubscriptions.cancel({
          id:         sub.mollie_subscription_id,
          customerId: sub.mollie_customer_id,
        });
      } catch { /* already cancelled */ }

      await db.from<Subscription>('subscriptions')
        .where('org_id', orgId)
        .update({ mollie_subscription_id: null } as Partial<Subscription>)
        .run();
    }

    const { rows: [org] } = await db.query<{ billing_country: string | null }>(
      `SELECT billing_country FROM organisations WHERE id = $1`,
      [orgId]
    );

    return this.createCheckout({ orgId, orgName, planSlug: newPlanSlug, userEmail, billingCountry: org?.billing_country ?? null });
  }

  // ── Private — payment handlers ────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async handlePaymentPaid(payment: any, meta: any, db: DataService): Promise<void> {
    const sub = await db.from<Subscription>('subscriptions')
      .where('org_id', meta.org_id)
      .first();
    if (!sub) return;

    if (meta.type === 'first_payment') {
      const mandateId          = await this.getValidMandateId(sub.mollie_customer_id!);
      const mollieSubscription = await this.createMollieSubscription(
        sub.mollie_customer_id!, mandateId, meta.plan_id, (meta.billing_cycle as 'month' | 'year') ?? 'month', db,
      );

      const now = new Date();
      const end = this.addInterval(now, mollieSubscription.interval, mollieSubscription.times ?? 1);

      await db.from<Subscription>('subscriptions')
        .where('org_id', meta.org_id)
        .update({
          status:                 'active',
          plan_id:                meta.plan_id,
          mollie_mandate_id:      mandateId,
          mollie_subscription_id: mollieSubscription.id,
          current_period_start:   now.toISOString(),
          current_period_end:     end.toISOString(),
          cancel_at_period_end:   false,
        } as Partial<Subscription>)
        .run();

      console.log(`[${this.name}] Subscription activated for org ${meta.org_id}`);

      this.sendInvoiceEmail({
        payment,
        orgId:       meta.org_id,
        plan:        (await db.from<DbPlan>('plans').where('id', meta.plan_id).first())!,
        periodStart: now,
        periodEnd:   end,
        db,
      }).catch(err => console.error(`[${this.name}] Invoice email failed:`, err));
    }

    if (meta.type === 'recurring') {
      const plan = await db.from<DbPlan>('plans').where('id', meta.plan_id).first();
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

      this.sendInvoiceEmail({
        payment, orgId: meta.org_id, plan, periodStart: now, periodEnd: end, db,
      }).catch(err => console.error(`[${this.name}] Renewal invoice email failed:`, err));
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sendInvoiceEmail(params: {
    payment:     any;
    orgId:       string;
    plan:        DbPlan;
    periodStart: Date;
    periodEnd:   Date;
    db:          DataService;
  }): Promise<void> {
    if (!bus.has('email') || !bus.isActive('email')) return;
    const emailSvc = bus.get<EmailService>('email');

    const [orgResult, membersResult, invoiceResult] = await Promise.all([
      params.db.from<OrgBilling>('organisations').where('id', params.orgId).first(),
      params.db.query<{ email: string; full_name: string }>(
        `SELECT u.email, u.full_name
         FROM org_members om JOIN users u ON u.id = om.user_id
         WHERE om.org_id = $1 AND om.role = 'owner' AND om.deleted_at IS NULL
         LIMIT 1`,
        [params.orgId],
      ),
      params.db.from<Invoice>('invoices')
        .where('mollie_payment_id', params.payment.id)
        .first(),
    ]);

    if (!membersResult.rows[0] || !orgResult || !invoiceResult) return;

    const org     = orgResult;
    const member  = membersResult.rows[0];
    const invoice = invoiceResult;

    const locale = 'nl-NL';
    const fmt    = (d: Date) =>
      d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });

    await emailSvc.sendInvoice({
      toEmail:        member.email,
      toName:         member.full_name,
      invoiceNumber:  this.generateInvoiceNumber(params.payment.id),
      paymentDate:    fmt(new Date()),
      planName:       params.plan.name,
      periodStart:    fmt(params.periodStart),
      periodEnd:      fmt(params.periodEnd),
      paymentMethod:  params.payment.method ?? 'iDEAL',
      dashboardUrl:   `${process.env.PUBLIC_URL ?? ''}/dashboard/billing`,

      // Billing address
      billingName:    org.billing_name ?? org.name,
      billingAddress: org.billing_address ?? null,
      billingPostal:  org.billing_postal_code ?? null,
      billingCity:    org.billing_city ?? null,
      billingCountry: org.billing_country ?? null,
      vatNumber:      org.vat_number ?? null,

      // VAT breakdown from stored invoice (already computed at checkout)
      subtotalCents:  invoice.subtotal_cents,
      vatRatePct:     invoice.vat_rate_pct,
      vatAmountCents: invoice.vat_amount_cents,
      reverseCharge:  invoice.vat_reverse_charge,
      totalCents:     invoice.amount_cents,
      currency:       invoice.currency,

      // Internal profit tracking
      mollieFee:      invoice.mollie_fee_cents,
      netRevenue:     invoice.net_revenue_cents,
    });
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
    sub:       Subscription & { plan: DbPlan },
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
    const mandates = await this.client.customerMandates.list({ customerId });
    const valid    = mandates.find((m: { status: string }) => m.status === 'valid');
    if (!valid) throw new PaymentError('MANDATE_NOT_FOUND', 'No valid mandate found after payment.');
    return valid.id;
  }

  private async createMollieSubscription(
    customerId:   string,
    mandateId:    string,
    planId:       string,
    billingCycle: 'month' | 'year',
    db:           DataService,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const plan = await db.from<DbPlan>('plans').where('id', planId).first();
    if (!plan)  throw new PaymentError('PLAN_NOT_FOUND', 'Plan not found.', 500);
    const mollieInterval = billingCycle === 'year' ? '12 months' : '1 months';
    const nextChargeDate = billingCycle === 'year'
      ? new Date(new Date().setFullYear(new Date().getFullYear() + 1))
      : new Date(new Date().setMonth(new Date().getMonth() + 1));
    const priceCents = billingCycle === 'year'
      ? plan.price_year_cents
      : plan.price_month_cents;

    if (!priceCents) throw new PaymentError('PRICE_MISSING', 'Plan has no price for this billing cycle.');

    console.log(`[${this.name}] Creating Mollie subscription: customer=${customerId}, mandate=${mandateId}, amount=${priceCents} cents, interval=${mollieInterval}, next_charge=${nextChargeDate.toISOString().split('T')[0]}`);
    return this.client.customerSubscriptions.create({
      customerId,
      mandateId,
      amount: {
        currency: 'EUR',
        value:    this.centsToCurrency(priceCents, 'EUR'),
      },
      interval:    mollieInterval,
      startDate:   nextChargeDate.toISOString().split('T')[0],
      description: `Foundiq ${plan.name} subscription`,
      webhookUrl:  this.config.webhookUrl,
      metadata: {
        plan_id:       plan.id,
        plan_slug:     plan.slug,
        billing_cycle: billingCycle,
        type:          'recurring',
      },
    });
  }

  // ── Private — utilities ───────────────────────────────────────────────────────

  private centsToCurrency(cents: number, _currency: string): string {
    return (cents / 100).toFixed(2);
  }

  private addInterval(date: Date, billingCycle: 'month' | 'year'): Date {
    const result = new Date(date);
    if (billingCycle === 'year')  result.setFullYear(result.getFullYear() + 1);
    else                          result.setMonth(result.getMonth() + 1);
    return result;
  }

  private mapPaymentStatus(mollieStatus: string): InvoiceStatus {
    const map: Record<string, InvoiceStatus> = {
      paid: 'paid', failed: 'failed', canceled: 'cancelled', expired: 'expired',
    };
    return map[mollieStatus] ?? 'open';
  }

  private generateInvoiceNumber(molliePaymentId: string): string {
    const year  = new Date().getFullYear();
    const short = molliePaymentId.replace('tr_', '').slice(0, 8).toUpperCase();
    return `INV-${year}-${short}`;
  }
}