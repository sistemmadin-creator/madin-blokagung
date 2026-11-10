'use client';
import React, { useEffect, useMemo } from 'react';
import {
  Award,
  Search,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Check,
  Clock,
  Users,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useEbtadinStore } from '@/stores/useEbtadinStore';
import { useSerahIjazahStore } from '@/stores/useSerahIjazahStore';
export default function SerahIjazahPage() {
  const { activeTahun, formasiList, fetchTahunList } = useEbtadinStore();
  const {
    records,
    isLoading,
    filterTingkat,
    filterKelas,
    filterStatus,
    searchKeyword,
    fetchRecords,
    toggleMenerima,
    batchSetKelasMenerima,
    setFilterTingkat,
    setFilterKelas,
    setFilterStatus,
    setSearchKeyword,
  } = useSerahIjazahStore();
  useEffect(() => {
    fetchTahunList();
  }, [fetchTahunList]);
  useEffect(() => {
    if (activeTahun?.id) {
      fetchRecords(activeTahun.id);
    }
  }, [activeTahun?.id, fetchRecords]);
  const totalSantri = records.length;
  const totalMenerima = records.filter((r) => r.is_menerima).length;
  const totalBelum = totalSantri - totalMenerima;
  const persenMenerima = totalSantri > 0 ? Math.round((totalMenerima / totalSantri) * 100) : 0;
  const persenBelum = totalSantri > 0 ? Math.round((totalBelum / totalSantri) * 100) : 0;
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterTingkat && r.tingkat.toUpperCase() !== filterTingkat.toUpperCase()) return false;
      if (filterKelas && `${r.din_kls} ${r.din_bag}`.toLowerCase() !== filterKelas.toLowerCase()) return false;
      if (filterStatus === 'SUDAH' && !r.is_menerima) return false;
      if (filterStatus === 'BELUM' && r.is_menerima) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchesName = r.nama_santri.toLowerCase().includes(q);
        const matchesInduk = r.no_induk.includes(q);
        const matchesIjazah = (r.nomor_seri_ijazah || '').toLowerCase().includes(q);
        if (!matchesName && !matchesInduk && !matchesIjazah) return false;
      }
      return true;
    });
  }, [records, filterTingkat, filterKelas, filterStatus, searchKeyword]);
  const groupedCards = useMemo(() => {
    const map = new Map<string, { formasi: any; santri: typeof records }>();
    formasiList.forEach((f) => {
      map.set(f.id, { formasi: f, santri: [] });
    });
    filteredRecords.forEach((r) => {
      const entry = map.get(r.ebtadin_formasi_id);
      if (entry) {
        entry.santri.push(r);
      }
    });
    return Array.from(map.values()).filter((g) => g.santri.length > 0);
  }, [formasiList, filteredRecords]);
  const handleExportExcel = () => {
    if (records.length === 0) return;
    const data = records.map((r, idx) => ({
      No: idx + 1,
      'No. Induk': r.no_induk,
      'Nama Santri': r.nama_santri,
      Tingkat: r.tingkat,
      Kelas: `${r.din_kls} ${r.din_bag}`,
      'No. Seri Ijazah': r.nomor_seri_ijazah || '-',
      'Status Ijazah': r.is_menerima ? 'Sudah Menerima' : 'Belum Menerima',
      'Tanggal Serah': r.tanggal_serah ? new Date(r.tanggal_serah).toLocaleDateString('id-ID') : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Serah_Ijazah_EBTADIN');
    XLSX.writeFile(wb, `Serah_Ijazah_EBTADIN_${activeTahun?.tahun_masehi || 2026}.xlsx`);
  };
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-xl bg-emerald-100 text-[#0f766e] flex items-center justify-center font-bold text-2xl flex-shrink-0 shadow-2xs">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                  Serah Ijazah Santri
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-[#0f766e] border border-emerald-300">
                  Tahun {activeTahun?.tahun_masehi || 2026}
                </span>
              </div>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Pemantauan dan pencatatan tanda terima penyerahan ijazah kelulusan santri per kelas binaan EBTADIN.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => activeTahun && fetchRecords(activeTahun.id)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                MENERIMA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-extrabold text-slate-900">{totalMenerima}</h3>
                <span className="text-xs font-bold text-slate-500">({persenMenerima}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Santri telah menerima ijazah</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                BELUM MENERIMA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-extrabold text-slate-900">{totalBelum}</h3>
                <span className="text-xs font-bold text-slate-500">({persenBelum}%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Santri menunggu penyerahan ijazah</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                TOTAL PESERTA EBTADIN
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <h3 className="text-3xl font-extrabold text-slate-900">{totalSantri}</h3>
                <span className="text-xs font-bold text-slate-500">Santri</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">4 Ula, 2 Wustho, 2 Ulya Aktif</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
          <div className="sm:col-span-5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Cari nama santri, NIS, atau no ijazah..."
              className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-madin-600 font-medium"
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-madin-600"
            >
              <option value="">Semua Tingkat</option>
              <option value="ULA">4 ULA</option>
              <option value="WUSTHO">2 WUSTHO</option>
              <option value="ULYA">2 ULYA</option>
            </select>
          </div>
          <div className="sm:col-span-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full text-xs py-2 px-3 rounded-lg border border-slate-300 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-madin-600"
            >
              <option value="SEMUA">Semua Status Penerimaan</option>
              <option value="SUDAH">Sudah Menerima</option>
              <option value="BELUM">Belum Menerima</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groupedCards.map(({ formasi, santri }) => {
          const countMenerima = santri.filter((s) => s.is_menerima).length;
          const ratio = `${countMenerima}/${santri.length}`;
          const progressPercent = Math.round((countMenerima / santri.length) * 100);
          return (
            <div
              key={formasi.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between"
            >
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-[#0f766e] text-xs font-bold">
                      {formasi.din_kls} {formasi.din_bag}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {formasi.tingkat} ({formasi.pa_pi})
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-600 font-mono">{ratio}</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="bg-[#0f766e] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 sticky top-0">
                    <tr>
                      <th className="py-1.5 px-3 w-8">No</th>
                      <th className="py-1.5 px-3">Nama Santri</th>
                      <th className="py-1.5 px-3 text-center w-20">Menerima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {santri.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <p className="font-bold text-slate-800 leading-snug">{s.nama_santri}</p>
                          <p className="text-[10px] font-mono text-emerald-700 mt-0.5">
                            {s.nomor_seri_ijazah || `NIS: ${s.no_induk}`}
                          </p>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleMenerima(s.id, s.is_menerima, 'Petugas')}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition ${
                              s.is_menerima
                                ? 'bg-[#0f766e] text-white shadow-2xs'
                                : 'border border-slate-300 hover:border-slate-400 text-transparent'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[3]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => batchSetKelasMenerima(formasi.id, true, 'Petugas')}
                  className="text-[#0f766e] hover:underline font-semibold"
                >
                  Tandai Semua Menerima
                </button>
                <span className="text-slate-400 text-[10px]">{formasi.wali_kelas_text || '-'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
