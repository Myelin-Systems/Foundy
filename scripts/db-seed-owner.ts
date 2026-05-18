// =============================================================================
// scripts/seed-owner.ts
// =============================================================================
// Gives info@myelinsystems.com the agency_max plan permanently.
// Run once on the VPS after first deploy:
//
//   docker compose -f docker-compose.prod.yml exec app node scripts/seed-owner.js
//
// Safe to re-run — uses upsert so it won't duplicate anything.
// =============================================================================

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

const OWNER_EMAIL  = 'info@myelinsystems.com';
const PLAN_SLUG    = 'agency_max';
// 100 years from now — effectively never expires
const FOREVER      = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();

async function seed() {
  console.log(`[seed] Looking up user: ${OWNER_EMAIL}`);

  // ── Find user ──────────────────────────────────────────────────────────────
  const [user] = await sql<{ id: string }[]>`
    SELECT id FROM users WHERE email = ${OWNER_EMAIL} LIMIT 1
  `;

  if (!user) {
    console.error(`[seed] User not found: ${OWNER_EMAIL}`);
    console.error('[seed] Register first, then re-run this script.');
    process.exit(1);
  }
  console.log(`[seed] Found user: ${user.id}`);

  // ── Find or create org ─────────────────────────────────────────────────────
  let [org] = await sql<{ id: string }[]>`
    SELECT o.id FROM organisations o
    JOIN org_members om ON om.org_id = o.id
    WHERE om.user_id = ${user.id} AND om.role = 'owner'
    LIMIT 1
  `;

  if (!org) {
    console.log('[seed] No org found — creating Myelin Systems org...');
    [org] = await sql<{ id: string }[]>`
      INSERT INTO organisations (name, slug)
      VALUES ('Myelin Systems', 'myelin-systems')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;

    await sql`
      INSERT INTO org_members (org_id, user_id, role)
      VALUES (${org.id}, ${user.id}, 'owner')
      ON CONFLICT (org_id, user_id) DO NOTHING
    `;

    await sql`
      UPDATE users SET active_org_id = ${org.id} WHERE id = ${user.id}
    `;

    console.log(`[seed] Created org: ${org.id}`);
  } else {
    console.log(`[seed] Found existing org: ${org.id}`);
  }

  // ── Find agency_max plan ───────────────────────────────────────────────────
  const [plan] = await sql<{ id: string }[]>`
    SELECT id FROM plans WHERE slug = ${PLAN_SLUG} LIMIT 1
  `;

  if (!plan) {
    console.error(`[seed] Plan "${PLAN_SLUG}" not found in DB.`);
    console.error('[seed] Make sure the app has booted at least once so migrations + plan seeding ran.');
    process.exit(1);
  }
  console.log(`[seed] Found plan: ${PLAN_SLUG} (${plan.id})`);

  // ── Upsert subscription ────────────────────────────────────────────────────
  await sql`
    INSERT INTO subscriptions (
      org_id,
      plan_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end
    )
    VALUES (
      ${org.id},
      ${plan.id},
      'active',
      NOW(),
      ${FOREVER}::timestamp,
      false
    )
    ON CONFLICT (org_id) DO UPDATE SET
      plan_id              = EXCLUDED.plan_id,
      status               = 'active',
      current_period_start = NOW(),
      current_period_end   = ${FOREVER}::timestamp,
      cancel_at_period_end = false,
      cancelled_at         = NULL,
      updated_at           = NOW()
  `;

  console.log(`[seed] ✓ Subscription set to agency_max — valid until ${FOREVER}`);
  console.log('[seed] Done! You can now log in with full access.');

  await sql.end();
}

seed().catch(err => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});