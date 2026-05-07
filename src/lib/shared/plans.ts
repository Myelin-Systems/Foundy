// =============================================================================
// src/lib/shared/plans.ts
// =============================================================================
// Pure data — no server imports. Safe on both client and server.
// Single source of truth for all plan definitions.
// =============================================================================

export type ProductFeature = 'cms' | 'social';

export type PlanId =
  | 'cms_starter' | 'cms_pro'    | 'cms_business'
  | 'social_basic' | 'social_pro' | 'social_unlimited'
  | 'bundle_starter' | 'bundle_pro' | 'bundle_business'
  | 'agency' | 'agency_max' | 'enterprise';

export interface Plan {
  id:          PlanId;
  name:        string;
  tagline:     string;
  price_month: number | null;
  price_year:  number | null;
  highlighted: boolean;
  features:    ProductFeature[];
  limits: {
    sites:          number;   // -1 = unlimited
    collections:    number;
    entries:        number;
    db_bytes:       number;
    file_bytes:     number;
    socialAccounts: number;
    scheduledPosts: number;   // 0 = no scheduling, -1 = unlimited
  };
  bullets: string[];
}

export const PLANS: Record<PlanId, Plan> = {

  // ── CMS ────────────────────────────────────────────────────────────────────

  cms_starter: {
    id: 'cms_starter', name: 'CMS Starter', highlighted: false,
    tagline: 'Try it out. No card required.',
    price_month: 0, price_year: 0, features: ['cms'],
    limits: { sites: 1, collections: 5, entries: 1_000,
              db_bytes: 104_857_600, file_bytes: 524_288_000,
              socialAccounts: 0, scheduledPosts: 0 },
    bullets: ['1 site', '5 collections per site', '1,000 entries',
              '100 MB database', '500 MB file storage', 'Community support'],
  },

  cms_pro: {
    id: 'cms_pro', name: 'CMS Pro', highlighted: false,
    tagline: 'For indie devs and small projects.',
    price_month: 29, price_year: 24, features: ['cms'],
    limits: { sites: 3, collections: 20, entries: 25_000,
              db_bytes: 536_870_912, file_bytes: 5_368_709_120,
              socialAccounts: 0, scheduledPosts: 0 },
    bullets: ['3 sites', '20 collections per site', '25,000 entries',
              '512 MB database', '5 GB storage', 'Email support', 'API access'],
  },

  cms_business: {
    id: 'cms_business', name: 'CMS Business', highlighted: false,
    tagline: 'For growing teams shipping fast.',
    price_month: 79, price_year: 66, features: ['cms'],
    limits: { sites: 10, collections: 50, entries: 100_000,
              db_bytes: 2_147_483_648, file_bytes: 21_474_836_480,
              socialAccounts: 0, scheduledPosts: 0 },
    bullets: ['10 sites', '50 collections per site', '100,000 entries',
              '2 GB database', '20 GB storage', 'Priority support', 'Webhooks'],
  },

  // ── Social ─────────────────────────────────────────────────────────────────
  // Basic  = connect + post manually, no scheduling
  // Pro    = scheduling with a queue limit
  // Unlimited = unlimited accounts + scheduling + analytics

  social_basic: {
    id: 'social_basic', name: 'Social Basic', highlighted: false,
    tagline: 'Connect accounts and post manually.',
    price_month: 9, price_year: 7, features: ['social'],
    limits: { sites: 0, collections: 0, entries: 0,
              db_bytes: 0, file_bytes: 524_288_000,
              socialAccounts: 3, scheduledPosts: 0 },
    bullets: ['3 social accounts', 'Manual posting', 'Basic analytics',
              'Email support'],
  },

  social_pro: {
    id: 'social_pro', name: 'Social Pro', highlighted: false,
    tagline: 'Schedule ahead and grow faster.',
    price_month: 29, price_year: 24, features: ['social'],
    limits: { sites: 0, collections: 0, entries: 0,
              db_bytes: 0, file_bytes: 2_147_483_648,
              socialAccounts: 10, scheduledPosts: 30 },
    bullets: ['10 social accounts', '30 scheduled posts in queue',
              'Advanced analytics', 'Priority support'],
  },

  social_unlimited: {
    id: 'social_unlimited', name: 'Social Unlimited', highlighted: false,
    tagline: 'No limits. For serious social teams.',
    price_month: 59, price_year: 49, features: ['social'],
    limits: { sites: 0, collections: 0, entries: 0,
              db_bytes: 0, file_bytes: 5_368_709_120,
              socialAccounts: -1, scheduledPosts: -1 },
    bullets: ['Unlimited social accounts', 'Unlimited scheduling',
              'Full analytics suite', 'Dedicated support', 'Team collaboration'],
  },

  // ── Bundle ─────────────────────────────────────────────────────────────────

  bundle_starter: {
    id: 'bundle_starter', name: 'Bundle Starter', highlighted: false,
    tagline: 'CMS + Social in one.',
    price_month: 29, price_year: 24, features: ['cms', 'social'],
    limits: { sites: 1, collections: 5, entries: 1_000,
              db_bytes: 104_857_600, file_bytes: 1_073_741_824,
              socialAccounts: 3, scheduledPosts: 0 },
    bullets: ['1 site', '5 collections', '3 social accounts',
              'Manual posting', '1 GB storage'],
  },

  bundle_pro: {
    id: 'bundle_pro', name: 'Bundle Pro', highlighted: true,
    tagline: 'The full stack for serious creators.',
    price_month: 69, price_year: 57, features: ['cms', 'social'],
    limits: { sites: 3, collections: 20, entries: 25_000,
              db_bytes: 536_870_912, file_bytes: 5_368_709_120,
              socialAccounts: 10, scheduledPosts: 30 },
    bullets: ['3 sites', '20 collections', '10 social accounts',
              '30 scheduled posts', '5 GB storage', 'Priority support'],
  },

  bundle_business: {
    id: 'bundle_business', name: 'Bundle Business', highlighted: false,
    tagline: 'Scale CMS and social together.',
    price_month: 129, price_year: 107, features: ['cms', 'social'],
    limits: { sites: 5, collections: 50, entries: 100_000,
              db_bytes: 2_147_483_648, file_bytes: 21_474_836_480,
              socialAccounts: -1, scheduledPosts: -1 },
    bullets: ['5 sites', '50 collections', 'Unlimited social accounts',
              'Unlimited scheduling', '20 GB storage', 'Custom roles'],
  },

  // ── Agency ─────────────────────────────────────────────────────────────────

  agency: {
    id: 'agency', name: 'Agency', highlighted: false,
    tagline: 'Run client sites and socials from one dashboard.',
    price_month: 249, price_year: 207, features: ['cms', 'social'],
    limits: { sites: 25, collections: 100, entries: 500_000,
              db_bytes: 10_737_418_240, file_bytes: 107_374_182_400,
              socialAccounts: -1, scheduledPosts: -1 },
    bullets: ['25 sites', '100 collections per site', '500K entries',
              'Unlimited social', '100 GB storage', 'Client switching',
              'Dedicated Slack'],
  },

  agency_max: {
    id: 'agency_max', name: 'Agency Max', highlighted: false,
    tagline: 'For large agencies with high-volume needs.',
    price_month: 499, price_year: 416, features: ['cms', 'social'],
    limits: { sites: 75, collections: 250, entries: 2_000_000,
              db_bytes: 53_687_091_200, file_bytes: 536_870_912_000,
              socialAccounts: -1, scheduledPosts: -1 },
    bullets: ['75 sites', '250 collections per site', '2M entries',
              '50 GB database', '500 GB storage', 'White-label option', 'SLA'],
  },

  // ── Enterprise ─────────────────────────────────────────────────────────────

  enterprise: {
    id: 'enterprise', name: 'Enterprise', highlighted: false,
    tagline: 'Custom limits. Dedicated infrastructure.',
    price_month: null, price_year: null, features: ['cms', 'social'],
    limits: { sites: -1, collections: -1, entries: -1,
              db_bytes: -1, file_bytes: -1,
              socialAccounts: -1, scheduledPosts: -1 },
    bullets: ['Unlimited everything', 'Dedicated infrastructure',
              'SSO / SAML', 'Audit logs', 'Custom SLA', 'Custom contracts'],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getPlan(id: string): Plan {
  return PLANS[id as PlanId] ?? PLANS['cms_starter'];
}

export function getAllPlans(): Plan[] {
  return Object.values(PLANS);
}

export function isUnlimited(n: number): boolean {
  return n === -1;
}

export function can(planId: string, feature: ProductFeature): boolean {
  return getPlan(planId).features.includes(feature);
}

export function canSchedule(planId: string): boolean {
  return getPlan(planId).limits.scheduledPosts !== 0;
}

// Groups for display — used in onboarding and pricing page
export const PLAN_GROUPS: { label: string; ids: PlanId[] }[] = [
  { label: 'CMS',    ids: ['cms_starter',    'cms_pro',      'cms_business']       },
  { label: 'Social', ids: ['social_basic',   'social_pro',   'social_unlimited']   },
  { label: 'Bundle', ids: ['bundle_starter', 'bundle_pro',   'bundle_business']    },
  { label: 'Agency', ids: ['agency',         'agency_max']                         },
];