/**
 * Skrip Sinkronisasi & Materialized Backfill Tabel formasi_kelas Supabase
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

const VALID_JAH_WALIKELAS = ['MUSTAHIQ', 'MS & KOOR', 'MUSTAHIQOH'];

function norm(val) {
  return String(val || '').trim().toUpperCase();
}

async function run() {
  console.log('=== MEMULAI SINKRONISASI & PERBAIKAN FORMASI KELAS ===\n');

  // 1. Ambil data master asatidz dan hierarki
  const { data: asatidzList, error: errAsatidz } = await supabase.from('asatidz').select('*');
  if (errAsatidz) throw errAsatidz;
  console.log(`[1] Master Asatidz dimuat: ${asatidzList.length} data`);

  const { data: appSettings } = await supabase.from('app_settings').select('value').eq('key', 'HIERARKI_LOKASI_KBM').maybeSingle();
  const hierarkiKBM = appSettings?.value || { diniyyah: [], takror: [] };

  function findBlok(lokasi, type) {
    if (!lokasi || lokasi.trim() === '-' || !lokasi.trim()) return '';
    const clean = lokasi.trim().toLowerCase();
    const list = type === 'diniyyah' ? hierarkiKBM.diniyyah || [] : hierarkiKBM.takror || [];
    for (const group of list) {
      for (const r of (group.lokasiList || [])) {
        if (r.trim().toLowerCase() === clean) return group.namaBlok;
      }
    }
    for (const group of list) {
      for (const r of (group.lokasiList || [])) {
        const rLower = r.trim().toLowerCase();
        if (clean.includes(rLower) || rLower.includes(clean)) return group.namaBlok;
      }
    }
    return '';
  }

  // 2. Tambahkan 5 kelas yang hilang
  console.log('\n[2] Menambahkan 5 kelas rombel yang belum terdaftar...');
  const newClasses = [
    {
      tingkat: 'ULA',
      din_kls: '3',
      din_bag: 'A',
      pa_pi: 'PA',
      is_unggulan: true,
      kapasitas_maksimal: 80,
    },
    {
      tingkat: 'ULA',
      din_kls: '4',
      din_bag: 'M',
      pa_pi: 'PI',
      is_unggulan: false,
      kapasitas_maksimal: 80,
    },
    {
      tingkat: 'ULA',
      din_kls: '4',
      din_bag: 'N',
      pa_pi: 'PI',
      is_unggulan: false,
      kapasitas_maksimal: 80,
    },
    {
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'M',
      pa_pi: 'PI',
      is_unggulan: false,
      kapasitas_maksimal: 80,
    },
    {
      tingkat: 'WUSTHO',
      din_kls: '1',
      din_bag: 'N',
      pa_pi: 'PI',
      is_unggulan: false,
      kapasitas_maksimal: 80,
    }
  ];

  for (const c of newClasses) {
    const { data: existing } = await supabase
      .from('formasi_kelas')
      .select('id')
      .eq('tingkat', c.tingkat)
      .eq('din_kls', c.din_kls)
      .eq('din_bag', c.din_bag)
      .eq('pa_pi', c.pa_pi);

    if (existing && existing.length > 0) {
      console.log(` - Kelas ${c.tingkat} ${c.din_kls}${c.din_bag} (${c.pa_pi}) sudah ada.`);
    } else {
      const { data, error } = await supabase.from('formasi_kelas').insert([c]).select();
      if (error) {
        console.error(` - Gagal insert ${c.tingkat} ${c.din_kls}${c.din_bag}:`, error.message);
      } else {
        console.log(` - Berhasil menambahkan ${c.tingkat} ${c.din_kls}${c.din_bag} (${c.pa_pi}) -> ID: ${data[0].id}`);
      }
    }
  }

  // 3. Ambil seluruh data formasi_kelas terkini
  const { data: allFormasi, error: errFormasi } = await supabase.from('formasi_kelas').select('*');
  if (errFormasi) throw errFormasi;
  console.log(`\n[3] Total data formasi_kelas saat ini: ${allFormasi.length} baris`);

  // 4. Lakukan Backfill data (id_mustahiq, domisili, lokasi_takror, lokasi_diniyyah, blok)
  console.log('\n[4] Memulai Materialized Backfill ke seluruh baris formasi_kelas...');
  let updatedCount = 0;
  let skippedCount = 0;

  // Cek apakah kolom baru 'blok_diniyyah' sudah ada di PostgreSQL
  let hasBlokDiniyyah = false;
  try {
    const { error: testColErr } = await supabase.from('formasi_kelas').select('blok_diniyyah').limit(1);
    if (!testColErr) hasBlokDiniyyah = true;
  } catch {
    hasBlokDiniyyah = false;
  }
  console.log(` - Deteksi kolom blok_diniyyah di PostgreSQL: ${hasBlokDiniyyah ? 'ADA' : 'BELUM ADA (menggunakan fallback kolom blok)'}`);

  for (const f of allFormasi) {
    const fTingkat = norm(f.tingkat);
    const fKls = norm(f.din_kls);
    const fBag = norm(f.din_bag);
    const fGender = norm(f.pa_pi);

    // Cari ustadz wali kelas
    const matched = asatidzList.filter((a) => {
      const jah = norm(a.jah_asatidz);
      if (!VALID_JAH_WALIKELAS.includes(jah)) return false;
      const matchT = norm(a.tingkat_asatidz) === fTingkat;
      const matchK = norm(a.din_kls_asatidz) === fKls;
      const matchB = norm(a.din_bag_asatidz) === fBag;
      const matchG = !fGender || !a.pa_pi || norm(a.pa_pi) === fGender;
      return matchT && matchK && matchB && matchG;
    });

    const primaryUstadz = matched[0] || null;

    const waliText = matched.length > 0 ? matched.map(m => m.nama_asatidz).join(', ') : (f.id_mustahiq || '');
    const domisili = primaryUstadz?.blok
      ? `Blok ${primaryUstadz.blok}${primaryUstadz.asrama ? ' - ' + primaryUstadz.asrama : ''}`
      : (f.domisili || '');
    const lokasiTakror = f.lokasi_takror || primaryUstadz?.lokasi_takror || '';
    const lokasiDiniyyah = f.lokasi_diniyyah || primaryUstadz?.lokasi_diniyyah || '';
    
    // Blok dari hierarki KBM atau fallback blok ustadz
    const blokDiniyyah = findBlok(lokasiDiniyyah, 'diniyyah') || (primaryUstadz?.blok ? `Blok ${primaryUstadz.blok}` : (f.blok || ''));
    const blokTakror = findBlok(lokasiTakror, 'takror');

    const updatePayload = {
      id_mustahiq: waliText,
      domisili: domisili,
      lokasi_takror: lokasiTakror,
      lokasi_diniyyah: lokasiDiniyyah,
      blok: blokDiniyyah, // simpan ke kolom legacy
    };

    if (hasBlokDiniyyah) {
      updatePayload.blok_diniyyah = blokDiniyyah;
      updatePayload.blok_takror = blokTakror;
    }

    const { error: updErr } = await supabase
      .from('formasi_kelas')
      .update(updatePayload)
      .eq('id', f.id);

    if (updErr) {
      console.error(`Gagal update formasi ID ${f.id} (${fTingkat} ${fKls}${fBag}):`, updErr.message);
      skippedCount++;
    } else {
      updatedCount++;
    }
  }

  console.log(`\n✅ Backfill selesai! Berhasil memperbarui: ${updatedCount} baris, Dilewati/Gagal: ${skippedCount}`);

  // 5. Cek verifikasi setelah update
  const { data: verifySample } = await supabase
    .from('formasi_kelas')
    .select('tingkat, din_kls, din_bag, pa_pi, id_mustahiq, domisili, lokasi_diniyyah, lokasi_takror, blok')
    .limit(5);

  console.log('\n[5] Sample 5 data setelah backfill ter-materialize:');
  console.log(JSON.stringify(verifySample, null, 2));
  console.log('\n🎉 SINKRONISASI SELESAI DENGAN SUKSES!');
}

run().catch(console.error);
