import 'dotenv/config';
import postgres from 'postgres';
import { execSync } from 'child_process';
import { Client } from 'minio';

const url = process.env.DATABASE_URL;
if (!url) { console.error('\n❌  DATABASE_URL is not set.\n'); process.exit(1); }
if (process.env.NODE_ENV === 'production') { console.error('\n❌  Refusing to reset a production database.\n'); process.exit(1); }

const sql    = postgres(url, { max: 1 });
const minio  = new Client({
  endPoint:  process.env.MINIO_ENDPOINT  ?? 'localhost',
  port:      parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL:    process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? '',
  secretKey: process.env.MINIO_SECRET_KEY ?? '',
});
const bucket = process.env.MINIO_BUCKET ?? 'foundiq-media';

async function clearMinio(): Promise<void> {
  console.log('🗑️  Clearing MinIO bucket...');
  const exists = await minio.bucketExists(bucket);
  if (!exists) { console.log('   Bucket does not exist — skipping.\n'); return; }

  // List all objects and delete them
  const objects: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const stream = minio.listObjects(bucket, '', true);
    stream.on('data', obj => { if (obj.name) objects.push(obj.name); });
    stream.on('end',  resolve);
    stream.on('error', reject);
  });

  if (objects.length === 0) {
    console.log('   Bucket already empty.\n');
    return;
  }

  await minio.removeObjects(bucket, objects);
  console.log(`✓  Removed ${objects.length} object${objects.length === 1 ? '' : 's'} from MinIO\n`);
}

async function reset(): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  DB + STORAGE RESET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🗑️  Dropping public schema...');
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql`GRANT ALL ON SCHEMA public TO PUBLIC`;
  console.log('✓  Schema wiped clean\n');
  await sql.end();

  await clearMinio();

  console.log('🌱 Running seed script...\n');
  execSync('npx tsx scripts/db-seed.ts', { stdio: 'inherit' });
}

reset().catch((err: Error) => {
  console.error('\n❌  Reset failed:', err.message);
  process.exit(1);
});