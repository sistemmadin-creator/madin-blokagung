const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
let databaseUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.substring('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
  }
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

function normalisasiNamaKelas(str) {
  if (!str) return '';
  return String(str)
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function extractBaseKelasAndOldLokasi(rawLokasi) {
  if (!rawLokasi) return { baseKelas: '', oldLokasi: '' };
  const raw = String(rawLokasi).trim();
  
  // Pola: 1 A ULA (PA) (Lokasi) ATAU 1 A ULA (PA) ATAU 1 A ULA (Lokasi)
  const match = raw.match(/^(.*?)\s*\(([^()]+)\)$/);
  if (match) {
    const isiKurung = match[2].trim();
    const upper = isiKurung.toUpperCase();
    if (upper === 'PA' || upper === 'PI' || upper === 'UG') {
      return { baseKelas: raw, oldLokasi: '' };
    }
    return { baseKelas: match[1].trim(), oldLokasi: isiKurung };
  }
  return { baseKelas: raw, oldLokasi: '' };
}

async function run() {
  console.log('=== MEMULAI SINKRONISASI LOKASI FORMASI KE JADWAL ===');
  
  // 1. Ambil seluruh data formasi_kelas
  const formasiRes = await pool.query('SELECT tingkat, din_kls, din_bag, pa_pi, lokasi_diniyyah FROM formasi_kelas');
  const formasiMap = new Map();
  for (const f of formasiRes.rows) {
    const key = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
    const keyNoGen = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
    const lok = (f.lokasi_diniyyah && f.lokasi_diniyyah !== '-') ? f.lokasi_diniyyah.trim() : '';
    formasiMap.set(key, lok);
    if (!formasiMap.has(keyNoGen)) {
      formasiMap.set(keyNoGen, lok);
    }
  }
  console.log(`Berhasil memuat ${formasiRes.rows.length} baris formasi_kelas.`);
  console.log('Kelas 1 A ULA (PA) lokasi di formasi:', formasiMap.get('1 A ULA (PA)'));

  // 2. Ambil seluruh data jadwal_kbm_slots
  const slotsRes = await pool.query('SELECT id, nama_asatidz, hari, jam, fan, kelas_lengkap, lokasi, raw_slot FROM jadwal_kbm_slots');
  console.log(`Berhasil memuat ${slotsRes.rows.length} baris jadwal_kbm_slots.`);

  const updates = [];

  for (const s of slotsRes.rows) {
    const { baseKelas } = extractBaseKelasAndOldLokasi(s.lokasi || s.kelas_lengkap);
    const normBase = normalisasiNamaKelas(baseKelas || s.kelas_lengkap);
    
    let formasiLokasi = formasiMap.get(normBase);
    if (formasiLokasi === undefined) {
      for (const [fKey, fLok] of formasiMap.entries()) {
        if (normBase.startsWith(fKey) || fKey.startsWith(normBase)) {
          formasiLokasi = fLok;
          break;
        }
      }
    }

    let expectedLokasi = baseKelas || s.kelas_lengkap;
    if (formasiLokasi) {
      expectedLokasi = `${baseKelas || s.kelas_lengkap} (${formasiLokasi})`;
    } else {
      expectedLokasi = baseKelas || s.kelas_lengkap;
    }

    const expectedRawSlot = `Jam ${s.jam} | ${s.fan || '-'} | ${expectedLokasi}`;

    if (s.lokasi !== expectedLokasi || s.raw_slot !== expectedRawSlot || s.kelas_lengkap !== (baseKelas || s.kelas_lengkap)) {
      updates.push({
        id: s.id,
        kelas_lengkap: baseKelas || s.kelas_lengkap,
        lokasi: expectedLokasi,
        raw_slot: expectedRawSlot
      });
    }
  }

  console.log(`Menemukan ${updates.length} slot yang memerlukan sinkronisasi lokasi.`);

  // Urutkan berdasarkan ID agar menghindari deadlock pada PostgreSQL
  updates.sort((a, b) => a.id.localeCompare(b.id));

  // Eksekusi update per batch tanpa long-lived transaction
  const chunkSize = 200;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    // Buat statement UPDATE dengan VALUES
    const valuesClause = chunk.map((u, idx) => 
      `($${idx * 4 + 1}::uuid, $${idx * 4 + 2}::text, $${idx * 4 + 3}::text, $${idx * 4 + 4}::text)`
    ).join(', ');

    const params = [];
    chunk.forEach(u => {
      params.push(u.id, u.kelas_lengkap, u.lokasi, u.raw_slot);
    });

    const sql = `
      UPDATE jadwal_kbm_slots AS j
      SET kelas_lengkap = v.kelas_lengkap,
          lokasi = v.lokasi,
          raw_slot = v.raw_slot
      FROM (VALUES ${valuesClause}) AS v(id, kelas_lengkap, lokasi, raw_slot)
      WHERE j.id = v.id
    `;

    await pool.query(sql, params);
    if ((i + chunkSize) % 1000 < chunkSize || i + chunkSize >= updates.length) {
      console.log(`Progress update: ${Math.min(i + chunkSize, updates.length)} / ${updates.length} slot...`);
    }
  }
  console.log(`✅ Berhasil memperbarui seluruh ${updates.length} slot di tabel jadwal_kbm_slots!`);

  // 3. Sinkronkan app_settings JADWAL_MENGAJAR_ASATIDZ
  const appRes = await pool.query("SELECT key, value FROM app_settings WHERE key = 'JADWAL_MENGAJAR_ASATIDZ'");
  if (appRes.rows.length > 0) {
    const rawVal = appRes.rows[0].value;
    const jadwalMap = typeof rawVal === 'string' ? JSON.parse(rawVal) : rawVal;
    let mapUpdated = false;

    for (const [guruName, row] of Object.entries(jadwalMap)) {
      if (!row || typeof row !== 'object') continue;
      const days = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'];
      for (const day of days) {
        if (!row[day]) continue;
        const lines = row[day].split('\n');
        const newLines = lines.map((line) => {
          const parts = line.split('|').map((p) => p.trim());
          if (parts.length >= 3) {
            const rawLok = parts[2];
            const { baseKelas } = extractBaseKelasAndOldLokasi(rawLok);
            const normBase = normalisasiNamaKelas(baseKelas);
            const formasiLokasi = formasiMap.get(normBase);
            let newLok = baseKelas;
            if (formasiLokasi) {
              newLok = `${baseKelas} (${formasiLokasi})`;
            }
            if (newLok !== rawLok) {
              mapUpdated = true;
              return `${parts[0]} | ${parts[1]} | ${newLok}`;
            }
          }
          return line;
        });
        row[day] = newLines.join('\n');
      }
    }

    if (mapUpdated) {
      await pool.query(
        "UPDATE app_settings SET value = $1 WHERE key = 'JADWAL_MENGAJAR_ASATIDZ'",
        [JSON.stringify(jadwalMap)]
      );
      console.log('✅ Berhasil menyinkronkan JADWAL_MENGAJAR_ASATIDZ di app_settings!');
    } else {
      console.log('JADWAL_MENGAJAR_ASATIDZ sudah sesuai.');
    }
  }

  // 4. Verifikasi slot 1 A ULA (PA)
  const verifyRes = await pool.query("SELECT id, nama_asatidz, hari, jam, fan, kelas_lengkap, lokasi, raw_slot FROM jadwal_kbm_slots WHERE kelas_lengkap = '1 A ULA (PA)' LIMIT 3");
  console.log('\nVerifikasi jadwal_kbm_slots 1 A ULA (PA):');
  for (const r of verifyRes.rows) {
    console.log(r);
  }

  // 5. Verifikasi slot kelas lain, misal 1 B ULA (PA)
  const verifyRes2 = await pool.query("SELECT id, nama_asatidz, hari, jam, fan, kelas_lengkap, lokasi, raw_slot FROM jadwal_kbm_slots WHERE kelas_lengkap = '1 B ULA (PA)' LIMIT 3");
  console.log('\nVerifikasi jadwal_kbm_slots 1 B ULA (PA):');
  for (const r of verifyRes2.rows) {
    console.log(r);
  }

  await pool.end();
  console.log('=== SELESAI SINKRONISASI ===');
}

run().catch(console.error);
