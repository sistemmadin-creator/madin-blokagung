import { LIST_HARI, HariKbm, ParsedSlotJadwal, TeacherJadwalRow, KelasKbmItem } from '@/types/jadwal';
import { ParsedSlotHariKBM } from '@/types/hari-kbm';
import { Formasi } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap } from '@/types/fan';
import { parseFanItemString } from './fanHelper';

export const HARI_KEYS_LOWER = ['sabtu', 'ahad', 'senin', 'selasa', 'rabu', 'kamis'] as const;

export const URUTAN_TINGKAT_KBM: Record<string, number> = {
  ULA: 1,
  WUSTHO: 2,
  ULYA: 3,
  "ISTI'DAD": 4,
  IST: 4,
};

/**
 * Normalisasi nama kelas universal agar kebal terhadap perbedaan tanda kurung, spasi, dan huruf kapital
 */
export function normalisasiNamaKelas(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/[()]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Memformat penulisan kelas lama (misal: "ULA 1-B" -> "1 B ULA")
 */
export function formatTampilanKelas(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(
    /\b(ULA|WUSTHO|ULYA)\s+(\d+)[-\s]+([A-Za-z0-9]+)\b/gi,
    '$2 $3 $1'
  );
}

/**
 * Memecah sel jadwal guru ("Jam 1 | Fiqih | 1 A ULA (PA) (Gedung)") menjadi array objek slot
 */
export function parseJadwalCell_Client(cellStr: string | null | undefined): ParsedSlotJadwal[] {
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

/**
 * Merakit kembali array objek slot menjadi string sel jadwal guru
 */
export function stringifyJadwalCell_Client(slots: Array<{ jam: number; fan?: string; lokasi?: string }>): string {
  const validSlots = (slots || []).slice().sort((a, b) => a.jam - b.jam);
  return validSlots
    .map((s) => `Jam ${s.jam} | ${s.fan || '-'} | ${s.lokasi || '-'}`)
    .join('\n');
}

/**
 * Mengambil nama Fan singkat (contoh: "FIQIH", "TAJWID", "AKHLAQ") untuk ditampilkan di sel Tabel KBM
 */
export function ambilNamaFanSingkat(
  fanRaw: string | null | undefined,
  tingkat?: string,
  kls?: string,
  fanConfig?: FanConfigMap
): string {
  if (!fanRaw || fanRaw === '-') return '-';
  const str = String(fanRaw).trim();

  // 1. Jika sudah berformat "(NamaFan) Nama Kitab", ambil NamaFan di dalam kurung
  const parsed = parseFanItemString(str);
  if (parsed.fan && parsed.fan !== '-') {
    return parsed.fan;
  }

  // 2. Cari kecocokan di fanConfig pada kelas reguler ("1 ULA") bila config disediakan
  if (fanConfig) {
    const strLower = str.toLowerCase();
    const keyReg = `${String(kls || '').trim()} ${String(tingkat || '').trim().toUpperCase()}`.trim();
    const kandidatList = [...(fanConfig[keyReg] || [])];

    Object.keys(fanConfig).forEach((k) => {
      if (
        /\(Ug\)\s*$/i.test(k) &&
        k.toUpperCase().startsWith(String(kls || '').trim().toUpperCase() + ' ')
      ) {
        kandidatList.push(...(fanConfig[k] || []));
      }
    });

    for (const item of kandidatList) {
      const p = parseFanItemString(item);
      if (p.fan && p.fan !== '-') {
        if (
          p.fan.toLowerCase() === strLower ||
          p.mapel.toLowerCase() === strLower ||
          String(item).toLowerCase() === strLower
        ) {
          return p.fan;
        }
      }
    }
  }

  return str;
}

/**
 * Menghitung label Tahun Ajaran berjalan secara otomatis
 */
export function dapatkanTahunAjaranKBM(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const masehiStart = month >= 6 ? year : year - 1;
  const masehiEnd = masehiStart + 1;
  const hijriStart = masehiStart - 579;
  const hijriEnd = hijriStart + 1;
  return `TAHUN AJARAN ${masehiStart}-${masehiEnd} M / ${hijriStart}-${hijriEnd} H`;
}

/**
 * Deteksi hari aktif KBM secara otomatis berdasarkan hari ini (Jumat diarahkan ke Sabtu)
 */
export function deteksiHariIniKBM(): HariKbm {
  const dayNum = new Date().getDay();
  // 0: Ahad, 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu
  const mapDay: Record<number, HariKbm> = {
    0: 'Ahad',
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Sabtu',
    6: 'Sabtu',
  };
  return mapDay[dayNum] || 'Sabtu';
}

/**
 * Menyeragamkan label tampilan Blok Kelas ("Induk" -> "Blok Induk", "-" -> "Blok Belum Diatur")
 */
export function formatLabelBlokHariKBM(blok: string | null | undefined): string {
  const raw = String(blok || '').trim();
  if (!raw || raw === '-' || raw.toLowerCase() === 'belum diatur') {
    return 'Blok Belum Diatur';
  }
  if (/^blok\b/i.test(raw)) {
    return raw;
  }
  return `Blok ${raw}`;
}

/**
 * Pengurutan kelompok Blok Kelas: Blok Induk paling atas, blok nomor natural, Belum Diatur paling bawah
 */
export function bandingkanBlokHariKBM(a: string | null | undefined, b: string | null | undefined): number {
  const bersihkan = (val: string | null | undefined) =>
    String(val || '')
      .replace(/^blok\s*/i, '')
      .trim()
      .toUpperCase();

  const blokA = bersihkan(a);
  const blokB = bersihkan(b);

  const peringkat = (blok: string) => {
    if (blok === 'INDUK') return 0;
    if (!blok || blok === '-' || blok === 'BELUM DIATUR') return 2;
    return 1;
  };

  const pA = peringkat(blokA);
  const pB = peringkat(blokB);
  if (pA !== pB) return pA - pB;

  return blokA.localeCompare(blokB, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Mencari lokasi Diniyyah default sebuah kelas
 */
export function cariLokasiKelasHariKBM(
  namaKelas: string | null | undefined,
  masterStrukturKelasKBM?: KelasKbmItem[],
  formasiList?: Formasi[]
): string {
  if (!namaKelas || namaKelas === '-') return '';
  const normTarget = normalisasiNamaKelas(namaKelas);

  if (Array.isArray(masterStrukturKelasKBM) && masterStrukturKelasKBM.length > 0) {
    const foundKbm = masterStrukturKelasKBM.find((k) => {
      const kNorm = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
      const kNormGen = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
      return kNorm === normTarget || kNormGen === normTarget;
    });
    if (foundKbm && foundKbm.lokal && foundKbm.lokal !== '-') {
      return foundKbm.lokal;
    }
  }

  if (Array.isArray(formasiList) && formasiList.length > 0) {
    const foundFormasi = formasiList.find((f) => {
      const fNorm = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
      const fNormGen = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
      return fNorm === normTarget || fNormGen === normTarget;
    });
    if (foundFormasi && foundFormasi.lokasi_diniyyah && foundFormasi.lokasi_diniyyah !== '-') {
      return foundFormasi.lokasi_diniyyah;
    }
  }

  return '';
}

/**
 * Menentukan Blok Kelas dari sesi mengajar seorang Asatidz
 */
export function dapatkanBlokDariSesiMengajar(
  slots: Array<{ kelas?: string; lokasi?: string }>,
  asatidzObj: Asatidz | null | undefined,
  formasiList: Formasi[],
  asatidzList: Asatidz[]
): string {
  const firstSlot = Array.isArray(slots) && slots.length > 0 ? slots[0] : null;

  if (firstSlot) {
    const normKelas = normalisasiNamaKelas(firstSlot.kelas);
    const normLokasi = normalisasiNamaKelas(firstSlot.lokasi);

    // 1. Cek pada master Formasi Kelas berdasarkan kelas atau lokasi
    if (Array.isArray(formasiList) && formasiList.length > 0) {
      const matchFormasi = formasiList.find((f) => {
        const fNorm = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
        const fNormGen = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
        const lokNorm = normalisasiNamaKelas(f.lokasi_diniyyah);
        return (
          (normKelas && (fNorm === normKelas || fNormGen === normKelas)) ||
          (normLokasi && normLokasi !== '-' && lokNorm === normLokasi)
        );
      });

      if (matchFormasi) {
        const blokF = String(matchFormasi.blok || '').trim();
        if (blokF && blokF !== '-') return blokF;
      }
    }

    // 2. Cek blok dari Mustahiq kelas yang diajar
    if (normKelas && Array.isArray(asatidzList)) {
      const guruMustahiq = asatidzList.find((a) => {
        const jah = String(a.jah_asatidz || '').toLowerCase();
        const isM =
          jah.includes('mustahiq') ||
          jah.includes('ms & koor') ||
          jah.includes("isti'dad") ||
          jah === 'ist';
        if (!isM) return false;
        const kNorm1 = normalisasiNamaKelas(
          `${a.din_kls_asatidz || ''} ${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''}`
        );
        const kNorm2 = normalisasiNamaKelas(
          `${a.din_kls_asatidz || ''} ${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''} (${a.pa_pi || ''})`
        );
        return kNorm1 === normKelas || kNorm2 === normKelas;
      });

      if (guruMustahiq && guruMustahiq.blok && String(guruMustahiq.blok).trim() !== '-') {
        return String(guruMustahiq.blok).trim();
      }
    }
  }

  // 3. Fallback ke blok pribadi asatidz
  const blokPribadi = String(asatidzObj?.blok || '').trim();
  if (blokPribadi && blokPribadi !== '-') return blokPribadi;

  return 'Belum Diatur';
}

/**
 * Mencari nama Mustahiq / Wali Kelas berdasarkan nama kelas
 */
export function cariMustahiqKelasHariKBM(
  namaKelas: string | null | undefined,
  masterStrukturKelasKBM?: KelasKbmItem[],
  asatidzList?: Asatidz[],
  formasiList?: Formasi[]
): string {
  if (!namaKelas || namaKelas === '-') return '-';
  const normTarget = normalisasiNamaKelas(namaKelas);

  // 1. Cek dari masterStrukturKelasKBM
  if (Array.isArray(masterStrukturKelasKBM) && masterStrukturKelasKBM.length > 0) {
    const f = masterStrukturKelasKBM.find((k) => {
      const kNorm = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
      const kNormGen = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
      return kNorm === normTarget || kNormGen === normTarget;
    });
    if (f && f.mustahiqNama && f.mustahiqNama !== '-') {
      return f.mustahiqNama;
    }
  }

  // 2. Cek dari asatidzList
  if (Array.isArray(asatidzList) && asatidzList.length > 0) {
    const guruMustahiq = asatidzList.find((a) => {
      const jah = String(a.jah_asatidz || '').toLowerCase();
      const isM =
        jah.includes('mustahiq') ||
        jah.includes('ms & koor') ||
        jah.includes("isti'dad") ||
        jah === 'ist';
      if (!isM) return false;

      const kls = String(a.din_kls_asatidz || '').trim();
      const bag = String(a.din_bag_asatidz || '').trim().toUpperCase();
      const tkt = String(a.tingkat_asatidz || '').trim().toUpperCase();
      const papi = String(a.pa_pi || '').trim().toUpperCase();

      const kNorm1 = normalisasiNamaKelas(`${kls} ${bag} ${tkt}`);
      const kNorm2 = normalisasiNamaKelas(`${kls} ${bag} ${tkt} (${papi})`);
      return kNorm1 === normTarget || kNorm2 === normTarget;
    });
    if (guruMustahiq && guruMustahiq.nama_asatidz) {
      return guruMustahiq.nama_asatidz;
    }
  }

  // 3. Cek dari formasiList
  if (Array.isArray(formasiList) && formasiList.length > 0) {
    const formasiItem = formasiList.find((f) => {
      const fNorm1 = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
      const fNorm2 = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
      return fNorm1 === normTarget || fNorm2 === normTarget;
    });
    if (formasiItem && formasiItem.id_mustahiq) {
      return formasiItem.id_mustahiq;
    }
  }

  return '-';
}

/**
 * Memecah teks jadwal harian asatidz menjadi array slot jam 1 dan jam 2
 */
export function parseSlotHariKBM(
  cellStr: string | null | undefined,
  defaultLokasiGuru = '',
  defaultTingkat = '',
  defaultKls = '',
  masterStrukturKelasKBM?: KelasKbmItem[],
  formasiList?: Formasi[],
  fanConfig?: FanConfigMap
): ParsedSlotHariKBM[] {
  if (!cellStr || !String(cellStr).trim()) return [];
  const lines = String(cellStr)
    .split(/\r?\n|;;/)
    .map((s) => s.trim())
    .filter(Boolean);

  const slots: ParsedSlotHariKBM[] = [];

  lines.forEach((line) => {
    const p = line.split(' | ');
    let jamNum = 0;
    const m = (p[0] || '').match(/\d+/);
    if (m) jamNum = parseInt(m[0], 10);

    // HANYA AMBIL JAM 1 DAN JAM 2
    if (jamNum !== 1 && jamNum !== 2) return;

    const rawFan = p[1] && p[1] !== '-' ? p[1].trim() : '-';
    const rawLok = p[2] && p[2] !== '-' ? p[2].trim() : '';

    let namaKelas = '-';
    let lokasiRuang = '-';

    if (rawLok) {
      const match = rawLok.match(/^(.*?)\s*\(([^()]+)\)$/);
      if (match) {
        const isiKurungAkhir = match[2].trim();
        const upperKurung = isiKurungAkhir.toUpperCase();
        if (upperKurung === 'PA' || upperKurung === 'PI' || upperKurung === 'UG') {
          namaKelas = formatTampilanKelas(rawLok);
          lokasiRuang = cariLokasiKelasHariKBM(namaKelas, masterStrukturKelasKBM, formasiList) || defaultLokasiGuru || '-';
        } else {
          namaKelas = formatTampilanKelas(match[1].trim());
          lokasiRuang =
            isiKurungAkhir && isiKurungAkhir !== '-'
              ? isiKurungAkhir
              : cariLokasiKelasHariKBM(namaKelas, masterStrukturKelasKBM, formasiList) || defaultLokasiGuru || '-';
        }
      } else {
        namaKelas = formatTampilanKelas(rawLok);
        lokasiRuang = cariLokasiKelasHariKBM(namaKelas, masterStrukturKelasKBM, formasiList) || defaultLokasiGuru || '-';
      }
    } else {
      lokasiRuang = defaultLokasiGuru || '-';
    }

    let tktSlot = defaultTingkat;
    let klsSlot = defaultKls;
    const matchKlsInfo = String(namaKelas).match(/^(\d+)\s+\S+\s+(ULA|WUSTHO|ULYA|ISTI'DAD|IST)/i);
    if (matchKlsInfo) {
      klsSlot = matchKlsInfo[1];
      tktSlot = matchKlsInfo[2].toUpperCase();
    }

    const fanSingkat = ambilNamaFanSingkat(rawFan, tktSlot, klsSlot, fanConfig);

    slots.push({
      jam: jamNum as 1 | 2,
      fan: fanSingkat || '-',
      fanAsli: rawFan,
      kelas: namaKelas,
      lokasi: lokasiRuang,
    });
  });

  return slots.sort((a, b) => a.jam - b.jam);
}

/**
 * Menghapus 1 slot jadwal milik kelas tertentu pada hari & jam tertentu dari objek jadwal guru
 */
export function removeSlotFromGuruObj(
  jdwObj: TeacherJadwalRow,
  hari: string,
  jam: number,
  kelasMurniNorm: string
): void {
  const dayIdx = LIST_HARI.findIndex((h) => h.toLowerCase() === String(hari || '').toLowerCase());
  if (dayIdx === -1) return;
  const hKey = HARI_KEYS_LOWER[dayIdx];
  const targetJam = parseInt(String(jam), 10);

  let slots = parseJadwalCell_Client(jdwObj[hKey]);
  slots = slots.filter((s) => {
    if (s.jam !== targetJam) return true;
    const sLokNorm = normalisasiNamaKelas(s.lokasi);
    return sLokNorm !== kelasMurniNorm && !sLokNorm.startsWith(kelasMurniNorm);
  });
  jdwObj[hKey] = stringifyJadwalCell_Client(slots);
}

/**
 * Menambahkan 1 slot jadwal pada hari & jam tertentu ke objek jadwal guru
 */
export function addSlotToGuruObj(
  jdwObj: TeacherJadwalRow,
  hari: string,
  jam: number,
  fan: string,
  lokasiGabungan: string
): void {
  const dayIdx = LIST_HARI.findIndex((h) => h.toLowerCase() === String(hari || '').toLowerCase());
  if (dayIdx === -1) return;
  const hKey = HARI_KEYS_LOWER[dayIdx];
  const targetJam = parseInt(String(jam), 10);

  const slots = parseJadwalCell_Client(jdwObj[hKey]).filter((s) => s.jam !== targetJam);
  slots.push({
    raw: '',
    jam: targetJam,
    fan: fan || '-',
    lokasi: lokasiGabungan || '-',
  });
  slots.sort((a, b) => a.jam - b.jam);
  jdwObj[hKey] = stringifyJadwalCell_Client(slots);
}

/**
 * Menghitung ulang daftar kelas `mengajar` dan `totalJam` pada objek jadwal guru
 */
export function syncGuruMengajarAndTotalObj(jdwObj: TeacherJadwalRow, asatidzList?: Asatidz[]): void {
  let total = 0;
  const classesSet = new Set<string>();

  HARI_KEYS_LOWER.forEach((hKey) => {
    const slots = parseJadwalCell_Client(jdwObj[hKey]);
    total += slots.length;
    slots.forEach((s) => {
      if (s.lokasi && s.lokasi !== '-') {
        const m = s.lokasi.match(/^(.*?)\s*\(([^()]*)\)$/);
        classesSet.add(m ? m[1].trim() : s.lokasi.trim());
      }
    });
  });

  jdwObj.totalJam = String(total);

  let existing = formatTampilanKelas(jdwObj.mengajar || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  classesSet.forEach((cls) => {
    if (!existing.some((ex) => normalisasiNamaKelas(ex) === normalisasiNamaKelas(cls))) {
      existing.push(cls);
    }
  });

  const namaUpper = String(jdwObj.nama_asatidz || '').trim().toUpperCase();
  const rowAsatidz = (asatidzList || []).find(
    (a) => String(a.nama_asatidz || '').trim().toUpperCase() === namaUpper
  );
  const isMustahiq = rowAsatidz
    ? String(rowAsatidz.jah_asatidz || '').toLowerCase().includes('mustahiq')
    : false;
  const ownClass =
    isMustahiq && rowAsatidz
      ? `${rowAsatidz.din_kls_asatidz || ''} ${rowAsatidz.din_bag_asatidz || ''} ${rowAsatidz.tingkat_asatidz || ''}`.trim()
      : '';

  existing = existing.filter((cls) => {
    if (isMustahiq && ownClass && normalisasiNamaKelas(cls) === normalisasiNamaKelas(ownClass)) {
      return true;
    }
    return (
      classesSet.has(cls) ||
      Array.from(classesSet).some((cs) => normalisasiNamaKelas(cs) === normalisasiNamaKelas(cls))
    );
  });

  jdwObj.mengajar = existing.join(', ');
}
