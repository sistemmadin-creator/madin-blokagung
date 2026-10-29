const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const resFormasi = await client.query(`
    SELECT 
      count(*) AS total_rows,
      count(*) FILTER (WHERE domisili IS NOT NULL AND domisili != '') AS filled_domisili,
      count(*) FILTER (WHERE lokasi_diniyyah IS NOT NULL AND lokasi_diniyyah != '') AS filled_lok_din,
      count(*) FILTER (WHERE lokasi_takror IS NOT NULL AND lokasi_takror != '') AS filled_lok_tak,
      count(*) FILTER (WHERE blok_diniyyah IS NOT NULL AND blok_diniyyah != '') AS filled_blk_din,
      count(*) FILTER (WHERE blok_takror IS NOT NULL AND blok_takror != '') AS filled_blk_tak
    FROM formasi_kelas;
  `);
  console.log('Statistik formasi_kelas di Supabase:');
  console.table(resFormasi.rows);

  // Sample 10 rows from formasi_kelas
  const sampleFormasi = await client.query(`
    SELECT tingkat, din_kls, din_bag, pa_pi, id_mustahiq, domisili, lokasi_diniyyah, lokasi_takror, blok_diniyyah, blok_takror
    FROM formasi_kelas
    ORDER BY tingkat, din_kls, din_bag, pa_pi
    LIMIT 10;
  `);
  console.log('\nSample 10 baris formasi_kelas:');
  console.table(sampleFormasi.rows);

  const resAsatidz = await client.query(`
    SELECT 
      count(*) AS total_asatidz,
      count(*) FILTER (WHERE lokasi_diniyyah IS NOT NULL AND lokasi_diniyyah != '') AS asatidz_lok_din,
      count(*) FILTER (WHERE lokasi_takror IS NOT NULL AND lokasi_takror != '') AS asatidz_lok_tak,
      count(*) FILTER (WHERE blok IS NOT NULL AND blok != '') AS asatidz_blok,
      count(*) FILTER (WHERE asrama IS NOT NULL AND asrama != '') AS asatidz_asrama
    FROM asatidz;
  `);
  console.log('\nStatistik asatidz di Supabase:');
  console.table(resAsatidz.rows);

  await client.end();
}

main().catch(console.error);
