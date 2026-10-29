const { Client } = require('pg');
const fs = require('fs');
const dbMatch = fs.readFileSync('.env.local', 'utf8').match(/DATABASE_URL=(.*)/);
const client = new Client({ connectionString: dbMatch[1].trim(), ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const res = await client.query("SELECT key, value FROM public.app_settings WHERE key = 'APP_SETTINGS'");
  const v = res.rows[0]?.value;
  console.log('Keys in APP_SETTINGS:', Object.keys(v || {}));
  await client.end();
}
run().catch(console.error);
