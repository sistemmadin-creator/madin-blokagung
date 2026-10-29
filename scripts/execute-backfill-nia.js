const fs = require('fs');
const { Client } = require('pg');

async function executeBackfillNia() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('--- TAHAP 1: BACKFILL NIA DI JADWAL_KBM_SLOTS ---');

  // 1. Fetch Asatidz
  const asatidzRes = await client.query('SELECT nia, nama_asatidz FROM asatidz WHERE nia IS NOT NULL AND nia != \'\'');
  const norm = (s) => (s || '').toLowerCase().replace(/['’`.,\s\-]/g, '').trim();
  const nameToNia = new Map();

  for (const a of asatidzRes.rows) {
    const cleanNia = a.nia.trim();
    nameToNia.set(norm(a.nama_asatidz), cleanNia);
  }

  const aliases = {
    [norm('DESTA EGY RAHMA PRATIWI')]: 'C37',
    [norm("ULFATUS SA'ADAH")]: 'C11',
    [norm('IKFINA YA MAULANAN NUZULA')]: 'C119',
    [norm('Ny')]: 'A33',
  };

  // 2. Fetch all slots that need update
  const jadwalRes = await client.query('SELECT id, nama_asatidz, nia FROM jadwal_kbm_slots');
  console.log(`Total slots diperiksa: ${jadwalRes.rowCount}`);

  let updatedCount = 0;
  let skippedCount = 0;

  // We can do an efficient batch update using temp table or unnest
  const updates = [];
  for (const row of jadwalRes.rows) {
    const rawName = row.nama_asatidz;
    const key = norm(rawName);
    const targetNia = aliases[key] || nameToNia.get(key);

    if (targetNia && row.nia !== targetNia) {
      updates.push({ id: row.id, nia: targetNia });
    } else if (!targetNia) {
      skippedCount++;
    }
  }

  console.log(`Slots yang akan diperbarui dengan NIA: ${updates.length}`);
  console.log(`Slots tanpa kecocokan (placeholder): ${skippedCount}`);

  // Batch update in chunks of 500 inside a transaction
  const CHUNK_SIZE = 500;
  await client.query('BEGIN');
  try {
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const ids = chunk.map((c) => c.id);
      const nias = chunk.map((c) => c.nia);

      await client.query(
        `
        UPDATE jadwal_kbm_slots AS j
        SET nia = u.nia
        FROM (
          SELECT unnest($1::uuid[]) AS id, unnest($2::text[]) AS nia
        ) AS u
        WHERE j.id = u.id
      `,
        [ids, nias]
      );
      updatedCount += chunk.length;
      console.log(`Progress update: ${updatedCount}/${updates.length} slots...`);
    }

    await client.query('COMMIT');
    console.log('✅ Transaksi COMMIT berhasil!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error saat update, rollback dilakukan:', err);
    throw err;
  }

  // 3. Verifikasi
  const verifyRes = await client.query(`
    SELECT 
      count(*) FILTER (WHERE nia IS NOT NULL AND nia != '') AS filled_nia,
      count(*) FILTER (WHERE nia IS NULL OR nia = '') AS empty_nia,
      count(*) AS total
    FROM jadwal_kbm_slots;
  `);
  console.log('\n--- VERIFIKASI AKHIR TAHAP 1 ---');
  console.table(verifyRes.rows);

  await client.end();
}

executeBackfillNia().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
