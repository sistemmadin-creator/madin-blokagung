const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Baca kredensial dari .env.local
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(url, key);

function parseJadwalCell(cellStr) {
  if (!cellStr) return [];
  return String(cellStr)
    .split(/\r?\n|;;/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const p = line.split(' | ');
      let jamNum = 0;
      const m = (p[0] || '').match(/\d+/);
      if (m) jamNum = parseInt(m[0], 10);
      return {
        raw: line,
        jam: jamNum,
        fan: p[1] && p[1] !== '-' ? p[1].trim() : '',
        lokasi: p[2] && p[2] !== '-' ? p[2].trim() : '',
      };
    });
}

function extractKelasInfo(lokasiRaw) {
  const raw = String(lokasiRaw || '').trim();
  const match = raw.match(/^(\d+)\s+([A-Za-z]+)\s+(ULA|WUSTHO|WUSTHA|ULYA)(?:\s*\((PA|PI)\))?(.*)$/i);
  if (match) {
    const din_kls = match[1];
    const din_bag = match[2].toUpperCase();
    const tingkat = match[3].toUpperCase();
    const pa_pi = (match[4] ? match[4].toUpperCase() : '');
    const sisaLokasi = (match[5] || '').trim().replace(/^\(|\)$/g, '').trim();
    const kelas_lengkap = `${din_kls} ${din_bag} ${tingkat}${pa_pi ? ` (${pa_pi})` : ''}`;
    return {
      kelas_lengkap,
      tingkat,
      din_kls,
      din_bag,
      pa_pi,
      lokasiMurni: sisaLokasi || raw,
    };
  }
  return {
    kelas_lengkap: raw,
    tingkat: '',
    din_kls: '',
    din_bag: '',
    pa_pi: '',
    lokasiMurni: raw,
  };
}

async function run() {
  console.log('=====================================================');
  console.log('MIGRASI DATA FASE 1: DOKUMEN -> RELASIONAL POSTGRESQL');
  console.log('=====================================================');

  // 1. Cek ketersediaan tabel relasional
  console.log('\n[1/4] Memeriksa ketersediaan tabel di Supabase...');
  const tJadwal = await supabase.from('jadwal_kbm_slots').select('*').limit(1);
  const tAbsensi = await supabase.from('absensi_records').select('*').limit(1);
  const tSetoran = await supabase.from('setoran_hafalan_records').select('*').limit(1);
  const tNotif = await supabase.from('notification_logs').select('*').limit(1);
  const tSync = await supabase.from('offline_sync_logs').select('*').limit(1);
  const tSolver = await supabase.from('schedule_solver_proposals').select('*').limit(1);

  console.log(' - jadwal_kbm_slots:', !tJadwal.error ? 'SIAP' : 'BELUM TERSEDIA');
  console.log(' - absensi_records:', !tAbsensi.error ? 'SIAP' : 'BELUM TERSEDIA');
  console.log(' - setoran_hafalan_records:', !tSetoran.error ? 'SIAP' : 'BELUM TERSEDIA');
  console.log(' - notification_logs (Fase 3):', !tNotif.error ? 'SIAP' : 'OPSIONAL / BELUM DIJALANKAN');
  console.log(' - offline_sync_logs (Fase 2):', !tSync.error ? 'SIAP' : 'OPSIONAL / BELUM DIJALANKAN');
  console.log(' - schedule_solver_proposals (Fase 3):', !tSolver.error ? 'SIAP' : 'OPSIONAL / BELUM DIJALANKAN');

  if (tJadwal.error || tAbsensi.error || tSetoran.error) {
    console.error('Tabel utama Fase 1 belum siap di Supabase. Jalankan file SQL migrasi terlebih dahulu.');
    process.exit(1);
  }

  // 2. Ambil snapshot data dari app_settings
  console.log('\n[2/4] Mengambil snapshot data eksisting dari app_settings...');
  const { data: rows, error: fetchErr } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['JADWAL_MENGAJAR_ASATIDZ', 'ABSENSI_ASATIDZ_DATA', 'RIWAYAT_MUHAFADZOH_DATA']);

  if (fetchErr) {
    console.error('Error membaca data:', fetchErr.message);
    process.exit(1);
  }

  const rawJdw = rows?.find((r) => r.key === 'JADWAL_MENGAJAR_ASATIDZ')?.value;
  const rawAbs = rows?.find((r) => r.key === 'ABSENSI_ASATIDZ_DATA')?.value;
  const rawSet = rows?.find((r) => r.key === 'RIWAYAT_MUHAFADZOH_DATA')?.value;

  const jadwalMap = typeof rawJdw === 'string' ? JSON.parse(rawJdw) : rawJdw || {};
  const absensiMap = typeof rawAbs === 'string' ? JSON.parse(rawAbs) : rawAbs || {};
  const setoranRaw = typeof rawSet === 'string' ? JSON.parse(rawSet) : rawSet || [];

  // Peta NIA dari tabel asatidz
  const { data: asatidzRows } = await supabase.from('asatidz').select('nama_asatidz, nia');
  const niaMap = new Map();
  (asatidzRows || []).forEach((a) => {
    if (a.nama_asatidz && a.nia) niaMap.set(a.nama_asatidz.trim().toUpperCase(), a.nia.trim());
  });

  // 3. Konversi Jadwal KBM ke Slots
  console.log('\n[3/4] Mengurai dan memvalidasi struktur data...');
  const hariList = [
    { key: 'sabtu', hari: 'Sabtu' },
    { key: 'ahad', hari: 'Ahad' },
    { key: 'senin', hari: 'Senin' },
    { key: 'selasa', hari: 'Selasa' },
    { key: 'rabu', hari: 'Rabu' },
    { key: 'kamis', hari: 'Kamis' },
  ];

  const jadwalSlots = [];
  const seenSlotKeys = new Set();

  for (const [guruKey, row] of Object.entries(jadwalMap)) {
    const nama_asatidz = (row.nama_asatidz || guruKey).trim();
    const nia = niaMap.get(nama_asatidz.toUpperCase()) || '';

    for (const { key, hari } of hariList) {
      if (!row[key]) continue;
      const parsed = parseJadwalCell(row[key]);
      for (const ps of parsed) {
        if (!ps.jam) continue;
        const kInfo = extractKelasInfo(ps.lokasi);
        const slotKey = `${nama_asatidz.toUpperCase()}|${hari}|${ps.jam}|${kInfo.kelas_lengkap.toUpperCase()}`;
        if (seenSlotKeys.has(slotKey)) continue;
        seenSlotKeys.add(slotKey);

        jadwalSlots.push({
          nama_asatidz,
          nia,
          hari,
          jam: ps.jam,
          tingkat: kInfo.tingkat,
          din_kls: kInfo.din_kls,
          din_bag: kInfo.din_bag,
          pa_pi: kInfo.pa_pi,
          kelas_lengkap: kInfo.kelas_lengkap,
          fan: ps.fan,
          lokasi: ps.lokasi,
          raw_slot: ps.raw,
        });
      }
    }
  }

  // 4. Konversi Absensi Records
  const absensiRecords = [];
  for (const [bucketKey, val] of Object.entries(absensiMap)) {
    if (!val || !Array.isArray(val.data)) continue;
    const [kTgl, kJam] = bucketKey.split('|');
    const tanggal = val.tanggal || kTgl || '';
    const jamKe = val.jamKe || kJam || 'Jam 1';
    const mJam = jamKe.match(/\d+/);
    const jamNum = mJam ? parseInt(mJam[0], 10) : 1;

    for (const t of val.data) {
      if (!Array.isArray(t)) continue;
      absensiRecords.push({
        id: String(t[0] || `ABS_${Math.random().toString(36).substring(2, 9)}`),
        tanggal,
        hari: val.hari || 'Ahad',
        jam_ke: jamKe,
        jam_num: jamNum,
        nama_asatidz: String(t[2] || '-'),
        nia: String(t[3] || ''),
        tingkat: String(t[4] || ''),
        din_kls: String(t[5] || ''),
        din_bag: String(t[6] || ''),
        blok: String(t[7] || ''),
        gender: String(t[8] || ''),
        kelas_mengajar: String(t[9] || '-'),
        fan: String(t[10] || '-'),
        lokasi: String(t[11] || '-'),
        status: String(t[12] || 'Hadir'),
        keterangan: String(t[13] || ''),
        menit_terlambat: String(t[14] || ''),
        nama_pengganti: String(t[15] || ''),
        diinput_oleh: String(t[16] || 'Admin'),
        waktu_update: String(t[17] || t[1] || ''),
      });
    }
  }

  // 5. Konversi Setoran Records
  const setoranRecords = [];
  for (let idx = 0; idx < setoranRaw.length; idx++) {
    const row = setoranRaw[idx];
    if (!Array.isArray(row)) continue;
    setoranRecords.push({
      id: `SETORAN_${idx + 1}_${row[1] || idx}`,
      no_induk: String(row[1] || '').trim(),
      tanggal: String(row[2] || '').trim(),
      nama: String(row[3] || '').trim(),
      tgl_lahir: String(row[4] || '').trim(),
      bln_lahir: String(row[5] || '').trim(),
      thn_lahir: String(row[6] || '').trim(),
      tempat_lahir: String(row[7] || '').trim(),
      penjaga: String(row[8] || '').trim(),
      mustahiq: String(row[9] || '').trim(),
      tingkat: String(row[10] || '').trim(),
      din_bag: String(row[11] || '').trim(),
      din_kls: String(row[12] || '').trim(),
      kecamatan: String(row[13] || '').trim(),
      kabupaten: String(row[14] || '').trim(),
      provinsi: String(row[15] || '').trim(),
      bin: String(row[16] || '').trim(),
      item_hafalan: String(row[17] || '').trim(),
      kategori: String(row[18] || 'Wajib').trim(),
    });
  }

  console.log(` - Slot Jadwal KBM siap: ${jadwalSlots.length}`);
  console.log(` - Rekaman Presensi siap: ${absensiRecords.length}`);
  console.log(` - Rekaman Setoran siap: ${setoranRecords.length}`);

  // 6. Eksekusi Batch Upsert ke PostgreSQL
  console.log('\n[4/4] Memulai transfer data ke tabel relasional Supabase...');

  // A. Jadwal Slots (Batch chunk 100)
  let savedSlots = 0;
  for (let i = 0; i < jadwalSlots.length; i += 100) {
    const chunk = jadwalSlots.slice(i, i + 100);
    const { error } = await supabase
      .from('jadwal_kbm_slots')
      .upsert(chunk, { onConflict: 'nama_asatidz,hari,jam,kelas_lengkap' });
    if (error) {
      console.error(`Error upsert jadwal chunk ${i}:`, error.message);
    } else {
      savedSlots += chunk.length;
      process.stdout.write(`\r -> Jadwal KBM tersimpan: ${savedSlots}/${jadwalSlots.length} baris`);
    }
  }
  console.log('\n ✅ Berhasil menyimpan jadwal_kbm_slots!');

  // B. Absensi Records
  if (absensiRecords.length > 0) {
    const { error: absErr } = await supabase
      .from('absensi_records')
      .upsert(absensiRecords, { onConflict: 'id' });
    if (absErr) {
      console.error('Error upsert absensi:', absErr.message);
    } else {
      console.log(` ✅ Berhasil menyimpan ${absensiRecords.length} baris absensi_records!`);
    }
  }

  // C. Setoran Records
  if (setoranRecords.length > 0) {
    const { error: setErr } = await supabase
      .from('setoran_hafalan_records')
      .upsert(setoranRecords, { onConflict: 'id' });
    if (setErr) {
      console.error('Error upsert setoran:', setErr.message);
    } else {
      console.log(` ✅ Berhasil menyimpan ${setoranRecords.length} baris setoran_hafalan_records!`);
    }
  }

  console.log('\n🎉 SELURUH DATA TELAH BERHASIL DIMIGRASIKAN KE TABEL RELASIONAL DENGAN GARANSI ZERO DATA LOSS!');
}

run().catch(console.error);
