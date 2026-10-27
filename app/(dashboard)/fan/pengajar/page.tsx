'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useFanStore } from '@/stores/useFanStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import {
  sortAsatidzByKodeNatural,
} from '@/lib/utils/fanHelper';
import {
  buildUnifiedTeacherMap,
  buildSyncJadwalToFanPayload,
  normNameKey,
  normalizeTingkatName,
} from '@/lib/utils/pengajarFanHelper';
import * as XLSX from 'xlsx';
import ModalGrupAsal from '@/components/modules/fan/ModalGrupAsal';
import ModalDetailAsatidz from '@/components/modules/asatidz/ModalDetailAsatidz';
import {
  Users,
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  RotateCcw,
  X,
  Star,
  Sparkles,
} from 'lucide-react';
import { Asatidz } from '@/types/asatidz';

export default function PengajarFanPage() {
  const {
    fanConfig,
    fanDetail,
    masterGrupAsal,
    fetchFanData,
    openModalGrupAsal,
    isLoading: loadingFan,
  } = useFanStore();

  const {
    asatidzList,
    fetchAsatidz,
    openDetailModal,
    isLoading: loadingAsatidz,
  } = useAsatidzStore();

  const { fetchFormasi, formasiList } = useFormasiStore();
  const { jadwalMap, fetchJadwal, isLoading: loadingJadwal } = useJadwalStore();

  const [search, setSearch] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('');
  const [filterJah, setFilterJah] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchFanData();
    fetchFormasi();
    fetchJadwal();
    if (asatidzList.length === 0) fetchAsatidz();
  }, [fetchFanData, fetchFormasi, fetchJadwal, fetchAsatidz, asatidzList.length]);

  // Distinct Jah options
  const jahOptions = useMemo(() => {
    const s = new Set<string>();
    (asatidzList || []).forEach((a) => {
      const j = String(a.jah_asatidz || '').trim();
      if (j && j !== '-') s.add(j);
    });
    return Array.from(s).sort();
  }, [asatidzList]);

  // Ekstraksi data pengajar fan terpadu (Fan Pelajaran + Jadwal KBM)
  const { teacherMap, totalItemFan, itemFanTerisi } = useMemo(() => {
    const finalPeta = buildUnifiedTeacherMap(
      asatidzList,
      fanDetail,
      fanConfig,
      jadwalMap,
      formasiList
    );

    let total = 0;
    let terisi = 0;
    const items = fanDetail.item || {};
    Object.keys(fanConfig || {}).forEach((kelasKey) => {
      (fanConfig[kelasKey] || []).forEach((raw) => {
        total++;
        const d = items[`${kelasKey}||${raw}`];
        if (d && Array.isArray(d.asatidz) && d.asatidz.length > 0) terisi++;
      });
    });

    return {
      teacherMap: finalPeta,
      totalItemFan: total,
      itemFanTerisi: terisi,
    };
  }, [asatidzList, fanDetail, fanConfig, jadwalMap, formasiList]);

  // Kelompokkan Asatidz berdasarkan Master Grup Asal & terapkan filtering
  const groupedAsatidzList = useMemo(() => {
    const asatidzAssigned = new Set<string>();
    const kelompok: Array<{
      namaGrup: string;
      asatidzList: Asatidz[];
    }> = [];

    // 1. Grup dari Master Grup Asal
    (masterGrupAsal || []).forEach((g) => {
      let list: Asatidz[] = [];
      (g.anggota || []).forEach((nama) => {
        const target = normNameKey(nama);
        const found = asatidzList.find(
          (a) => normNameKey(a.nama_asatidz) === target
        );
        if (found) {
          list.push(found);
          asatidzAssigned.add(normNameKey(found.nama_asatidz));
        }
      });
      list = sortAsatidzByKodeNatural(list);
      if (list.length > 0) {
        kelompok.push({ namaGrup: g.namaGrup, asatidzList: list });
      }
    });

    // 2. Non-Grup (Asatidz yang belum masuk grup apapun)
    let nonGrup = asatidzList.filter(
      (a) => !asatidzAssigned.has(normNameKey(a.nama_asatidz))
    );
    nonGrup = sortAsatidzByKodeNatural(nonGrup);
    if (nonGrup.length > 0) {
      kelompok.push({ namaGrup: '', asatidzList: nonGrup });
    }

    // 3. Mapping data baris dan filter toleran spasi
    const qClean = search.trim().replace(/\s+/g, ' ').toLowerCase();
    const fTkt = normalizeTingkatName(filterTingkat);
    const fJah = filterJah.trim();

    return kelompok
      .map((grp) => {
        const grupCocok =
          !!qClean &&
          grp.namaGrup.toLowerCase().replace(/\s+/g, ' ').includes(qClean);
        const rows = grp.asatidzList
          .map((a) => {
            const kode = a.nia || '-';
            const nama = a.nama_asatidz;
            const jah = a.jah_asatidz || '-';
            let entries =
              teacherMap[normNameKey(nama)] ||
              teacherMap[nama.toUpperCase()] ||
              [];
            if (fTkt) {
              entries = entries.filter(
                (e) => normalizeTingkatName(e.tingkat) === fTkt
              );
            }
            return { asatidz: a, kode, nama, jah, entries };
          })
          .filter((o) => {
            if (fJah && o.jah !== fJah) return false;
            if (fTkt && o.entries.length === 0) return false;
            if (!qClean || grupCocok) return true;
            const hayClean = `${o.kode} ${o.nama} ${o.jah} ${grp.namaGrup} ${o.entries
              .map((e) => `${e.fan} ${e.kelas} ${e.kitab.join(' ')}`)
              .join(' ')}`
              .replace(/\s+/g, ' ')
              .toLowerCase();
            return hayClean.includes(qClean);
          });

        return {
          namaGrup: grp.namaGrup,
          rows,
        };
      })
      .filter((grp) => grp.rows.length > 0);
  }, [masterGrupAsal, asatidzList, teacherMap, search, filterTingkat, filterJah]);

  const totalAsatidzTampil = useMemo(() => {
    return groupedAsatidzList.reduce((s, g) => s + g.rows.length, 0);
  }, [groupedAsatidzList]);

  const persentaseKeterisian = totalItemFan > 0 ? Math.round((itemFanTerisi / totalItemFan) * 100) : 0;

  // Export Excel
  const handleExportExcel = () => {
    if (groupedAsatidzList.length === 0) {
      alert('Tidak ada data untuk diexport!');
      return;
    }

    const rows: (string | number)[][] = [
      ['No', 'Kode', 'Nama', 'Asal', 'Jah', 'Mengajar Fan', 'Jumlah Fan'],
    ];

    let no = 1;
    groupedAsatidzList.forEach((grp) => {
      const asal = grp.namaGrup || '-';
      grp.rows.forEach((o) => {
        const fanText = o.entries.map((e) => `${e.fan} (${e.kelas})`).join('; ');
        rows.push([no++, o.kode, o.nama, asal, o.jah, fanText, o.entries.length]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 5 },
      { wch: 8 },
      { wch: 34 },
      { wch: 18 },
      { wch: 16 },
      { wch: 70 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pengajar Fan');
    XLSX.writeFile(wb, 'Daftar_Pengajar_Fan_Madin.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetFilter = () => {
    setSearch('');
    setFilterTingkat('');
    setFilterJah('');
  };

  const handleSyncJadwalKeFan = async () => {
    if (
      !confirm(
        'Sinkronkan penugasan dari Jadwal KBM ke daftar Fan Pelajaran dan bersihkan mustahiq unggulan dari data reguler?'
      )
    ) {
      return;
    }

    setIsSyncing(true);
    // 1. Bersihkan mustahiq unggulan dari fan reguler
    const cleanRes = await useFanStore
      .getState()
      .bersihkanMustahiqUnggulanDariReguler(asatidzList, formasiList);

    // 2. Sinkronkan jadwal aktif ke Fan Pelajaran
    const syncRes = buildSyncJadwalToFanPayload(
      jadwalMap,
      fanConfig,
      useFanStore.getState().fanDetail,
      formasiList
    );

    if (syncRes.changesCount > 0) {
      await useFanStore.getState().saveFanConfig(syncRes.updatedConfig);
      useFanStore.setState({ fanDetail: syncRes.updatedDetail });
      useFanStore.getState().triggerAutoSaveFanDetail();
    }

    setIsSyncing(false);
    alert(
      `Sinkronisasi selesai!\n- ${cleanRes.cleanedCount} item reguler dibersihkan dari mustahiq unggulan.\n- ${syncRes.changesCount} penugasan mata pelajaran dari jadwal KBM berhasil diselaraskan.`
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Toolbar Card */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Pengajar Fan
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Rekapitulasi Fan Mata Pelajaran yang Diajarkan oleh Masing-Masing Asatidz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. Grup Asal Modal */}
            <button
              type="button"
              onClick={openModalGrupAsal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Grup Asal</span>
            </button>

            {/* 2. Segarkan Data */}
            <button
              type="button"
              onClick={() => {
                fetchFanData();
                fetchAsatidz();
                fetchJadwal();
                fetchFormasi();
              }}
              disabled={loadingFan || loadingAsatidz || loadingJadwal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingFan || loadingAsatidz || loadingJadwal ? 'animate-spin' : ''}`}
              />
              <span>Segarkan Data</span>
            </button>

            {/* 2b. Sinkronkan Jadwal ke Fan */}
            <button
              type="button"
              onClick={handleSyncJadwalKeFan}
              disabled={isSyncing || loadingFan || loadingAsatidz || loadingJadwal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-amber-300 text-amber-800 bg-amber-50/60 hover:bg-amber-100/70 shadow-xs transition-colors disabled:opacity-50"
              title="Sinkronkan penugasan di Jadwal KBM ke Fan Pelajaran dan bersihkan data ganda"
            >
              <Sparkles
                className={`w-3.5 h-3.5 text-amber-600 ${isSyncing ? 'animate-spin' : ''}`}
              />
              <span>{isSyncing ? 'Menyelaraskan...' : 'Sinkronkan Jadwal'}</span>
            </button>

            {/* 3. Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            {/* 4. Cetak Dokumen */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Cetak Dokumen</span>
            </button>
          </div>
        </div>

        {/* 2. Filter Bar & Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 mt-1 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Kode / Nama / Fan / Jah..."
              className="w-full text-xs pl-9 pr-8 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tingkat Dropdown */}
          <div className="md:col-span-2">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
            >
              <option value="">Semua Tingkat</option>
              <option value="ISTI'DAD">ISTI&apos;DAD</option>
              <option value="ULA">ULA</option>
              <option value="WUSTHO">WUSTHO</option>
              <option value="ULYA">ULYA</option>
            </select>
          </div>

          {/* Jah Dropdown */}
          <div className="md:col-span-2">
            <select
              value={filterJah}
              onChange={(e) => setFilterJah(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 shadow-xs"
            >
              <option value="">Semua Jah</option>
              {jahOptions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* Reset & Metrics Badges */}
          <div className="md:col-span-4 flex items-center gap-2 flex-wrap justify-end">
            {(search || filterTingkat || filterJah) && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <span className="text-xs font-semibold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
              {totalAsatidzTampil} Asatidz
            </span>
            <span className="text-xs font-bold px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
              Keterisian Fan: {itemFanTerisi}/{totalItemFan} ({persentaseKeterisian}%)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Area Tabel Pengajar Fan */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm bg-white rounded-xl">
        <div className="text-center mb-4">
          <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-800 m-0">
            DAFTAR PENGAJAR FAN MATA PELAJARAN
          </h3>
          <h4 className="text-xs font-bold text-slate-500 m-0 mt-0.5">
            MADRASAH DINIYYAH AL AMIRIYYAH
          </h4>
        </div>

        <div className="overflow-x-auto border border-slate-300 rounded-lg">
          <table className="w-full min-w-[850px] text-xs border-collapse text-left border border-slate-300 tabel-pengajar-fan">
            <thead>
              <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold text-center">
                <th className="py-2.5 px-2 border-r border-slate-300 w-[60px] sticky left-0 bg-slate-100 z-10">KODE</th>
                <th className="py-2.5 px-3 border-r border-slate-300 min-w-[200px] text-left sticky left-[60px] bg-slate-100 z-10">NAMA</th>
                <th className="py-2.5 px-2 border-r border-slate-300 w-[110px]">ASAL</th>
                <th className="py-2.5 px-2 border-r border-slate-300 w-[90px]">JAH</th>
                <th className="py-2.5 px-3 border-r border-slate-300 text-left">MENGAJAR FAN</th>
                <th className="py-2.5 px-2 border-slate-300 w-[55px]">JML</th>
              </tr>
            </thead>
            <tbody>
              {groupedAsatidzList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    Tidak ada asatidz yang cocok dengan filter atau pencarian.
                  </td>
                </tr>
              ) : (
                groupedAsatidzList.map((grp) => {
                  const isGrouped = !!grp.namaGrup;
                  const rowCount = grp.rows.length;

                  return grp.rows.map((o, idxInGroup) => (
                    <tr
                      key={`${grp.namaGrup}-${o.nama}`}
                      className="group border-b border-slate-200 hover:bg-slate-50/70 transition-colors"
                    >
                      {/* KODE (NIA) - Sticky horizontal left 0 */}
                      <td className="font-mono text-center font-bold py-2 px-2 border-r border-slate-200 text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10">
                        {o.kode}
                      </td>

                      {/* NAMA (Clickable opens Asatidz Profile Modal) - Sticky horizontal left 60px */}
                      <td
                        onClick={() => openDetailModal(o.asatidz)}
                        className="py-2 px-3 border-r border-slate-200 font-bold text-slate-800 hover:text-emerald-700 hover:underline cursor-pointer sticky left-[60px] bg-white group-hover:bg-slate-50 transition-colors z-10"
                        title={`Klik untuk lihat profil ${o.nama}`}
                      >
                        {o.nama}
                      </td>

                      {/* ASAL (Rowspan merged vertically per group) */}
                      {isGrouped ? (
                        idxInGroup === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="text-center font-bold py-2 px-2 border-r border-slate-200 bg-slate-50 text-emerald-900 align-middle tracking-wider"
                          >
                            {grp.namaGrup}
                          </td>
                        )
                      ) : (
                        <td className="text-center text-slate-400 py-2 px-2 border-r border-slate-200">
                          -
                        </td>
                      )}

                      {/* JAH */}
                      <td className="text-center py-2 px-2 border-r border-slate-200 text-slate-600 font-medium">
                        {o.jah}
                      </td>

                      {/* MENGAJAR FAN BADGES */}
                      <td className="py-2 px-3 border-r border-slate-200">
                        {o.entries.length === 0 ? (
                          <span className="text-slate-400 italic text-[11px]">
                            Belum ada fan yang diampu
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {o.entries.map((e, eIdx) => (
                              <span
                                key={eIdx}
                                title={e.kitab.length ? e.kitab.join(', ') : e.fan}
                                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                  e.isUg
                                    ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}
                              >
                                {e.isUg && <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />}
                                <span>{e.fan}</span>
                                <span className="text-[10px] opacity-75 font-normal">
                                  ({e.kelas})
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* JML */}
                      <td className="text-center font-bold py-2 px-2 border-slate-200 text-slate-800">
                        {o.entries.length}
                      </td>
                    </tr>
                  ));
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ModalGrupAsal />
      <ModalDetailAsatidz />
    </div>
  );
}
