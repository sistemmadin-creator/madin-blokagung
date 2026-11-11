import { LIST_HARI, HariKbm, ParsedSlotJadwal, TeacherJadwalRow, KelasKbmItem, SesiSlot } from '@/types/jadwal';
import { ParsedSlotHariKBM } from '@/types/hari-kbm';
import { Formasi, HierarkiBlokKBMConfig } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap, FanPelajaranDetail } from '@/types/fan';
import { parseFanItemString, isKelasUnggulan, cekKategoriJahAsatidz } from './fanHelper';
import { findBlokFromLokasi } from '@/lib/services/hierarchy-service';

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
 * Mendapatkan class stabilo khusus untuk Kode Guru (KG):
 * - Kode awalan 'A' -> 'cell-kg-a' (Biru)
 * - Kode awalan 'D' -> 'cell-kg-d' (Ungu)
 */
export function getKgHighlightClass(kg?: string | null): string {
  if (!kg) return '';
  const clean = String(kg).trim().toUpperCase();
  if (clean === '' || clean === '-') return '';
  if (clean.startsWith('A')) return 'cell-kg-a';
  if (clean.startsWith('D')) return 'cell-kg-d';
  return '';
}

/**
 * Info kelas hasil normalisasi untuk pencocokan yang peka gender (PA / PI).
 * - norm   : nama kelas ternormalisasi, tanpa nama gedung di kurung terakhir ("1 A ULA PI")
 * - gender : 'PA' | 'PI' | '' bila tag gender tidak ditulis
 * - base   : nama kelas ternormalisasi tanpa token gender ("1 A ULA")
 */
export interface InfoKelasNorm {
  norm: string;
  gender: '' | 'PA' | 'PI';
  base: string;
}

/**
 * Membuang nama gedung / ruang pada kurung paling akhir, tetapi mempertahankan tag (PA), (PI), (Ug).
 * Contoh: "1 A ULA (PI) (Asrama Al-Barokah)" -> "1 A ULA (PI)"
 */
export function ekstrakKelasMurniDariLokasi(raw: string | null | undefined): string {
  let s = String(raw || '').trim();
  for (let i = 0; i < 5; i++) {
    const m = s.match(/^(.*?)\s*\(([^()]*)\)$/);
    if (!m) break;
    const isi = m[2].trim().toUpperCase();
    if (isi === 'PA' || isi === 'PI' || isi === 'UG') break;
    s = m[1].trim();
  }
  return s;
}

/**
 * Menyusun nama kelas lengkap dari objek kelas: "1 A ULA (PI)" (tanpa tag bila gender kosong)
 */
export function namaKelasLengkapDariObj(k: {
  kls: string;
  bag: string;
  tingkat: string;
  papi?: string;
}): string {
  const papi = String(k.papi || '').trim().toUpperCase();
  const gTag = papi === 'PA' || papi === 'PI' ? ` (${papi})` : '';
  return `${k.kls} ${k.bag} ${k.tingkat}${gTag}`.trim();
}

/**
 * Mengurai teks kelas / lokasi slot menjadi InfoKelasNorm.
 * Token gender dibaca pada posisi setelah "KLS BAG TINGKAT" (indeks 3 atau 4).
 */
export function parseInfoKelasNorm(raw: string | null | undefined): InfoKelasNorm {
  const murni = ekstrakKelasMurniDariLokasi(formatTampilanKelas(String(raw || '')));
  const norm = normalisasiNamaKelas(murni);
  if (!norm) return { norm: '', gender: '', base: '' };
  const tokens = norm.split(' ');
  let gender: '' | 'PA' | 'PI' = '';
  let genderIdx = -1;
  for (let i = 3; i <= 4 && i < tokens.length; i++) {
    if (tokens[i] === 'PA' || tokens[i] === 'PI') {
      gender = tokens[i] as 'PA' | 'PI';
      genderIdx = i;
      break;
    }
  }
  const base = genderIdx >= 0 ? tokens.filter((_, i) => i !== genderIdx).join(' ') : norm;
  return { norm, gender, base };
}

/**
 * Inti pencocokan slot -> kelas yang peka gender.
 * Aturan:
 * 1. Slot PA tidak pernah cocok dengan kelas PI, dan sebaliknya.
 * 2. Kecocokan eksak, atau slot diawali nama kelas target + spasi (sisa teks = keterangan ruang)
 *    hanya berlaku bila gender slot dan target sama.
 * 3. Slot lama tanpa tag gender hanya cocok ke kelas bergender bila gender guru sama
 *    (atau gender guru tidak diketahui).
 */
export function isInfoKelasCocok(
  slot: InfoKelasNorm,
  target: InfoKelasNorm,
  guruGender?: string
): boolean {
  if (!slot.norm || !target.norm) return false;
  if (slot.gender && target.gender && slot.gender !== target.gender) return false;
  if (slot.norm === target.norm) return true;

  if (slot.gender === target.gender && slot.norm.startsWith(target.norm + ' ')) {
    return true;
  }

  if (!slot.gender && target.gender) {
    if (slot.norm === target.base || slot.norm.startsWith(target.base + ' ')) {
      const g = String(guruGender || '').trim().toUpperCase();
      return !g || g === target.gender;
    }
  }
  return false;
}

/**
 * Mengecek apakah teks lokasi sebuah slot jadwal adalah milik kelas target (peka gender PA / PI).
 * Contoh: isSlotMilikKelas("1 A ULA (PI) (Asrama X)", "1 A ULA (PA)") === false
 */
export function isSlotMilikKelas(
  sLokasi: string | null | undefined,
  targetKelas: string,
  guruGender?: string
): boolean {
  return isInfoKelasCocok(parseInfoKelasNorm(sLokasi), parseInfoKelasNorm(targetKelas), guruGender);
}

/**
 * Peta NAMA GURU (uppercase) -> gender ('PA' | 'PI') dari master Asatidz
 */
export function buatPetaGenderGuru(asatidzList?: Asatidz[]): Record<string, string> {
  const map: Record<string, string> = {};
  (asatidzList || []).forEach((a) => {
    const n = String(a.nama_asatidz || '').trim().toUpperCase();
    const g = String(a.pa_pi || '').trim().toUpperCase();
    if (n && (g === 'PA' || g === 'PI')) map[n] = g;
  });
  return map;
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
 * Menghitung label Tahun Ajaran berjalan secara otomatis (tersinkron dengan useTahunAjaranStore)
 */
export function dapatkanTahunAjaranKBM(): string {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('MADIN_GLOBAL_TAHUN_AJARAN_CACHE_V1');
      if (raw) {
        const parsed = JSON.parse(raw) as { activeTahunAjaran?: string };
        if (
          parsed?.activeTahunAjaran &&
          parsed.activeTahunAjaran !== '2025/2026' &&
          parsed.activeTahunAjaran !== '2024/2025'
        ) {
          const [startStr, endStr] = parsed.activeTahunAjaran.split('/');
          const sYr = parseInt(startStr, 10) || 2026;
          const eYr = parseInt(endStr, 10) || sYr + 1;
          const hStart = sYr - 579;
          const hEnd = hStart + 1;
          return `TAHUN AJARAN ${sYr}-${eYr} M / ${hStart}-${hEnd} H`;
        }
      }
    } catch {
      // Gunakan fallback 2026-2027
    }
  }
  return 'TAHUN AJARAN 2026-2027 M / 1447-1448 H';
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
 * Pengurutan resmi kelompok Blok Kelas:
 * 1. Blok Induk Putra
 * 2. Blok Induk Ponut
 * 3. Blok Induk Ponsel
 * 4. Blok Induk (fallback umum)
 * 5. Blok GP (Gedung Putri)
 * 6. Blok Angka Berurutan (Blok 1, Blok 2, Blok 3, Blok 4 ... Blok 12)
 * 7. Blok Embel
 * 8. Blok bernama lainnya (alfabetis)
 * 9. Belum Diatur / '-' / kosong (paling bawah)
 */
export function bandingkanBlokHariKBM(a: string | null | undefined, b: string | null | undefined): number {
  const bersihkan = (val: string | null | undefined) =>
    String(val || '')
      .replace(/^blok\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();

  const blokA = bersihkan(a);
  const blokB = bersihkan(b);

  const peringkat = (blok: string): number => {
    if (!blok || blok === '-' || blok === 'BELUM DIATUR') return 99;
    if (blok === 'INDUK PUTRA' || blok === 'INDUK PA' || blok === 'INDUK (PA)') return 1;
    if (blok === 'INDUK PONUT' || blok === 'INDUK PI' || blok === 'INDUK (PI)' || blok === 'INDUK UTARA') return 2;
    if (blok === 'INDUK PONSEL' || blok === 'INDUK SELATAN') return 3;
    if (blok === 'INDUK') return 4;
    if (blok === 'GP' || blok === 'GEDUNG PUTRI') return 5;

    // Blok Angka murni atau berawalan angka (misal "1", "2", "3" ... "12")
    const numMatch = blok.match(/^(\d+)/);
    if (numMatch) {
      return 10 + parseInt(numMatch[1], 10);
    }

    if (blok === 'EMBEL' || blok === 'BLOK EMBEL') return 90;

    return 80;
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

  // 1. Prioritas Utama: Master Formasi Kelas (formasiList)
  if (Array.isArray(formasiList) && formasiList.length > 0) {
    const foundFormasi = formasiList.find((f) => {
      const fNorm = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
      const fNormGen = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
      return fNorm === normTarget || fNormGen === normTarget;
    });
    if (foundFormasi) {
      return (foundFormasi.lokasi_diniyyah && foundFormasi.lokasi_diniyyah !== '-')
        ? foundFormasi.lokasi_diniyyah
        : '-';
    }
  }

  // 2. Fallback: Master Struktur Kelas KBM
  if (Array.isArray(masterStrukturKelasKBM) && masterStrukturKelasKBM.length > 0) {
    const foundKbm = masterStrukturKelasKBM.find((k) => {
      const kNorm = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
      const kNormGen = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
      return kNorm === normTarget || kNormGen === normTarget;
    });
    if (foundKbm) {
      return (foundKbm.lokal && foundKbm.lokal !== '-') ? foundKbm.lokal : '-';
    }
  }

  return '';
}

/**
 * Menentukan Blok Kelas Diniyyah dari sesi mengajar seorang Asatidz
 * Murni berdasarkan data Formasi Kelas (blok_diniyyah) dan Hierarki Lokasi Diniyyah,
 * tanpa fallback ke kamar asrama pribadi guru/mustahiq.
 */
export function dapatkanBlokDariSesiMengajar(
  slots: Array<{ kelas?: string; lokasi?: string }>,
  asatidzObj?: Asatidz | null | undefined,
  formasiList?: Formasi[],
  asatidzList?: Asatidz[],
  hierarkiConfig?: HierarkiBlokKBMConfig
): string {
  const firstSlot = Array.isArray(slots) && slots.length > 0 ? slots[0] : null;

  if (firstSlot) {
    const normKelas = normalisasiNamaKelas(firstSlot.kelas);
    const normLokasi = normalisasiNamaKelas(firstSlot.lokasi);

    // Deteksi gender target sesi mengajar
    let targetGender = '';
    const mGen = String(firstSlot.kelas || '').match(/\(\s*(PA|PI)\s*\)/i);
    if (mGen) {
      targetGender = mGen[1].toUpperCase();
    } else if (asatidzObj?.pa_pi) {
      targetGender = String(asatidzObj.pa_pi).toUpperCase();
    }

    // 1. Cek pada master Formasi Kelas (Single Source of Truth)
    if (Array.isArray(formasiList) && formasiList.length > 0) {
      let matchFormasi: Formasi | undefined;

      // Pencarian prioritas 1: Cocok nama kelas dan spesifik gender PA/PI
      if (targetGender && normKelas) {
        matchFormasi = formasiList.find((f) => {
          const fGenderMatch = String(f.pa_pi || '').trim().toUpperCase() === targetGender;
          if (!fGenderMatch) return false;
          const fNormGen = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
          const fNorm = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
          return (
            fNormGen === normKelas ||
            fNorm === normKelas ||
            (normKelas && fNormGen && (normKelas.startsWith(fNormGen) || normKelas.startsWith(fNorm)))
          );
        });
      }

      // Pencarian prioritas 2: Cocok nama kelas umum atau lokasi Diniyyah formasi
      if (!matchFormasi) {
        matchFormasi = formasiList.find((f) => {
          const fNorm = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat}`);
          const fNormGen = normalisasiNamaKelas(`${f.din_kls} ${f.din_bag} ${f.tingkat} (${f.pa_pi})`);
          const lokNorm = normalisasiNamaKelas(f.lokasi_diniyyah);
          return (
            (normKelas && (fNorm === normKelas || fNormGen === normKelas || normKelas.startsWith(fNormGen) || normKelas.startsWith(fNorm))) ||
            (normLokasi && normLokasi !== '-' && lokNorm === normLokasi)
          );
        });
      }

      // Pencarian prioritas 3: Fallback ke Mustahiq formasi jika asatidzObj adalah Mustahiq
      if (!matchFormasi && asatidzObj?.nama_asatidz) {
        const namaGuruClean = asatidzObj.nama_asatidz.trim().toUpperCase();
        matchFormasi = formasiList.find((f) => {
          return f.id_mustahiq && f.id_mustahiq.trim().toUpperCase() === namaGuruClean;
        });
      }

      if (matchFormasi) {
        // Prioritas utama: blok_diniyyah resmi di Formasi Kelas
        const blokD = String(matchFormasi.blok_diniyyah || '').trim();
        if (blokD && blokD !== '-') return blokD;

        // Jika blok belum terisi di formasi, petakan lewat hierarki lokasi ruang Diniyyah
        const targetLokasi = matchFormasi.lokasi_diniyyah || firstSlot.lokasi;
        if (targetLokasi) {
          const blokH = findBlokFromLokasi('diniyyah', targetLokasi, hierarkiConfig);
          if (blokH) return blokH;
        }
      }
    }

    // 2. Jika tidak ada kecocokan formasi langsung, petakan lokasi sesi mengajar via hierarki Diniyyah
    if (firstSlot.lokasi) {
      const blokH = findBlokFromLokasi('diniyyah', firstSlot.lokasi, hierarkiConfig);
      if (blokH) return blokH;
    }

    // 3. Fallback: petakan teks kelas bila mengandung nama ruang / gedung
    if (firstSlot.kelas) {
      const blokH = findBlokFromLokasi('diniyyah', firstSlot.kelas, hierarkiConfig);
      if (blokH) return blokH;
    }

    // 4. Fallback: petakan lokasi_diniyyah dari profil asatidzObj
    if (asatidzObj?.lokasi_diniyyah) {
      const blokH = findBlokFromLokasi('diniyyah', asatidzObj.lokasi_diniyyah, hierarkiConfig);
      if (blokH) return blokH;
    }
  }

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
        } else {
          namaKelas = formatTampilanKelas(match[1].trim());
        }

        // 1. Prioritas Utama: Lokasi resmi dari Formasi Kelas
        const masterLokasi = cariLokasiKelasHariKBM(namaKelas, masterStrukturKelasKBM, formasiList);
        if (masterLokasi && masterLokasi !== '-') {
          lokasiRuang = masterLokasi;
        } else if (masterLokasi === '-') {
          // Kelas terdaftar di formasi kelas namun lokasinya belum diisi/masih kosong
          lokasiRuang = '-';
        } else if (upperKurung !== 'PA' && upperKurung !== 'PI' && upperKurung !== 'UG' && isiKurungAkhir && isiKurungAkhir !== '-') {
          // 2. Fallback ke teks kurung lama hanya jika kelas tidak terdaftar di formasi
          lokasiRuang = isiKurungAkhir;
        } else {
          lokasiRuang = '-';
        }
      } else {
        namaKelas = formatTampilanKelas(rawLok);
        const masterLokasi = cariLokasiKelasHariKBM(namaKelas, masterStrukturKelasKBM, formasiList);
        lokasiRuang = masterLokasi || '-';
      }
    } else {
      lokasiRuang = '-';
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
 * Menghapus 1 slot jadwal milik kelas tertentu pada hari & jam tertentu dari objek jadwal guru.
 * Pencocokan peka gender: menghapus slot kelas "1 A ULA (PI)" tidak ikut menghapus slot "1 A ULA (PA)".
 * @param kelasTarget nama kelas lengkap (boleh mentah atau ternormalisasi), contoh "1 A ULA (PI)"
 * @param guruGender gender guru pemilik jadwal, dipakai untuk slot lama tanpa tag gender
 */
export function removeSlotFromGuruObj(
  jdwObj: TeacherJadwalRow,
  hari: string,
  jam: number,
  kelasTarget: string,
  guruGender?: string
): void {
  const dayIdx = LIST_HARI.findIndex((h) => h.toLowerCase() === String(hari || '').toLowerCase());
  if (dayIdx === -1) return;
  const hKey = HARI_KEYS_LOWER[dayIdx];
  const targetJam = parseInt(String(jam), 10);
  const targetInfo = parseInfoKelasNorm(kelasTarget);
  if (!targetInfo.norm) return;

  let slots = parseJadwalCell_Client(jdwObj[hKey]);
  slots = slots.filter((s) => {
    if (s.jam !== targetJam) return true;
    return !isInfoKelasCocok(parseInfoKelasNorm(s.lokasi), targetInfo, guruGender);
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
  const targetInfo = parseInfoKelasNorm(lokasiGabungan);

  const slots = parseJadwalCell_Client(jdwObj[hKey]).filter((s) => {
    if (s.jam !== targetJam) return true;
    if (targetInfo.norm) {
      return !isInfoKelasCocok(parseInfoKelasNorm(s.lokasi), targetInfo);
    }
    return false;
  });
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
 * Klaim ruang kelas baru: guru yang baru saja ditempatkan pada (hari, jam, kelas).
 */
export interface KlaimSlotKelasBaru {
  guru: string;
  hari: string;
  jam: 1 | 2;
  info: InfoKelasNorm;
}

export interface HasilAutoReplaceKelas {
  /** Baris jadwal guru lama yang tergeser (sudah dibersihkan dari slot kelas yang diambil alih) */
  rowsTergeser: Record<string, TeacherJadwalRow>;
  /** Nama guru yang tergeser */
  guruTergeser: string[];
  /** Seluruh klaim baru (dipakai juga untuk membersihkan tabel relasional) */
  klaimBaru: KlaimSlotKelasBaru[];
}

/**
 * Auto-replace ruang kelas (Jam 1 & Jam 2): satu kelas pada satu hari & jam hanya boleh diajar satu guru.
 * Slot yang BARU ditempatkan oleh guru-guru pada `rowsBaru` (dibanding `jadwalMapSebelum`) dianggap
 * sebagai penempatan yang disengaja, sehingga guru lain (yang tidak ikut diubah) pada kelas, hari, dan
 * jam yang sama otomatis digeser keluar. Slot lama yang tidak disentuh tidak pernah dijadikan klaim.
 * Satu guru yang mengajar di beberapa kelas sekaligus tidak disentuh sama sekali.
 */
export function terapkanAutoReplaceKelasJam12(
  jadwalMapSebelum: Record<string, TeacherJadwalRow>,
  rowsBaru: Record<string, TeacherJadwalRow>,
  genderGuruMap: Record<string, string> = {},
  asatidzList?: Asatidz[]
): HasilAutoReplaceKelas {
  const changedSet = new Set(Object.keys(rowsBaru).map((k) => String(k).trim().toUpperCase()));
  const klaimBaru: KlaimSlotKelasBaru[] = [];

  const kunciSlot = (s: { jam: number; fan: string; lokasi: string }) =>
    `${s.jam}|${s.fan.trim().toLowerCase()}|${s.lokasi.trim().toLowerCase()}`;

  Object.keys(rowsBaru).forEach((key) => {
    const rowBaru = rowsBaru[key];
    const upper = String(key).trim().toUpperCase();
    const rowLama = jadwalMapSebelum[upper] || jadwalMapSebelum[key];
    const namaGuru = String(rowBaru.nama_asatidz || key).trim();

    LIST_HARI.forEach((hari, idx) => {
      const hKey = HARI_KEYS_LOWER[idx];
      const slotLama = new Set(parseJadwalCell_Client(rowLama?.[hKey]).map(kunciSlot));
      parseJadwalCell_Client(rowBaru[hKey]).forEach((s) => {
        if (s.jam !== 1 && s.jam !== 2) return;
        if (slotLama.has(kunciSlot(s))) return;
        const info = parseInfoKelasNorm(s.lokasi);
        if (!info.norm) return;
        klaimBaru.push({ guru: namaGuru, hari, jam: s.jam as 1 | 2, info });
      });
    });
  });

  const rowsTergeser: Record<string, TeacherJadwalRow> = {};
  if (klaimBaru.length === 0) return { rowsTergeser, guruTergeser: [], klaimBaru };

  const klaimPerSlot = new Map<string, KlaimSlotKelasBaru[]>();
  klaimBaru.forEach((c) => {
    const k = `${c.hari.toLowerCase()}|${c.jam}`;
    if (!klaimPerSlot.has(k)) klaimPerSlot.set(k, []);
    klaimPerSlot.get(k)!.push(c);
  });

  Object.keys(jadwalMapSebelum).forEach((key) => {
    const upper = String(key).trim().toUpperCase();
    if (changedSet.has(upper)) return;
    const row = jadwalMapSebelum[key];
    if (!row) return;
    const gGuru = genderGuruMap[String(row.nama_asatidz || key).trim().toUpperCase()] || '';

    let tergeser = false;
    const salinan: TeacherJadwalRow = { ...row };

    LIST_HARI.forEach((hari, idx) => {
      const hKey = HARI_KEYS_LOWER[idx];
      const slots = parseJadwalCell_Client(row[hKey]);
      if (slots.length === 0) return;
      const sisa = slots.filter((s) => {
        if (s.jam !== 1 && s.jam !== 2) return true;
        const klaim = klaimPerSlot.get(`${hari.toLowerCase()}|${s.jam}`);
        if (!klaim) return true;
        const infoSlot = parseInfoKelasNorm(s.lokasi);
        const diambil = klaim.some((c) => isInfoKelasCocok(infoSlot, c.info, gGuru));
        if (diambil) tergeser = true;
        return !diambil;
      });
      if (sisa.length !== slots.length) salinan[hKey] = stringifyJadwalCell_Client(sisa);
    });

    if (tergeser) {
      syncGuruMengajarAndTotalObj(salinan, asatidzList);
      rowsTergeser[upper] = salinan;
    }
  });

  return { rowsTergeser, guruTergeser: Object.keys(rowsTergeser), klaimBaru };
}

/**
 * Menghitung ulang daftar kelas `mengajar` dan `totalJam` pada objek jadwal guru
 */
export function syncGuruMengajarAndTotalObj(jdwObj: TeacherJadwalRow, asatidzList?: Asatidz[]): void {
  let total = 0;
  const classesSet = new Set<string>();

  HARI_KEYS_LOWER.forEach((hKey) => {
    const slots = parseJadwalCell_Client(jdwObj[hKey]);
    const jamSet = new Set(slots.map((s) => s.jam));
    total += jamSet.size;
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

/**
 * Memeriksa string sel jadwal harian Asatidz dan mengembalikan tanda 'X'
 * apabila terdapat jadwal mengajar pada Jam 1 (I) dan/atau Jam 2 (II)
 */
export function getStatusJam1Dan2Hari(cellStr: string | null | undefined): { j1: string; j2: string } {
  const res = { j1: '', j2: '' };
  if (!cellStr || !String(cellStr).trim()) return res;

  const lines = String(cellStr)
    .split(/\r?\n|;;/)
    .map((s) => s.trim())
    .filter(Boolean);

  lines.forEach((l) => {
    const p = l.split(' | ');
    const jamStr = p[0] || '';
    const m = jamStr.match(/\d+/);
    if (m) {
      const j = parseInt(m[0], 10);
      if (j === 1) res.j1 = 'X';
      if (j === 2) res.j2 = 'X';
    }
  });

  return res;
}

export interface DistribusiJamTingkat {
  ula: { [kls: number]: number };
  wst: { [kls: number]: number };
  ulya: { [kls: number]: number };
  totalJml: number;
}

/**
 * Menghitung distribusi total jam mengajar Jam 1 & Jam 2 seorang Asatidz
 * pada masing-masing jenjang dan kelas: ULA (I-IV), WST (I-II), ULYA (I-II), serta JML
 */
export function hitungDistribusiJam12Tingkat(
  asatidzObj: { tingkat_asatidz?: string; din_kls_asatidz?: string | number } | null | undefined,
  jadwal: TeacherJadwalRow | Record<string, string> | null | undefined
): DistribusiJamTingkat {
  const counts: DistribusiJamTingkat = {
    ula: { 1: 0, 2: 0, 3: 0, 4: 0 },
    wst: { 1: 0, 2: 0 },
    ulya: { 1: 0, 2: 0 },
    totalJml: 0,
  };

  if (!jadwal) return counts;

  LIST_HARI.forEach((hari) => {
    const val = (jadwal as Record<string, any>)[hari.toLowerCase()] || '';
    if (!String(val).trim()) return;

    const lines = String(val)
      .split(/\r?\n|;;/)
      .map((s) => s.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      const p = line.split(' | ');
      const jamStr = p[0] || '';
      const matchJam = jamStr.match(/\d+/);
      const jamNum = matchJam ? parseInt(matchJam[0], 10) : 0;

      if (jamNum === 1 || jamNum === 2) {
        counts.totalJml++;
        const lok = formatTampilanKelas(p[2] || '');
        const match = lok.match(/(\d+)\s+[A-Za-z0-9']+\s+(ULA|WUSTHO|WUSTHA|ULYA|ISTI'DAD|IST)/i);

        if (match) {
          const kls = parseInt(match[1], 10);
          const tkt = match[2].toUpperCase();
          if ((tkt === 'ULA' || tkt === "ISTI'DAD" || tkt === 'IST') && counts.ula[kls] !== undefined) counts.ula[kls]++;
          else if ((tkt === 'WUSTHO' || tkt === 'WUSTHA') && counts.wst[kls] !== undefined) counts.wst[kls]++;
          else if (tkt === 'ULYA' && counts.ulya[kls] !== undefined) counts.ulya[kls]++;
        } else {
          // Fallback: gunakan tingkat & kelas Diniyyah milik Asatidz itu sendiri
          const mTkt = String(asatidzObj?.tingkat_asatidz || '').toUpperCase();
          const mKls = parseInt(String(asatidzObj?.din_kls_asatidz || ''), 10) || 0;
          if (mTkt === 'ULA' && counts.ula[mKls] !== undefined) counts.ula[mKls]++;
          else if (mTkt.includes('WUSTH') && counts.wst[mKls] !== undefined) counts.wst[mKls]++;
          else if (mTkt === 'ULYA' && counts.ulya[mKls] !== undefined) counts.ulya[mKls]++;
        }
      }
    });
  });

  return counts;
}

/**
 * Mengambil objek jadwal seorang guru dari jadwalMap secara case-insensitive
 */
export function getJadwalGuruFromMap(
  nama: string | null | undefined,
  jadwalMap: Record<string, TeacherJadwalRow>
): TeacherJadwalRow {
  const clean = String(nama || '').trim();
  const cleanNorm = clean.replace(/\s+/g, ' ');
  const keyUpper = cleanNorm.toUpperCase();
  if (jadwalMap && jadwalMap[keyUpper]) {
    return {
      ...jadwalMap[keyUpper],
      nama_asatidz: jadwalMap[keyUpper].nama_asatidz || clean,
    };
  }
  if (jadwalMap && keyUpper) {
    const matchedKey = Object.keys(jadwalMap).find(
      (k) => k.trim().replace(/\s+/g, ' ').toUpperCase() === keyUpper
    );
    if (matchedKey && jadwalMap[matchedKey]) {
      return {
        ...jadwalMap[matchedKey],
        nama_asatidz: jadwalMap[matchedKey].nama_asatidz || clean,
      };
    }
  }
  return {
    nama_asatidz: clean,
    mengajar: '',
    sabtu: '',
    ahad: '',
    senin: '',
    selasa: '',
    rabu: '',
    kamis: '',
    totalJam: '0',
  };
}

/**
 * Membangun struktur matriks kelas KBM terpusat (`masterStrukturKelasKBM`)
 * yang dikonsumsi oleh Jadwal KBM, Hari KBM, Absensi Asatidz, dan Absen Cepat
 */
/**
 * Fungsi pembanding urutan default baris tabel Jadwal KBM Per Kelas (4-Tier Sort Comparator):
 * 1. Tingkat Diniyyah (ULA -> WUSTHO -> ULYA -> ISTI'DAD)
 * 2. Angka Kelas Diniyyah (1 -> 2 -> 3 -> 4)
 * 3. Gender (Putra/PA seluruhnya lebih dulu daripada Putri/PI untuk kelas yang sama)
 * 4. Abjad Bagian Kelas (A -> B -> C -> D -> E -> F ...)
 */
export function bandingkanUrutanKelasKBM(
  a: { tingkat: string; kls: string; bag: string; papi?: string },
  b: { tingkat: string; kls: string; bag: string; papi?: string }
): number {
  // 1. Tingkat Diniyyah
  const tA = URUTAN_TINGKAT_KBM[a.tingkat] || 99;
  const tB = URUTAN_TINGKAT_KBM[b.tingkat] || 99;
  if (tA !== tB) return tA - tB;

  // 2. Angka Kelas Diniyyah
  const kA = parseInt(a.kls, 10) || 0;
  const kB = parseInt(b.kls, 10) || 0;
  if (kA !== kB) return kA - kB;

  // 3. Gender (Putra/PA peringkat 1 sebelum Putri/PI peringkat 2)
  const getGenderRank = (papi?: string) => {
    const g = String(papi || '').trim().toUpperCase();
    if (g === 'PA' || g === 'PUTRA') return 1;
    if (g === 'PI' || g === 'PUTRI') return 2;
    return 3;
  };
  const gA = getGenderRank(a.papi);
  const gB = getGenderRank(b.papi);
  if (gA !== gB) return gA - gB;

  // 4. Huruf Bagian Kelas
  return a.bag.localeCompare(b.bag, undefined, { numeric: true, sensitivity: 'base' });
}

export interface InfoKelasUniversal {
  tingkat: string;
  kls: string;
  bag: string;
  papi: 'PA' | 'PI' | '';
  isValid: boolean;
  raw: string;
}

/**
 * Mengurai string kelas dalam format apa pun ("1 A ULA (PA)", "1 C ULA (PI) (GP 4)", "ULA 1-B")
 * menjadi struktur terstandarisasi untuk perbandingan hierarki akademik.
 */
export function parseStrukturKelasUniversal(str: string | null | undefined): InfoKelasUniversal {
  if (!str) {
    return { tingkat: '', kls: '', bag: '', papi: '', isValid: false, raw: '' };
  }

  const raw = String(str).trim();
  if (raw === '' || raw === '-') {
    return { tingkat: '', kls: '', bag: '', papi: '', isValid: false, raw };
  }

  // Format lama (misal "ULA 1-B" -> "1 B ULA")
  const formatted = formatTampilanKelas(raw);

  // Regex fleksibel: [Angka] [Bagian] [Tingkat] opsional (Gender)
  const match = formatted.match(
    /\b(\d+)\s+([A-Za-z0-9]+)\s+(ULA|WUSTHO|ULYA|ISTI'DAD|IST)\b(?:\s*\((PA|PI|PUTRA|PUTRI)\))?/i
  );

  if (match) {
    const kls = match[1];
    const bag = match[2].toUpperCase();
    let tingkat = match[3].toUpperCase();
    if (tingkat === 'IST') tingkat = "ISTI'DAD";
    let papi: 'PA' | 'PI' | '' = '';
    if (match[4]) {
      const upGender = match[4].toUpperCase();
      papi = upGender === 'PA' || upGender === 'PUTRA' ? 'PA' : upGender === 'PI' || upGender === 'PUTRI' ? 'PI' : '';
    } else {
      if (/\b(PA|PUTRA)\b/i.test(formatted)) papi = 'PA';
      else if (/\b(PI|PUTRI)\b/i.test(formatted)) papi = 'PI';
    }

    return {
      tingkat,
      kls,
      bag,
      papi,
      isValid: true,
      raw,
    };
  }

  // Fallback pola tanpa huruf bagian jika ada, misal "1 ULA" atau "WUSTHO 1"
  const matchNoBag =
    formatted.match(/\b(\d+)\s+(ULA|WUSTHO|ULYA|ISTI'DAD|IST)\b/i) ||
    formatted.match(/\b(ULA|WUSTHO|ULYA|ISTI'DAD|IST)\s+(\d+)\b/i);

  if (matchNoBag) {
    const isNumFirst = /^\d+/.test(matchNoBag[1]);
    const kls = isNumFirst ? matchNoBag[1] : matchNoBag[2];
    let tingkat = (isNumFirst ? matchNoBag[2] : matchNoBag[1]).toUpperCase();
    if (tingkat === 'IST') tingkat = "ISTI'DAD";
    const papi: 'PA' | 'PI' | '' = /\b(PA|PUTRA)\b/i.test(formatted)
      ? 'PA'
      : /\b(PI|PUTRI)\b/i.test(formatted)
      ? 'PI'
      : '';

    return {
      tingkat,
      kls,
      bag: '',
      papi,
      isValid: true,
      raw,
    };
  }

  return { tingkat: '', kls: '', bag: '', papi: '', isValid: false, raw };
}

/**
 * Komparator Universal Hierarki Kelas Madrasah Diniyyah:
 * Urutan:
 * 1. Tingkat: ULA (1) -> WUSTHO (2) -> ULYA (3) -> ISTI'DAD (4)
 * 2. Angka Kelas: 1 -> 2 -> 3 -> 4
 * 3. Huruf Bagian: A -> B -> C -> D ...
 * 4. Gender: PA (1) -> PI (2)
 * Entri kelas valid selalu mendahului entri non-kelas ('-' atau kosong).
 */
export function bandingkanUrutanKelasUniversal(aStr?: string | null, bStr?: string | null): number {
  const a = parseStrukturKelasUniversal(aStr);
  const b = parseStrukturKelasUniversal(bStr);

  if (a.isValid && !b.isValid) return -1;
  if (!a.isValid && b.isValid) return 1;
  if (!a.isValid && !b.isValid) {
    return String(aStr || '').localeCompare(String(bStr || ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  }

  // 1. Tingkat Diniyyah
  const tA = URUTAN_TINGKAT_KBM[a.tingkat] || 99;
  const tB = URUTAN_TINGKAT_KBM[b.tingkat] || 99;
  if (tA !== tB) return tA - tB;

  // 2. Angka Kelas Diniyyah
  const kA = parseInt(a.kls, 10) || 0;
  const kB = parseInt(b.kls, 10) || 0;
  if (kA !== kB) return kA - kB;

  // 3. Huruf Bagian Kelas (A -> B -> C...)
  const cmpBag = a.bag.localeCompare(b.bag, undefined, { numeric: true, sensitivity: 'base' });
  if (cmpBag !== 0) return cmpBag;

  // 4. Gender (Putra/PA peringkat 1 sebelum Putri/PI peringkat 2)
  const gA = a.papi === 'PA' ? 1 : a.papi === 'PI' ? 2 : 3;
  const gB = b.papi === 'PA' ? 1 : b.papi === 'PI' ? 2 : 3;
  if (gA !== gB) return gA - gB;

  return 0;
}

export function buildMasterStrukturKelasKBM(
  formasiList: Formasi[],
  asatidzList: Asatidz[],
  jadwalMap: Record<string, TeacherJadwalRow>,
  fanConfig?: FanConfigMap
): KelasKbmItem[] {
  const mapKelas = new Map<string, KelasKbmItem>();

  const buatJadwalKosong = (): Record<string, Record<1 | 2, SesiSlot[]>> => {
    const j: Record<string, Record<1 | 2, SesiSlot[]>> = {};
    LIST_HARI.forEach((h) => {
      j[h] = { 1: [], 2: [] };
    });
    return j;
  };

  const mapAsatidzByUpper = new Map<string, Asatidz>();
  (asatidzList || []).forEach((a) => {
    const n = (a.nama_asatidz || '').trim();
    if (n) mapAsatidzByUpper.set(n.toUpperCase(), a);
  });

  // 1. Pindai dari master Formasi Kelas
  (formasiList || []).forEach((f) => {
    const tingkat = (f.tingkat || '').trim().toUpperCase();
    const kls = (f.din_kls || '').trim();
    const bag = (f.din_bag || '').trim().toUpperCase();
    const papi = (f.pa_pi || '').trim().toUpperCase();
    if (!tingkat || !kls || !bag) return;

    const key = `${kls} ${bag} ${tingkat} (${papi || '-'})`;
    const namaKelasMurni = `${kls} ${bag} ${tingkat}`.trim();
    const isUg = Boolean(f.is_unggulan);
    const namaMustahiqFormasi = (f.id_mustahiq || '').trim();
    const profilMustahiq = namaMustahiqFormasi
      ? mapAsatidzByUpper.get(namaMustahiqFormasi.toUpperCase())
      : undefined;

    if (!mapKelas.has(key)) {
      mapKelas.set(key, {
        key,
        tingkat,
        kls,
        bag,
        papi,
        mustahiqNama: namaMustahiqFormasi || '-',
        mustahiqKG: profilMustahiq?.nia || '-',
        mustahiqJah: profilMustahiq?.jah_asatidz || 'Mustahiq',
        lokal: f.lokasi_diniyyah || '-',
        isUnggulan: isUg,
        jadwal: buatJadwalKosong(),
      });
    }
  });

  // 2. Pindai dari master Asatidz untuk mengisi/melengkapi Mustahiq
  (asatidzList || []).forEach((a) => {
    const tingkat = (a.tingkat_asatidz || '').trim().toUpperCase();
    const kls = (a.din_kls_asatidz || '').trim();
    const bag = (a.din_bag_asatidz || '').trim().toUpperCase();
    const papi = (a.pa_pi || '').trim().toUpperCase();
    const nama = (a.nama_asatidz || '').trim();
    const nia = (a.nia || '').trim();
    const jah = (a.jah_asatidz || '').trim();

    if (tingkat && kls && bag) {
      const key = `${kls} ${bag} ${tingkat} (${papi || '-'})`;
      const namaKelasMurni = `${kls} ${bag} ${tingkat}`.trim();
      if (!mapKelas.has(key)) {
        mapKelas.set(key, {
          key,
          tingkat,
          kls,
          bag,
          papi,
          mustahiqNama: '-',
          mustahiqKG: '-',
          mustahiqJah: '',
          lokal: '-',
          isUnggulan: isKelasUnggulan(namaKelasMurni, formasiList, papi),
          jadwal: buatJadwalKosong(),
        });
      }

      const item = mapKelas.get(key)!;
      const jahLower = jah.toLowerCase();
      const isMustahiq =
        jahLower.includes('mustahiq') ||
        jahLower.includes('ms & koor') ||
        jahLower.includes("isti'dad") ||
        jahLower === 'ist';

      if (isMustahiq && (item.mustahiqNama === '-' || !item.mustahiqNama)) {
        item.mustahiqNama = nama;
        item.mustahiqKG = nia || '-';
        item.mustahiqJah = jah;
      }
    }
  });

  // 3. Gabungkan daftar seluruh guru dari asatidzList + jadwalMap (case-insensitive)
  const semuaKunciGuruUpper = new Set<string>(Array.from(mapAsatidzByUpper.keys()));
  Object.keys(jadwalMap || {}).forEach((k) => {
    const clean = k.trim().toUpperCase();
    if (clean) semuaKunciGuruUpper.add(clean);
  });

  // 4. Petakan seluruh slot Jam 1 & Jam 2 ke dalam kelas terkait (peka gender PA / PI)
  const allKelasItems = Array.from(mapKelas.values());
  const infoKelasList = allKelasItems.map((k) => parseInfoKelasNorm(namaKelasLengkapDariObj(k)));
  semuaKunciGuruUpper.forEach((keyUpper) => {
    const guruMaster = mapAsatidzByUpper.get(keyUpper);
    const jdw = getJadwalGuruFromMap(guruMaster?.nama_asatidz || keyUpper, jadwalMap);
    const namaGuru = (guruMaster?.nama_asatidz || jdw.nama_asatidz || keyUpper).trim();
    if (!namaGuru) return;

    const kgGuru = guruMaster?.nia || '-';
    const jahGuru = guruMaster?.jah_asatidz || '';
    const genderGuru = String(guruMaster?.pa_pi || '').trim().toUpperCase();

    LIST_HARI.forEach((hari) => {
      const hKey = hari.toLowerCase();
      const rawCell = jdw[hKey];
      if (!rawCell) return;

      const slots = parseJadwalCell_Client(rawCell);
      slots.forEach((s) => {
        if (s.jam !== 1 && s.jam !== 2) return;
        const slotInfo = parseInfoKelasNorm(s.lokasi);
        if (!slotInfo.norm) return;

        for (let idx = 0; idx < allKelasItems.length; idx++) {
          if (!isInfoKelasCocok(slotInfo, infoKelasList[idx], genderGuru)) continue;

          const itemKls = allKelasItems[idx];
          const fanShort = ambilNamaFanSingkat(s.fan, itemKls.tingkat, itemKls.kls, fanConfig);
          const targetArr = itemKls.jadwal[hari][s.jam as 1 | 2];
          if (
            !targetArr.some(
              (existing: SesiSlot) => existing.guru.toUpperCase() === namaGuru.toUpperCase()
            )
          ) {
            targetArr.push({
              kg: kgGuru,
              fan: fanShort,
              fanAsli: s.fan,
              guru: namaGuru,
              jah: jahGuru,
              lokasiGabungan: s.lokasi,
            });
          }
          break;
        }
      });
    });
  });

  const arr = Array.from(mapKelas.values());
  arr.sort(bandingkanUrutanKelasKBM);

  return arr;
}

/**
 * Mengecek apakah sebuah Fan berstatus pengajar === 'MS' pada kelasKey yang diberikan
 */
export function cekFanMSuntukKelas(
  primaryFanKey: string,
  fallbackFanKey: string,
  valFan: string,
  fanDetail?: FanPelajaranDetail
): boolean {
  if (!valFan || !fanDetail || !fanDetail.item) return false;
  const valLower = String(valFan).trim().toLowerCase();
  if (!valLower) return false;

  const cariDiKey = (key: string): boolean => {
    if (!key || !fanDetail.item) return false;
    let ditemukan = false;
    Object.keys(fanDetail.item).forEach((iKey) => {
      if (ditemukan) return;
      if (iKey.indexOf(key + '||') !== 0) return;
      const rawItem = iKey.substring((key + '||').length);
      const parsed = parseFanItemString(rawItem);
      const fanName = parsed.fan && parsed.fan !== '-' ? parsed.fan : parsed.mapel;
      const cocok =
        rawItem.toLowerCase() === valLower ||
        (fanName && fanName.toLowerCase() === valLower) ||
        (parsed.mapel && parsed.mapel.toLowerCase() === valLower);
      if (cocok) {
        const det = fanDetail.item![iKey];
        if (det && det.pengajar === 'MS') ditemukan = true;
      }
    });
    return ditemukan;
  };

  if (primaryFanKey && primaryFanKey !== fallbackFanKey) {
    const hasInPrimary = Object.keys(fanDetail.item).some(
      (iKey) => iKey.indexOf(primaryFanKey + '||') === 0
    );
    if (hasInPrimary) {
      return cariDiKey(primaryFanKey);
    }
  }

  return cariDiKey(primaryFanKey) || cariDiKey(fallbackFanKey);
}

/**
 * Mengambil informasi batas jam maksimal mingguan suatu Fan dari `fanDetail`
 * Menggunakan arsitektur pencocokan bertingkat (Exact-First Hierarchical Matching)
 * untuk mencegah tabrakan substring antar-fan (misal Fiqih vs Ushul Fiqih, Sorogan vs Fiqih).
 */
export function dapatkanBatasJamFan(
  kelasKey: string,
  fanInput: string,
  fanConfig?: FanConfigMap,
  fanDetail?: FanPelajaranDetail
): { rawItem: string; maxJam: number | null } | null {
  if (!fanInput || !String(fanInput).trim()) return null;
  const targetRawItem = cariRawItemFanPadaKelasKey(kelasKey, fanInput, fanConfig);
  if (!targetRawItem) return null;

  const itemKey = `${kelasKey}||${targetRawItem}`;
  const itemDetail = fanDetail?.item?.[itemKey];
  const maxJam =
    itemDetail && itemDetail.jam !== undefined && itemDetail.jam !== ''
      ? parseInt(String(itemDetail.jam), 10)
    : null;

  return {
    rawItem: targetRawItem,
    maxJam: maxJam === null || isNaN(maxJam) ? null : maxJam,
  };
}

/**
 * Mendapatkan kunci kelas efektif untuk `fanConfig` & `fanDetail`
 */
export function dapatkanKelasKeyFanDariObj(
  k: KelasKbmItem,
  formasiList?: Formasi[],
  fanConfig?: FanConfigMap
): { effectiveKey: string; primaryKey: string; fallbackKey: string; isUg: boolean } {
  const namaKelasMurni = `${k.kls} ${k.bag} ${k.tingkat}`.trim();
  const isUg = Boolean(
    k.isUnggulan !== undefined
      ? k.isUnggulan
      : formasiList && isKelasUnggulan(namaKelasMurni, formasiList, k.papi)
  );
  const keyUg = `${k.kls} ${k.tingkat} (Ug)`;
  const keyUgLegacy = `${namaKelasMurni} (Ug)`;
  const keyReg = `${k.kls} ${k.tingkat}`;
  if (isUg && fanConfig) {
    if (Array.isArray(fanConfig[keyUg]) && fanConfig[keyUg].length > 0) {
      return { effectiveKey: keyUg, primaryKey: keyUg, fallbackKey: keyReg, isUg: true };
    }
    if (Array.isArray(fanConfig[keyUgLegacy]) && fanConfig[keyUgLegacy].length > 0) {
      return { effectiveKey: keyUgLegacy, primaryKey: keyUg, fallbackKey: keyReg, isUg: true };
    }
  }
  return { effectiveKey: keyReg, primaryKey: isUg ? keyUg : keyReg, fallbackKey: keyReg, isUg };
}

/**
 * Mencari rawItem di `fanConfig[kelasKey]` yang cocok dengan string fan.
 * Menggunakan pencocokan bertingkat (Exact Match prioritas tertinggi) agar
 * fan dengan nama substring (seperti Fiqih di dalam Ushul Fiqih) atau kitab
 * yang sama (seperti Fathul Qorib pada Fiqih & Sorogan) tidak bertabrakan.
 */
export function cariRawItemFanPadaKelasKey(
  kelasKey: string,
  fanInput: string,
  fanConfig?: FanConfigMap
): string | null {
  if (!kelasKey || !fanInput || fanInput === '-') return null;
  const list = (fanConfig && fanConfig[kelasKey]) || [];
  if (list.length === 0) return null;

  const fStr = String(fanInput).trim();
  const fLower = fStr.toLowerCase();
  const fClean = fStr.replace(/[()]/g, '').trim().toLowerCase();
  const pInput = parseFanItemString(fStr);
  const inFan = pInput.fan && pInput.fan !== '-' ? pInput.fan.toLowerCase() : '';
  const inMapel = pInput.mapel && pInput.mapel !== '-' ? pInput.mapel.toLowerCase() : '';

  // 1. Prioritas 1: Persis sama dengan raw lengkap (termasuk tanda kurung)
  const exactRaw = list.find((raw) => String(raw || '').trim().toLowerCase() === fLower);
  if (exactRaw) return exactRaw;

  // 2. Prioritas 2: Jika input memiliki format (Fan) Mapel, keduanya harus cocok
  if (inFan && inMapel) {
    const dualMatch = list.find((raw) => {
      const p = parseFanItemString(raw);
      const pFan = p.fan && p.fan !== '-' ? p.fan.toLowerCase() : '';
      const pMapel = p.mapel && p.mapel !== '-' ? p.mapel.toLowerCase() : '';
      return pFan === inFan && pMapel === inMapel;
    });
    if (dualMatch) return dualMatch;
  }

  // 3. Prioritas 3: Jika input hanya Nama Fan murni (misal: "Fiqih", "Ushul Fiqih", "Tauhid", "Sorogan", "Takror")
  const matchFan = list.find((raw) => {
    const p = parseFanItemString(raw);
    const pFan = p.fan && p.fan !== '-' ? p.fan.toLowerCase() : '';
    return pFan && (pFan === fClean || (inFan && pFan === inFan));
  });
  if (matchFan) return matchFan;

  // 4. Prioritas 4: Jika input hanya Nama Mapel/Kitab (misal: "Tashilut Thuruqot", "Fathul Qorib 4")
  const matchMapel = list.find((raw) => {
    const p = parseFanItemString(raw);
    const pFan = p.fan && p.fan !== '-' ? p.fan.toLowerCase() : '';
    const pMapel = p.mapel && p.mapel !== '-' ? p.mapel.toLowerCase() : '';
    if (inFan && pFan && pFan !== inFan) return false;
    return pMapel && (pMapel === fClean || (inMapel && pMapel === inMapel));
  });
  if (matchMapel) return matchMapel;

  // 5. Prioritas 5: Cocok persis tanpa tanda kurung
  const matchClean = list.find((raw) => {
    const rClean = String(raw || '').replace(/[()]/g, '').trim().toLowerCase();
    return rClean === fClean;
  });
  if (matchClean) return matchClean;

  // 6. Prioritas 6: Prefix match pada Nama Fan atau Mapel
  const matchPrefix = list.find((raw) => {
    const p = parseFanItemString(raw);
    const pFan = p.fan && p.fan !== '-' ? p.fan.toLowerCase() : '';
    const pMapel = p.mapel && p.mapel !== '-' ? p.mapel.toLowerCase() : '';
    if (inFan && pFan && pFan !== inFan) return false;
    return (
      (pFan && pFan.startsWith(fClean)) ||
      (pMapel && pMapel.startsWith(fClean))
    );
  });
  if (matchPrefix) return matchPrefix;

  // 7. Prioritas 7: Fallback substring contains (hanya jika input minimal 5 karakter)
  if (fClean.length >= 5) {
    const matchContains = list.find((raw) => {
      const rClean = String(raw || '').replace(/[()]/g, '').trim().toLowerCase();
      return rClean.includes(fClean);
    });
    if (matchContains) return matchContains;
  }

  return null;
}

/**
 * Mengecek bentrok fisik seorang Asatidz pada Hari & Jam di `masterStrukturKelasKBM`
 * Catatan: Di Madin Blokagung, penempatan satu guru di beberapa kelas sekaligus pada jam yang sama
 * adalah hal yang lumrah dalam operasional pesantren (misal: guru terbagi dua / gabung kelas mandiri),
 * sehingga sistem tidak memblokirnya.
 */
export function cekBentrokFisikHariJamKBM(
  _namaGuru: string,
  _hari: string,
  _jam: number,
  _masterStrukturKelasKBM: KelasKbmItem[],
  _excludeSlots: Array<{ kelasKey: string; hari: string; jam: number }> = []
): string | null {
  return null;
}

/**
 * Menghitung label pengajar ('MS', 'MB', atau 'MS, MB') dari daftar nama Asatidz
 */
export function hitungLabelPengajarDariListAsatidz(
  listAsatidz: string[],
  asatidzList: Asatidz[],
  existingLabel = ''
): string {
  let hasMS = String(existingLabel || '').includes('MS');
  let hasMB = String(existingLabel || '').includes('MB');

  (listAsatidz || []).forEach((nama) => {
    const row = (asatidzList || []).find(
      (a) => String(a.nama_asatidz || '').trim().toUpperCase() === String(nama || '').trim().toUpperCase()
    );
    if (row) {
      const kat = cekKategoriJahAsatidz(row.jah_asatidz);
      if (kat.isMS) hasMS = true;
      if (kat.isMB) hasMB = true;
    }
  });

  if (hasMS && hasMB) return 'MS, MB';
  if (hasMS) return 'MS';
  if (hasMB) return 'MB';
  return existingLabel || 'MB';
}

export interface SlotBusyDetail {
  labelKls: string;
  kelasKey: string;
  fan: string;
  fanAsli?: string;
  tingkat: string;
  kls: string;
  papi: string;
  lokal?: string;
}

export interface CacheRelasiFanJadwalKelas {
  kelasKey: string;
  primaryFanKey: string;
  fallbackFanKey: string;
  isUg: boolean;
  listFanKelas: Array<{
    fan: string;
    mapel: string;
    rawItem: string;
    asatidz: string[];
  }>;
  listSemuaFan: string[];
  mapFanKeAsatidz: Record<string, string[]>;
  mapAsatidzKeFan: Record<string, string[]>;
  setSemuaAsatidz: string[];
  mapBusyAll: Record<string, Record<string, string>>;
  mapBusyDetails?: Record<string, Record<string, SlotBusyDetail>>;
}

/**
 * Membangun cache Fan kelas, relasi dua arah Fan <-> Asatidz, dan peta guru sibuk
 * untuk Modal Input Jadwal Kelas & Modal Aksi Klik Kanan KG
 */
export function siapkanCacheRelasiFanJadwalKelas(
  k: KelasKbmItem,
  formasiList: Formasi[],
  fanConfig: FanConfigMap,
  fanDetail: FanPelajaranDetail,
  masterStrukturKelasKBM: KelasKbmItem[]
): CacheRelasiFanJadwalKelas {
  const namaKelasMurni = `${k.kls} ${k.bag} ${k.tingkat}`.trim();
  const isUg = Boolean(
    k.isUnggulan !== undefined
      ? k.isUnggulan
      : isKelasUnggulan(namaKelasMurni, formasiList, k.papi)
  );
  const primaryFanKey = isUg ? `${k.kls} ${k.tingkat} (Ug)` : `${k.kls} ${k.tingkat}`;
  const legacyUgFanKey = `${namaKelasMurni} (Ug)`;
  const fallbackFanKey = `${k.kls} ${k.tingkat}`;

  const listFanKelas: CacheRelasiFanJadwalKelas['listFanKelas'] = [];
  const listSemuaFan: string[] = [];
  const mapFanKeAsatidz: Record<string, string[]> = {};
  const mapAsatidzKeFan: Record<string, string[]> = {};
  const setSemuaAsatidz = new Set<string>();

  const ekstrakFanDariKey = (targetKey: string) => {
    if (!fanDetail || !fanDetail.item) return;
    Object.keys(fanDetail.item).forEach((iKey) => {
      if (iKey.startsWith(targetKey + '||')) {
        const itemDetail = fanDetail.item![iKey];
        const rawItem = iKey.substring(targetKey.length + 2);
        const parsed = parseFanItemString(rawItem);
        const fanName = parsed.fan && parsed.fan !== '-' ? parsed.fan : parsed.mapel || rawItem;
        const gurus = Array.isArray(itemDetail.asatidz) ? itemDetail.asatidz : [];

        if (!listFanKelas.some((f) => f.fan === fanName || f.rawItem === rawItem)) {
          listFanKelas.push({
            fan: fanName,
            mapel: parsed.mapel || '',
            rawItem,
            asatidz: gurus,
          });
          if (!listSemuaFan.includes(fanName)) {
            listSemuaFan.push(fanName);
          }

          gurus.forEach((g) => {
            const gNama = String(g || '').trim();
            if (gNama) {
              setSemuaAsatidz.add(gNama);
              const gUpper = gNama.toUpperCase();
              if (!mapAsatidzKeFan[gUpper]) mapAsatidzKeFan[gUpper] = [];
              if (!mapAsatidzKeFan[gUpper].includes(fanName)) {
                mapAsatidzKeFan[gUpper].push(fanName);
              }
            }
          });

          const fLower = fanName.toLowerCase();
          mapFanKeAsatidz[fLower] = gurus;
          if (parsed.mapel) mapFanKeAsatidz[parsed.mapel.toLowerCase()] = gurus;
          mapFanKeAsatidz[rawItem.toLowerCase()] = gurus;
        }
      }
    });
  };

  ekstrakFanDariKey(primaryFanKey);
  if (isUg) {
    ekstrakFanDariKey(legacyUgFanKey);
    ekstrakFanDariKey(fallbackFanKey);
  }

  const configFans =
    (fanConfig && fanConfig[primaryFanKey]) ||
    (isUg && fanConfig && fanConfig[legacyUgFanKey]) ||
    (isUg && fanConfig ? fanConfig[fallbackFanKey] : null) ||
    [];

  configFans.forEach((rawItem) => {
    const parsed = parseFanItemString(rawItem);
    const fanName = parsed.fan && parsed.fan !== '-' ? parsed.fan : parsed.mapel || rawItem;
    if (!listSemuaFan.includes(fanName)) {
      listSemuaFan.push(fanName);
      listFanKelas.push({
        fan: fanName,
        mapel: parsed.mapel || '',
        rawItem,
        asatidz: [],
      });
    }
  });

  const mapBusyAll: Record<string, Record<string, string>> = {};
  const mapBusyDetails: Record<string, Record<string, SlotBusyDetail>> = {};
  LIST_HARI.forEach((h) => {
    mapBusyAll[`${h}_1`] = {};
    mapBusyAll[`${h}_2`] = {};
    mapBusyDetails[`${h}_1`] = {};
    mapBusyDetails[`${h}_2`] = {};
  });

  (masterStrukturKelasKBM || []).forEach((kOther) => {
    if (kOther.key === k.key) return;
    const labelKls = `${kOther.kls} ${kOther.bag || ''} ${kOther.tingkat} (${kOther.papi})`
      .replace(/\s+/g, ' ')
      .trim();

    LIST_HARI.forEach((h) => {
      ([1, 2] as const).forEach((j) => {
        const sesiList = (kOther.jadwal && kOther.jadwal[h] && kOther.jadwal[h][j]) || [];
        sesiList.forEach((s) => {
          if (s.guru && s.guru !== '-') {
            const gUpper = s.guru.trim().toUpperCase();
            mapBusyAll[`${h}_${j}`][gUpper] = labelKls;
            mapBusyDetails[`${h}_${j}`][gUpper] = {
              labelKls,
              kelasKey: kOther.key,
              fan: s.fan || '',
              fanAsli: s.fanAsli || s.fan || '',
              tingkat: kOther.tingkat || '',
              kls: kOther.kls || '',
              papi: kOther.papi || '',
              lokal: kOther.lokal || '',
            };
          }
        });
      });
    });
  });

  return {
    kelasKey: k.key,
    primaryFanKey,
    fallbackFanKey,
    isUg,
    listFanKelas,
    listSemuaFan,
    mapFanKeAsatidz,
    mapAsatidzKeFan,
    setSemuaAsatidz: Array.from(setSemuaAsatidz),
    mapBusyAll,
    mapBusyDetails,
  };
}
