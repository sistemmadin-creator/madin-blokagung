const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = env.match(/DATABASE_URL=(.*)/)[1].trim();
  const client = new Client({ connectionString: dbMatch, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const res = await client.query(`
    SELECT id, nama_asatidz, tingkat, din_kls, din_bag, pa_pi, hari, jam, fan 
    FROM jadwal_kbm_slots 
    WHERE tingkat = 'WUSTHO' AND din_kls = '2' AND din_bag = 'A' AND pa_pi = 'PI'
    ORDER BY hari, jam
  `);
  console.log('Slots for WUSTHO 2 A PI:');
  console.table(res.rows);

  const resNy = await client.query(`
    SELECT id, nama_asatidz, tingkat, din_kls, din_bag, pa_pi, hari, jam, fan 
    FROM jadwal_kbm_slots 
    WHERE tingkat = 'ULA' AND din_kls = '2' AND din_bag = 'C' AND pa_pi = 'PI'
    ORDER BY hari, jam
  `);
  console.log('Slots for ULA 2 C PI:');
  console.table(resNy.rows);

  await client.end();
}

main().catch(console.error);
