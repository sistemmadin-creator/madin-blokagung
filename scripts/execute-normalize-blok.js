const fs = require('fs');
const { Client } = require('pg');

async function executeNormalizeBlok() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- TAHAP 2: NORMALISASI BLOK DI ABSENSI_RECORDS & FORMASI_KELAS ---');

  // 1. Normalisasi absensi_records
  const res8 = await client.query("UPDATE absensi_records SET blok = 'Blok 8' WHERE blok = '8'");
  console.log(`absensi_records: ${res8.rowCount} baris dengan nilai '8' diubah menjadi 'Blok 8'`);

  const resGP = await client.query("UPDATE absensi_records SET blok = 'Blok 8' WHERE blok = 'GP'");
  console.log(`absensi_records: ${resGP.rowCount} baris dengan nilai 'GP' disinkronkan ke 'Blok 8'`);

  // 2. Normalisasi variasi 'Induk' di formasi_kelas
  const resInduk1 = await client.query("UPDATE formasi_kelas SET blok_diniyyah = 'Blok Induk' WHERE blok_diniyyah IN ('Blok Blok Induk Putra', 'Blok induk', 'Blok Putra Induk')");
  console.log(`formasi_kelas: ${resInduk1.rowCount} baris variasi Induk diubah menjadi 'Blok Induk'`);

  // 3. Verifikasi absensi_records
  const resVerifyAbsensi = await client.query('SELECT blok, COUNT(*) FROM absensi_records GROUP BY blok ORDER BY count DESC');
  console.log('\nDistribusi blok di absensi_records sekarang:');
  console.table(resVerifyAbsensi.rows);

  // 4. Verifikasi formasi_kelas
  const resVerifyFormasi = await client.query('SELECT DISTINCT blok_diniyyah FROM formasi_kelas ORDER BY blok_diniyyah');
  console.log('\nDistribusi blok_diniyyah di formasi_kelas sekarang:');
  console.table(resVerifyFormasi.rows);

  await client.end();
}

executeNormalizeBlok().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
