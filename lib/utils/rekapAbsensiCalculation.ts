import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { TeacherJadwalRow } from '@/types/jadwal';
import { HariLiburInfo, BucketAbsensiCompact } from '@/types/absensi';
import { LIST_HARI } from '@/stores/useJadwalStore';
import {
  ARRAY_HARI_IND,
  bangunDaftarRiwayatAbsensi,
} from '@/lib/utils/absensiHelper';
import {
  parseJadwalCell_Client,
  formatTampilanKelas,
  formatLabelBlokHariKBM,
  getJadwalGuruFromMap,
  bandingkanUrutanKelasUniversal,
} from '@/lib/utils/jadwalHelper';
import { DrilldownDetailSession } from '@/components/modules/rekap-absensi/ModalDrilldownRekap';

export type JenjangRekapFilter = 'SEMUA' | 'ULA' | 'WUSTHO' | 'ULYA';

export type StatusRekapKey =
  | 'hadir'
  | 'izin'
  | 'sakit'
  | 'alfa'
  | 'kosong'
  | 'terlambat'
  | 'ganti';

export interface StatusRekapMeta {
  key: StatusRekapKey;
  label: string;
  shortDesc: string;
  badgeClass: string;
  barClass: string;
  textClass: string;
  bgSoftClass: string;
}

export const DAFTAR_STATUS_REKAP_META: StatusRekapMeta[] = [
  {
    key: 'hadir',
    label: 'Hadir',
    shortDesc: 'Hadir mengajar tepat waktu sesuai jadwal KBM',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    barClass: 'bg-emerald-600',
    textClass: 'text-emerald-700',
    bgSoftClass: 'bg-emerald-50/70',
  },
  {
    key: 'izin',
    label: 'Izin',
    shortDesc: 'Izin resmi atau menjalankan tugas kepesantrenan/madrasah',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-200',
    barClass: 'bg-sky-500',
    textClass: 'text-sky-700',
    bgSoftClass: 'bg-sky-50/70',
  },
  {
    key: 'sakit',
    label: 'Sakit',
    shortDesc: 'Berhalangan hadir mengajar karena sakit',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    barClass: 'bg-amber-500',
    textClass: 'text-amber-700',
    bgSoftClass: 'bg-amber-50/70',
  },
  {
    key: 'alfa',
    label: 'Alfa',
    shortDesc: 'Tidak hadir mengajar tanpa keterangan resmi',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
    barClass: 'bg-rose-600',
    textClass: 'text-rose-700',
    bgSoftClass: 'bg-rose-50/70',
  },
  {
    key: 'kosong',
    label: 'Kosong',
    shortDesc: 'Kelas tercatat kosong atau sesi terjadwal belum terlaksana',
    badgeClass: 'bg-slate-200 text-slate-800 border-slate-300',
    barClass: 'bg-slate-600',
    textClass: 'text-slate-700',
    bgSoftClass: 'bg-slate-100/70',
  },
  {
    key: 'terlambat',
    label: 'Terlambat',
    shortDesc: 'Hadir mengajar melewati batas toleransi waktu masuk jam KBM',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    barClass: 'bg-orange-500',
    textClass: 'text-orange-700',
    bgSoftClass: 'bg-orange-50/70',
  },
  {
    key: 'ganti',
    label: 'Ganti',
    shortDesc: 'Sesi mengajar digantikan oleh Asatidz pengganti (Badal)',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    barClass: 'bg-purple-600',
    textClass: 'text-purple-700',
    bgSoftClass: 'bg-purple-50/70',
  },
];

export interface AsatidzStatusDrilldownItem {
  nama: string;
  nia: string;
  blok: string;
  jah: string;
  jenjang: 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA';
  kelasTugas: string;
  statusKey: StatusRekapKey;
  statusCount: number;
  totalSesiGuru: number;
  pctStatusGuru: number;
  totalMenitTerlambat: number;
  sessions: DrilldownDetailSession[];
}

export interface StatusRekapSummaryRow {
  key: StatusRekapKey;
  meta: StatusRekapMeta;
  countActive: number;
  pctActive: number;
  countSemua: number;
  pctSemua: number;
  countUla: number;
  pctUla: number;
  countWustho: number;
  pctWustho: number;
  countUlya: number;
  pctUlya: number;
  totalAsatidzTerlibat: number;
  asatidzList: AsatidzStatusDrilldownItem[];
}

export function formatLabelBlokRekap(blok: string | null | undefined): string {
  const raw = String(blok || '').trim();
  if (
    !raw ||
    raw === '-' ||
    raw.toLowerCase() === 'belum diatur' ||
    raw.toLowerCase() === 'blok belum diatur'
  ) {
    return 'Belum Diatur';
  }
  return formatLabelBlokHariKBM(raw);
}

export function resolveJenjangFromText(
  tingkatRaw?: string | null,
  kelasRaw?: string | null
): 'ULA' | 'WUSTHO' | 'ULYA' | null {
  const combined = `${tingkatRaw || ''} ${kelasRaw || ''}`.toUpperCase();
  if (combined.includes('ULYA')) return 'ULYA';
  if (combined.includes('WUSTHO') || combined.includes('WUSTHA')) return 'WUSTHO';
  if (
    combined.includes('ULA') ||
    combined.includes("ISTI'DAD") ||
    /\bIST\b/.test(combined)
  ) {
    return 'ULA';
  }
  return null;
}

export function resolveTeacherPrimaryJenjang(
  asatidzObj: Asatidz | null | undefined,
  jadwalMap: Record<string, TeacherJadwalRow>,
  formasiList: Formasi[]
): 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA' {
  if (asatidzObj) {
    const direct = resolveJenjangFromText(
      asatidzObj.tingkat_asatidz,
      `${asatidzObj.din_kls_asatidz || ''} ${asatidzObj.din_bag_asatidz || ''}`
    );
    if (direct) return direct;

    const nama = String(asatidzObj.nama_asatidz || '').trim();
    if (nama) {
      const foundFormasi = (formasiList || []).find(
        (f) =>
          String(f.id_mustahiq || '').trim().toUpperCase() ===
          nama.toUpperCase()
      );
      if (foundFormasi) {
        const fromFormasi = resolveJenjangFromText(foundFormasi.tingkat, '');
        if (fromFormasi) return fromFormasi;
      }

      const jdwObj = getJadwalGuruFromMap(nama, jadwalMap);
      if (jdwObj) {
        const counts: Record<'ULA' | 'WUSTHO' | 'ULYA', number> = {
          ULA: 0,
          WUSTHO: 0,
          ULYA: 0,
        };
        LIST_HARI.forEach((hari) => {
          const hariLower = hari.toLowerCase() as keyof TeacherJadwalRow;
          const cellStr = String(jdwObj[hariLower] || '');
          const slots = parseJadwalCell_Client(formatTampilanKelas(cellStr));
          slots.forEach((s) => {
            const j = resolveJenjangFromText('', s.lokasi);
            if (j) counts[j]++;
          });
        });
        if (counts.ULYA > 0 && counts.ULYA >= counts.WUSTHO && counts.ULYA >= counts.ULA) {
          return 'ULYA';
        }
        if (counts.WUSTHO > 0 && counts.WUSTHO >= counts.ULA) {
          return 'WUSTHO';
        }
        if (counts.ULA > 0) {
          return 'ULA';
        }
      }
    }
  }
  return 'LAINNYA';
}

export function dapatkanBlokRekapAsatidz(
  asatidzObj: Asatidz | null | undefined,
  formasiList: Formasi[],
  lokasiOverride = ''
): string {
  const lokTarget = String(
    lokasiOverride ||
      asatidzObj?.lokasi_diniyyah ||
      asatidzObj?.lokasi_takror ||
      ''
  ).trim();

  if (lokTarget && lokTarget !== '-') {
    const normLok = lokTarget
      .replace(/[()]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    const foundFormasi = (formasiList || []).find((f) => {
      const fDin = String(f.lokasi_diniyyah || '')
        .replace(/[()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
      const fTak = String(f.lokasi_takror || '')
        .replace(/[()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
      return (fDin && fDin === normLok) || (fTak && fTak === normLok);
    });
    const formasiBlok = foundFormasi?.blok_diniyyah || foundFormasi?.blok_takror;
    if (formasiBlok && String(formasiBlok).trim() !== '-') {
      return formatLabelBlokRekap(formasiBlok);
    }
  }

  if (asatidzObj) {
    const dinKls = String(asatidzObj.din_kls_asatidz || '').trim();
    const dinBag = String(asatidzObj.din_bag_asatidz || '')
      .trim()
      .toUpperCase();
    const tingkat = String(asatidzObj.tingkat_asatidz || '')
      .trim()
      .toUpperCase();
    const papi = String(asatidzObj.pa_pi || '').trim().toUpperCase();

    if (dinKls && dinBag && tingkat) {
      const foundKelas = (formasiList || []).find((f) => {
        return (
          String(f.din_kls || '').trim() === dinKls &&
          String(f.din_bag || '').trim().toUpperCase() === dinBag &&
          String(f.tingkat || '').trim().toUpperCase() === tingkat &&
          (!papi || String(f.pa_pi || '').trim().toUpperCase() === papi)
        );
      });
      const klsBlok = foundKelas?.blok_diniyyah || foundKelas?.blok_takror;
      if (klsBlok && String(klsBlok).trim() !== '-') {
        return formatLabelBlokRekap(klsBlok);
      }
    }
  }

  return '-';
}

export function mapRawStatusToStatusRekapKey(rawStatus: string): StatusRekapKey {
  const s = String(rawStatus || '').trim();
  if (s === 'Hadir') return 'hadir';
  if (s === 'Izin' || s === 'Tugas Lain' || s === 'Tugas') return 'izin';
  if (s === 'Sakit') return 'sakit';
  if (s === 'Alfa') return 'alfa';
  if (s === 'Terlambat') return 'terlambat';
  if (s === 'Digantikan' || s === 'Badal') return 'ganti';
  return 'kosong';
}

export interface ComputeRekapStatusParams {
  startDate: string;
  endDate: string;
  activeJenjang: JenjangRekapFilter;
  filterBlok: string;
  filterJah: string;
  filterJam: string;
  searchQuery: string;
  includeUnrecordedScheduledAsKosong: boolean;
  asatidzList: Asatidz[];
  formasiList: Formasi[];
  jadwalMap: Record<string, TeacherJadwalRow>;
  rawBucketMap: Record<string, BucketAbsensiCompact>;
  liburMapByDate: Record<string, HariLiburInfo>;
}

export interface ComputeRekapStatusResult {
  rows: StatusRekapSummaryRow[];
  totalsByJenjang: {
    SEMUA: number;
    ULA: number;
    WUSTHO: number;
    ULYA: number;
    active: number;
  };
  totalUniqueTeachersInScope: number;
}

export function computeRekapStatusSummary(
  params: ComputeRekapStatusParams
): ComputeRekapStatusResult {
  const {
    startDate,
    endDate,
    activeJenjang,
    filterBlok,
    filterJah,
    filterJam,
    searchQuery,
    includeUnrecordedScheduledAsKosong,
    asatidzList,
    formasiList,
    jadwalMap,
    rawBucketMap,
    liburMapByDate,
  } = params;

  const emptyTotals = { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0, active: 0 };
  if (!startDate || !endDate) {
    return {
      rows: DAFTAR_STATUS_REKAP_META.map((meta) => ({
        key: meta.key,
        meta,
        countActive: 0,
        pctActive: 0,
        countSemua: 0,
        pctSemua: 0,
        countUla: 0,
        pctUla: 0,
        countWustho: 0,
        pctWustho: 0,
        countUlya: 0,
        pctUlya: 0,
        totalAsatidzTerlibat: 0,
        asatidzList: [],
      })),
      totalsByJenjang: emptyTotals,
      totalUniqueTeachersInScope: 0,
    };
  }

  const normKey = (n: string) => n.trim().replace(/\s+/g, ' ').toUpperCase();

  // Peta profil Asatidz
  const teacherProfileMap = new Map<
    string,
    {
      nama: string;
      nia: string;
      blok: string;
      jah: string;
      jenjang: 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA';
      kelasTugas: string;
      scheduleByHariJam: Record<
        string,
        Array<{ jam: number; kelas: string; jenjang: 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA' }>
      >;
    }
  >();

  (asatidzList || []).forEach((a) => {
    const nama = String(a.nama_asatidz || '').trim();
    if (!nama) return;
    const key = normKey(nama);
    const primaryJenjang = resolveTeacherPrimaryJenjang(a, jadwalMap, formasiList);
    const blok = dapatkanBlokRekapAsatidz(a, formasiList);

    const foundFormasi = (formasiList || []).find(
      (f) => String(f.id_mustahiq || '').trim().toUpperCase() === nama.toUpperCase()
    );
    const kelasTugas = foundFormasi
      ? `${foundFormasi.din_kls} ${foundFormasi.din_bag} ${foundFormasi.tingkat} (${foundFormasi.pa_pi || ''})`
          .replace(/\s+/g, ' ')
          .trim()
      : a.din_kls_asatidz && a.tingkat_asatidz
      ? `${a.din_kls_asatidz} ${a.din_bag_asatidz || ''} ${a.tingkat_asatidz} (${a.pa_pi || ''})`
          .replace(/\s+/g, ' ')
          .trim()
      : '';

    const scheduleByHariJam: Record<
      string,
      Array<{ jam: number; kelas: string; jenjang: 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA' }>
    > = {
      Sabtu: [],
      Ahad: [],
      Senin: [],
      Selasa: [],
      Rabu: [],
      Kamis: [],
    };

    const jdwObj = getJadwalGuruFromMap(nama, jadwalMap);
    const jahLower = String(a.jah_asatidz || '').trim().toLowerCase();
    const dinKls = String(a.din_kls_asatidz || '').trim();
    const dinBag = String(a.din_bag_asatidz || '').trim();
    const tingkat = String(a.tingkat_asatidz || '').trim();
    const isMustahiq =
      jahLower.includes('mustahiq') ||
      jahLower.includes('ms & koor') ||
      jahLower === 'ist' ||
      jahLower.includes("isti'dad");

    LIST_HARI.forEach((hari) => {
      const hariLower = hari.toLowerCase() as keyof TeacherJadwalRow;
      const cellStr = jdwObj ? String(jdwObj[hariLower] || '') : '';
      const slots = parseJadwalCell_Client(formatTampilanKelas(cellStr));
      const slotMap = new Map<
        number,
        { jam: number; kelas: string; jenjang: 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA' }
      >();

      slots.forEach((s) => {
        if (s.jam >= 1 && s.jam <= 4) {
          const slotJenjang =
            resolveJenjangFromText('', s.lokasi) || primaryJenjang;
          slotMap.set(s.jam, {
            jam: s.jam,
            kelas: s.lokasi || kelasTugas || '-',
            jenjang: slotJenjang,
          });
        }
      });

      if (
        isMustahiq &&
        dinKls &&
        dinKls !== '-' &&
        dinBag &&
        dinBag !== '-' &&
        tingkat &&
        tingkat !== '-' &&
        slots.length > 0
      ) {
        const mustahiqKelas = `${dinKls} ${dinBag} ${tingkat}`;
        const mustahiqJenjang =
          resolveJenjangFromText(tingkat, mustahiqKelas) || primaryJenjang;
        if (!slotMap.has(3)) {
          slotMap.set(3, {
            jam: 3,
            kelas: mustahiqKelas,
            jenjang: mustahiqJenjang,
          });
        }
        if (!slotMap.has(4)) {
          slotMap.set(4, {
            jam: 4,
            kelas: mustahiqKelas,
            jenjang: mustahiqJenjang,
          });
        }
      }

      scheduleByHariJam[hari] = Array.from(slotMap.values());
    });

    teacherProfileMap.set(key, {
      nama,
      nia: a.nia || '-',
      blok,
      jah: a.jah_asatidz || '-',
      jenjang: primaryJenjang,
      kelasTugas,
      scheduleByHariJam,
    });
  });

  // Ambil seluruh riwayat absensi pada rentang tanggal
  const semuaRiwayat = bangunDaftarRiwayatAbsensi(
    rawBucketMap,
    asatidzList,
    formasiList
  );
  const riwayatInPeriod = semuaRiwayat.filter(
    (r) => r.tanggal >= startDate && r.tanggal <= endDate
  );

  const qTrim = searchQuery.trim().toLowerCase();
  const qClean = qTrim.replace(/\s+/g, '');

  const matchesTeacherAndSessionCriteria = (
    nama: string,
    nia: string,
    blok: string,
    jah: string,
    jamKe: string,
    kelas: string,
    fan: string,
    statusLabel: string
  ): boolean => {
    const formattedBlok = formatLabelBlokRekap(blok);
    if (filterBlok) {
      if (filterBlok === '-') {
        if (blok !== '-' && formattedBlok !== 'Belum Diatur') return false;
      } else if (formattedBlok !== filterBlok) {
        return false;
      }
    }
    if (filterJah && String(jah || '').trim() !== filterJah) {
      return false;
    }
    if (filterJam && String(jamKe || '').trim() !== filterJam) {
      return false;
    }
    if (qTrim) {
      // Jangan memfilter habis baris status jika kata kunci adalah nama status itu sendiri
      const isSearchingStatusName = DAFTAR_STATUS_REKAP_META.some((m) =>
        m.label.toLowerCase().includes(qTrim)
      );
      if (!isSearchingStatusName) {
        const hay = `${nama} ${nia} ${formattedBlok} ${jah} ${kelas} ${fan} ${statusLabel}`.toLowerCase();
        const hayClean = hay.replace(/\s+/g, '');
        if (!hay.includes(qTrim) && !hayClean.includes(qClean)) {
          return false;
        }
      }
    }
    return true;
  };

  interface NormalizedSessionEvent {
    teacherKey: string;
    nama: string;
    nia: string;
    blok: string;
    jah: string;
    kelasTugas: string;
    jenjang: 'ULA' | 'WUSTHO' | 'ULYA' | 'LAINNYA';
    statusKey: StatusRekapKey;
    detail: DrilldownDetailSession;
  }

  const allEvents: NormalizedSessionEvent[] = [];
  const recordedKeySet = new Set<string>();

  riwayatInPeriod.forEach((r) => {
    const nama = String(r.nama || '').trim();
    if (!nama || nama === '-') return;
    const tKey = normKey(nama);
    const prof = teacherProfileMap.get(tKey);

    const nia = prof?.nia || r.nia || '-';
    const blok =
      prof?.blok && prof.blok !== '-'
        ? prof.blok
        : dapatkanBlokRekapAsatidz(null, formasiList, r.lokasi || '');
    const jah = prof?.jah || '-';
    const kelasTugas = prof?.kelasTugas || r.kelasMengajar || '';
    const jamKe = r.jamKe || 'Jam 1';
    const statusKey = mapRawStatusToStatusRekapKey(r.status);

    const sessionJenjang =
      resolveJenjangFromText(r.tingkat, r.kelasMengajar) ||
      prof?.jenjang ||
      'LAINNYA';

    if (
      !matchesTeacherAndSessionCriteria(
        nama,
        nia,
        blok,
        jah,
        jamKe,
        r.kelasMengajar || kelasTugas,
        r.fan || '',
        r.status || ''
      )
    ) {
      return;
    }

    recordedKeySet.add(`${r.tanggal}|${tKey}|${jamKe}`);

    allEvents.push({
      teacherKey: tKey,
      nama,
      nia,
      blok,
      jah,
      kelasTugas,
      jenjang: sessionJenjang,
      statusKey,
      detail: {
        tanggal: r.tanggal,
        hari: r.hari,
        jam: jamKe,
        kelas: r.kelasMengajar || kelasTugas || '-',
        fan: r.fan || '-',
        status: r.status,
        keterangan: r.keterangan || '',
        menitTerlambat: r.menitTerlambat || '',
        pengganti: r.namaPengganti || '',
      },
    });
  });

  // Jika mode menyertakan sesi terjadwal yang belum tercatat sebagai 'Kosong'
  if (includeUnrecordedScheduledAsKosong) {
    const dCursor = new Date(startDate + 'T00:00:00');
    const dEnd = new Date(endDate + 'T00:00:00');
    let guard = 0;

    while (dCursor <= dEnd && guard < 1500) {
      const yyyy = dCursor.getFullYear();
      const mm = String(dCursor.getMonth() + 1).padStart(2, '0');
      const dd = String(dCursor.getDate()).padStart(2, '0');
      const ymd = `${yyyy}-${mm}-${dd}`;
      const dayIdx = dCursor.getDay();
      const namaHari = ARRAY_HARI_IND[dayIdx];
      const isHariJumat = dayIdx === 5;
      const isLibur = Boolean(liburMapByDate && liburMapByDate[ymd]);

      if (!isHariJumat && !isLibur) {
        teacherProfileMap.forEach((prof, tKey) => {
          const slots = prof.scheduleByHariJam[namaHari] || [];
          slots.forEach((slot) => {
            const jamKe = `Jam ${slot.jam}`;
            const recKey = `${ymd}|${tKey}|${jamKe}`;
            if (recordedKeySet.has(recKey)) return;

            if (
              !matchesTeacherAndSessionCriteria(
                prof.nama,
                prof.nia,
                prof.blok,
                prof.jah,
                jamKe,
                slot.kelas,
                '-',
                'Kosong'
              )
            ) {
              return;
            }

            allEvents.push({
              teacherKey: tKey,
              nama: prof.nama,
              nia: prof.nia,
              blok: prof.blok,
              jah: prof.jah,
              kelasTugas: prof.kelasTugas,
              jenjang: slot.jenjang,
              statusKey: 'kosong',
              detail: {
                tanggal: ymd,
                hari: namaHari,
                jam: jamKe,
                kelas: slot.kelas,
                fan: '-',
                status: 'Jadwal Kosong',
                keterangan: 'Belum tercatat pada rekaman presensi',
                menitTerlambat: '',
                pengganti: '',
              },
            });
          });
        });
      }

      dCursor.setDate(dCursor.getDate() + 1);
      guard++;
    }
  }

  // Hitung total sesi per jenjang
  let totalSemua = 0;
  let totalUla = 0;
  let totalWustho = 0;
  let totalUlya = 0;

  const countsByStatusAndJenjang: Record<
    StatusRekapKey,
    { SEMUA: number; ULA: number; WUSTHO: number; ULYA: number }
  > = {
    hadir: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
    izin: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
    sakit: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
    alfa: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
    kosong: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
    terlambat: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
    ganti: { SEMUA: 0, ULA: 0, WUSTHO: 0, ULYA: 0 },
  };

  // Hitung total sesi per guru pada jenjang aktif (untuk menghitung % status per guru di dalam modal drilldown)
  const teacherTotalInActiveJenjang = new Map<string, number>();
  const uniqueTeachersInScope = new Set<string>();

  allEvents.forEach((ev) => {
    totalSemua++;
    countsByStatusAndJenjang[ev.statusKey].SEMUA++;

    if (ev.jenjang === 'ULA') {
      totalUla++;
      countsByStatusAndJenjang[ev.statusKey].ULA++;
    } else if (ev.jenjang === 'WUSTHO') {
      totalWustho++;
      countsByStatusAndJenjang[ev.statusKey].WUSTHO++;
    } else if (ev.jenjang === 'ULYA') {
      totalUlya++;
      countsByStatusAndJenjang[ev.statusKey].ULYA++;
    }

    const inActiveScope =
      activeJenjang === 'SEMUA' || ev.jenjang === activeJenjang;
    if (inActiveScope) {
      uniqueTeachersInScope.add(ev.teacherKey);
      teacherTotalInActiveJenjang.set(
        ev.teacherKey,
        (teacherTotalInActiveJenjang.get(ev.teacherKey) || 0) + 1
      );
    }
  });

  const totalActive =
    activeJenjang === 'ULA'
      ? totalUla
      : activeJenjang === 'WUSTHO'
      ? totalWustho
      : activeJenjang === 'ULYA'
      ? totalUlya
      : totalSemua;

  const calcPct = (num: number, den: number) =>
    den > 0 ? (num / den) * 100 : 0;

  const rows: StatusRekapSummaryRow[] = DAFTAR_STATUS_REKAP_META.map((meta) => {
    const sKey = meta.key;
    const cSemua = countsByStatusAndJenjang[sKey].SEMUA;
    const cUla = countsByStatusAndJenjang[sKey].ULA;
    const cWustho = countsByStatusAndJenjang[sKey].WUSTHO;
    const cUlya = countsByStatusAndJenjang[sKey].ULYA;
    const cActive =
      activeJenjang === 'ULA'
        ? cUla
        : activeJenjang === 'WUSTHO'
        ? cWustho
        : activeJenjang === 'ULYA'
        ? cUlya
        : cSemua;

    // Kumpulkan daftar Asatidz untuk status ini sesuai activeJenjang
    const teacherMapForStatus = new Map<string, AsatidzStatusDrilldownItem>();

    allEvents.forEach((ev) => {
      if (ev.statusKey !== sKey) return;
      if (activeJenjang !== 'SEMUA' && ev.jenjang !== activeJenjang) return;

      const existing = teacherMapForStatus.get(ev.teacherKey);
      const menit = parseInt(ev.detail.menitTerlambat || '0', 10) || 0;
      const totalSesiGuru = teacherTotalInActiveJenjang.get(ev.teacherKey) || 1;

      if (!existing) {
        teacherMapForStatus.set(ev.teacherKey, {
          nama: ev.nama,
          nia: ev.nia,
          blok: ev.blok,
          jah: ev.jah,
          jenjang: ev.jenjang,
          kelasTugas: ev.kelasTugas,
          statusKey: sKey,
          statusCount: 1,
          totalSesiGuru,
          pctStatusGuru: (1 / totalSesiGuru) * 100,
          totalMenitTerlambat: menit,
          sessions: [ev.detail],
        });
      } else {
        existing.statusCount += 1;
        existing.totalMenitTerlambat += menit;
        existing.pctStatusGuru = (existing.statusCount / totalSesiGuru) * 100;
        existing.sessions.push(ev.detail);
      }
    });

    const sortedTeacherList = Array.from(teacherMapForStatus.values()).sort(
      (a, b) => {
        if (b.statusCount !== a.statusCount) {
          return b.statusCount - a.statusCount;
        }
        if (b.pctStatusGuru !== a.pctStatusGuru) {
          return b.pctStatusGuru - a.pctStatusGuru;
        }
        const cmpKls = bandingkanUrutanKelasUniversal(
          a.kelasTugas,
          b.kelasTugas
        );
        if (cmpKls !== 0) return cmpKls;
        return a.nama.localeCompare(b.nama);
      }
    );

    return {
      key: sKey,
      meta,
      countActive: cActive,
      pctActive: calcPct(cActive, totalActive),
      countSemua: cSemua,
      pctSemua: calcPct(cSemua, totalSemua),
      countUla: cUla,
      pctUla: calcPct(cUla, totalUla),
      countWustho: cWustho,
      pctWustho: calcPct(cWustho, totalWustho),
      countUlya: cUlya,
      pctUlya: calcPct(cUlya, totalUlya),
      totalAsatidzTerlibat: sortedTeacherList.length,
      asatidzList: sortedTeacherList,
    };
  });

  return {
    rows,
    totalsByJenjang: {
      SEMUA: totalSemua,
      ULA: totalUla,
      WUSTHO: totalWustho,
      ULYA: totalUlya,
      active: totalActive,
    },
    totalUniqueTeachersInScope: uniqueTeachersInScope.size,
  };
}
