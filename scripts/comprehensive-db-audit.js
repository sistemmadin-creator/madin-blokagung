const { Client } = require('pg');
const fs = require('fs');

function quotePgIdentifier(identifier) {
  if (typeof identifier !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Identifier PostgreSQL tidak valid: ${String(identifier)}`);
  }
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function comprehensiveAudit() {
  const envContent = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8') : '';
  const dbMatch = envContent.match(/^DATABASE_URL=(.*)$/m);
  const connectionString = process.env.DATABASE_URL || (dbMatch ? dbMatch[1].trim() : '');
  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan di environment maupun .env.local');
  }

  const allowInsecureSsl = process.env.DB_SSL_INSECURE === 'true';
  const client = new Client({
    connectionString,
    ssl: allowInsecureSsl ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
  });

  await client.connect();

  try {
    const resTables = await client.query(`
      SELECT tablename AS table_name
      FROM pg_catalog.pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const allowedTables = new Set(resTables.rows.map((r) => r.table_name));
    const auditReport = {};

    for (const t of allowedTables) {
      const safeTable = quotePgIdentifier(t);
      const countRes = await client.query(`SELECT count(*)::int AS total FROM public.${safeTable};`);
      const total = countRes.rows[0].total;

      const colsRes = await client.query(
        `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position;
      `,
        [t]
      );

      const colStats = [];

      if (total > 0) {
        for (const col of colsRes.rows) {
          const colName = col.column_name;
          const safeCol = quotePgIdentifier(colName);
          const fillRes = await client.query(`
            SELECT count(*)::int AS filled
            FROM public.${safeTable}
            WHERE ${safeCol} IS NOT NULL
              AND ${safeCol}::text != ''
              AND ${safeCol}::text != '-'
              AND ${safeCol}::text != 'null';
          `);
          const filled = fillRes.rows[0].filled;
          const pct = Math.round((filled / total) * 100);
          colStats.push({
            column: colName,
            type: col.data_type,
            filled,
            total,
            pct,
          });
        }
      } else {
        for (const col of colsRes.rows) {
          colStats.push({
            column: col.column_name,
            type: col.data_type,
            filled: 0,
            total: 0,
            pct: 0,
          });
        }
      }

      auditReport[t] = {
        totalRows: total,
        columnsCount: colsRes.rows.length,
        columns: colStats,
      };
    }

    fs.writeFileSync('scripts/comprehensive-audit-result.json', JSON.stringify(auditReport, null, 2));
    console.log('✅ Audit selesai! Disimpan ke scripts/comprehensive-audit-result.json');
  } finally {
    await client.end();
  }
}

comprehensiveAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
