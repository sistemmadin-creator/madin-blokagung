const fs = require('fs');
const { Client } = require('pg');

async function dropNisInAsatidz() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- TAHAP 3: DROP COLUMN NIS DI TABEL ASATIDZ ---');

  await client.query('ALTER TABLE public.asatidz DROP COLUMN IF EXISTS nis;');
  console.log('✅ ALTER TABLE public.asatidz DROP COLUMN IF EXISTS nis BERHASIL!');

  const resCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'asatidz' 
    ORDER BY ordinal_position;
  `);
  console.log('\nStruktur kolom asatidz sekarang:');
  console.table(resCols.rows);

  await client.end();
}

dropNisInAsatidz().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
