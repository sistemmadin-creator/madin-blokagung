const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = envContent.match(/DATABASE_URL=(.*)/);
  if (!dbMatch) throw new Error('DATABASE_URL not found in .env.local');

  const client = new Client({
    connectionString: dbMatch[1].trim(),
    ssl: { rejectUnauthorized: false },
  });

  console.log('Menghubungkan ke PostgreSQL...');
  await client.connect();

  const sqlPath = path.join(__dirname, '../supabase/migrations/20261102_tabel_push_subscriptions.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Menjalankan migrasi tabel push_subscriptions...');
  await client.query(sql);

  console.log('Verifikasi tabel push_subscriptions...');
  const res = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'push_subscriptions'
    ORDER BY ordinal_position;
  `);

  console.log('Kolom tabel push_subscriptions:', res.rows);
  await client.end();
  console.log('Migrasi selesai dengan sukses!');
}

run().catch((err) => {
  console.error('Error saat migrasi:', err);
  process.exit(1);
});
