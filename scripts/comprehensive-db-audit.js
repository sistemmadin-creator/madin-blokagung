const { Client } = require('pg');
const fs = require('fs');

async function comprehensiveAudit() {
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
  const auditReport = {};

  for (const t of tables) {
    const countRes = await client.query(`SELECT count(*)::int as total FROM public."${t}";`);
    const total = countRes.rows[0].total;

    const colsRes = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);

    const colStats = [];

    if (total > 0) {
      for (const col of colsRes.rows) {
        const colName = col.column_name;
        // Count non-null and non-empty string
        const fillRes = await client.query(`
          SELECT count(*)::int as filled
          FROM public."${t}"
          WHERE "${colName}" IS NOT NULL 
            AND "${colName}"::text != '' 
            AND "${colName}"::text != '-'
            AND "${colName}"::text != 'null';
        `);
        const filled = fillRes.rows[0].filled;
        const pct = Math.round((filled / total) * 100);
        colStats.push({
          column: colName,
          type: col.data_type,
          filled: filled,
          total: total,
          pct: pct
        });
      }
    } else {
      for (const col of colsRes.rows) {
        colStats.push({
          column: col.column_name,
          type: col.data_type,
          filled: 0,
          total: 0,
          pct: 0
        });
      }
    }

    auditReport[t] = {
      totalRows: total,
      columnsCount: colsRes.rows.length,
      columns: colStats
    };
  }

  fs.writeFileSync('scripts/comprehensive-audit-result.json', JSON.stringify(auditReport, null, 2));
  console.log('✅ Audit selesai! Disimpan ke scripts/comprehensive-audit-result.json');
  await client.end();
}

comprehensiveAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
