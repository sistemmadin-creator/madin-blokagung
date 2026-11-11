const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  const dbMatch = envContent.match(/DATABASE_URL=(.*)/);
  if (!dbMatch) {
    throw new Error('DATABASE_URL tidak ditemukan di .env.local');
  }

  const client = new Client({
    connectionString: dbMatch[1].trim(),
    ssl: { rejectUnauthorized: false },
  });

  console.log('Menghubungkan ke PostgreSQL...');
  await client.connect();

  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20261112_harden_rbac_and_anti_bola_rls.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Menerapkan migrasi 20261112_harden_rbac_and_anti_bola_rls.sql...');
  await client.query(migrationSql);

  console.log('✅ Migrasi RLS Anti-BOLA & Otorisasi RBAC berhasil diterapkan ke database!');

  // Verifikasi policies pada tabel penting
  const pol = await client.query(`
    SELECT tablename, policyname, cmd, roles 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('app_settings', 'activity_logs', 'push_subscriptions', 'serah_piagam', 'ebtadin_santri')
    ORDER BY tablename, policyname;
  `);

  console.table(pol.rows);

  await client.end();
}

applyMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
