import { SetoranHafalan, RiwayatSetoranRawRow } from '@/types/setoran';

export const DEFAULT_HAFALAN_WAJIB: Record<string, string[]> = {
  ULA_1: ["Juz Amma' (Al-Fajr-An-Nass)"],
  ULA_2: ["Aurod Fii Sholah Wa ba'daha", 'Tahlil / Yasin'],
  ULA_3: ['Tasrif Istilahi'],
  ULA_4: ['Nadhom Al-Imrithi'],
  WUSTHO_1: ['Al-Fiyyah 350', 'Al-Fiyyah 500'],
  WUSTHO_2: ['Al-Fiyyah 850', 'Al-Fiyyah 1000'],
  ULYA_1: ['Jauharul Maknun'],
  ULYA_2: ['Tashilut Thuruqot'],
};

export const VALID_JAH_WALIKELAS = ['MUSTAHIQ', 'MS & KOOR', 'MUSTAHIQOH'];

export function norm(val: any): string {
  return String(val || '').trim().toUpperCase();
}

export function getNowLocalDateTimeString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function formatDateTimeSetoran(dtStr: string): string {
  if (!dtStr) return '';
  const parts = String(dtStr).split('T');
  if (parts.length !== 2) return dtStr;
  const dateParts = parts[0].split('-');
  if (dateParts.length !== 3) return dtStr;
  return `${dateParts[2]}/${dateParts[1]}/${dateParts[0]} ${parts[1]}`;
}

export function toDateTimeLocalInput(formattedStr: string): string {
  if (!formattedStr) return getNowLocalDateTimeString();
  if (String(formattedStr).includes('T')) return formattedStr;
  const parts = String(formattedStr).trim().split(' ');
  const dateParts = (parts[0] || '').split('/');
  if (dateParts.length === 3) {
    const timePart = parts[1] ? parts[1].slice(0, 5) : '00:00';
    return `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}T${timePart}`;
  }
  return getNowLocalDateTimeString();
}

export function formatTanggalResmi(tglSetorRaw: string): string {
  if (!tglSetorRaw) return '';
  const parsedLocal = toDateTimeLocalInput(tglSetorRaw);
  const d = new Date(parsedLocal);
  if (!isNaN(d.getTime())) {
    const blnArr = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${d.getDate()} ${blnArr[d.getMonth()]} ${d.getFullYear()}`;
  }
  return tglSetorRaw;
}

export function cariMustahiqSantri(
  santriTingkat: string,
  santriDinBag: string,
  santriDinKls: string,
  santriPaPi: string,
  listAsatidz: any[] = [],
  listFormasi: any[] = []
): string {
  const tkt = norm(santriTingkat);
  const bag = norm(santriDinBag);
  const kls = norm(santriDinKls);
  const papi = norm(santriPaPi);

  // 1. Cari Asatidz di kelas tersebut yang berstatus Wali Kelas (Mustahiq / Mustahiqoh / MS & Koor)
  const matchWali = listAsatidz.find((a) =>
    norm(a.tingkat_asatidz || a.tingkat) === tkt &&
    norm(a.din_bag_asatidz || a.din_bag) === bag &&
    norm(a.din_kls_asatidz || a.din_kls) === kls &&
    norm(a.pa_pi) === papi &&
    VALID_JAH_WALIKELAS.includes(norm(a.jah_asatidz || a.jabatan))
  );
  if (matchWali && (matchWali.nama_asatidz || matchWali.nama)) {
    return matchWali.nama_asatidz || matchWali.nama;
  }

  // 2. Fallback: Cari Asatidz siapa saja yang ditempatkan di kelas tersebut
  const matchAnyAsatidz = listAsatidz.find((a) =>
    norm(a.tingkat_asatidz || a.tingkat) === tkt &&
    norm(a.din_bag_asatidz || a.din_bag) === bag &&
    norm(a.din_kls_asatidz || a.din_kls) === kls &&
    norm(a.pa_pi) === papi
  );
  if (matchAnyAsatidz && (matchAnyAsatidz.nama_asatidz || matchAnyAsatidz.nama)) {
    return matchAnyAsatidz.nama_asatidz || matchAnyAsatidz.nama;
  }

  // 3. Fallback: Cari dari Master Formasi Kelas
  const matchFormasi = listFormasi.find((f) =>
    norm(f.tingkat) === tkt &&
    norm(f.din_bag) === bag &&
    norm(f.din_kls) === kls &&
    norm(f.pa_pi) === papi
  );
  if (matchFormasi && matchFormasi.id_mustahiq && matchFormasi.id_mustahiq !== '-') {
    return matchFormasi.id_mustahiq;
  }

  return 'Belum Ditentukan';
}

export function getDaftarTingkatKelasDiniyyah(listFormasi: any[] = [], listSantri: any[] = []) {
  const pairs: Array<{ key: string; tk: string; kls: string; label: string }> = [];
  const seen = new Set<string>();

  function addPair(tk: string, kls: string) {
    const cleanTk = norm(tk);
    const cleanKls = norm(kls);
    if (!cleanTk || !cleanKls || cleanTk === '-' || cleanKls === '-') return;
    const key = `${cleanTk}_${cleanKls}`;
    if (!seen.has(key)) {
      seen.add(key);
      pairs.push({ key, tk: cleanTk, kls: cleanKls, label: `${cleanKls} ${cleanTk}` });
    }
  }

  // Dari Formasi
  listFormasi.forEach((f) => addPair(f.tingkat, f.din_kls));

  // Dari Santri jika masih kurang
  if (pairs.length === 0 && listSantri.length > 0) {
    listSantri.forEach((s) => addPair(s.tingkat || s[26], s.din_kls || s[24]));
  }

  // Fallback Kurikulum Madin
  if (pairs.length === 0) {
    [
      ['ULA', '1'], ['ULA', '2'], ['ULA', '3'], ['ULA', '4'],
      ['WUSTHO', '1'], ['WUSTHO', '2'],
      ['ULYA', '1'], ['ULYA', '2']
    ].forEach(([tk, kls]) => addPair(tk, kls));
  }

  const orderTingkat: Record<string, number> = { ULA: 1, WUSTHO: 2, WUSTHA: 2, ULYA: 3 };
  pairs.sort((a, b) => {
    const tA = orderTingkat[a.tk] || 99;
    const tB = orderTingkat[b.tk] || 99;
    if (tA !== tB) return tA - tB;
    return String(a.kls).localeCompare(String(b.kls), 'id', { numeric: true });
  });

  return pairs;
}

export function convertRawToSetoran(row: any[]): SetoranHafalan {
  const noInduk = String(row[1] || '').trim();
  const tglSetor = String(row[2] || '').trim();
  const namaSantri = String(row[3] || '').trim();
  const tglLahir = String(row[4] || '').trim();
  const blnLahir = String(row[5] || '').trim();
  const thnLahir = String(row[6] || '').trim();
  const tempatLahir = String(row[7] || '').trim();
  const penjaga = String(row[8] || '').trim();
  const mustahiq = String(row[9] || '').trim();
  const tingkat = String(row[10] || '').trim();
  const dinBag = String(row[11] || '').trim();
  const dinKls = String(row[12] || '').trim();
  const kecamatan = String(row[13] || '').trim();
  const kabupaten = String(row[14] || '').trim();
  const provinsi = String(row[15] || '').trim();
  const bin = String(row[16] || '').trim();
  const hafalan = String(row[17] || '').trim();
  const kategori = String(row[18] || 'Wajib').trim();

  const kelasStr = `${dinKls} ${dinBag} ${tingkat}`.trim();

  return {
    id: `${noInduk}_${tglSetor}_${hafalan}`,
    no_induk: noInduk,
    tanggal: tglSetor,
    nama: namaSantri,
    tgl_lahir: tglLahir,
    bln_lahir: blnLahir,
    thn_lahir: thnLahir,
    tempat_lahir: tempatLahir,
    penjaga,
    mustahiq,
    tingkat,
    din_bag: dinBag,
    din_kls: dinKls,
    kecamatan,
    kabupaten,
    provinsi,
    bin,
    item_hafalan: hafalan,
    kategori,
    kelas: kelasStr,
    nilai: 'Mumtaz (A)',
    capaian: hafalan,
  };
}

export function convertSetoranToRaw(s: SetoranHafalan): RiwayatSetoranRawRow {
  return [
    '',
    s.no_induk || '',
    s.tanggal || '',
    s.nama || '',
    s.tgl_lahir || '',
    s.bln_lahir || '',
    s.thn_lahir || '',
    s.tempat_lahir || '',
    s.penjaga || '',
    s.mustahiq || '',
    s.tingkat || '',
    s.din_bag || '',
    s.din_kls || '',
    s.kecamatan || '',
    s.kabupaten || '',
    s.provinsi || '',
    s.bin || '',
    s.item_hafalan || '',
    s.kategori || 'Wajib'
  ];
}
