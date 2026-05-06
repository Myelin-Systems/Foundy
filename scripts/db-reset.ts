// =============================================================================
// scripts/db-reset.ts
// =============================================================================
// Wipes the entire database and immediately re-seeds it.
//
// Usage:
//   npm run db:reset
//
// WARNING: This is destructive. Never run against production.
// =============================================================================

import 'dotenv/config';
import postgres from 'postgres';
import { execSync } from 'child_process';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('\n❌  DATABASE_URL is not set in your .env file.\n');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('\n❌  Refusing to reset a production database.\n');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

async function reset(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DB RESET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🗑️  Dropping public schema...');
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO PUBLIC`;
  console.log('✓  Schema wiped clean\n');

  await sql.end();

  console.log('🌱 Running seed script...\n');
  execSync('npx tsx scripts/db-seed.ts', { stdio: 'inherit' });
}

reset().catch((err: Error) => {
  console.error('\n❌  Reset failed:', err.message);
  process.exit(1);
});