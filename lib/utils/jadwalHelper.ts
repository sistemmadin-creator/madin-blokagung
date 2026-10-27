import { LIST_HARI, HariKbm, ParsedSlotJadwal, TeacherJadwalRow, KelasKbmItem, SesiSlot } from '@/types/jadwal';
import { ParsedSlotHariKBM } from '@/types/hari-kbm';
import { Formasi } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap, FanPelajaranDetail } from '@/types/fan';
import { parseFanItemString, isKelasUnggulan, cekKategoriJahAsatidz } from './fanHelper';

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
    const isUg = isKelasUnggulan(namaKelasMurni, formasiList);
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
        lokal: f.lokasi_diniyyah || profilMustahiq?.lokasi_diniyyah || '-',
        isUnggulan: isUg,
        jadwal: buatJadwalKosong(),
      });
    }
  });

  // 2. Pindai dari master Asatidz untuk mengisi/melengkapi Mustahiq & Lokal
  (asatidzList || []).forEach((a) => {
    const tingkat = (a.tingkat_asatidz || '').trim().toUpperCase();
    const kls = (a.din_kls_asatidz || '').trim();
    const bag = (a.din_bag_asatidz || '').trim().toUpperCase();
    const papi = (a.pa_pi || '').trim().toUpperCase();
    const nama = (a.nama_asatidz || '').trim();
    const nia = (a.nia || '').trim();
    const jah = (a.jah_asatidz || '').trim();
    const lokDin = (a.lokasi_diniyyah || '').trim();

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
          lokal: lokDin || '-',
          isUnggulan: isKelasUnggulan(namaKelasMurni, formasiList),
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
        if (lokDin && lokDin !== '-') item.lokal = lokDin;
      } else if (item.lokal === '-' && lokDin && lokDin !== '-') {
        item.lokal = lokDin;
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
 */
export function dapatkanBatasJamFan(
  kelasKey: string,
  fanInput: string,
  fanConfig?: FanConfigMap,
  fanDetail?: FanPelajaranDetail
): { rawItem: string; maxJam: number | null } | null {
  if (!fanInput || !String(fanInput).trim()) return null;
  const fanInputClean = String(fanInput).replace(/[()]/g, '').trim().toLowerCase();
  const listConfig = (fanConfig && fanConfig[kelasKey]) || [];

  const targetRawItem = listConfig.find((item) => {
    const rawClean = String(item).replace(/[()]/g, '').trim().toLowerCase();
    const parsed = parseFanItemString(item);
    return (
      rawClean === fanInputClean ||
      parsed.fan.toLowerCase() === fanInputClean ||
      parsed.mapel.toLowerCase() === fanInputClean ||
      rawClean.includes(fanInputClean) ||
      fanInputClean.includes(parsed.mapel.toLowerCase())
    );
  });

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
  const isUg = Boolean(k.isUnggulan || (formasiList && isKelasUnggulan(namaKelasMurni, formasiList)));
  const keyUg = `${namaKelasMurni} (Ug)`;
  const keyReg = `${k.kls} ${k.tingkat}`;
  if (isUg && fanConfig && Array.isArray(fanConfig[keyUg]) && fanConfig[keyUg].length > 0) {
    return { effectiveKey: keyUg, primaryKey: keyUg, fallbackKey: keyReg, isUg: true };
  }
  return { effectiveKey: keyReg, primaryKey: isUg ? keyUg : keyReg, fallbackKey: keyReg, isUg };
}

/**
 * Mencari rawItem di `fanConfig[kelasKey]` yang cocok dengan string fan
 */
export function cariRawItemFanPadaKelasKey(
  kelasKey: string,
  fanInput: string,
  fanConfig?: FanConfigMap
): string | null {
  if (!kelasKey || !fanInput || fanInput === '-') return null;
  const list = (fanConfig && fanConfig[kelasKey]) || [];
  const fStr = String(fanInput).trim();
  const fLower = fStr.toLowerCase();
  const fClean = fStr.replace(/[()]/g, '').trim().toLowerCase();
  const pInput = parseFanItemString(fStr);
  const inFan = pInput.fan && pInput.fan !== '-' ? pInput.fan.toLowerCase() : '';
  const inMapel = pInput.mapel && pInput.mapel !== '-' ? pInput.mapel.toLowerCase() : '';

  return (
    list.find((raw) => {
      const rStr = String(raw || '').trim();
      const rLower = rStr.toLowerCase();
      const rClean = rStr.replace(/[()]/g, '').trim().toLowerCase();
      const p = parseFanItemString(rStr);
      const pFan = p.fan && p.fan !== '-' ? p.fan.toLowerCase() : '';
      const pMapel = p.mapel && p.mapel !== '-' ? p.mapel.toLowerCase() : '';

      return (
        rLower === fLower ||
        rClean === fClean ||
        (pFan && (pFan === fLower || pFan === inFan)) ||
        (pMapel && (pMapel === fLower || pMapel === inMapel))
      );
    }) || null
  );
}

/**
 * Mengecek bentrok fisik seorang Asatidz pada Hari & Jam di `masterStrukturKelasKBM`
 */
export function cekBentrokFisikHariJamKBM(
  namaGuru: string,
  hari: string,
  jam: number,
  masterStrukturKelasKBM: KelasKbmItem[],
  excludeSlots: Array<{ kelasKey: string; hari: string; jam: number }> = []
): string | null {
  if (!namaGuru || namaGuru === '-') return null;
  const guruUpper = String(namaGuru).trim().toUpperCase();
  const jamNum = parseInt(String(jam), 10) as 1 | 2;

  for (let i = 0; i < (masterStrukturKelasKBM || []).length; i++) {
    const kOther = masterStrukturKelasKBM[i];
    const isExcluded = excludeSlots.some(
      (ex) => ex.kelasKey === kOther.key && ex.hari === hari && parseInt(String(ex.jam), 10) === jamNum
    );
    if (isExcluded) continue;

    const sesiList = (kOther.jadwal && kOther.jadwal[hari] && kOther.jadwal[hari][jamNum]) || [];
    for (const s of sesiList) {
      if (s.guru && String(s.guru).trim().toUpperCase() === guruUpper) {
        return `${kOther.kls} ${kOther.bag} ${kOther.tingkat} (${kOther.papi})`;
      }
    }
  }
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
  const isUg = Boolean(k.isUnggulan || isKelasUnggulan(namaKelasMurni, formasiList));
  const primaryFanKey = isUg ? `${namaKelasMurni} (Ug)` : `${k.kls} ${k.tingkat}`;
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
  if (isUg) ekstrakFanDariKey(fallbackFanKey);

  const configFans =
    (fanConfig && fanConfig[primaryFanKey]) ||
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
  LIST_HARI.forEach((h) => {
    mapBusyAll[`${h}_1`] = {};
    mapBusyAll[`${h}_2`] = {};
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
            mapBusyAll[`${h}_${j}`][s.guru.trim().toUpperCase()] = labelKls;
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
  };
}
