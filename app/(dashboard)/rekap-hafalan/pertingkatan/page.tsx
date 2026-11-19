'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Inbox,
  Layers,
  Printer,
  Search,
  Settings,
} from 'lucide-react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useTahunAjaranStore } from '@/stores/useTahunAjaranStore';
import { usePagePermission } from '@/stores/useRbacStore';
import { exportAoaToExcel } from '@/lib/utils/excel';
import {
  normalizeTahunAjaranDash,
  normalizeTahunAjaranSlash,
} from '@/lib/utils/setoranHelper';
import {
  buildExcelSheetsRekapPertingkatan,
  buildRekapPertingkatanSections,
  formatPercentLabel,
  TingkatPertingkatan,
} from '@/lib/utils/rekapPertingkatanHelper';
import ModalSettingsHafalan from '@/components/modules/setoran/ModalSettingsHafalan';

type FilterTingkat = 'ALL' | TingkatPertingkatan;
type FilterGender = 'ALL' | 'PA' | 'PI';

export default function RekapHafalanPertingkatanPage() {
  const { santriList, fetchSantri, isLoading: loadingSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const {
    config,
    setoranList,
    fetchSetoranData,
    openSettings,
    isLoading: loadingSetoran,
  } = useMuhafadzohStore();
  const {
    activeTahunAjaran,
    daftarTahunAjaran,
    fetchGlobalTahunAjaran,
  } = useTahunAjaranStore();
  const { canAccessSettings, isPersonAllowed } = usePagePermission(
    'rekap-hafalan-pertingkatan'
  );

  const normalizedActiveTa = normalizeTahunAjaranSlash(activeTahunAjaran || '2026/2027');
  const [selectedTa, setSelectedTa] = useState<string>(normalizedActiveTa);
  const [filterTingkat, setFilterTingkat] = useState<FilterTingkat>('ALL');
  const [filterGender, setFilterGender] = useState<FilterGender>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useEffect(() => {
    setSelectedTa(normalizedActiveTa);
  }, [normalizedActiveTa]);

  useEffect(() => {
    fetchSantri();
    fetchAsatidz();
    fetchFormasi();
    fetchSetoranData();
    fetchGlobalTahunAjaran();
  }, [fetchSantri, fetchAsatidz, fetchFormasi, fetchSetoranData, fetchGlobalTahunAjaran]);

  const allowedSantriList = useMemo(() => {
    return santriList.filter((s) =>
      isPersonAllowed({ blok: s.blok, pa_pi: s.pa_pi })
    );
  }, [santriList, isPersonAllowed]);

  const taOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ slash: string; label: string }> = [];
    const addOpt = (raw: string) => {
      const slash = normalizeTahunAjaranSlash(raw);
      if (!slash || seen.has(slash)) return;
      seen.add(slash);
      const dash = normalizeTahunAjaranDash(slash);
      opts.push({
        slash,
        label: slash === normalizedActiveTa ? `${dash} (Aktif)` : dash,
      });
    };
    addOpt(normalizedActiveTa);
    daftarTahunAjaran.forEach((t) => addOpt(t.tahunAjaranMasehi));
    return opts;
  }, [daftarTahunAjaran, normalizedActiveTa]);

  const sections = useMemo(() => {
    return buildRekapPertingkatanSections({
      santriList: allowedSantriList,
      asatidzList,
      formasiList,
      setoranList,
      config,
      tahunAjaran: selectedTa,
      filterTingkat,
      filterGender,
      searchQuery,
    });
  }, [
    allowedSantriList,
    asatidzList,
    formasiList,
    setoranList,
    config,
    selectedTa,
    filterTingkat,
    filterGender,
    searchQuery,
  ]);

  const totalDisplayedClasses = useMemo(() => {
    return sections.reduce(
      (sum, sec) =>
        sum + sec.kelasGroups.reduce((gSum, g) => gSum + g.rows.length, 0),
      0
    );
  }, [sections]);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      // Ekspor selalu membentuk 3 sheet lengkap (ULA, WUSTHO, ULYA) untuk Tahun Ajaran terpilih
      const allTingkatSections = buildRekapPertingkatanSections({
        santriList: allowedSantriList,
        asatidzList,
        formasiList,
        setoranList,
        config,
        tahunAjaran: selectedTa,
        filterTingkat: 'ALL',
        filterGender,
        searchQuery,
      });

      if (allTingkatSections.length === 0) {
        alert('Tidak ada data rekapitulasi yang dapat diekspor.');
        return;
      }

      const sheets = buildExcelSheetsRekapPertingkatan(allTingkatSections);
      const taUnderscore = normalizeTahunAjaranDash(selectedTa).replace('-', '_');

      await exportAoaToExcel({
        filename: `Rekap_Hafalan_Pertingkatan_${taUnderscore}.xlsx`,
        sheets,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = loadingSantri || loadingSetoran;

  return (
    <div className="space-y-5">
      {/* Header & Toolbar Kontrol */}
      <div className="card-panel border border-slate-200 p-4 sm:p-5 shadow-xs no-print-kbm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 m-0">
                Rekapitulasi Hafalan Pertingkatan
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 m-0">
                Laporan per tingkatan &amp; kelas berdasarkan data Setoran Muhafadzoh (Tahun Ajaran{' '}
                <strong>{normalizeTahunAjaranDash(selectedTa)}</strong>).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Pilih Tahun Ajaran"
              value={selectedTa}
              onChange={(e) => setSelectedTa(e.target.value)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              {taOptions.map((opt) => (
                <option key={opt.slash} value={opt.slash}>
                  TA {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Tingkat"
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value as FilterTingkat)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="ULA">Tingkat Ula</option>
              <option value="WUSTHO">Tingkat Wustho</option>
              <option value="ULYA">Tingkat Ulya</option>
            </select>

            <select
              aria-label="Filter Jenis Kelamin"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as FilterGender)}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-700 cursor-pointer"
            >
              <option value="ALL">Semua (Putra/Putri)</option>
              <option value="PA">Putra</option>
              <option value="PI">Putri</option>
            </select>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kelas / mustahiq..."
                className="h-9 pl-8 pr-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700"
              />
            </div>

            {canAccessSettings && (
              <button
                type="button"
                onClick={openSettings}
                title="Pengaturan Item Hafalan"
                className="h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Materi</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="h-9 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>

            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleExportExcel()}
              className="h-9 px-3.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Mengekspor...' : 'Export Excel (3 Sheet)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama */}
      {isLoading ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mb-2" />
          <p className="text-xs text-slate-500 font-medium">
            Sedang mengkalkulasi rekapitulasi hafalan pertingkatan...
          </p>
        </div>
      ) : sections.length === 0 || totalDisplayedClasses === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-slate-200 shadow-xs rounded-2xl bg-white space-y-2">
          <Inbox className="w-10 h-10 text-slate-400 mx-auto" />
          <h2 className="font-bold text-slate-700 text-sm m-0">
            Data Kelas Pertingkatan Tidak Ditemukan
          </h2>
          <p className="text-xs text-slate-500 m-0">
            Tidak ada rombel yang cocok dengan filter tingkat, gender, atau kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.tingkat}
              className="card-panel border border-slate-200 p-4 sm:p-5 shadow-xs space-y-6"
            >
              {/* Kop Seksi Tingkat */}
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight m-0">
                  {section.title}
                </h2>
                <p className="text-xs font-semibold text-slate-600 mt-0.5 m-0">
                  Tahun Ajaran: {section.tahunAjaranLabel}
                </p>
              </div>

              {/* Sub-Tabel Per Kelas (KELAS 1 ULA, KELAS 2 ULA, dst.) */}
              <div className="space-y-7">
                {section.kelasGroups.map((group) => (
                  <div key={group.key} className="space-y-2">
                    <h3 className="text-xs sm:text-sm font-extrabold text-emerald-800 tracking-wide uppercase m-0">
                      {group.title}
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white">
                      <table className="tabel-kbm-resmi w-full text-xs border-collapse">
                        <thead>
                          <tr>
                            <th rowSpan={2} className="w-10 text-center">
                              No
                            </th>
                            <th rowSpan={2} className="min-w-[95px] text-center">
                              Kelas
                            </th>
                            <th rowSpan={2} className="min-w-[90px] text-center">
                              Jenis Kelamin
                            </th>
                            <th rowSpan={2} className="min-w-[210px] text-left">
                              Nama Mustahiq
                            </th>
                            <th rowSpan={2} className="w-20 text-center">
                              Jumlah Santri
                            </th>

                            {group.items.map((it) => (
                              <th
                                key={`${group.key}_${it.kriteria}_${it.nama}`}
                                rowSpan={2}
                                className="min-w-[115px] text-center whitespace-pre-line leading-snug"
                              >
                                {`${it.nama}\n(${it.kriteria})`}
                              </th>
                            ))}

                            <th rowSpan={2} className="w-20 text-center">
                              Rata-rata
                            </th>
                            <th colSpan={2} className="text-center">
                              hafalan Wajib
                            </th>
                            <th colSpan={2} className="text-center">
                              hafalan Sunnah
                            </th>
                            <th colSpan={2} className="text-center">
                              hafalan Wisuda
                            </th>
                            <th rowSpan={2} className="w-24 text-center">
                              Prosentase total
                            </th>
                          </tr>
                          <tr className="bg-subhead">
                            <th className="w-16 text-center normal-case">jumlah</th>
                            <th className="w-20 text-center normal-case">prosentase</th>
                            <th className="w-16 text-center normal-case">jumlah</th>
                            <th className="w-20 text-center normal-case">prosentase</th>
                            <th className="w-16 text-center normal-case">jumlah</th>
                            <th className="w-20 text-center normal-case">prosentase</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                row.paPi === 'PI'
                                  ? 'row-jadwal-pi'
                                  : 'row-jadwal-pa hover:bg-slate-50/80'
                              }
                            >
                              <td className="text-center font-mono text-slate-600">
                                {row.no}
                              </td>
                              <td className="font-bold text-slate-900 whitespace-nowrap">
                                {row.kelas}
                              </td>
                              <td className="text-center text-slate-700">
                                {row.jenisKelamin}
                              </td>
                              <td className="font-medium text-slate-800 whitespace-nowrap">
                                {row.namaMustahiq}
                              </td>
                              <td className="text-center font-mono font-semibold text-slate-800">
                                {row.jumlahSantri}
                              </td>

                              {row.itemCounts.map((cnt, idx) => (
                                <td
                                  key={`${row.id}_item_${idx}`}
                                  className="text-center font-mono text-slate-800"
                                >
                                  {cnt}
                                </td>
                              ))}

                              <td className="text-center font-mono font-semibold text-slate-900">
                                {row.rataRata}
                              </td>
                              <td className="text-center font-mono text-slate-800">
                                {row.wajibJumlah}
                              </td>
                              <td className="text-center font-mono font-semibold text-emerald-800">
                                {formatPercentLabel(row.wajibProsentase)}
                              </td>
                              <td className="text-center font-mono text-slate-800">
                                {row.sunnahJumlah}
                              </td>
                              <td className="text-center font-mono font-semibold text-blue-800">
                                {formatPercentLabel(row.sunnahProsentase)}
                              </td>
                              <td className="text-center font-mono text-slate-800">
                                {row.wisudaJumlah}
                              </td>
                              <td className="text-center font-mono font-semibold text-rose-800">
                                {formatPercentLabel(row.wisudaProsentase)}
                              </td>
                              <td className="text-center font-mono font-bold text-slate-900">
                                {formatPercentLabel(row.prosentaseTotal)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ModalSettingsHafalan />
    </div>
  );
}
