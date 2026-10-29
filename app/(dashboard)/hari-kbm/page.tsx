'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useJadwalStore, LIST_HARI } from '@/stores/useJadwalStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useFanStore } from '@/stores/useFanStore';
import {
  CalendarDays,
  Table as TableIcon,
  LayoutGrid,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Search,
  X,
  MapPin,
  Building2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  parseSlotHariKBM,
  dapatkanBlokDariSesiMengajar,
  cariMustahiqKelasHariKBM,
  formatLabelBlokHariKBM,
  bandingkanBlokHariKBM,
  normalisasiNamaKelas,
  buildMasterStrukturKelasKBM,
  getJadwalGuruFromMap,
} from '@/lib/utils/jadwalHelper';
import { compareNIANatural } from '@/lib/utils/fanHelper';
import { GuruAktifHariKBM, KelompokBlokHariKBM } from '@/types/hari-kbm';
import { Asatidz } from '@/types/asatidz';
import { HierarkiBlokKBMConfig } from '@/types/formasi';
import { loadHierarkiKbm } from '@/lib/services/hierarchy-service';
import ModalDetailKelasKBM from '@/components/modules/jadwal-kbm/ModalDetailKelasKBM';
import ModalInputJadwalKelas from '@/components/modules/jadwal-kbm/ModalInputJadwalKelas';
import ModalDetailAsatidz from '@/components/modules/asatidz/ModalDetailAsatidz';

export default function HariKbmPage() {
  const {
    jadwalMap,
    fetchJadwal,
    isLoading,
    activeHari,
    setActiveHari,
    viewModeHariKbm,
    setViewModeHariKbm,
    openModalDetailKelas,
    rebuildMasterStrukturKelas,
  } = useJadwalStore();

  const { asatidzList, fetchAsatidz, openDetailModal } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { fanItems, fanConfig, fetchFanData } = useFanStore();

  // Hierarki Blok KBM Config
  const [hierarkiConfig, setHierarkiConfig] = useState<HierarkiBlokKBMConfig | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [fltTingkat, setFltTingkat] = useState('');
  const [fltJam, setFltJam] = useState<'semua' | '1' | '2'>('semua');

  useEffect(() => {
    fetchJadwal();
    loadHierarkiKbm().then((cfg) => setHierarkiConfig(cfg));
    if (asatidzList.length === 0) fetchAsatidz();
    if (formasiList.length === 0) fetchFormasi();
    if (fanItems.length === 0) fetchFanData();
  }, [fetchJadwal, fetchAsatidz, fetchFormasi, fetchFanData, asatidzList.length, formasiList.length, fanItems.length]);

  // Build Master Struktur Kelas for ModalDetailKelasKBM & sinkron ke useJadwalStore
  const masterStrukturKelasKBM = useMemo(() => {
    return buildMasterStrukturKelasKBM(formasiList, asatidzList, jadwalMap, fanConfig);
  }, [formasiList, asatidzList, jadwalMap, fanConfig]);

  useEffect(() => {
    rebuildMasterStrukturKelas(formasiList, asatidzList, fanConfig);
  }, [formasiList, asatidzList, jadwalMap, fanConfig, rebuildMasterStrukturKelas]);

  // Helper to open class detail modal by string name
  const handleOpenKelasDetail = (namaKelas: string) => {
    const norm = normalisasiNamaKelas(namaKelas);
    const found = masterStrukturKelasKBM.find((k) => {
      const kNorm1 = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat}`);
      const kNorm2 = normalisasiNamaKelas(`${k.kls} ${k.bag} ${k.tingkat} (${k.papi})`);
      return kNorm1 === norm || kNorm2 === norm || k.key === namaKelas;
    });
    if (found) {
      openModalDetailKelas(found.key);
    } else {
      openModalDetailKelas(namaKelas);
    }
  };

  // 1. Ekstraksi daftar Guru Aktif pada hari yang dipilih (Union asatidzList + jadwalMap)
  const listGuruAktif: GuruAktifHariKBM[] = useMemo(() => {
    const hariKey = activeHari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
    const asatidzMap = new Map<string, Asatidz>();
    const allTeacherNames = new Set<string>();

    asatidzList.forEach((a) => {
      if (a.nama_asatidz) {
        const clean = a.nama_asatidz.trim();
        asatidzMap.set(clean.toUpperCase(), a);
        allTeacherNames.add(clean);
      }
    });

    Object.values(jadwalMap).forEach((jRow) => {
      const n = String(jRow.nama_asatidz || '').trim();
      if (n && !asatidzMap.has(n.toUpperCase())) {
        allTeacherNames.add(n);
      }
    });

    const result: GuruAktifHariKBM[] = [];

    allTeacherNames.forEach((nama) => {
      if (!nama) return;

      const jdwObj = getJadwalGuruFromMap(nama, jadwalMap);
      const rawJadwalHari = jdwObj ? jdwObj[hariKey] || '' : '';
      if (!rawJadwalHari.trim()) return;

      const a: Asatidz = asatidzMap.get(nama.toUpperCase()) || {
        nia: '-',
        nama_asatidz: nama,
        jah_asatidz: '-',
        tingkat_asatidz: '',
        din_kls_asatidz: '',
        din_bag_asatidz: '',
        pa_pi: 'PA',
        lokasi_diniyyah: '',
      };

      const defaultLokasi = String(a.lokasi_diniyyah || '').trim();
      const defaultTingkat = String(a.tingkat_asatidz || '').trim().toUpperCase();
      const defaultKls = String(a.din_kls_asatidz || '').trim();

      const slots = parseSlotHariKBM(
        rawJadwalHari,
        defaultLokasi,
        defaultTingkat,
        defaultKls,
        masterStrukturKelasKBM,
        formasiList,
        fanConfig
      );

      if (slots.length > 0) {
        const blokTerdeteksi = dapatkanBlokDariSesiMengajar(slots, a, formasiList, asatidzList, hierarkiConfig || undefined);

        result.push({
          rawRow: a,
          nia: String(a.nia || '-').trim() || '-',
          nama,
          jah: String(a.jah_asatidz || '-').trim() || '-',
          tingkat: defaultTingkat,
          blok: blokTerdeteksi,
          lokasiDiniyyahMaster: defaultLokasi,
          slots,
        });
      }
    });

    return result;
  }, [activeHari, asatidzList, jadwalMap, masterStrukturKelasKBM, formasiList, fanConfig, hierarkiConfig]);

  // 2. Filter data berdasarkan pencarian, tingkat, dan jam
  const filteredGuruAktif = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qClean = q.replace(/\s+/g, '');
    const fTkt = fltTingkat.trim().toUpperCase();
    const isIstTarget = fTkt === "ISTI'DAD" || fTkt === 'IST';
    const fJamNum = fltJam === '1' ? 1 : fltJam === '2' ? 2 : 0;

    return listGuruAktif.filter((item) => {
      let validSlots = item.slots;

      if (fJamNum > 0) {
        validSlots = validSlots.filter((s) => s.jam === fJamNum);
        if (validSlots.length === 0) return false;
      }

      if (fTkt) {
        const matchTkt = validSlots.some((s) => {
          const kUpper = String(s.kelas || '').toUpperCase();
          if (isIstTarget) return kUpper.includes("ISTI'DAD") || kUpper.includes('IST');
          return kUpper.includes(fTkt);
        }) || (isIstTarget ? (item.tingkat === "ISTI'DAD" || item.tingkat === 'IST') : item.tingkat.includes(fTkt));

        if (!matchTkt) return false;
      }

      if (q) {
        const slotsText = validSlots
          .map(
            (s) =>
              `${s.fan} ${s.fanAsli || ''} ${s.kelas} ${s.lokasi} ${cariMustahiqKelasHariKBM(
                s.kelas,
                masterStrukturKelasKBM,
                asatidzList,
                formasiList
              )}`
          )
          .join(' ')
          .toLowerCase();

        const fullText = `${item.nama} ${item.nia} ${item.jah} ${item.blok} ${slotsText}`.toLowerCase();
        const fullTextClean = fullText.replace(/\s+/g, '');
        if (!fullText.includes(q) && !fullTextClean.includes(qClean)) return false;
      }

      return true;
    });
  }, [listGuruAktif, search, fltTingkat, fltJam, masterStrukturKelasKBM, asatidzList, formasiList]);

  // 3. Kelompokkan per Blok Kelas
  const daftarKelompokBlok: KelompokBlokHariKBM[] = useMemo(() => {
    const mapBlok: Record<string, KelompokBlokHariKBM> = {};

    filteredGuruAktif.forEach((item) => {
      let blokAsli = String(item.blok || '').trim();
      if (!blokAsli || blokAsli === '-') blokAsli = 'Belum Diatur';
      const kunciBlok = blokAsli.replace(/^blok\s*/i, '').trim().toUpperCase();

      if (!mapBlok[kunciBlok]) {
        mapBlok[kunciBlok] = {
          namaBlok: blokAsli,
          daftarAsatidz: [],
        };
      }
      mapBlok[kunciBlok].daftarAsatidz.push(item);
    });

    const kelompokList = Object.values(mapBlok).sort((a, b) =>
      bandingkanBlokHariKBM(a.namaBlok, b.namaBlok)
    );

    // Natural sort by NIA inside each block
    kelompokList.forEach((k) => {
      k.daftarAsatidz.sort((a, b) => compareNIANatural(a.nia, b.nia));
    });

    return kelompokList;
  }, [filteredGuruAktif]);

  // Total jam statistics
  const totalJamTampil = useMemo(() => {
    let count = 0;
    const fJamNum = fltJam === '1' ? 1 : fltJam === '2' ? 2 : 0;
    filteredGuruAktif.forEach((item) => {
      if (fJamNum > 0) {
        count += item.slots.filter((s) => s.jam === fJamNum).length;
      } else {
        count += item.slots.length;
      }
    });
    return count;
  }, [filteredGuruAktif, fltJam]);

  // Export Excel
  const handleExportExcel = () => {
    if (filteredGuruAktif.length === 0) {
      alert('Tidak ada data yang dapat diexport.');
      return;
    }

    const rows: (string | number)[][] = [
      ['NO', 'KODE', 'ASATIDZ', 'JAH', 'BLOK', 'JAM', 'FAN', 'KELAS', 'MUSTAHIQ', 'LOKASI DINIYYAH'],
    ];

    let no = 1;
    daftarKelompokBlok.forEach((kelompok) => {
      kelompok.daftarAsatidz.forEach((item) => {
        let slots = item.slots;
        if (fltJam === '1') slots = slots.filter((s) => s.jam === 1);
        if (fltJam === '2') slots = slots.filter((s) => s.jam === 2);

        slots.forEach((s) => {
          const mustahiq = cariMustahiqKelasHariKBM(s.kelas, masterStrukturKelasKBM, asatidzList, formasiList);
          rows.push([
            no++,
            item.nia,
            item.nama,
            item.jah,
            formatLabelBlokHariKBM(kelompok.namaBlok),
            `Jam ${s.jam}`,
            s.fan,
            s.kelas,
            mustahiq,
            s.lokasi,
          ]);
        });
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Hari_${activeHari}`);
    XLSX.writeFile(wb, `Jadwal_Hari_${activeHari}_Madin.xlsx`);
  };

  const handlePrint = () => {
    document.body.classList.add('printing-hari-kbm');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-hari-kbm');
    }, 600);
  };

  let globalNoUrut = 1;

  return (
    <div className="space-y-6">
      {/* 1. Header & Day Tabs */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
              <CalendarDays className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Hari KBM
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Monitoring penugasan mengajar &amp; lokasi asatidz per hari aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => fetchJadwal(true)}
              disabled={isLoading}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Print</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher Hari (Sabtu - Kamis) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {LIST_HARI.map((hari) => {
              const isActive = activeHari === hari;
              return (
                <button
                  key={hari}
                  type="button"
                  onClick={() => setActiveHari(hari)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition shrink-0 ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'border border-emerald-700/60 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {hari}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              Hari Aktif: <b className="font-bold">{activeHari}</b>
            </span>

            {/* Toggle Mode Tampilan (Tabel / Card) */}
            <div className="inline-flex rounded-lg border border-emerald-700 p-0.5 bg-white">
              <button
                type="button"
                onClick={() => setViewModeHariKbm('table')}
                title="Tampilan Tabel"
                className={`p-1.5 rounded-md transition ${
                  viewModeHariKbm === 'table'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewModeHariKbm('card')}
                title="Tampilan Kartu"
                className={`p-1.5 rounded-md transition ${
                  viewModeHariKbm === 'card'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end mt-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Pencarian Cepat:
            </label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Asatidz / NIA / Kelas / Lokasi..."
                className="w-full text-xs py-2 pl-3 pr-8 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Tingkat Diniyyah:
            </label>
            <select
              value={fltTingkat}
              onChange={(e) => setFltTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            >
              <option value="">Semua Tingkat</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              Sesi Jam:
            </label>
            <select
              value={fltJam}
              onChange={(e) => setFltJam(e.target.value as 'semua' | '1' | '2')}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            >
              <option value="semua">Semua Jam (Jam 1 &amp; Jam 2)</option>
              <option value="1">Jam 1 Saja</option>
              <option value="2">Jam 2 Saja</option>
            </select>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs mt-3 pt-3 border-t border-slate-100">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 font-semibold text-emerald-800">
            {filteredGuruAktif.length} Asatidz Mengajar
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-medium text-slate-700">
            {totalJamTampil} Total Jam (Jam 1 &amp; 2)
          </span>
          <span className="text-slate-400 italic text-[11px] ml-auto">
            *Klik nama Asatidz untuk lihat profil; klik nama Kelas untuk rincian jadwal kelas.
          </span>
        </div>
      </div>

      {/* 2. AREA TAMPILAN RESMI */}
      {viewModeHariKbm === 'table' ? (
        <div className="card-panel border-0 p-4 md:p-6 shadow-sm overflow-hidden" id="areaPrintHariKBM">
          <div className="text-center mb-4">
            <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
              DAFTAR TUGAS MENGAJAR ASATIDZ HARI {activeHari.toUpperCase()}
            </h5>
            <h6 className="font-bold text-slate-500 text-xs md:text-sm m-0 mt-1">
              MADRASAH DINIYYAH AL AMIRIYYAH
            </h6>
          </div>

          <div className="table-responsive overflow-x-auto rounded-xl border border-slate-200 shadow-xs bg-white">
            <table className="tabel-kbm-resmi w-full min-w-[980px]" id="tableHariKBM">
              <thead>
                <tr>
                  <th style={{ width: 44, minWidth: 44 }} className="text-center sticky left-0 z-30 bg-[#e2e8f0]">NO</th>
                  <th style={{ width: 70, minWidth: 70 }} className="text-center sticky left-[44px] z-30 bg-[#e2e8f0] border-r-2 border-r-slate-400">KODE</th>
                  <th style={{ minWidth: 200 }}>ASATIDZ</th>
                  <th style={{ width: 100, minWidth: 100 }} className="text-center">JAH</th>
                  <th style={{ minWidth: 170 }}>MENGAJAR (JAM &amp; FAN)</th>
                  <th style={{ minWidth: 180 }}>KELAS &amp; MUSTAHIQ</th>
                  <th style={{ minWidth: 170 }}>LOKASI DINIYYAH</th>
                </tr>
              </thead>
              <tbody id="tbodyHariKBM">
                {daftarKelompokBlok.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Tidak ada data Asatidz mengajar pada hari <b>{activeHari}</b> yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  daftarKelompokBlok.map((kelompok) => {
                    const labelBlok = formatLabelBlokHariKBM(kelompok.namaBlok);

                    return (
                      <React.Fragment key={kelompok.namaBlok}>
                        {/* 7 Kolom Baris Header Pemisah Blok */}
                        <tr
                          className="table-group-divider"
                          style={{
                            background: 'rgba(15, 118, 110, 0.08)',
                            borderTop: '2px solid #0f766e',
                            borderBottom: '1.5px solid #0f766e',
                          }}
                        >
                          <td colSpan={7} className="py-2.5 px-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-emerald-800" />
                                <span
                                  className="font-bold text-emerald-900 uppercase tracking-wide"
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  {labelBlok}
                                </span>
                              </div>
                              <span className="badge bg-emerald-700 text-white rounded-full px-3 py-1 font-mono text-[11px] shadow-xs">
                                {kelompok.daftarAsatidz.length} Asatidz
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Baris Asatidz di dalam Blok */}
                        {kelompok.daftarAsatidz.map((item) => {
                          const noUrut = globalNoUrut++;
                          const jahLower = item.jah.toLowerCase();
                          const isMustahiq =
                            jahLower.includes('mustahiq') || jahLower.includes('ms & koor');

                          let slotsToShow = item.slots;
                          if (fltJam === '1') slotsToShow = slotsToShow.filter((s) => s.jam === 1);
                          if (fltJam === '2') slotsToShow = slotsToShow.filter((s) => s.jam === 2);

                          return (
                            <tr key={`${kelompok.namaBlok}-${item.nama}`} className="hover:bg-slate-50/70 transition-colors">
                              <td
                                className="text-center font-bold text-slate-400 text-xs sticky left-0 z-10 bg-white"
                                style={{ width: 44, minWidth: 44 }}
                              >
                                {noUrut}
                              </td>
                              <td
                                className="text-center font-mono font-bold text-slate-800 text-xs sticky left-[44px] z-10 bg-white border-r-2 border-r-slate-200"
                                style={{ width: 70, minWidth: 70 }}
                              >
                                {item.nia}
                              </td>
                              <td>
                                <span
                                  onClick={() => openDetailModal(item.rawRow)}
                                  className="font-bold text-slate-800 hover:text-emerald-700 cursor-pointer transition-colors"
                                  title={`Klik untuk lihat profil & jadwal ${item.nama}`}
                                >
                                  {item.nama}
                                </span>
                              </td>
                              <td className="text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10.5px] font-semibold border ${
                                    isMustahiq
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {item.jah}
                                </span>
                              </td>

                              {/* Kolom Mengajar (Jam & Fan) */}
                              <td className="py-2">
                                {slotsToShow.map((slot, sIdx) => (
                                  <div
                                    key={slot.jam}
                                    className={`flex items-center gap-1.5 ${
                                      sIdx > 0 ? 'border-t border-slate-100 pt-1.5 mt-1.5' : ''
                                    }`}
                                  >
                                    <span
                                      className={`inline-block font-mono text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-xs ${
                                        slot.jam === 1 ? 'bg-emerald-600' : 'bg-blue-600'
                                      }`}
                                    >
                                      Jam {slot.jam}
                                    </span>
                                    <span className="font-semibold text-slate-800 text-xs">
                                      {slot.fan}
                                    </span>
                                  </div>
                                ))}
                              </td>

                              {/* Kolom Kelas & Mustahiq */}
                              <td className="py-2">
                                {slotsToShow.map((slot, sIdx) => {
                                  const namaMustahiq = cariMustahiqKelasHariKBM(
                                    slot.kelas,
                                    masterStrukturKelasKBM,
                                    asatidzList,
                                    formasiList
                                  );

                                  return (
                                    <div
                                      key={slot.jam}
                                      onClick={() => handleOpenKelasDetail(slot.kelas)}
                                      className={`rounded px-1.5 py-0.5 hover:bg-emerald-50 cursor-pointer transition-colors ${
                                        sIdx > 0 ? 'border-t border-slate-100 pt-1.5 mt-1.5' : ''
                                      }`}
                                      title={`Klik untuk melihat Detail Kelas ${slot.kelas}`}
                                    >
                                      <div className="font-bold text-slate-800 text-xs hover:text-emerald-700">
                                        {slot.kelas}
                                      </div>
                                      <div className="text-[11px] text-slate-400 leading-tight">
                                        Mustahiq:{' '}
                                        <span className="text-emerald-700 font-semibold">
                                          {namaMustahiq}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </td>

                              {/* Kolom Lokasi Diniyyah */}
                              <td className="py-2">
                                {slotsToShow.map((slot, sIdx) => (
                                  <div
                                    key={slot.jam}
                                    className={`flex items-center gap-1.5 ${
                                      sIdx > 0 ? 'border-t border-slate-100 pt-1.5 mt-1.5' : ''
                                    }`}
                                  >
                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                    <span className="text-slate-600 font-medium text-xs truncate">
                                      {slot.lokasi || '-'}
                                    </span>
                                  </div>
                                ))}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 3. MODE KARTU HARI KBM */
        <div className="space-y-6" id="cardHariKBMWrapper">
          {daftarKelompokBlok.length === 0 ? (
            <div className="card-panel border-0 p-8 text-center text-slate-400">
              Tidak ada data Asatidz mengajar pada hari <b>{activeHari}</b> yang cocok dengan filter pencarian.
            </div>
          ) : (
            daftarKelompokBlok.map((kelompok) => {
              const labelBlok = formatLabelBlokHariKBM(kelompok.namaBlok);

              return (
                <div key={kelompok.namaBlok} className="space-y-3">
                  {/* Banner Blok */}
                  <div className="bg-emerald-700/10 border-l-4 border-emerald-700 px-4 py-2.5 rounded-r-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-800" />
                      <h4 className="font-bold text-emerald-950 uppercase tracking-wide text-sm m-0">
                        {labelBlok}
                      </h4>
                    </div>
                    <span className="badge bg-emerald-700 text-white rounded-full px-3 py-1 font-mono text-xs">
                      {kelompok.daftarAsatidz.length} Asatidz
                    </span>
                  </div>

                  {/* Grid Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {kelompok.daftarAsatidz.map((item) => {
                      const jahLower = item.jah.toLowerCase();
                      const isMustahiq =
                        jahLower.includes('mustahiq') || jahLower.includes('ms & koor');

                      let slotsToShow = item.slots;
                      if (fltJam === '1') slotsToShow = slotsToShow.filter((s) => s.jam === 1);
                      if (fltJam === '2') slotsToShow = slotsToShow.filter((s) => s.jam === 2);

                      return (
                        <div
                          key={item.nama}
                          className="bg-white rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition p-3.5 flex flex-col justify-between"
                        >
                          <div>
                            {/* Card Top: Code & Jah */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-xs font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                                {item.nia}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  isMustahiq
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                {item.jah}
                              </span>
                            </div>

                            {/* Teacher Name */}
                            <h4
                              onClick={() => openDetailModal(item.rawRow)}
                              className="font-bold text-slate-800 hover:text-emerald-700 cursor-pointer text-sm m-0 line-clamp-1 mb-2.5 transition-colors"
                              title={`Klik untuk lihat profil ${item.nama}`}
                            >
                              {item.nama}
                            </h4>

                            {/* Sessions */}
                            <div className="space-y-2 border-t border-slate-100 pt-2.5">
                              {slotsToShow.map((slot) => {
                                const namaMustahiq = cariMustahiqKelasHariKBM(
                                  slot.kelas,
                                  masterStrukturKelasKBM,
                                  asatidzList,
                                  formasiList
                                );

                                return (
                                  <div
                                    key={slot.jam}
                                    className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`font-mono text-[9.5px] font-bold text-white px-1.5 py-0.2 rounded shadow-xs ${
                                          slot.jam === 1 ? 'bg-emerald-600' : 'bg-blue-600'
                                        }`}
                                      >
                                        Jam {slot.jam}
                                      </span>
                                      <span className="font-bold text-slate-800 text-[11px]">
                                        {slot.fan}
                                      </span>
                                    </div>

                                    <div
                                      onClick={() => handleOpenKelasDetail(slot.kelas)}
                                      className="cursor-pointer hover:text-emerald-700 transition"
                                      title="Klik untuk detail kelas"
                                    >
                                      <div className="font-semibold text-slate-700">
                                        Kelas: <span className="text-emerald-700">{slot.kelas}</span>
                                      </div>
                                      <div className="text-[10.5px] text-slate-400">
                                        Mustahiq: <span className="text-slate-600">{namaMustahiq}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-0.5 border-t border-slate-200/60">
                                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                                      <span className="truncate">{slot.lokasi || '-'}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Detail Kelas KBM & Input Jadwal Kelas */}
      <ModalDetailKelasKBM masterStrukturKelas={masterStrukturKelasKBM} />
      <ModalInputJadwalKelas masterStrukturKelas={masterStrukturKelasKBM} />

      {/* Modal Detail Profil Asatidz */}
      <ModalDetailAsatidz />
    </div>
  );
}
