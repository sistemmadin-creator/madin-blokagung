const fs = require('fs');
const { Client } = require('pg');

async function dropUnusedSantriColumns() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/);
  if (!dbMatch) {
    throw new Error('DATABASE_URL tidak ditemukan di .env.local');
  }
  const client = new Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- DROP UNUSED COLUMNS IN PUBLIC.SANTRI ---');

  await client.query(`
    ALTER TABLE public.santri
      DROP COLUMN IF EXISTS no_biro,
      DROP COLUMN IF EXISTS nisn,
      DROP COLUMN IF EXISTS orda,
      DROP COLUMN IF EXISTS nik,
      DROP COLUMN IF EXISTS no_kk,
      DROP COLUMN IF EXISTS nik_ayah,
      DROP COLUMN IF EXISTS nama_ibu,
      DROP COLUMN IF EXISTS nik_ibu;
  `);
  console.log('✅ ALTER TABLE public.santri DROP COLUMN IF EXISTS BERHASIL!');

  const resCols = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'santri'
    ORDER BY ordinal_position;
  `);
  console.log('\nStruktur kolom public.santri sekarang:');
  console.table(resCols.rows);

  await client.end();
}

dropUnusedSantriColumns().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
