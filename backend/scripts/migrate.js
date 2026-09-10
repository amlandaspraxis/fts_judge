import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const connectionString = 'postgresql://postgres.llvmryghfpijxszawgdt:AmlanDYC2026@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL...');

    const sqlPath = path.resolve(__dirname, '../../database/supabase_schema.sql');
    const sql = await fs.readFile(sqlPath, 'utf8');

    console.log(`Executing supabase_schema.sql (${sql.length} bytes)...`);
    await client.query(sql);

    console.log('✅ Supabase schema successfully created and seeded!');

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Tables created in public schema:', tablesRes.rows.map(r => r.table_name));
    await client.end();
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

run();
