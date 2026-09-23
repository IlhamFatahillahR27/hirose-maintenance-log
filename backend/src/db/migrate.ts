import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function waitForDatabase(maxRetries = 10, delayMs = 2000) {
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database is ready and reachable.');
      return;
    } catch (err: any) {
      console.log(`⏳ Waiting for database connection (attempt ${i}/${maxRetries}): ${err.message}`);
      if (i === maxRetries) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

async function runMigration() {
  console.log('🔄 Checking database readiness...');
  try {
    await waitForDatabase();
    console.log('🔄 Running database migrations...');
    const migrationsFolder = path.resolve(__dirname, 'migrations');
    await migrate(db, { migrationsFolder });
    console.log('✅ Migrations applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
