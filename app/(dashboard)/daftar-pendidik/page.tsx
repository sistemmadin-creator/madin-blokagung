'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useFanStore } from '@/stores/useFanStore';
import { sortAsatidzByKodeNatural } from '@/lib/utils/fanHelper';
import { getStatusJam1Dan2Hari, hitungDistribusiJam12Tingkat, getJadwalGuruFromMap } from '@/lib/utils/jadwalHelper';
import ModalGrupAsal from '@/components/modules/fan/ModalGrupAsal';
import ModalDetailAsatidz from '@/components/modules/asatidz/ModalDetailAsatidz';
import ModalDetailSelJadwal from '@/components/modules/jadwal-kbm/ModalDetailSelJadwal';
import {
  FileText,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  X,
  GitFork,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DaftarPendidikPage() {
  const { asatidzList, fetchAsatidz, openDetailModal, isLoading: loadingAsatidz } = useAsatidzStore();
  const { jadwalMap, fetchJadwal, isLoading: loadingJadwal } = useJadwalStore();
  const { masterGrupAsal, fetchFanData, openModalGrupAsal } = useFanStore();

  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSlotSession, setSelectedSlotSession] = useState<{
    nama: string;
    hari: string;
    jam: number;
  } | null>(null);

  useEffect(() => {
    fetchAsatidz();
    fetchFanData();
    fetchJadwal();
  }, [fetchAsatidz, fetchFanData, fetchJadwal]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchAsatidz(),
        fetchFanData(),
        fetchJadwal(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Susun data terkelompok berdasarkan Grup Asal & Natural Sort NIA
  const kelompokTampil = useMemo(() => {
    const asatidzAssigned = new Set<string>();
    const groups: { namaGrup: string; asatidzList: typeof asatidzList }[] = [];

    // 1. Susun Asatidz yang terdaftar di dalam Grup Asal
    (masterGrupAsal || []).forEach((g) => {
      let anggotaList: typeof asatidzList = [];
      (g.anggota || []).forEach((nama) => {
        const found = asatidzList.find(
          (a) => a.nama_asatidz.trim().toUpperCase() === nama.trim().toUpperCase()
        );
        if (found) {
          anggotaList.push(found);
          asatidzAssigned.add(found.nama_asatidz.trim().toUpperCase());
        }
      });

      anggotaList = sortAsatidzByKodeNatural(anggotaList);
      if (anggotaList.length > 0) {
        groups.push({ namaGrup: g.namaGrup, asatidzList: anggotaList });
      }
    });

    // 2. Susun Asatidz yang belum masuk ke Grup Asal mana pun
    let nonGrup = asatidzList.filter(
      (a) => !asatidzAssigned.has(a.nama_asatidz.trim().toUpperCase())
    );
    nonGrup = sortAsatidzByKodeNatural(nonGrup);
    if (nonGrup.length > 0) {
      groups.push({ namaGrup: '', asatidzList: nonGrup });
    }

    // 3. Terapkan filter pencarian
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    const qClean = q.replace(/\s+/g, '');

    return groups
      .map((grp) => {
        const grupCocok =
          grp.namaGrup.toLowerCase().includes(q) ||
          grp.namaGrup.toLowerCase().replace(/\s+/g, '').includes(qClean);
        const listCocok = grupCocok
          ? grp.asatidzList
          : grp.asatidzList.filter((a) => {
              const fullText = `${a.nia || ''} ${a.nama_asatidz} ${a.jah_asatidz || ''}`.toLowerCase();
              return fullText.includes(q) || fullText.replace(/\s+/g, '').includes(qClean);
            });
        return { namaGrup: grp.namaGrup, asatidzList: listCocok };
      })
      .filter((grp) => grp.asatidzList.length > 0);
  }, [masterGrupAsal, asatidzList, search]);

  const totalTampil = useMemo(() => {
    return kelompokTampil.reduce((acc, g) => acc + g.asatidzList.length, 0);
  }, [kelompokTampil]);

  const handleExportExcel = () => {
    const rows: (string | number)[][] = [
      [
        'KODE',
        'NAMA',
        'ASAL',
        'JAH',
        'SABTU I',
        'SABTU II',
        'AHAD I',
        'AHAD II',
        'SENIN I',
        'SENIN II',
        'SELASA I',
        'SELASA II',
        'RABU I',
        'RABU II',
        'KAMIS I',
        'KAMIS II',
        'ULA I',
        'ULA II',
        'ULA III',
        'ULA IV',
        'WST I',
        'WST II',
        'ULYA I',
        'ULYA II',
        'JML',
      ],
    ];

    kelompokTampil.forEach((grp) => {
      const asalStr = grp.namaGrup || '-';
      grp.asatidzList.forEach((a) => {
        const kode = a.nia || '-';
        const nama = a.nama_asatidz;
        const jah = a.jah_asatidz || '-';
        const jdw = getJadwalGuruFromMap(nama, jadwalMap);

        const sbt = getStatusJam1Dan2Hari(jdw?.sabtu);
        const ahd = getStatusJam1Dan2Hari(jdw?.ahad);
        const sen = getStatusJam1Dan2Hari(jdw?.senin);
        const sel = getStatusJam1Dan2Hari(jdw?.selasa);
        const rab = getStatusJam1Dan2Hari(jdw?.rabu);
        const kam = getStatusJam1Dan2Hari(jdw?.kamis);

        const dist = hitungDistribusiJam12Tingkat(a, jdw);

        rows.push([
          kode,
          nama,
          asalStr,
          jah,
          sbt.j1,
          sbt.j2,
          ahd.j1,
          ahd.j2,
          sen.j1,
          sen.j2,
          sel.j1,
          sel.j2,
          rab.j1,
          rab.j2,
          kam.j1,
          kam.j2,
          dist.ula[1] || '',
          dist.ula[2] || '',
          dist.ula[3] || '',
          dist.ula[4] || '',
          dist.wst[1] || '',
          dist.wst[2] || '',
          dist.ulya[1] || '',
          dist.ulya[2] || '',
          dist.totalJml || 0,
        ]);
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Pendidik');
    XLSX.writeFile(wb, 'Daftar_Tenaga_Pendidik_Madin.xlsx');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Card Sesuai madinblokagung-main Gambar 2 */}
      <div className="card-panel border-0 no-print-pendidik">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Daftar Tenaga Pendidik
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Madrasah Diniyyah Al Amiriyyah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Grup Asal */}
            <button
              type="button"
              onClick={openModalGrupAsal}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition shadow-xs flex items-center gap-1.5"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Grup Asal</span>
            </button>

            {/* Tombol Segarkan Data */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loadingAsatidz || loadingJadwal || isRefreshing}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-emerald-700 text-emerald-700 hover:bg-emerald-50 transition shadow-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAsatidz || isRefreshing ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>

            {/* Tombol Export Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition shadow-xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Excel</span>
            </button>

            {/* Tombol Print / Cetak Dokumen */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition shadow-xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Cetak Dokumen</span>
            </button>
          </div>
        </div>

        {/* Bar Pencarian */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
          <div className="relative w-full sm:w-96">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Kode / Nama / Asal (Grup) / Jah..."
              className="w-full text-xs pl-8 pr-7 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-600">
            {search ? (
              <>Ditemukan: <b className="text-emerald-700">{totalTampil}</b> Asatidz</>
            ) : (
              <>Menampilkan <b>{totalTampil}</b> dari {asatidzList.length} Tenaga Pendidik</>
            )}
          </span>
        </div>
      </div>

      {/* 2. Area Tabel Dokumen Resmi Sesuai Gambar 2 */}
      <div className="card-panel border-0 p-4 md:p-6 shadow-sm" id="areaPrintDaftarPendidik">
        <div className="text-center mb-4">
          <h5 className="font-bold text-sm md:text-base text-slate-800 uppercase tracking-wide m-0">
            Daftar Tenaga Pendidik
          </h5>
          <h6 className="font-bold text-slate-500 text-xs md:text-sm m-0 mt-1">
            Madrasah Diniyyah Al Amiriyyah
          </h6>
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="tabel-daftar-pendidik min-w-[1100px] w-full border-collapse border border-slate-300 text-center">
            <thead>
              {/* Baris Header 1 */}
              <tr className="bg-slate-100 text-slate-800 font-bold text-xs uppercase">
                <th rowSpan={3} className="border border-slate-300 px-2 py-2 sticky left-0 z-20 bg-slate-100" style={{ width: 45 }}>KODE</th>
                <th rowSpan={3} className="border border-slate-300 px-3 py-2 text-left sticky left-[45px] z-20 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" style={{ minWidth: 180 }}>NAMA</th>
                <th rowSpan={3} className="border border-slate-300 px-2 py-2" style={{ width: 60 }}>ASAL</th>
                <th rowSpan={3} className="border border-slate-300 px-2 py-2" style={{ width: 90 }}>JAH</th>
                <th colSpan={12} className="border border-slate-300 px-2 py-1.5 bg-slate-200/80">HARI &amp; JAM</th>
                <th colSpan={8} className="border border-slate-300 px-2 py-1.5 bg-slate-200/80">TINGKAT DAN KODE</th>
                <th rowSpan={3} className="border border-slate-300 px-2 py-2" style={{ width: 45 }}>JML</th>
              </tr>
              {/* Baris Header 2 (Nama Hari & Jenjang) */}
              <tr className="bg-slate-50 text-slate-700 font-bold text-[11px]">
                <th colSpan={2} className="border border-slate-300 py-1">Sabtu</th>
                <th colSpan={2} className="border border-slate-300 py-1">Ahad</th>
                <th colSpan={2} className="border border-slate-300 py-1">Senin</th>
                <th colSpan={2} className="border border-slate-300 py-1">Selasa</th>
                <th colSpan={2} className="border border-slate-300 py-1">Rabu</th>
                <th colSpan={2} className="border border-slate-300 py-1">Kamis</th>
                <th colSpan={4} className="border border-slate-300 py-1">ULA</th>
                <th colSpan={2} className="border border-slate-300 py-1">WST</th>
                <th colSpan={2} className="border border-slate-300 py-1">ULYA</th>
              </tr>
              {/* Baris Header 3 (Sub-Kolom Jam I, II & Kelas I-IV) */}
              <tr className="bg-slate-50 text-slate-600 font-semibold text-[10px]">
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>III</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>IV</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>I</th>
                <th className="border border-slate-300 py-1" style={{ width: 28 }}>II</th>
              </tr>
            </thead>
            <tbody>
              {kelompokTampil.length === 0 ? (
                <tr>
                  <td colSpan={25} className="text-center py-6 text-slate-400 border border-slate-300">
                    {search ? `Tidak ditemukan hasil untuk "${search}".` : 'Tidak ada data tenaga pendidik.'}
                  </td>
                </tr>
              ) : (
                kelompokTampil.map((grp) => {
                  const isGrouped = Boolean(grp.namaGrup);
                  const rowCount = grp.asatidzList.length;

                  return grp.asatidzList.map((a, idxInGroup) => {
                    const kode = a.nia || '-';
                    const nama = a.nama_asatidz;
                    const jah = a.jah_asatidz || '-';
                    const jdw = getJadwalGuruFromMap(nama, jadwalMap);

                    const sbt = getStatusJam1Dan2Hari(jdw?.sabtu);
                    const ahd = getStatusJam1Dan2Hari(jdw?.ahad);
                    const sen = getStatusJam1Dan2Hari(jdw?.senin);
                    const sel = getStatusJam1Dan2Hari(jdw?.selasa);
                    const rab = getStatusJam1Dan2Hari(jdw?.rabu);
                    const kam = getStatusJam1Dan2Hari(jdw?.kamis);

                    const dist = hitungDistribusiJam12Tingkat(a, jdw);

                    const renderCellJam = (statusVal: string, hariNama: string, jamNum: number) => {
                      if (statusVal !== 'X') {
                        return <td className="border border-slate-300 text-center py-1 px-0.5 text-xs"></td>;
                      }
                      return (
                        <td
                          className="border border-slate-300 text-center py-1 px-0.5 text-xs font-bold text-emerald-800 bg-emerald-50/50 hover:bg-emerald-100 cursor-pointer transition select-none"
                          onClick={() => setSelectedSlotSession({ nama, hari: hariNama, jam: jamNum })}
                          title={`${hariNama} - Jam ${jamNum === 1 ? 'I' : 'II'} — Klik untuk lihat detail sesi`}
                        >
                          X
                        </td>
                      );
                    };

                    return (
                      <tr key={a.id || `${a.nia}-${nama}`} className="hover:bg-slate-50/60 transition">
                        {/* KODE */}
                        <td className="border border-slate-300 text-center py-1 px-1 font-mono font-bold text-xs text-slate-900 bg-slate-50 sticky left-0 z-10">
                          {kode}
                        </td>

                        {/* NAMA (Clickable) */}
                        <td
                          className="border border-slate-300 text-left py-1 px-2.5 font-semibold text-xs text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer transition bg-white sticky left-[45px] z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                          onClick={() => openDetailModal(a)}
                          title={`Klik untuk lihat profil & santri binaan ${nama}`}
                        >
                          {nama}
                        </td>

                        {/* ASAL (Rowspan vertikal jika tergabung dalam grup) */}
                        {isGrouped ? (
                          idxInGroup === 0 ? (
                            <td
                              rowSpan={rowCount}
                              className="border border-slate-300 text-center py-2 px-2 font-bold text-xs text-emerald-900 bg-slate-50/70 align-middle tracking-wide uppercase"
                            >
                              {grp.namaGrup}
                            </td>
                          ) : null
                        ) : (
                          <td className="border border-slate-300 text-center py-1 px-1 text-xs text-slate-400">
                            -
                          </td>
                        )}

                        {/* JAH */}
                        <td className="border border-slate-300 text-center py-1 px-1.5 text-xs text-slate-700">
                          {jah}
                        </td>

                        {/* 12 Sub-Kolom Hari & Jam */}
                        {renderCellJam(sbt.j1, 'Sabtu', 1)}
                        {renderCellJam(sbt.j2, 'Sabtu', 2)}
                        {renderCellJam(ahd.j1, 'Ahad', 1)}
                        {renderCellJam(ahd.j2, 'Ahad', 2)}
                        {renderCellJam(sen.j1, 'Senin', 1)}
                        {renderCellJam(sen.j2, 'Senin', 2)}
                        {renderCellJam(sel.j1, 'Selasa', 1)}
                        {renderCellJam(sel.j2, 'Selasa', 2)}
                        {renderCellJam(rab.j1, 'Rabu', 1)}
                        {renderCellJam(rab.j2, 'Rabu', 2)}
                        {renderCellJam(kam.j1, 'Kamis', 1)}
                        {renderCellJam(kam.j2, 'Kamis', 2)}

                        {/* 8 Sub-Kolom Tingkat & Kode (ULA I-IV, WST I-II, ULYA I-II) */}
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.ula[1] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.ula[2] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.ula[3] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.ula[4] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.wst[1] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.wst[2] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.ulya[1] || ''}
                        </td>
                        <td className="border border-slate-300 text-center py-1 px-0.5 text-xs font-medium text-slate-800">
                          {dist.ulya[2] || ''}
                        </td>

                        {/* JML */}
                        <td className="border border-slate-300 text-center py-1 px-1 font-bold text-xs text-emerald-800 bg-emerald-50/40">
                          {dist.totalJml || 0}
                        </td>
                      </tr>
                    );
                  });
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Seluruh Modal Terkait */}
      <ModalGrupAsal />
      <ModalDetailAsatidz />
      <ModalDetailSelJadwal
        isOpen={Boolean(selectedSlotSession)}
        onClose={() => setSelectedSlotSession(null)}
        session={selectedSlotSession}
      />
    </div>
  );
}
