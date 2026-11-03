import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { FanConfigMap } from '@/types/fan';
import { TeacherJadwalRow, KelasKbmItem } from '@/types/jadwal';
import {
  JamKbm,
  StatusAbsensi,
  SesiJadwalHarian,
  StatusSesiData,
  RiwayatAbsensiItem,
  CompactSesiTuple,
  BucketAbsensiCompact,
  HariLiburInfo,
} from '@/types/absensi';
import {
  normalisasiNamaKelas,
  formatTampilanKelas,
  parseJadwalCell_Client,
  ambilNamaFanSingkat,
  cariLokasiKelasHariKBM,
  dapatkanBlokDariSesiMengajar,
  bandingkanBlokHariKBM,
  getJadwalGuruFromMap,
  bandingkanUrutanKelasUniversal,
} from './jadwalHelper';
import { isKelasUnggulan, URUTAN_TINGKAT } from './fanHelper';

export const ARRAY_HARI_IND = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

export const ARRAY_BULAN_IND = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const KATEGORI_LIBUR_OPTIONS = [
  'Libur Pondok',
  'Libur Nasional',
  'Ujian / Ikhtibar',
  'Haflah Akhirussanah',
  'Rapat Asatidz',
  'Kegiatan Lainnya',
] as const;

/**
 * Format waktu sekarang WIB: "dd/MM/yyyy HH:mm:ss"
 */
export function formatWaktuSekarangWIB(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Mendapatkan tanggal default absensi ("YYYY-MM-DD").
 * Otomatis maju +1 hari mulai pukul 18:00 WIB (Maghrib / pergantian hari pesantren).
 */
export function getDefaultTanggalAbsensi(): string {
  // Ambil waktu terkini dalam zona waktu Asia/Jakarta (WIB)
  const nowWibStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const nowWib = new Date(nowWibStr);

  if (nowWib.getHours() >= 18) {
    nowWib.setDate(nowWib.getDate() + 1);
  }
  const yyyy = nowWib.getFullYear();
  const mm = String(nowWib.getMonth() + 1).padStart(2, '0');
  const dd = String(nowWib.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Helper penentuan label waktu KBM Pesantren:
 * - Jam Ke-1, 2, 3: (Malam Sebelumnya) dilaksanakan malam hari ba'da Maghrib/Isya
 * - Jam Ke-4: (Siang Hari) dilaksanakan siang hari ba'da Dzuhur (Takror)
 */
export function getLabelWaktuJamKBM(jam: number): {
  label: string;
  deskripsi: string;
  badgeClass: string;
} {
  if (jam <= 3) {
    return {
      label: '(Malam Sebelumnya)',
      deskripsi: 'KBM Malam (Ba\'da Maghrib/Isya)',
      badgeClass: 'bg-slate-800 text-white border-slate-700',
    };
  }
  return {
    label: '(Siang Hari)',
    deskripsi: 'Takror Siang (Ba\'da Dzuhur)',
    badgeClass: 'bg-emerald-700 text-white border-emerald-600',
  };
}

/**
 * Mengambil nama hari Bahasa Indonesia dari string tanggal "YYYY-MM-DD"
 */
export function getNamaHariDariTgl(tanggalYMD: string): string {
  if (!tanggalYMD) return '-';
  const parts = tanggalYMD.split('-');
  if (parts.length !== 3) return '-';
  const d = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  if (isNaN(d.getTime())) return '-';
  return ARRAY_HARI_IND[d.getDay()] || '-';
}

/**
 * Memformat tanggal menjadi "Selasa, 27 Oktober 2026"
 */
export function formatTanggalPanjangIndo(tanggalYMD: string): string {
  if (!tanggalYMD) return '-';
  const parts = tanggalYMD.split('-');
  if (parts.length !== 3) return tanggalYMD;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const dNum = parseInt(parts[2], 10);
  const dateObj = new Date(y, m, dNum);
  if (isNaN(dateObj.getTime())) return tanggalYMD;
  const namaHari = ARRAY_HARI_IND[dateObj.getDay()] || '';
  const namaBulan = ARRAY_BULAN_IND[m] || '';
  return `${namaHari}, ${dNum} ${namaBulan} ${y}`;
}

/**
 * Membuat kunci sesi unik untuk pencocokan rekaman absensi
 */
export function getSesiKey(
  tanggal: string,
  sesi: { nama: string; jamKe: string; kelasMengajar: string; fan: string }
): string {
  return `${tanggal}|${sesi.nama}|${sesi.jamKe}|${sesi.kelasMengajar}|${sesi.fan}`
    .trim()
    .toLowerCase();
}

/**
 * Mengemas objek sesi absensi menjadi Tuple Array Ringkas 18 elemen (Format V3 Supabase)
 */
export function packSesiToCompactArray(r: Partial<RiwayatAbsensiItem>): CompactSesiTuple {
  return [
    r.id || 'ABS-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    r.timestamp || formatWaktuSekarangWIB(),
    r.nama || '-',
    r.nia || '-',
    r.tingkat || '-',
    r.dinKls || '-',
    r.dinBag || '-',
    r.blok || '-',
    r.gender || '-',
    r.kelasMengajar || '-',
    r.fan || '-',
    r.lokasi || '-',
    (r.status || 'Hadir') as string,
    r.keterangan || '',
    r.menitTerlambat ? String(r.menitTerlambat) : '',
    r.namaPengganti || '',
    r.diinputOleh || 'Admin',
    r.waktuUpdate || '',
  ];
}

/**
 * Membongkar Tuple Array Ringkas 18 elemen (atau objek legacy) menjadi RiwayatAbsensiItem
 */
export function unpackCompactArrayToSesi(
  arr: unknown,
  tanggal: string,
  hari: string,
  jamKe: string
): RiwayatAbsensiItem | null {
  if (!arr) return null;
  if (!Array.isArray(arr)) {
    const obj = arr as Record<string, unknown>;
    return {
      id: String(obj.id || 'ABS-' + Math.random().toString(36).substring(2, 10).toUpperCase()),
      timestamp: String(obj.timestamp || obj.updated_at || ''),
      tanggal: String(obj.tanggal || tanggal || ''),
      hari: String(obj.hari || hari || getNamaHariDariTgl(tanggal)),
      jamKe: String(obj.jamKe || jamKe || (obj.jam ? `Jam ${obj.jam}` : 'Jam 1')),
      nama: String(obj.nama || obj.nama_asatidz || '-'),
      nia: String(obj.nia || '-'),
      tingkat: String(obj.tingkat || '-'),
      dinKls: String(obj.dinKls || '-'),
      dinBag: String(obj.dinBag || '-'),
      blok: String(obj.blok || '-'),
      gender: String(obj.gender || '-'),
      kelasMengajar: String(obj.kelasMengajar || obj.kelas || '-'),
      fan: String(obj.fan || '-'),
      lokasi: String(obj.lokasi || '-'),
      status: (obj.status || 'Hadir') as StatusAbsensi,
      keterangan: String(obj.keterangan || ''),
      menitTerlambat: obj.menitTerlambat
        ? String(obj.menitTerlambat)
        : obj.menit_terlambat
        ? String(obj.menit_terlambat)
        : '',
      namaPengganti: String(obj.namaPengganti || obj.asatidz_pengganti || ''),
      diinputOleh: String(obj.diinputOleh || obj.diinput_oleh || 'Admin'),
      waktuUpdate: String(obj.waktuUpdate || obj.updated_at || ''),
    };
  }

  return {
    id: String(arr[0] || ''),
    timestamp: String(arr[1] || ''),
    tanggal: tanggal || '',
    hari: hari || getNamaHariDariTgl(tanggal),
    jamKe: jamKe || '',
    nama: String(arr[2] || '-'),
    nia: String(arr[3] || '-'),
    tingkat: String(arr[4] || '-'),
    dinKls: String(arr[5] || '-'),
    dinBag: String(arr[6] || '-'),
    blok: String(arr[7] || '-'),
    gender: String(arr[8] || '-'),
    kelasMengajar: String(arr[9] || '-'),
    fan: String(arr[10] || '-'),
    lokasi: String(arr[11] || '-'),
    status: (arr[12] || 'Hadir') as StatusAbsensi,
    keterangan: String(arr[13] || ''),
    menitTerlambat: String(arr[14] || ''),
    namaPengganti: String(arr[15] || ''),
    diinputOleh: String(arr[16] || 'Admin'),
    waktuUpdate: String(arr[17] || ''),
  };
}

/**
 * Mengekstrak sesi jadwal mengajar harian untuk Jam 1, Jam 2, Jam 3, dan Jam 4
 * termasuk auto-generate Jam 3 & Jam 4 untuk Mustahiq serta deteksi bentrok kelas.
 */
export function ekstraksiSesiJadwalHariIni(
  hari: string,
  asatidzList: Asatidz[],
  jadwalMap: Record<string, TeacherJadwalRow>,
  formasiList: Formasi[],
  fanConfig: FanConfigMap,
  masterStrukturKelasKBM?: KelasKbmItem[]
): Record<JamKbm, SesiJadwalHarian[]> {
  const result: Record<JamKbm, SesiJadwalHarian[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  };

  if (!hari || hari === 'Jumat' || hari === '-') {
    return result;
  }

  const hariKey = hari.toLowerCase() as keyof TeacherJadwalRow;

  (asatidzList || []).forEach((a) => {
    const nama = String(a.nama_asatidz || '').trim();
    if (!nama) return;

    const nia = String(a.nia || '-').trim();
    const gender = String(a.pa_pi || '-').trim();
    const tingkat = String(a.tingkat_asatidz || '-').trim();
    const dinKls = String(a.din_kls_asatidz || '-').trim();
    const dinBag = String(a.din_bag_asatidz || '-').trim();
    const jah = String(a.jah_asatidz || '-').trim();
    const lokDinMaster = String(a.lokasi_diniyyah || '').trim();
    const lokTakMaster = String(a.lokasi_takror || '').trim();

    const jdwObj = getJadwalGuruFromMap(nama, jadwalMap);
    const rawCell = jdwObj ? String(jdwObj[hariKey] || '') : '';
    const cellStr = formatTampilanKelas(rawCell);

    const parsedSlots = parseJadwalCell_Client(cellStr);
    const jamSudahAda = new Set<number>();

    parsedSlots.forEach((slot) => {
      const jamNum = slot.jam as JamKbm;
      if (jamNum < 1 || jamNum > 4) return;

      const rawFan = slot.fan && slot.fan !== '-' ? slot.fan.trim() : '';
      const rawLok = slot.lokasi && slot.lokasi !== '-' ? slot.lokasi.trim() : '';

      let kelasMengajar = '-';
      let lokasiRuang = '-';

      if (rawLok) {
        const match = rawLok.match(/^(.*?)\s*\(([^()]+)\)$/);
        if (match) {
          const isiKurungAkhir = match[2].trim();
          const upperKurung = isiKurungAkhir.toUpperCase();
          if (upperKurung === 'PA' || upperKurung === 'PI' || upperKurung === 'UG') {
            kelasMengajar = formatTampilanKelas(rawLok);
          } else {
            kelasMengajar = formatTampilanKelas(match[1].trim());
          }

          // 1. Prioritas Utama: Lokasi resmi dari Formasi Kelas
          const masterLokasi = cariLokasiKelasHariKBM(kelasMengajar, masterStrukturKelasKBM, formasiList);
          if (masterLokasi && masterLokasi !== '-') {
            lokasiRuang = masterLokasi;
          } else if (masterLokasi === '-') {
            lokasiRuang = '-';
          } else if (upperKurung !== 'PA' && upperKurung !== 'PI' && upperKurung !== 'UG' && isiKurungAkhir && isiKurungAkhir !== '-') {
            lokasiRuang = isiKurungAkhir;
          } else {
            lokasiRuang = '-';
          }
        } else {
          kelasMengajar = formatTampilanKelas(rawLok);
          const masterLokasi = cariLokasiKelasHariKBM(kelasMengajar, masterStrukturKelasKBM, formasiList);
          lokasiRuang = masterLokasi || '-';
        }
      } else {
        if (dinKls !== '-' && dinBag !== '-' && tingkat !== '-') {
          kelasMengajar = `${dinKls} ${dinBag} ${tingkat}`;
        }
        const masterLokasi = cariLokasiKelasHariKBM(kelasMengajar, masterStrukturKelasKBM, formasiList);
        lokasiRuang = masterLokasi || '-';
      }

      let tktSlot = tingkat;
      let klsSlot = dinKls;
      const matchKlsInfo = String(kelasMengajar).match(
        /^(\d+)\s+\S+\s+(ULA|WUSTHO|ULYA|ISTI'DAD|IST)/i
      );
      if (matchKlsInfo) {
        klsSlot = matchKlsInfo[1];
        tktSlot = matchKlsInfo[2].toUpperCase();
      }
      if (tktSlot === "ISTI'DAD" || tktSlot === "IST") {
        if (fanConfig && !fanConfig[`${klsSlot} ${tktSlot}`] && fanConfig[`${klsSlot} ULA`]) {
          tktSlot = 'ULA';
        }
      }

      let fanSingkat = '-';
      if (jamNum >= 1 && jamNum <= 3) {
        fanSingkat = ambilNamaFanSingkat(rawFan, tktSlot, klsSlot, fanConfig);
      } else {
        fanSingkat = rawFan || '(Takror) Takror';
      }

      const blokSesi = dapatkanBlokDariSesiMengajar(
        [{ kelas: kelasMengajar, lokasi: lokasiRuang }],
        a,
        formasiList,
        asatidzList
      );

      jamSudahAda.add(jamNum);

      result[jamNum].push({
        jamNum,
        jamKe: `Jam ${jamNum}`,
        nama,
        nia,
        gender,
        tingkat,
        dinKls,
        dinBag,
        jah,
        blok: blokSesi,
        kelasMengajar: kelasMengajar || '-',
        fan: fanSingkat || '-',
        fanAsli: rawFan || fanSingkat || '-',
        lokasi: lokasiRuang || '-',
        lokasiGabungan: rawLok || `${kelasMengajar} (${lokasiRuang})`,
      });
    });

    // Auto-generate Jam 3 & Jam 4 untuk Mustahiq di kelas binaannya
    const jahLower = jah.toLowerCase();
    const isMustahiq =
      jahLower.includes('mustahiq') ||
      jahLower.includes('ms & koor') ||
      jahLower === 'ist' ||
      jahLower.includes("isti'dad");

    if (
      isMustahiq &&
      dinKls &&
      dinKls !== '-' &&
      dinBag &&
      dinBag !== '-' &&
      tingkat &&
      tingkat !== '-'
    ) {
      const ownClassBase = `${dinKls} ${dinBag} ${tingkat}`.trim();
      const ownClassWithGender =
        gender && gender !== '-' ? `${ownClassBase} (${gender})` : ownClassBase;

      const masterLokasi = cariLokasiKelasHariKBM(ownClassWithGender, masterStrukturKelasKBM, formasiList);
      const lokDin = masterLokasi || '-';
      const lokTak = lokTakMaster || lokDin;

      let fansList: string[] = [];
      if (fanConfig) {
        const keyUg = `${dinKls} ${tingkat.toUpperCase()} (Ug)`;
        const keyUgLegacy = `${dinKls} ${dinBag.toUpperCase()} ${tingkat.toUpperCase()} (Ug)`;
        const keyReg = `${dinKls} ${tingkat.toUpperCase()}`;
        if (isKelasUnggulan(ownClassBase, formasiList, gender)) {
          if (Array.isArray(fanConfig[keyUg]) && fanConfig[keyUg].length > 0) {
            fansList = fanConfig[keyUg];
          } else if (Array.isArray(fanConfig[keyUgLegacy]) && fanConfig[keyUgLegacy].length > 0) {
            fansList = fanConfig[keyUgLegacy];
          } else if (Array.isArray(fanConfig[keyReg])) {
            fansList = fanConfig[keyReg];
          }
        } else if (Array.isArray(fanConfig[keyReg])) {
          fansList = fanConfig[keyReg];
        }
      }

      const nFan = fansList.length;
      const rawFanJam3 =
        nFan >= 2
          ? fansList[nFan - 2]
          : nFan === 1
          ? fansList[0]
          : 'Bandongan / Syawir';
      const fanJam3 =
        nFan >= 1
          ? ambilNamaFanSingkat(rawFanJam3, tingkat, dinKls, fanConfig)
          : 'Bandongan / Syawir';
      const fanJam4 = nFan >= 1 ? fansList[nFan - 1] : '(Takror) Takror';

      const blokMustahiq = dapatkanBlokDariSesiMengajar(
        [{ kelas: ownClassWithGender, lokasi: lokDin }],
        a,
        formasiList,
        asatidzList
      );

      if (!jamSudahAda.has(3)) {
        result[3].push({
          jamNum: 3,
          jamKe: 'Jam 3',
          nama,
          nia,
          gender,
          tingkat,
          dinKls,
          dinBag,
          jah,
          blok: blokMustahiq,
          kelasMengajar: ownClassWithGender,
          fan: fanJam3 || 'Bandongan / Syawir',
          fanAsli: rawFanJam3 || 'Bandongan / Syawir',
          lokasi: lokDin,
          lokasiGabungan: `${ownClassWithGender} (${lokDin})`,
        });
      }

      if (!jamSudahAda.has(4)) {
        result[4].push({
          jamNum: 4,
          jamKe: 'Jam 4',
          nama,
          nia,
          gender,
          tingkat,
          dinKls,
          dinBag,
          jah,
          blok: blokMustahiq,
          kelasMengajar: ownClassWithGender,
          fan: fanJam4 || '(Takror) Takror',
          fanAsli: fanJam4 || '(Takror) Takror',
          lokasi: lokTak,
          lokasiGabungan: `${ownClassWithGender} (${lokTak})`,
        });
      }
    }
  });

  // Deteksi bentrok kelas pada Jam 1 dan Jam 2 + urutkan berdasarkan kelasMengajar A-Z
  ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
    if (j === 1 || j === 2) {
      const counts: Record<string, number> = {};
      result[j].forEach((s) => {
        const kNorm = normalisasiNamaKelas(s.kelasMengajar);
        if (kNorm && kNorm !== '-') {
          counts[kNorm] = (counts[kNorm] || 0) + 1;
        }
      });
      result[j].forEach((s) => {
        const kNorm = normalisasiNamaKelas(s.kelasMengajar);
        if (kNorm && counts[kNorm] > 1) {
          s.isBentrok = true;
        }
      });
    }

    result[j].sort((a, b) =>
      bandingkanUrutanKelasUniversal(a.kelasMengajar, b.kelasMengajar) ||
      String(a.nama || '').localeCompare(String(b.nama || ''))
    );
  });

  return result;
}

/**
 * Mengurai seluruh rekaman dari map database menjadi daftar RiwayatAbsensiItem terurut menurun
 */
export function bangunDaftarRiwayatAbsensi(
  rawBucketMap: Record<string, unknown>,
  asatidzList: Asatidz[],
  formasiList: Formasi[]
): RiwayatAbsensiItem[] {
  const list: RiwayatAbsensiItem[] = [];
  if (!rawBucketMap || typeof rawBucketMap !== 'object') return list;

  const mapGuruUpper = new Map<string, Asatidz>();
  (asatidzList || []).forEach((a) => {
    if (a.nama_asatidz) {
      mapGuruUpper.set(a.nama_asatidz.trim().toUpperCase(), a);
    }
  });

  Object.entries(rawBucketMap).forEach(([key, bucketVal]) => {
    if (!bucketVal || typeof bucketVal !== 'object') return;

    // Cek apakah format V3 ("YYYY-MM-DD|Jam X" -> { tanggal, hari, jamKe, data: [...] })
    const bObj = bucketVal as Record<string, unknown>;
    if (Array.isArray(bObj.data)) {
      const [keyTgl, keyJam] = key.split('|');
      const tanggal = String(bObj.tanggal || keyTgl || '');
      const hari = String(bObj.hari || getNamaHariDariTgl(tanggal));
      const jamKe = String(bObj.jamKe || keyJam || 'Jam 1');

      bObj.data.forEach((tuple) => {
        const item = unpackCompactArrayToSesi(tuple, tanggal, hari, jamKe);
        if (!item) return;

        if (!item.diinputOleh && bObj.diinputOleh) {
          item.diinputOleh = String(bObj.diinputOleh);
        }
        if (!item.waktuUpdate && bObj.waktuUpdate) {
          item.waktuUpdate = String(bObj.waktuUpdate);
        }

        // Backfill blok / gender bila kosong
        const guru = mapGuruUpper.get(item.nama.trim().toUpperCase());
        if ((!item.gender || item.gender === '-') && guru?.pa_pi) {
          item.gender = guru.pa_pi;
        }
        if (!item.blok || item.blok === '-' || item.blok === 'Belum Diatur') {
          item.blok = dapatkanBlokDariSesiMengajar(
            [{ kelas: item.kelasMengajar, lokasi: item.lokasi }],
            guru,
            formasiList,
            asatidzList
          );
        }

        list.push(item);
      });
    } else {
      // Format legacy: { [date]: { 1: [...], 2: [...], 3: [...], 4: [...] } }
      const tanggal = key;
      const hari = getNamaHariDariTgl(tanggal);
      ([1, 2, 3, 4] as JamKbm[]).forEach((jamNum) => {
        const arr = bObj[jamNum] || bObj[String(jamNum)];
        if (Array.isArray(arr)) {
          arr.forEach((rec) => {
            const item = unpackCompactArrayToSesi(rec, tanggal, hari, `Jam ${jamNum}`);
            if (!item) return;
            const guru = mapGuruUpper.get(item.nama.trim().toUpperCase());
            if ((!item.gender || item.gender === '-') && guru?.pa_pi) {
              item.gender = guru.pa_pi;
            }
            if (!item.blok || item.blok === '-' || item.blok === 'Belum Diatur') {
              item.blok = dapatkanBlokDariSesiMengajar(
                [{ kelas: item.kelasMengajar, lokasi: item.lokasi }],
                guru,
                formasiList,
                asatidzList
              );
            }
            list.push(item);
          });
        }
      });
    }
  });

  list.sort((a, b) => {
    const cmpTgl = String(b.tanggal).localeCompare(String(a.tanggal));
    if (cmpTgl !== 0) return cmpTgl;
    const cmpJam = String(b.jamKe).localeCompare(String(a.jamKe), undefined, { numeric: true });
    if (cmpJam !== 0) return cmpJam;
    return (
      bandingkanUrutanKelasUniversal(a.kelasMengajar, b.kelasMengajar) ||
      String(a.nama || '').localeCompare(String(b.nama || ''))
    );
  });

  return list;
}

/**
 * Mengurai nama kelas ("1 A ULA (PA)") menjadi komponen pengurutan laporan WA
 */
function parseKelasInfoForWA(
  kelasStr: string,
  sesiFallback?: { tingkat?: string; dinKls?: string; dinBag?: string; gender?: string }
): {
  tingkat: string;
  klsNum: number;
  klsStr: string;
  bag: string;
  gender: string;
  displayLabel: string;
} {
  const clean = formatTampilanKelas(kelasStr || '');
  let gender = sesiFallback?.gender || '';
  const mGen = clean.match(/\(\s*(PA|PI)\s*\)/i);
  if (mGen) {
    gender = mGen[1].toUpperCase();
  }

  const noParen = clean
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const m = noParen.match(/^(\d+)\s+([A-Za-z0-9]+)\s+(ULA|WUSTHO|ULYA|ISTI'DAD|IST)/i);
  if (m) {
    const klsStr = m[1];
    const bag = m[2].toUpperCase();
    const tingkat = m[3].toUpperCase() === 'IST' ? "ISTI'DAD" : m[3].toUpperCase();
    const genSuffix = gender && gender !== '-' ? ` (${gender})` : '';
    return {
      tingkat,
      klsNum: parseInt(klsStr, 10) || 99,
      klsStr,
      bag,
      gender,
      displayLabel: `${tingkat} ${klsStr} ${bag}${genSuffix}`,
    };
  }

  const fallbackTkt = String(sesiFallback?.tingkat || 'LAINNYA').toUpperCase();
  const fallbackKls = String(sesiFallback?.dinKls || '');
  const fallbackBag = String(sesiFallback?.dinBag || '').toUpperCase();
  const genSuffix = gender && gender !== '-' ? ` (${gender})` : '';

  if (fallbackKls && fallbackKls !== '-' && fallbackBag && fallbackBag !== '-') {
    return {
      tingkat: fallbackTkt,
      klsNum: parseInt(fallbackKls, 10) || 99,
      klsStr: fallbackKls,
      bag: fallbackBag,
      gender,
      displayLabel: `${fallbackTkt} ${fallbackKls} ${fallbackBag}${genSuffix}`,
    };
  }

  return {
    tingkat: fallbackTkt,
    klsNum: 99,
    klsStr: '-',
    bag: noParen || '-',
    gender,
    displayLabel: clean || '-',
  };
}

export function getEmojiStatusWA(status: string | null | undefined): string {
  const s = String(status || '').toLowerCase().trim();
  if (s === 'hadir') return '✅';
  if (s === 'alfa' || s === 'jadwal kosong') return '🅰️';
  if (s === 'izin') return 'ℹ️';
  if (s === 'sakit') return '🤒';
  if (s === 'terlambat') return '⏳';
  if (s === 'digantikan' || s === 'badal') return '🔄';
  if (s === 'tugas lain' || s === 'tugas') return '📋';
  return '❓';
}

function getEmojiForStatus(status: StatusAbsensi | ''): string {
  return getEmojiStatusWA(status);
}

export function parseKelasWA(str: string): { tingkatOrder: number; angka: number; bagian: string } {
  const upper = String(str || '').toUpperCase();
  let tingkatOrder = 99;
  if (/\bULA\b/.test(upper)) tingkatOrder = 1;
  else if (/\b(WUSTHO|WUSTHA)\b/.test(upper)) tingkatOrder = 2;
  else if (/\bULYA\b/.test(upper)) tingkatOrder = 3;
  else if (/\b(ISTI['’]?DAD|IST)\b/.test(upper)) tingkatOrder = 4;

  const matchAngka = upper.match(/\b(\d+)\b/);
  const angka = matchAngka ? parseInt(matchAngka[1], 10) : 0;

  const bagian = upper
    .replace(/\b(ULA|WUSTHO|WUSTHA|ULYA|ISTI['’]?DAD|IST)\b/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .trim();

  return { tingkatOrder, angka, bagian };
}

export interface GenerateLaporanWAParams {
  tanggal: string;
  sesiHariIni: Record<JamKbm, SesiJadwalHarian[]>;
  getSesiStatus: (sesi: SesiJadwalHarian) => StatusSesiData;
  jamNums?: JamKbm[];
  selectedJams?: number[];
  filterGender?: 'SEMUA' | 'PA' | 'PI';
  judulJamLabel?: string;
  isLibur?: boolean;
  infoLibur?: HariLiburInfo | null;
}

/**
 * Menghasilkan teks Laporan WhatsApp berformat resmi Madrasah Diniyyah
 * dikelompokkan per Blok dan diurutkan per Tingkat & Kelas (100% kompatibel referensi madinblokagung-main).
 */
/**
 * Format nama asatidz untuk laporan WhatsApp:
 * 1. Setiap asatidz putra diawali 'Ust.' dan putri diawali 'Ustz.'
 * 2. Membersihkan gelar/awalan yang mungkin sudah tertulis di master data agar tidak duplikat
 * 3. Membatasi panjang nama maksimal 14 karakter; jika lebih dari 14 huruf, selanjutnya menjadi ' ...'
 */
export function formatNamaAsatidzWA(
  nama: string,
  gender?: 'PA' | 'PI' | string
): string {
  if (!nama || !nama.trim()) return '-';

  // 1. Bersihkan prefix gelar lama jika ada (misal: "Ust.", "Ustadz", "Ustz.", "Ustadzah")
  let cleanName = nama
    .trim()
    .replace(/^(ust(\.|adz)?|ustz(\.|adzah)?)\s+/i, '')
    .trim();

  // 2. Potong maksimal 14 karakter jika melebihi
  let truncated = cleanName;
  if (cleanName.length > 14) {
    truncated = cleanName.slice(0, 14).trimEnd() + ' ...';
  }

  // 3. Tambahkan prefix berdasarkan gender
  const isPI = String(gender || '').trim().toUpperCase() === 'PI';
  const prefix = isPI ? 'Ustz. ' : 'Ust. ';

  return `${prefix}${truncated}`;
}

export function generateLaporanWAText({
  tanggal,
  sesiHariIni,
  getSesiStatus,
  jamNums,
  selectedJams,
  filterGender = 'SEMUA',
  isLibur = false,
  infoLibur = null,
}: GenerateLaporanWAParams): string {
  const tglPanjang = formatTanggalPanjangIndo(tanggal).toUpperCase();

  if (isLibur && infoLibur) {
    return (
      `*INFORMASI KBM MADRASAH DINIYYAH*\n` +
      ` Pondok Pesantren Darussalam Blokagung\n` +
      `🗓️ *${tglPanjang}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📌 *STATUS HARI INI: LIBUR / EVENT KHUSUS*\n` +
      `🏷️ Kategori : *${infoLibur.kategori || 'Libur'}*\n` +
      `📝 Keterangan : ${infoLibur.keterangan || '-'}\n\n` +
      `_Kegiatan Belajar Mengajar (KBM) reguler diliburkan._`
    );
  }

  // Tentukan jam yang diproses
  let jamsToProcess: number[] = [];
  if (selectedJams && selectedJams.length > 0) {
    jamsToProcess = selectedJams;
  } else if (jamNums && jamNums.length > 0) {
    jamsToProcess = jamNums;
  } else {
    jamsToProcess = [1, 2];
  }

  if (jamsToProcess.length === 0) {
    return 'Silakan pilih minimal satu Sesi Jam di atas.';
  }

  const hariRaw = getNamaHariDariTgl(tanggal).toUpperCase();
  let tglHeader = tanggal;
  if (tanggal.includes('-')) {
    const p = tanggal.split('-');
    const BULAN_IND = [
      'JANUARI',
      'FEBRUARI',
      'MARET',
      'APRIL',
      'MEI',
      'JUNI',
      'JULI',
      'AGUSTUS',
      'SEPTEMBER',
      'OKTOBER',
      'NOVEMBER',
      'DESEMBER',
    ];
    const blnNama = BULAN_IND[parseInt(p[1], 10) - 1] || p[1];
    tglHeader = `${hariRaw}, ${parseInt(p[2], 10)} ${blnNama} ${p[0]}`;
  }

  interface SessionRecordWA {
    jam: number;
    status: string;
    emoji: string;
  }

  interface GuruClassRecordWA {
    guru: string;
    gender: 'PA' | 'PI' | string;
    sessions: SessionRecordWA[];
  }

  const mapBlok: Record<string, Record<string, Record<string, GuruClassRecordWA>>> = {};
  const allGuruStatusMap: Record<string, string[]> = {};

  jamsToProcess.forEach((j) => {
    const sesiList = sesiHariIni[j as JamKbm] || [];
    sesiList.forEach((s) => {
      // Deteksi gender sesi (PA / PI)
      let genderSesi = String(s.gender || '').trim().toUpperCase();
      if (!genderSesi) {
        const klsGabung = `${s.kelasMengajar || ''} ${s.lokasiGabungan || ''}`.toUpperCase();
        if (klsGabung.includes('(PA)') || /\bPA\b/.test(klsGabung)) genderSesi = 'PA';
        else if (klsGabung.includes('(PI)') || /\bPI\b/.test(klsGabung)) genderSesi = 'PI';
      }

      if (filterGender !== 'SEMUA' && genderSesi && genderSesi !== filterGender) {
        return;
      }

      const stData = getSesiStatus(s);
      const status = stData && stData.status ? stData.status : 'Alfa';
      const emoji = getEmojiStatusWA(status);

      const blokBersih = String(s.blok || '')
        .replace(/^blok\s*/i, '')
        .trim()
        .toUpperCase();
      const isBelumDiatur = !blokBersih || blokBersih === '-' || blokBersih === 'BELUM DIATUR';
      const blokNama = isBelumDiatur ? 'BELUM DIATUR' : blokBersih;

      if (!mapBlok[blokNama]) mapBlok[blokNama] = {};

      // Bersihkan label (PA) / (PI) dari nama kelas agar tampilan laporan rapi
      const klsKey = String(s.kelasMengajar || 'Lain-lain')
        .replace(/\s*\((PA|PI)\)\s*/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!mapBlok[blokNama][klsKey]) mapBlok[blokNama][klsKey] = {};

      const guruKey = s.nama.trim();
      if (!mapBlok[blokNama][klsKey][guruKey]) {
        mapBlok[blokNama][klsKey][guruKey] = {
          guru: s.nama,
          gender: genderSesi,
          sessions: [],
        };
      }
      mapBlok[blokNama][klsKey][guruKey].sessions.push({
        jam: j,
        status,
        emoji,
      });

      if (!allGuruStatusMap[guruKey]) allGuruStatusMap[guruKey] = [];
      allGuruStatusMap[guruKey].push(status);
    });
  });

  // Hitung statistik guru unik
  const totalGuru = Object.keys(allGuruStatusMap).length;
  let hadirCount = 0;
  let alpaCount = 0;
  let izinCount = 0;

  Object.values(allGuruStatusMap).forEach((statusArr) => {
    if (statusArr.every((st) => st === 'Hadir' || st === 'Terlambat')) {
      hadirCount++;
    } else if (statusArr.some((st) => st === 'Izin' || st === 'Sakit')) {
      izinCount++;
    } else {
      alpaCount++;
    }
  });

  let labelKategori = '';
  if (filterGender === 'PA') labelKategori = ' (PUTRA / PA)';
  else if (filterGender === 'PI') labelKategori = ' (PUTRI / PI)';

  const listJudul: string[] = [];
  if (jamsToProcess.includes(1) || jamsToProcess.includes(2)) listJudul.push('DINIYYAH');
  if (jamsToProcess.includes(3)) listJudul.push('BANDONGAN & SYAWIR');
  if (jamsToProcess.includes(4)) listJudul.push('TAKROR');

  const judulAbsensi =
    listJudul.length > 0 ? 'ABSENSI ' + listJudul.join(' & ') : 'ABSENSI DINIYYAH';

  let out = `${judulAbsensi}${labelKategori} ${tglHeader}\n`;
  out += `JUMLAH GURU: ${totalGuru}\n`;
  out += `HADIR: ${hadirCount}\n`;
  out += `ALPA: ${alpaCount}\n`;
  out += `IZIN: ${izinCount}\n\n`;

  const blokKeys = Object.keys(mapBlok).sort((a, b) => bandingkanBlokHariKBM(a, b));

  if (blokKeys.length === 0) {
    out += `_Tidak ada data jadwal pengajar untuk kategori ${filterGender} pada jam yang dipilih._\n`;
  } else {
    blokKeys.forEach((bKey) => {
      let headerBlok = '';
      if (bKey === 'BELUM DIATUR') {
        headerBlok = '⚠️ BLOK BELUM DIATUR';
      } else {
        const emojiBlok = bKey.includes('9') ? '🏢' : '🏠';
        headerBlok = `${emojiBlok} BLOK ${bKey.replace(/^BLOK\s*/i, '').trim()}`;
      }
      out += `${headerBlok}\n`;

      const kelasMap = mapBlok[bKey];
      const kelasKeys = Object.keys(kelasMap).sort((a, b) => {
        const infA = parseKelasWA(a);
        const infB = parseKelasWA(b);
        if (infA.tingkatOrder !== infB.tingkatOrder) return infA.tingkatOrder - infB.tingkatOrder;
        if (infA.angka !== infB.angka) return infA.angka - infB.angka;
        if (infA.bagian !== infB.bagian) {
          return infA.bagian.localeCompare(infB.bagian, undefined, { numeric: true });
        }
        return a.localeCompare(b);
      });

      let noUrut = 1;
      kelasKeys.forEach((kKey) => {
        const guruMap = kelasMap[kKey];
        const listGuruTeks: string[] = [];

        Object.values(guruMap).forEach((gItem) => {
          const formattedName = formatNamaAsatidzWA(gItem.guru, gItem.gender);
          const firstEmoji = gItem.sessions[0]?.emoji || '❓';
          const isSemuaSama = gItem.sessions.every((se) => se.emoji === firstEmoji);
          if (isSemuaSama) {
            listGuruTeks.push(`${formattedName} ${firstEmoji}`);
          } else {
            const detailJam = gItem.sessions.map((se) => `J${se.jam}:${se.emoji}`).join(' ');
            listGuruTeks.push(`${formattedName} (${detailJam})`);
          }
        });

        const guruStr = listGuruTeks.join(' & ');
        out += `${noUrut}. ${kKey} ${guruStr}\n`;
        noUrut++;
      });

      out += `\n`;
    });
  }

  return out.trim();
}
