const fs = require('fs');
const { Client } = require('pg');

async function testBackfill() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const asatidzRes = await client.query('SELECT nia, nama_asatidz FROM asatidz WHERE nia IS NOT NULL AND nia != \'\'');
  const norm = (s) => (s || '').toLowerCase().replace(/['’`.,\s\-]/g, '').trim();
  const nameToNia = new Map();

  for (const a of asatidzRes.rows) {
    const cleanNia = a.nia.trim();
    nameToNia.set(norm(a.nama_asatidz), cleanNia);
  }

  // Alias / manual mappings for known slight discrepancies
  const aliases = {
    [norm('DESTA EGY RAHMA PRATIWI')]: 'C37',
    [norm("ULFATUS SA'ADAH")]: 'C11',
    [norm('IKFINA YA MAULANAN NUZULA')]: 'C119',
    [norm('Ny')]: 'A33', // Ny. Hj. Nur Mualina
  };

  const jadwalRes = await client.query('SELECT id, nama_asatidz, nia FROM jadwal_kbm_slots');
  let willUpdate = 0;
  let alreadyHasNia = 0;
  let noMatch = 0;
  const noMatchList = [];

  for (const row of jadwalRes.rows) {
    const rawName = row.nama_asatidz;
    const key = norm(rawName);
    const targetNia = aliases[key] || nameToNia.get(key);

    if (targetNia) {
      willUpdate++;
    } else {
      noMatch++;
      if (!noMatchList.includes(rawName)) noMatchList.push(rawName);
    }
  }

  console.log('Total jadwal slots:', jadwalRes.rowCount);
  console.log('Slots matching NIA successfully:', willUpdate);
  console.log('Slots without match:', noMatch);
  console.log('Unmatched names:', noMatchList);

  await client.end();
}

testBackfill().catch(console.error);
