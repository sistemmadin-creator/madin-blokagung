'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import {
  AsatidzStatusDrilldownItem,
  formatLabelBlokRekap,
  JenjangRekapFilter,
  StatusRekapSummaryRow,
} from '@/lib/utils/rekapAbsensiCalculation';
import { bandingkanBlokHariKBM } from '@/lib/utils/jadwalHelper';

interface ModalDrilldownStatusAsatidzProps {
  isOpen: boolean;
  onClose: () => void;
  statusRow: StatusRekapSummaryRow | null;
  activeJenjang: JenjangRekapFilter;
  periodeLabel: string;
  onPrintStatusDetail: (row: StatusRekapSummaryRow) => void;
}

export default function ModalDrilldownStatusAsatidz({
  isOpen,
  onClose,
  statusRow,
  activeJenjang,
  periodeLabel,
  onPrintStatusDetail,
}: ModalDrilldownStatusAsatidzProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'pct' | 'nama' | 'blok'>('count');
  const [expandedTeacherKey, setExpandedTeacherKey] = useState<string | null>(
    null
  );
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSortBy('count');
      setExpandedTeacherKey(null);
      setPage(1);
    }
  }, [isOpen, statusRow?.key]);

  const filteredTeachers = useMemo(() => {
    if (!statusRow) return [];
    const q = search.trim().toLowerCase();
    const qClean = q.replace(/\s+/g, '');

    const list = statusRow.asatidzList.filter((item) => {
      if (!q) return true;
      const hay = `${item.nama} ${item.nia} ${formatLabelBlokRekap(item.blok)} ${item.jah} ${item.jenjang} ${item.kelasTugas}`.toLowerCase();
      const hayClean = hay.replace(/\s+/g, '');
      return hay.includes(q) || hayClean.includes(qClean);
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'nama') {
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === 'blok') {
        const cmpBlok = bandingkanBlokHariKBM(
          formatLabelBlokRekap(a.blok),
          formatLabelBlokRekap(b.blok)
        );
        if (cmpBlok !== 0) return cmpBlok;
        return a.nama.localeCompare(b.nama);
      }
      if (sortBy === 'pct') {
        if (b.pctStatusGuru !== a.pctStatusGuru) {
          return b.pctStatusGuru - a.pctStatusGuru;
        }
        return b.statusCount - a.statusCount;
      }
      if (b.statusCount !== a.statusCount) {
        return b.statusCount - a.statusCount;
      }
      if (b.pctStatusGuru !== a.pctStatusGuru) {
        return b.pctStatusGuru - a.pctStatusGuru;
      }
      return a.nama.localeCompare(b.nama);
    });
  }, [statusRow, search, sortBy]);

  if (!isOpen || !statusRow) return null;

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const paginatedTeachers = filteredTeachers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const labelJenjang =
    activeJenjang === 'SEMUA'
      ? 'Semua Tingkat (Ula, Wustho, Ulya)'
      : `Tingkat ${activeJenjang}`;

  const renderExtraInfo = (item: AsatidzStatusDrilldownItem) => {
    if (statusRow.key === 'terlambat' && item.totalMenitTerlambat > 0) {
      return (
        <span className="text-[11px] font-semibold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
          Total {item.totalMenitTerlambat} mnt
        </span>
      );
    }
    if (statusRow.key === 'ganti') {
      const penggantiSet = Array.from(
        new Set(
          item.sessions
            .map((s) => s.pengganti)
            .filter((p) => p && p !== '-')
        )
      );
      if (penggantiSet.length > 0) {
        return (
          <span className="text-[11px] text-purple-700 font-medium truncate max-w-[200px] inline-block">
            Badal: {penggantiSet.slice(0, 2).join(', ')}
            {penggantiSet.length > 2 ? ` +${penggantiSet.length - 2}` : ''}
          </span>
        );
      }
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 no-print-kbm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-status-asatidz-title"
      data-testid="modal-drilldown-status-asatidz"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-[#0b5751] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="modal-status-asatidz-title"
                className="text-sm sm:text-base font-extrabold flex items-center gap-2 flex-wrap"
              >
                <span>Daftar Asatidz Berstatus: {statusRow.meta.label}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white">
                  {statusRow.pctActive.toFixed(1)}%
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100 mt-0.5">
                {labelJenjang} • Periode {periodeLabel} •{' '}
                {statusRow.totalAsatidzTerlibat} Asatidz ({statusRow.countActive}{' '}
                Sesi)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="btn-print-modal-status-asatidz"
              onClick={() => onPrintStatusDetail(statusRow)}
              className="px-3 py-1.5 rounded-lg bg-white text-[#0b5751] hover:bg-emerald-50 text-xs font-extrabold inline-flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Unduh PDF / Print Daftar Ini</span>
            </button>
            <button
              type="button"
              data-testid="btn-close-modal-status-asatidz"
              onClick={onClose}
              aria-label="Tutup rincian status asatidz"
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bar Pencarian & Pengurutan */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              data-testid="input-search-modal-status-asatidz"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama Asatidz, NIA, blok, atau kelas..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as 'count' | 'pct' | 'nama' | 'blok');
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <option value="count">Jumlah Sesi Terbanyak</option>
              <option value="pct">% Status Tertinggi</option>
              <option value="nama">Nama Asatidz (A-Z)</option>
              <option value="blok">Blok Kelas</option>
            </select>
          </div>
        </div>

        {/* Body Tabel Daftar Asatidz */}
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table
              className="w-full text-xs border-collapse"
              data-testid="table-modal-status-asatidz"
            >
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                  <th className="py-2.5 px-3 text-center w-10">NO</th>
                  <th className="py-2.5 px-3 text-left">NAMA ASATIDZ</th>
                  <th className="py-2.5 px-2.5 text-center">NIA</th>
                  <th className="py-2.5 px-2.5 text-center">TINGKAT</th>
                  <th className="py-2.5 px-2.5 text-center">BLOK</th>
                  <th className="py-2.5 px-2.5 text-center">
                    SESI {statusRow.meta.label.toUpperCase()}
                  </th>
                  <th className="py-2.5 px-2.5 text-center">
                    % DARI SESI GURU
                  </th>
                  <th className="py-2.5 px-3 text-center">RINCIAN SESI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedTeachers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-400 text-xs"
                    >
                      Tidak ditemukan Asatidz dengan status{' '}
                      <strong>{statusRow.meta.label}</strong> pada kriteria ini.
                    </td>
                  </tr>
                ) : (
                  paginatedTeachers.map((item, idx) => {
                    const rowNo = (page - 1) * pageSize + idx + 1;
                    const rowKey = `${item.nama}-${item.nia}`;
                    const isExpanded = expandedTeacherKey === rowKey;

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          onClick={() =>
                            setExpandedTeacherKey((prev) =>
                              prev === rowKey ? null : rowKey
                            )
                          }
                          className="hover:bg-slate-50/90 transition-colors cursor-pointer"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                            {rowNo}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-extrabold text-slate-800">
                              {item.nama}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                              <span>{item.jah}</span>
                              {item.kelasTugas && (
                                <span className="text-slate-400">
                                  • {item.kelasTugas}
                                </span>
                              )}
                              {renderExtraInfo(item)}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-mono text-slate-600">
                            {item.nia}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                              {item.jenjang}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-50 text-slate-700 border border-slate-200 font-bold text-[10px]">
                              {formatLabelBlokRekap(item.blok)}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full border font-extrabold text-xs ${statusRow.meta.badgeClass}`}
                            >
                              {item.statusCount} Sesi
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-extrabold text-slate-800">
                            {item.pctStatusGuru.toFixed(1)}%
                            <span className="block text-[10px] font-normal text-slate-400">
                              ({item.statusCount}/{item.totalSesiGuru} sesi)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{item.sessions.length} Tanggal</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={8} className="p-3">
                              <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                                <table className="w-full text-[11px] border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                                      <th className="py-1.5 px-2.5 text-left">
                                        Tanggal &amp; Hari
                                      </th>
                                      <th className="py-1.5 px-2.5 text-center">
                                        Jam
                                      </th>
                                      <th className="py-1.5 px-2.5 text-left">
                                        Kelas
                                      </th>
                                      <th className="py-1.5 px-2.5 text-left">
                                        Fan
                                      </th>
                                      <th className="py-1.5 px-2.5 text-left">
                                        Keterangan / Pengganti
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {item.sessions.map((ses, sIdx) => (
                                      <tr key={`${ses.tanggal}-${ses.jam}-${sIdx}`}>
                                        <td className="py-1.5 px-2.5 font-semibold text-slate-700 whitespace-nowrap">
                                          {ses.tanggal} ({ses.hari})
                                        </td>
                                        <td className="py-1.5 px-2.5 text-center font-bold text-emerald-700 whitespace-nowrap">
                                          {ses.jam}
                                        </td>
                                        <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                                          {ses.kelas}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-slate-600">
                                          {ses.fan}
                                        </td>
                                        <td className="py-1.5 px-2.5 text-slate-600">
                                          {ses.menitTerlambat
                                            ? `Terlambat ${ses.menitTerlambat} menit. `
                                            : ''}
                                          {ses.pengganti && ses.pengganti !== '-'
                                            ? `Pengganti: ${ses.pengganti}. `
                                            : ''}
                                          {ses.keterangan || '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Pagination Modal */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Menampilkan{' '}
            <strong>
              {filteredTeachers.length === 0
                ? 0
                : (page - 1) * pageSize + 1}
            </strong>{' '}
            s/d{' '}
            <strong>
              {Math.min(page * pageSize, filteredTeachers.length)}
            </strong>{' '}
            dari <strong>{filteredTeachers.length}</strong> Asatidz
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-bold text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 font-semibold text-slate-700 disabled:opacity-40"
            >
              Berikutnya
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 px-3.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
