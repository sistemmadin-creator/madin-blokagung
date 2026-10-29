const { Client } = require('pg');
const fs = require('fs');

async function auditSchema() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = envContent.match(/DATABASE_URL=(.*)/);
  const client = new Client({
    connectionString: dbMatch[1].trim(),
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const resTables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  const tables = resTables.rows.map(r => r.table_name);
  console.log('Total public tables:', tables.length);

  const tableColumns = {};
  for (const t of tables) {
    const resCols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    tableColumns[t] = resCols.rows;
  }

  fs.writeFileSync('scripts/db-schema-dump.json', JSON.stringify(tableColumns, null, 2));
  console.log('Saved schema dump to scripts/db-schema-dump.json');
  await client.end();
}

auditSchema().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
