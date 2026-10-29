const { Client } = require('pg');
const fs = require('fs');

async function runDDLMigrations() {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const dbMatch = envContent.match(/DATABASE_URL=(.*)/);
  if (!dbMatch) throw new Error('DATABASE_URL not found in .env.local');

  const client = new Client({
    connectionString: dbMatch[1].trim(),
    ssl: { rejectUnauthorized: false },
  });

  console.log('Menghubungkan ke PostgreSQL sebagai Admin...');
  await client.connect();

  console.log('1. Menjalankan DDL ALTER TABLE formasi_kelas...');
  await client.query(`
    ALTER TABLE public.formasi_kelas
    ADD COLUMN IF NOT EXISTS blok_diniyyah TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS blok_takror TEXT DEFAULT '';
  `);
  console.log(' ✅ Kolom blok_diniyyah & blok_takror berhasil ditambahkan!');

  console.log('2. Menambahkan Unique Constraint (tingkat, din_kls, din_bag, pa_pi)...');
  await client.query(`
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'uq_formasi_kelas_rombel'
        ) THEN
            ALTER TABLE public.formasi_kelas
            ADD CONSTRAINT uq_formasi_kelas_rombel UNIQUE (tingkat, din_kls, din_bag, pa_pi);
        END IF;
    END $$;
  `);
  console.log(' ✅ Unique Constraint uq_formasi_kelas_rombel aktif!');

  console.log('3. Melakukan sinkronisasi blok_diniyyah = blok...');
  const resUpdate = await client.query(`
    UPDATE public.formasi_kelas
    SET blok_diniyyah = blok
    WHERE (blok_diniyyah IS NULL OR blok_diniyyah = '') 
      AND blok IS NOT NULL AND blok != '' AND blok != '-';
  `);
  console.log(` ✅ Sinkronisasi nilai blok awal: ${resUpdate.rowCount} baris.`);

  console.log('4. Verifikasi kolom tabel formasi_kelas...');
  const resCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'formasi_kelas' 
    ORDER BY ordinal_position;
  `);
  console.log('Kolom formasi_kelas sekarang:');
  console.table(resCols.rows);

  await client.end();
  console.log('🎉 SELURUH DDL MIGRATION BERHASIL 100%!');
}

runDDLMigrations().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
