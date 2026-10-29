const { Client } = require('pg');
const fs = require('fs');

async function dropLegacyBlok() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = envContent.match(/DATABASE_URL=(.*)/);
  const client = new Client({
    connectionString: dbMatch[1].trim(),
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Menghubungkan ke PostgreSQL...');

  await client.query('ALTER TABLE public.formasi_kelas DROP COLUMN IF EXISTS blok;');
  console.log('✅ Kolom blok berhasil dihapus dari tabel formasi_kelas di Supabase!');

  const resCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'formasi_kelas' 
    ORDER BY ordinal_position;
  `);
  console.log('\nStruktur kolom formasi_kelas sekarang:');
  console.table(resCols.rows);

  await client.end();
}

dropLegacyBlok().catch((err) => {
  console.error('Error drop column:', err);
  process.exit(1);
});
