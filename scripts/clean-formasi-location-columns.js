const fs = require('fs');
const { Client } = require('pg');

async function cleanFormasiLocationColumns() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- PEMBERSIHAN KOLOM LOKASI & DOMISILI FORMASI_KELAS DI SUPABASE ---');

  // 1. Kondisi sebelum
  const beforeRes = await client.query(`
    SELECT 
      count(*) AS total_kelas,
      count(*) FILTER (WHERE domisili IS NOT NULL AND domisili != '') AS filled_domisili,
      count(*) FILTER (WHERE lokasi_diniyyah IS NOT NULL AND lokasi_diniyyah != '') AS filled_lok_din,
      count(*) FILTER (WHERE lokasi_takror IS NOT NULL AND lokasi_takror != '') AS filled_lok_tak,
      count(*) FILTER (WHERE blok_diniyyah IS NOT NULL AND blok_diniyyah != '') AS filled_blk_din,
      count(*) FILTER (WHERE blok_takror IS NOT NULL AND blok_takror != '') AS filled_blk_tak,
      count(*) FILTER (WHERE foto_diniyyah IS NOT NULL AND foto_diniyyah != '') AS filled_foto_din,
      count(*) FILTER (WHERE foto_takror IS NOT NULL AND foto_takror != '') AS filled_foto_tak
    FROM formasi_kelas;
  `);
  console.log('Kondisi SEBELUM pembersihan:');
  console.table(beforeRes.rows);

  // 2. Eksekusi UPDATE pengosongan kolom lokasi & domisili
  const updateRes = await client.query(`
    UPDATE public.formasi_kelas 
    SET 
      domisili = '',
      blok_diniyyah = '',
      blok_takror = '',
      lokasi_diniyyah = '',
      lokasi_takror = '',
      foto_diniyyah = '',
      foto_takror = '';
  `);
  console.log(`✅ Berhasil mengosongkan kolom pada ${updateRes.rowCount} baris formasi_kelas!`);

  // 3. Kondisi sesudah
  const afterRes = await client.query(`
    SELECT 
      count(*) AS total_kelas,
      count(*) FILTER (WHERE domisili IS NOT NULL AND domisili != '') AS filled_domisili,
      count(*) FILTER (WHERE lokasi_diniyyah IS NOT NULL AND lokasi_diniyyah != '') AS filled_lok_din,
      count(*) FILTER (WHERE lokasi_takror IS NOT NULL AND lokasi_takror != '') AS filled_lok_tak,
      count(*) FILTER (WHERE blok_diniyyah IS NOT NULL AND blok_diniyyah != '') AS filled_blk_din,
      count(*) FILTER (WHERE blok_takror IS NOT NULL AND blok_takror != '') AS filled_blk_tak,
      count(*) FILTER (WHERE foto_diniyyah IS NOT NULL AND foto_diniyyah != '') AS filled_foto_din,
      count(*) FILTER (WHERE foto_takror IS NOT NULL AND foto_takror != '') AS filled_foto_tak
    FROM formasi_kelas;
  `);
  console.log('\nKondisi SESUDAH pembersihan:');
  console.table(afterRes.rows);

  // 4. Pastikan data identitas kelas tetap utuh
  const sampleIntact = await client.query(`
    SELECT tingkat, din_kls, din_bag, pa_pi, id_mustahiq, kapasitas_maksimal, domisili, lokasi_diniyyah
    FROM formasi_kelas
    ORDER BY tingkat, din_kls, din_bag, pa_pi
    LIMIT 5;
  `);
  console.log('\nSample 5 kelas (Identitas kelas dan wali kelas tetap utuh):');
  console.table(sampleIntact.rows);

  await client.end();
}

cleanFormasiLocationColumns().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
