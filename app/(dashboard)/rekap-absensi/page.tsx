'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart2,
  RefreshCw,
  Search,
  Printer,
  FileSpreadsheet,
  Trophy,
  MessageSquare,
  Filter,
  RotateCcw,
  Users,
  TrendingUp,
  XOctagon,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import { Asatidz } from '@/types/asatidz';
import { Formasi } from '@/types/formasi';
import { TeacherJadwalRow } from '@/types/jadwal';
import {
  ARRAY_HARI_IND,
  ARRAY_BULAN_IND,
  bangunDaftarRiwayatAbsensi,
} from '@/lib/utils/absensiHelper';
import {
  parseJadwalCell_Client,
  formatTampilanKelas,
  formatLabelBlokHariKBM,
  bandingkanBlokHariKBM,
} from '@/lib/utils/jadwalHelper';
import ModalGeneratorWA from '@/components/modules/rekap-absensi/ModalGeneratorWA';
import ModalDrilldownRekap, {
  RekapAsatidzRow,
  getPredikatBadgeClass,
} from '@/components/modules/rekap-absensi/ModalDrilldownRekap';

type QuickRangeType = 'minggu' | 'bulan' | 'lalu' | 'custom';

type SortKeyRekap =
  | 'nama'
  | 'nia'
  | 'blok'
  | 'jah'
  | 'totalTerjadwal'
  | 'hadir'
  | 'izin'
  | 'sakit'
  | 'alfa'
  | 'terlambatCount'
  | 'digantikan'
  | 'pct'
  | 'predikat';

/**
 * Memformat label Blok pada Rekap Absensi (mengembalikan 'Belum Diatur' bila kosong / '-')
 */
function formatLabelBlokRekap(blok: string | null | undefined): string {
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

/**
 * Menentukan Blok Kelas Asatidz berdasarkan lokasi mengajar / lokasi Diniyyah & Takror pada Formasi Kelas
 */
function dapatkanBlokRekapAsatidz(
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
    if (
      foundFormasi &&
      foundFormasi.blok &&
      String(foundFormasi.blok).trim() !== '-'
    ) {
      return formatLabelBlokRekap(foundFormasi.blok);
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
      if (
        foundKelas &&
        foundKelas.blok &&
        String(foundKelas.blok).trim() !== '-'
      ) {
        return formatLabelBlokRekap(foundKelas.blok);
      }
    }
  }

  return '-';
}

/**
 * Memformat tanggal "YYYY-MM-DD" menjadi format Bahasa Indonesia (contoh: "1 Oktober 2026")
 */
function formatTanggalIndoRekap(ymd: string): string {
  if (!ymd) return '-';
  const p = String(ymd).split('-');
  if (p.length < 3) return ymd;
  const blnIdx = parseInt(p[1], 10) - 1;
  return `${parseInt(p[2], 10)} ${ARRAY_BULAN_IND[blnIdx] || p[1]} ${p[0]}`;
}

/**
 * Menghitung rentang tanggal 'minggu' | 'bulan' | 'lalu'
 */
function computeQuickRangeDates(tipe: 'minggu' | 'bulan' | 'lalu'): {
  dari: string;
  sampai: string;
} {
  const now = new Date();
  let dDari: Date;
  let dSampai: Date;

  if (tipe === 'minggu') {
    const day = now.getDay(); // 0=Ahad ... 6=Sabtu
    const diffToMonday = day === 0 ? 6 : day - 1;
    dDari = new Date(now);
    dDari.setDate(now.getDate() - diffToMonday);
    dSampai = new Date(dDari);
    dSampai.setDate(dDari.getDate() + 6);
  } else if (tipe === 'lalu') {
    dDari = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    dSampai = new Date(now.getFullYear(), now.getMonth(), 0);
  } else {
    dDari = new Date(now.getFullYear(), now.getMonth(), 1);
    dSampai = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  return { dari: fmt(dDari), sampai: fmt(dSampai) };
}

export default function RekapAbsensiPage() {
  const {
    rawBucketMap,
    liburMapByDate,
    fetchAbsensi,
    isLoading: loadingAbsensi,
  } = useAbsensiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { jadwalMap, fetchJadwal } = useJadwalStore();

  // Default periode: Bulan Ini (sama seperti inisialisasiHalamanRekapAbsensi di madinblokagung-main)
  const initialRange = useMemo(() => computeQuickRangeDates('bulan'), []);
  const [startDate, setStartDate] = useState<string>(initialRange.dari);
  const [endDate, setEndDate] = useState<string>(initialRange.sampai);
  const [activeRangePreset, setActiveRangePreset] =
    useState<QuickRangeType>('bulan');

  // Filter Kriteria
  const [filterBlok, setFilterBlok] = useState<string>('');
  const [filterTingkat, setFilterTingkat] = useState<string>('');
  const [filterJah, setFilterJah] = useState<string>('');
  const [filterNama, setFilterNama] = useState<string>('');

  // Kontrol Tabel DataTables (PageSize, Quick Search, Sort, Pagination)
  const [tableSearch, setTableSearch] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [page, setPage] = useState<number>(1);
  const [sortKey, setSortKey] = useState<SortKeyRekap>('pct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Modals & Dropdowns
  const [showWAModal, setShowWAModal] = useState<boolean>(false);
  const [showTop10Dropdown, setShowTop10Dropdown] = useState<boolean>(false);
  const [selectedTeacherRow, setSelectedTeacherRow] =
    useState<RekapAsatidzRow | null>(null);
  const [printMode, setPrintMode] = useState<'rekap' | 'top10'>('rekap');
  const [toastMsg, setToastMsg] = useState<{
    type: 'info' | 'success';
    text: string;
  } | null>(null);

  const showToast = (type: 'info' | 'success', text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    fetchAbsensi();
    if (asatidzList.length === 0) fetchAsatidz();
    if (formasiList.length === 0) fetchFormasi();
    if (Object.keys(jadwalMap).length === 0) fetchJadwal();
  }, [
    fetchAbsensi,
    fetchAsatidz,
    fetchFormasi,
    fetchJadwal,
    asatidzList.length,
    formasiList.length,
    jadwalMap,
  ]);

  const handleSetQuickRange = (tipe: 'minggu' | 'bulan' | 'lalu') => {
    const { dari, sampai } = computeQuickRangeDates(tipe);
    setStartDate(dari);
    setEndDate(sampai);
    setActiveRangePreset(tipe);
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterBlok('');
    setFilterTingkat('');
    setFilterJah('');
    setFilterNama('');
    setTableSearch('');
    handleSetQuickRange('bulan');
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      fetchAbsensi(true),
      fetchAsatidz(),
      fetchFormasi(),
      fetchJadwal(true),
    ]);
    showToast('success', 'Data rekap absensi berhasil disegarkan.');
  };

  // Opsi Dropdown Filter Blok, Tingkat, dan Jah
  const { opsiBlok, opsiTingkat, opsiJah } = useMemo(() => {
    const setBlok = new Set<string>();
    const setTingkat = new Set<string>();
    const setJah = new Set<string>();

    (formasiList || []).forEach((f) => {
      const blk = String(f.blok || '').trim();
      if (blk && blk !== '-' && blk.toLowerCase() !== 'belum diatur') {
        setBlok.add(formatLabelBlokRekap(blk));
      }
    });

    (asatidzList || []).forEach((a) => {
      const tkt = String(a.tingkat_asatidz || '').trim().toUpperCase();
      if (tkt && tkt !== '-') setTingkat.add(tkt);

      const jah = String(a.jah_asatidz || '').trim();
      if (jah && jah !== '-') setJah.add(jah);
    });

    return {
      opsiBlok: Array.from(setBlok).sort((a, b) => bandingkanBlokHariKBM(a, b)),
      opsiTingkat: Array.from(setTingkat).sort(),
      opsiJah: Array.from(setJah).sort(),
    };
  }, [formasiList, asatidzList]);

  // ENGINE UTAMA: hitungRekapAbsensi (1:1 dengan rekap-absensi.js di madinblokagung-main)
  const allRekapRows: RekapAsatidzRow[] = useMemo(() => {
    if (!startDate || !endDate) return [];

    // Bangun peta cepat jadwal berdasarkan nama asatidz uppercase
    const mapJadwalUpper: Record<string, TeacherJadwalRow> = {};
    Object.entries(jadwalMap || {}).forEach(([k, val]) => {
      mapJadwalUpper[k.trim().toUpperCase()] = val;
      if (val && val.nama_asatidz) {
        mapJadwalUpper[String(val.nama_asatidz).trim().toUpperCase()] = val;
      }
    });

    // 1. Peta jumlah sesi per guru per hari (Sabtu..Kamis)
    const schedulePerGuruHari: Record<string, Record<string, number>> = {};

    (asatidzList || []).forEach((a) => {
      const nama = String(a.nama_asatidz || '').trim();
      if (!nama) return;
      const key = nama.toUpperCase();
      schedulePerGuruHari[key] = {
        Sabtu: 0,
        Ahad: 0,
        Senin: 0,
        Selasa: 0,
        Rabu: 0,
        Kamis: 0,
      };

      const jdwObj = mapJadwalUpper[key];
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
        const jamSet = new Set<number>();

        slots.forEach((s) => {
          if (s.jam >= 1 && s.jam <= 4) {
            jamSet.add(s.jam);
          }
        });

        // Jika Mustahiq memiliki Kelas Asal lengkap & mengajar pada hari tersebut, tambahkan Jam 3 & 4
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
          jamSet.add(3);
          jamSet.add(4);
        }

        schedulePerGuruHari[key][hari] = jamSet.size;
      });
    });

    // 2. Hitung berapa kali tiap nama hari (Sabtu..Kamis) muncul dalam rentang tanggal (kecuali hari libur)
    const weekdayCount: Record<string, number> = {
      Sabtu: 0,
      Ahad: 0,
      Senin: 0,
      Selasa: 0,
      Rabu: 0,
      Kamis: 0,
    };

    const dCursor = new Date(startDate + 'T00:00:00');
    const dEnd = new Date(endDate + 'T00:00:00');
    let pengaman = 0;

    while (dCursor <= dEnd && pengaman < 5000) {
      const yyyy = dCursor.getFullYear();
      const mm = String(dCursor.getMonth() + 1).padStart(2, '0');
      const dd = String(dCursor.getDate()).padStart(2, '0');
      const ymd = `${yyyy}-${mm}-${dd}`;

      const isHariLibur = Boolean(liburMapByDate && liburMapByDate[ymd]);
      if (!isHariLibur) {
        const namaHari = ARRAY_HARI_IND[dCursor.getDay()];
        if (Object.prototype.hasOwnProperty.call(weekdayCount, namaHari)) {
          weekdayCount[namaHari]++;
        }
      }
      dCursor.setDate(dCursor.getDate() + 1);
      pengaman++;
    }

    // 3. Saring data riwayat absensi sesuai rentang tanggal
    const semuaRiwayat = bangunDaftarRiwayatAbsensi(
      rawBucketMap,
      asatidzList,
      formasiList
    );
    const riwayatFiltered = semuaRiwayat.filter(
      (r) => r.tanggal >= startDate && r.tanggal <= endDate
    );

    // 4. Inisialisasi rekap dari master Asatidz
    const mapAsatidz: Record<string, Omit<RekapAsatidzRow, 'tidakTerlaksana' | 'pct' | 'predikat'>> = {};

    (asatidzList || []).forEach((a) => {
      const nama = String(a.nama_asatidz || '').trim();
      if (!nama) return;
      const key = nama.toUpperCase();
      const sch = schedulePerGuruHari[key] || {};

      let totalTerjadwal = 0;
      Object.keys(weekdayCount).forEach((hari) => {
        totalTerjadwal += (sch[hari] || 0) * weekdayCount[hari];
      });

      mapAsatidz[key] = {
        nama,
        nia: a.nia || '-',
        blok: dapatkanBlokRekapAsatidz(a, formasiList),
        jah: a.jah_asatidz || '-',
        tingkat: a.tingkat_asatidz || '-',
        totalTerjadwal,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alfa: 0,
        terlambatCount: 0,
        terlambatMenit: 0,
        digantikan: 0,
        tugasLain: 0,
        jadwalKosong: 0,
        totalTercatat: 0,
        detail: [],
      };
    });

    // 5. Masukkan rekaman absensi tersimpan ke masing-masing Asatidz
    riwayatFiltered.forEach((r) => {
      const nama = String(r.nama || '').trim();
      if (!nama || nama === '-') return;
      const key = nama.toUpperCase();

      if (!mapAsatidz[key]) {
        mapAsatidz[key] = {
          nama,
          nia: r.nia || '-',
          blok: dapatkanBlokRekapAsatidz(null, formasiList, r.lokasi || ''),
          jah: '-',
          tingkat: r.tingkat || '-',
          totalTerjadwal: 0,
          hadir: 0,
          izin: 0,
          sakit: 0,
          alfa: 0,
          terlambatCount: 0,
          terlambatMenit: 0,
          digantikan: 0,
          tugasLain: 0,
          jadwalKosong: 0,
          totalTercatat: 0,
          detail: [],
        };
      }

      const obj = mapAsatidz[key];
      const status = r.status;
      obj.totalTercatat++;

      if (status === 'Hadir') obj.hadir++;
      else if (status === 'Izin') obj.izin++;
      else if (status === 'Sakit') obj.sakit++;
      else if (status === 'Alfa') obj.alfa++;
      else if (status === 'Terlambat') {
        obj.terlambatCount++;
        obj.terlambatMenit += parseInt(r.menitTerlambat || '0', 10) || 0;
      } else if (status === 'Digantikan' || status === 'Badal') {
        obj.digantikan++;
      } else if (status === 'Tugas Lain' || status === 'Tugas') {
        obj.tugasLain++;
      } else if (status === 'Jadwal Kosong') {
        obj.jadwalKosong++;
      }

      obj.detail.push({
        tanggal: r.tanggal,
        hari: r.hari,
        jam: r.jamKe,
        kelas: r.kelasMengajar,
        fan: r.fan,
        status,
        keterangan: r.keterangan || '',
        menitTerlambat: r.menitTerlambat || '',
        pengganti: r.namaPengganti || '',
      });
    });

    // 6. Hitung metrik turunan: sesi tidak terlaksana, % kehadiran, dan predikat
    const rows: RekapAsatidzRow[] = Object.values(mapAsatidz)
      .map((o) => {
        const kekuranganTanpaData = Math.max(
          0,
          o.totalTerjadwal - o.totalTercatat
        );
        const tidakTerlaksana =
          o.alfa + o.jadwalKosong + kekuranganTanpaData;
        const dasarHadir = o.hadir + o.terlambatCount;
        const pct =
          o.totalTerjadwal > 0 ? (dasarHadir / o.totalTerjadwal) * 100 : 0;
        const predikat: RekapAsatidzRow['predikat'] =
          pct >= 95
            ? 'Sangat Baik'
            : pct >= 85
            ? 'Baik'
            : pct >= 70
            ? 'Perlu Perhatian'
            : 'Kritis';

        return {
          ...o,
          tidakTerlaksana,
          pct,
          predikat,
        };
      })
      .filter((o) => o.totalTerjadwal > 0 || o.totalTercatat > 0);

    return rows;
  }, [
    startDate,
    endDate,
    asatidzList,
    formasiList,
    jadwalMap,
    rawBucketMap,
    liburMapByDate,
  ]);

  // Saring berdasarkan Filter Kriteria (Blok, Tingkat, Jah, Cari Nama Asatidz)
  const criteriaFilteredRows = useMemo(() => {
    return allRekapRows.filter((o) => {
      if (filterBlok) {
        if (filterBlok === '-') {
          if (
            o.blok !== '-' &&
            formatLabelBlokRekap(o.blok) !== 'Belum Diatur'
          ) {
            return false;
          }
        } else if (formatLabelBlokRekap(o.blok) !== filterBlok) {
          return false;
        }
      }
      if (
        filterTingkat &&
        String(o.tingkat || '').trim().toUpperCase() !==
          filterTingkat.toUpperCase()
      ) {
        return false;
      }
      if (filterJah && String(o.jah || '').trim() !== filterJah) {
        return false;
      }
      if (filterNama.trim()) {
        const q = filterNama.trim().toLowerCase();
        if (
          !o.nama.toLowerCase().includes(q) &&
          !String(o.nia || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [allRekapRows, filterBlok, filterTingkat, filterJah, filterNama]);

  // Hitung 4 Kartu KPI Ringkasan dari criteriaFilteredRows
  const kpiSummary = useMemo(() => {
    const total = criteriaFilteredRows.length;
    if (total === 0) {
      return {
        total: 0,
        avgPct: '0%',
        tidakTerlaksana: 0,
        terendahNama: '-',
        terendahPct: '0%',
      };
    }

    let sumPct = 0;
    let sumTidakTerlaksana = 0;
    let terendah = criteriaFilteredRows[0];

    criteriaFilteredRows.forEach((o) => {
      sumPct += o.pct;
      sumTidakTerlaksana += o.tidakTerlaksana;
      if (o.totalTerjadwal > 0 && o.pct < terendah.pct) {
        terendah = o;
      }
    });

    return {
      total,
      avgPct: `${(sumPct / total).toFixed(1)}%`,
      tidakTerlaksana: sumTidakTerlaksana,
      terendahNama: terendah.nama,
      terendahPct: `${terendah.pct.toFixed(1)}% Kehadiran`,
    };
  }, [criteriaFilteredRows]);

  // Saring berdasarkan input "Cari:" di atas tabel & urutkan berdasarkan kolom aktif
  const sortedTableRows = useMemo(() => {
    const searched = !tableSearch.trim()
      ? criteriaFilteredRows
      : criteriaFilteredRows.filter((o) => {
          const q = tableSearch.trim().toLowerCase();
          const hay = `${o.nama} ${o.nia} ${formatLabelBlokRekap(o.blok)} ${o.jah} ${o.predikat}`.toLowerCase();
          return hay.includes(q);
        });

    return [...searched].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nama':
          cmp = a.nama.localeCompare(b.nama);
          break;
        case 'nia':
          cmp = a.nia.localeCompare(b.nia, undefined, { numeric: true });
          break;
        case 'blok':
          cmp = bandingkanBlokHariKBM(
            formatLabelBlokRekap(a.blok),
            formatLabelBlokRekap(b.blok)
          );
          break;
        case 'jah':
          cmp = a.jah.localeCompare(b.jah);
          break;
        case 'totalTerjadwal':
          cmp = a.totalTerjadwal - b.totalTerjadwal;
          break;
        case 'hadir':
          cmp = a.hadir - b.hadir;
          break;
        case 'izin':
          cmp = a.izin - b.izin;
          break;
        case 'sakit':
          cmp = a.sakit - b.sakit;
          break;
        case 'alfa':
          cmp = a.alfa - b.alfa;
          break;
        case 'terlambatCount':
          cmp = a.terlambatCount - b.terlambatCount;
          break;
        case 'digantikan':
          cmp = a.digantikan - b.digantikan;
          break;
        case 'predikat':
          cmp = a.predikat.localeCompare(b.predikat);
          break;
        case 'pct':
        default:
          cmp = a.pct - b.pct;
          break;
      }
      if (cmp === 0) {
        return a.nama.localeCompare(b.nama);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [criteriaFilteredRows, tableSearch, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedTableRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const startIdx = (page - 1) * pageSize;
    return sortedTableRows.slice(startIdx, startIdx + pageSize);
  }, [sortedTableRows, page, pageSize]);

  const handleSortColumn = (key: SortKeyRekap) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Data Top 10 Alfa (hanya asatidz dengan alfa > 0, diurutkan alfa desc lalu pct asc)
  const top10AlfaList = useMemo(() => {
    const source =
      criteriaFilteredRows.length > 0 ? criteriaFilteredRows : allRekapRows;
    return [...source]
      .filter((o) => o.alfa > 0)
      .sort((a, b) => {
        if (b.alfa !== a.alfa) return b.alfa - a.alfa;
        return a.pct - b.pct;
      })
      .slice(0, 10);
  }, [criteriaFilteredRows, allRekapRows]);

  // ============================================================================
  // EXPORT EXCEL (2 SHEET: "Ringkasan" & "Detail") & CETAK DOKUMEN RESMI
  // ============================================================================
  const handleExportRekapExcel = () => {
    if (criteriaFilteredRows.length === 0) {
      showToast('info', 'Tidak ada data rekap untuk diekspor.');
      return;
    }

    const ringkasanHeader = [
      'No',
      'Asatidz',
      'NIA',
      'Blok',
      'Jah',
      'Sesi Terjadwal',
      'Hadir',
      'Izin',
      'Sakit',
      'Alfa',
      'Terlambat (Jml)',
      'Terlambat (Menit)',
      'Digantikan',
      'Sesi Tidak Terlaksana',
      '% Kehadiran',
      'Predikat',
    ];
    const ringkasanData: Array<Array<string | number>> = [ringkasanHeader];

    const detailHeader = [
      'Asatidz',
      'NIA',
      'Tanggal',
      'Hari',
      'Jam',
      'Kelas',
      'Fan',
      'Status',
      'Keterangan',
    ];
    const detailData: Array<Array<string | number>> = [detailHeader];

    criteriaFilteredRows.forEach((o, i) => {
      ringkasanData.push([
        i + 1,
        o.nama,
        o.nia,
        formatLabelBlokRekap(o.blok),
        o.jah,
        o.totalTerjadwal,
        o.hadir,
        o.izin,
        o.sakit,
        o.alfa,
        o.terlambatCount,
        o.terlambatMenit,
        o.digantikan,
        o.tidakTerlaksana,
        `${o.pct.toFixed(1)}%`,
        o.predikat,
      ]);

      (o.detail || []).forEach((d) => {
        detailData.push([
          o.nama,
          o.nia,
          d.tanggal,
          d.hari,
          d.jam,
          d.kelas,
          d.fan,
          d.status,
          d.keterangan,
        ]);
      });
    });

    const ws1 = XLSX.utils.aoa_to_sheet(ringkasanData);
    const ws2 = XLSX.utils.aoa_to_sheet(detailData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, ws2, 'Detail');
    XLSX.writeFile(
      wb,
      `Rekap_Absensi_Asatidz_${startDate}_sd_${endDate}.xlsx`
    );
  };

  const handleCetakRekapResmi = () => {
    if (criteriaFilteredRows.length === 0) {
      showToast('info', 'Tidak ada data rekap untuk dicetak.');
      return;
    }
    setPrintMode('rekap');
    document.body.classList.add('printing-rekap-resmi');
    setTimeout(() => {
      window.print();
      setTimeout(
        () => document.body.classList.remove('printing-rekap-resmi'),
        500
      );
    }, 150);
  };

  const handleCetakTop10Alfa = () => {
    setShowTop10Dropdown(false);
    if (top10AlfaList.length === 0) {
      showToast(
        'info',
        'Data Alfa Bersih: Tidak ada Asatidz yang memiliki status Alfa pada rentang tanggal atau filter ini.'
      );
      return;
    }
    setPrintMode('top10');
    document.body.classList.add('printing-rekap-resmi');
    setTimeout(() => {
      window.print();
      setTimeout(
        () => document.body.classList.remove('printing-rekap-resmi'),
        500
      );
    }, 150);
  };

  const handleExportTop10AlfaExcel = () => {
    setShowTop10Dropdown(false);
    if (top10AlfaList.length === 0) {
      showToast(
        'info',
        'Data Alfa Bersih: Tidak ada Asatidz yang memiliki status Alfa pada rentang tanggal atau filter ini.'
      );
      return;
    }

    const headers = [
      'Rank',
      'Nama Asatidz',
      'NIA',
      'Blok',
      'Jah',
      'Sesi Terjadwal',
      'Total Alfa',
      'Terlambat (Kali)',
      'Terlambat (Menit)',
      'Total Hadir',
      '% Kehadiran',
      'Predikat',
    ];
    const wsData: Array<Array<string | number>> = [headers];

    top10AlfaList.forEach((o, i) => {
      wsData.push([
        i + 1,
        o.nama,
        o.nia || '-',
        formatLabelBlokRekap(o.blok),
        o.jah || '-',
        o.totalTerjadwal,
        o.alfa,
        o.terlambatCount,
        o.terlambatMenit,
        o.hadir,
        `${o.pct.toFixed(1)}%`,
        o.predikat,
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Top_10_Alfa');
    XLSX.writeFile(
      wb,
      `Top_10_Alfa_Asatidz_${startDate}_sd_${endDate}.xlsx`
    );
  };

  const renderSortIcon = (colKey: SortKeyRekap) => {
    if (sortKey !== colKey) {
      return <ArrowUpDown className="w-3 h-3 text-slate-300 inline ml-1" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-emerald-700 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 text-emerald-700 inline ml-1" />
    );
  };

  return (
    <div className="space-y-4 pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold animate-in fade-in slide-in-from-bottom-4 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-700'
              : 'bg-slate-800 text-white border-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* ====================================================================
          1. HEADER UTAMA SESUAI GAMBAR 2 (rekap-absensi.html)
      ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 no-print-kbm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              <BarChart2 className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-800 m-0 leading-tight">
                Rekap Absensi Asatidz
              </h1>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Ringkasan kinerja kehadiran mengajar per periode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap relative">
            <button
              type="button"
              onClick={() => setShowWAModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs inline-flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Broadcast WA</span>
            </button>

            <button
              type="button"
              onClick={handleRefreshAll}
              disabled={loadingAbsensi}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition shadow-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loadingAbsensi ? 'animate-spin' : ''
                }`}
              />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handleExportRekapExcel}
              className="px-3.5 py-2 text-xs font-bold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition shadow-xs inline-flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleCetakRekapResmi}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Resmi</span>
            </button>

            {/* Dropdown Top 10 Alfa */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTop10Dropdown((prev) => !prev)}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border border-rose-400 text-rose-600 hover:bg-rose-50 transition shadow-xs inline-flex items-center gap-1.5"
              >
                <Trophy className="w-3.5 h-3.5 text-rose-500" />
                <span>Top 10 Alfa</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showTop10Dropdown && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-1.5 text-[11px] font-extrabold text-rose-600 uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    TOP 10 ALFA TERBANYAK
                  </div>
                  <hr className="my-1 border-slate-100" />
                  <button
                    type="button"
                    onClick={handleCetakTop10Alfa}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-600" />
                    Cetak Dokumen Resmi
                  </button>
                  <button
                    type="button"
                    onClick={handleExportTop10AlfaExcel}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Unduh Berkas Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. PANEL FILTER PERIODE & KRITERIA (SESUAI GAMBAR 2)
      ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3 no-print-kbm">
        <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Periode &amp; Kriteria</span>
        </div>

        {/* Baris 1 Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveRangePreset('custom');
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActiveRangePreset('custom');
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pintasan Periode
            </label>
            <div className="grid grid-cols-3 rounded-lg border border-emerald-700 overflow-hidden bg-white">
              <button
                type="button"
                onClick={() => handleSetQuickRange('minggu')}
                className={`py-1.5 text-xs font-bold transition-colors ${
                  activeRangePreset === 'minggu'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange('bulan')}
                className={`py-1.5 text-xs font-bold border-x border-emerald-700 transition-colors ${
                  activeRangePreset === 'bulan'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetQuickRange('lalu')}
                className={`py-1.5 text-xs font-bold transition-colors ${
                  activeRangePreset === 'lalu'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Bulan Lalu
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Blok
            </label>
            <select
              value={filterBlok}
              onChange={(e) => {
                setFilterBlok(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Blok</option>
              {opsiBlok.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="-">Belum Diatur</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tingkat
            </label>
            <select
              value={filterTingkat}
              onChange={(e) => {
                setFilterTingkat(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua</option>
              {opsiTingkat.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Baris 2 Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Jah
            </label>
            <select
              value={filterJah}
              onChange={(e) => {
                setFilterJah(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua</option>
              {opsiJah.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Cari Nama Asatidz
            </label>
            <input
              type="text"
              value={filterNama}
              onChange={(e) => {
                setFilterNama(e.target.value);
                setPage(1);
              }}
              placeholder="Ketik nama..."
              className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="lg:col-span-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-1.5 px-3 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. EMPAT KARTU KPI RINGKASAN GLOBAL (SESUAI GAMBAR 2)
      ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 no-print-kbm">
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">
              Total Asatidz
            </div>
            <div className="text-2xl font-black text-slate-800 leading-tight">
              {kpiSummary.total}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">
              Rata-rata % Kehadiran
            </div>
            <div className="text-2xl font-black text-emerald-600 leading-tight">
              {kpiSummary.avgPct}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <XOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-500">
              Sesi Tidak Terlaksana
            </div>
            <div className="text-2xl font-black text-rose-600 leading-tight">
              {kpiSummary.tidakTerlaksana}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-slate-500">
              Kehadiran Terendah
            </div>
            <div className="text-sm font-black text-slate-800 truncate mt-0.5">
              {kpiSummary.terendahNama}
            </div>
            <div className="text-[11px] font-semibold text-slate-400">
              {kpiSummary.terendahPct}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          4. TABEL UTAMA 14 KOLOM (SESUAI GAMBAR 2)
      ==================================================================== */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3 no-print-kbm">
        {/* Kontrol Atas Tabel: Tampilkan X data & Cari */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Tampilkan</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>data</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Cari:</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Tabel 14 Kolom */}
        <div className="overflow-x-auto border-y border-slate-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200 select-none">
                <th className="py-3 px-2.5 text-center w-10">NO</th>
                <th
                  onClick={() => handleSortColumn('nama')}
                  className="py-3 px-3 text-left cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  ASATIDZ {renderSortIcon('nama')}
                </th>
                <th
                  onClick={() => handleSortColumn('nia')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  NIA {renderSortIcon('nia')}
                </th>
                <th
                  onClick={() => handleSortColumn('blok')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  BLOK {renderSortIcon('blok')}
                </th>
                <th
                  onClick={() => handleSortColumn('jah')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  JAH {renderSortIcon('jah')}
                </th>
                <th
                  onClick={() => handleSortColumn('totalTerjadwal')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  SESI TERJADWAL {renderSortIcon('totalTerjadwal')}
                </th>
                <th
                  onClick={() => handleSortColumn('hadir')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  HADIR {renderSortIcon('hadir')}
                </th>
                <th
                  onClick={() => handleSortColumn('izin')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  IZIN {renderSortIcon('izin')}
                </th>
                <th
                  onClick={() => handleSortColumn('sakit')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  SAKIT {renderSortIcon('sakit')}
                </th>
                <th
                  onClick={() => handleSortColumn('alfa')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  ALFA {renderSortIcon('alfa')}
                </th>
                <th
                  onClick={() => handleSortColumn('terlambatCount')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  TERLAMBAT {renderSortIcon('terlambatCount')}
                </th>
                <th
                  onClick={() => handleSortColumn('digantikan')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  DIGANTIKAN {renderSortIcon('digantikan')}
                </th>
                <th
                  onClick={() => handleSortColumn('pct')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  % KEHADIRAN {renderSortIcon('pct')}
                </th>
                <th
                  onClick={() => handleSortColumn('predikat')}
                  className="py-3 px-2.5 text-center cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                >
                  PREDIKAT {renderSortIcon('predikat')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={14}
                    className="py-10 text-center text-slate-400 text-xs"
                  >
                    Tidak ada data pada periode/filter ini.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((o, idx) => {
                  const rowNo = (page - 1) * pageSize + idx + 1;
                  const labelBlok = formatLabelBlokRekap(o.blok);

                  return (
                    <tr
                      key={o.nama}
                      onClick={() => setSelectedTeacherRow(o)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Klik untuk melihat rincian kehadiran harian"
                    >
                      <td className="py-3 px-2.5 text-center text-slate-600">
                        {rowNo}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-slate-800 whitespace-nowrap">
                        {o.nama}
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-600">
                        {o.nia}
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px]">
                          {labelBlok}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-600 whitespace-nowrap">
                        {o.jah}
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-700">
                        {o.totalTerjadwal}
                      </td>
                      <td className="py-3 px-2.5 text-center font-extrabold text-emerald-700">
                        {o.hadir}
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-700">
                        {o.izin}
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-700">
                        {o.sakit}
                      </td>
                      <td className="py-3 px-2.5 text-center font-extrabold text-rose-600">
                        {o.alfa}
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-700 whitespace-nowrap">
                        {o.terlambatCount}x{' '}
                        <span className="text-[11px] text-slate-400">
                          ({o.terlambatMenit} mnt)
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-center text-slate-700">
                        {o.digantikan}
                      </td>
                      <td className="py-3 px-2.5 text-center font-extrabold text-slate-800">
                        {o.pct.toFixed(1)}%
                      </td>
                      <td className="py-3 px-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded border font-bold text-[10px] ${getPredikatBadgeClass(
                            o.predikat
                          )}`}
                        >
                          {o.predikat}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel: Info Halaman, Pagination, & Catatan Kaki */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
          <div>
            {sortedTableRows.length === 0 ? (
              <span>Menampilkan 0 data</span>
            ) : (
              <span>
                Menampilkan <strong>{(page - 1) * pageSize + 1}</strong> -{' '}
                <strong>
                  {Math.min(page * pageSize, sortedTableRows.length)}
                </strong>{' '}
                dari <strong>{sortedTableRows.length}</strong> Asatidz
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="px-2.5 py-1 font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 italic flex items-center gap-1 pt-1">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>
            Klik salah satu baris/nama Asatidz untuk melihat rincian harian.
          </span>
        </p>
      </div>

      {/* ====================================================================
          5. WADAH CETAK DOKUMEN RESMI (#areaCetakRekapResmi)
      ==================================================================== */}
      <div id="areaCetakRekapResmi" className="hidden print:block">
        {printMode === 'rekap' ? (
          <div>
            <div className="text-center mb-4">
              <h2 className="font-bold uppercase text-base m-0">
                Rekap Absensi Asatidz
              </h2>
              <h3 className="font-bold text-sm m-0 mt-0.5">
                Madrasah Diniyyah Al Amiriyyah
              </h3>
              <p className="text-xs m-0 mt-1">
                Periode: {formatTanggalIndoRekap(startDate)} s/d{' '}
                {formatTanggalIndoRekap(endDate)}
              </p>
            </div>

            <table className="tabel-cetak-resmi w-full">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Asatidz</th>
                  <th>NIA</th>
                  <th>Blok</th>
                  <th>Sesi Terjadwal</th>
                  <th>Hadir</th>
                  <th>Izin</th>
                  <th>Sakit</th>
                  <th>Alfa</th>
                  <th>Terlambat</th>
                  <th>Digantikan</th>
                  <th>% Hadir</th>
                  <th>Predikat</th>
                </tr>
              </thead>
              <tbody>
                {criteriaFilteredRows.map((o, i) => (
                  <tr key={o.nama}>
                    <td className="text-center">{i + 1}</td>
                    <td>{o.nama}</td>
                    <td className="text-center">{o.nia}</td>
                    <td className="text-center">
                      {formatLabelBlokRekap(o.blok)}
                    </td>
                    <td className="text-center">{o.totalTerjadwal}</td>
                    <td className="text-center">{o.hadir}</td>
                    <td className="text-center">{o.izin}</td>
                    <td className="text-center">{o.sakit}</td>
                    <td className="text-center">{o.alfa}</td>
                    <td className="text-center">
                      {o.terlambatCount} ({o.terlambatMenit} mnt)
                    </td>
                    <td className="text-center">{o.digantikan}</td>
                    <td className="text-center">{o.pct.toFixed(1)}%</td>
                    <td className="text-center">{o.predikat}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 mt-10 text-center text-xs">
              <div>
                <p className="m-0">Mengetahui,</p>
                <p className="m-0">Kepala TU</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
              <div>
                <p className="m-0">
                  {formatTanggalIndoRekap(
                    new Date().toISOString().slice(0, 10)
                  )}
                </p>
                <p className="m-0">Pengasuh</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center mb-4">
              <h2 className="font-bold uppercase text-base text-rose-700 m-0">
                TOP 10 ASATIDZ STATUS ALFA TERBANYAK
              </h2>
              <h3 className="font-bold text-sm m-0 mt-0.5">
                MADRASAH DINIYYAH AL AMIRIYYAH
              </h3>
              <p className="text-xs m-0 mt-1">
                Periode: {formatTanggalIndoRekap(startDate)} s/d{' '}
                {formatTanggalIndoRekap(endDate)}
              </p>
            </div>

            <table className="tabel-cetak-resmi w-full">
              <thead>
                <tr>
                  <th className="text-center">RANK</th>
                  <th>NAMA ASATIDZ</th>
                  <th className="text-center">NIA</th>
                  <th className="text-center">BLOK</th>
                  <th className="text-center">JAH</th>
                  <th className="text-center">TERJADWAL</th>
                  <th className="text-center">TOTAL ALFA</th>
                  <th className="text-center">TERLAMBAT</th>
                  <th className="text-center">HADIR</th>
                  <th className="text-center">% HADIR</th>
                  <th className="text-center">PREDIKAT</th>
                </tr>
              </thead>
              <tbody>
                {top10AlfaList.map((o, i) => (
                  <tr key={o.nama}>
                    <td className="text-center font-bold">{i + 1}</td>
                    <td className="font-bold">{o.nama}</td>
                    <td className="text-center font-mono">{o.nia || '-'}</td>
                    <td className="text-center">
                      {formatLabelBlokRekap(o.blok)}
                    </td>
                    <td className="text-center">{o.jah || '-'}</td>
                    <td className="text-center">{o.totalTerjadwal}</td>
                    <td className="text-center font-bold text-rose-700">
                      {o.alfa} Sesi
                    </td>
                    <td className="text-center">
                      {o.terlambatCount} ({o.terlambatMenit} mnt)
                    </td>
                    <td className="text-center">{o.hadir}</td>
                    <td className="text-center font-bold">
                      {o.pct.toFixed(1)}%
                    </td>
                    <td className="text-center">{o.predikat}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 gap-8 mt-10 text-center text-xs">
              <div>
                <p className="m-0">Mengetahui,</p>
                <p className="m-0">Kepala Bagian Kesiswaan</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
              <div>
                <p className="m-0">
                  {formatTanggalIndoRekap(
                    new Date().toISOString().slice(0, 10)
                  )}
                </p>
                <p className="m-0">Staf Kurikulum / TU</p>
                <div className="h-16" />
                <p className="font-bold m-0">
                  (...........................................)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          MODALS
      ==================================================================== */}
      <ModalGeneratorWA
        isOpen={showWAModal}
        onClose={() => setShowWAModal(false)}
      />

      <ModalDrilldownRekap
        isOpen={Boolean(selectedTeacherRow)}
        onClose={() => setSelectedTeacherRow(null)}
        teacherData={selectedTeacherRow}
      />
    </div>
  );
}
