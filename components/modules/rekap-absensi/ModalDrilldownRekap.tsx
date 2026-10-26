'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { UserCheck, CalendarCheck, Search, X } from 'lucide-react';

export interface DrilldownDetailSession {
  tanggal: string;
  hari: string;
  jam: string;
  kelas: string;
  fan: string;
  status: string;
  keterangan: string;
  menitTerlambat: string;
  pengganti: string;
}

export interface RekapAsatidzRow {
  nama: string;
  nia: string;
  blok: string;
  jah: string;
  tingkat: string;
  totalTerjadwal: number;
  hadir: number;
  izin: number;
  sakit: number;
  alfa: number;
  terlambatCount: number;
  terlambatMenit: number;
  digantikan: number;
  tugasLain: number;
  jadwalKosong: number;
  totalTercatat: number;
  tidakTerlaksana: number;
  pct: number;
  predikat: 'Sangat Baik' | 'Baik' | 'Perlu Perhatian' | 'Kritis';
  detail: DrilldownDetailSession[];
}

interface ModalDrilldownRekapProps {
  isOpen: boolean;
  onClose: () => void;
  teacherData: RekapAsatidzRow | null;
}

export function getPredikatBadgeClass(predikat: string): string {
  if (predikat === 'Sangat Baik') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (predikat === 'Baik') {
    return 'bg-sky-50 text-sky-700 border-sky-200';
  }
  if (predikat === 'Perlu Perhatian') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-rose-50 text-rose-700 border-rose-200';
}

export default function ModalDrilldownRekap({
  isOpen,
  onClose,
  teacherData,
}: ModalDrilldownRekapProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setPage(1);
    }
  }, [isOpen, teacherData]);

  const sortedDetails = useMemo(() => {
    if (!teacherData) return [];
    const base = [...(teacherData.detail || [])].sort((a, b) => {
      const cmp = String(a.tanggal || '').localeCompare(String(b.tanggal || ''));
      if (cmp !== 0) return cmp;
      return String(a.jam || '').localeCompare(String(b.jam || ''), undefined, {
        numeric: true,
      });
    });

    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((d) => {
      const hay = `${d.tanggal} ${d.hari} ${d.jam} ${d.kelas} ${d.fan} ${d.status} ${d.keterangan} ${d.pengganti}`.toLowerCase();
      return hay.includes(q);
    });
  }, [teacherData, search]);

  if (!isOpen || !teacherData) return null;

  const totalPages = Math.max(1, Math.ceil(sortedDetails.length / pageSize));
  const paginatedDetails = sortedDetails.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Hadir':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Izin':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'Sakit':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Alfa':
      case 'Jadwal Kosong':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Terlambat':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Digantikan':
      case 'Badal':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Hijau */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2 flex-wrap">
                <span>{teacherData.nama}</span>
                <span className="font-normal text-emerald-100 text-xs">
                  (NIA: {teacherData.nia})
                </span>
              </h3>
              <p className="text-[11px] text-emerald-100">
                Rincian Kehadiran Asatidz • {teacherData.jah}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
          {/* 8 Kartu Ringkasan Performa Individu */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Sesi Terjadwal
              </div>
              <div className="text-lg font-extrabold text-slate-800 mt-0.5">
                {teacherData.totalTerjadwal}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Hadir
              </div>
              <div className="text-lg font-extrabold text-emerald-600 mt-0.5">
                {teacherData.hadir}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Izin / Sakit
              </div>
              <div className="text-lg font-extrabold text-sky-600 mt-0.5">
                {teacherData.izin + teacherData.sakit}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Alfa
              </div>
              <div className="text-lg font-extrabold text-rose-600 mt-0.5">
                {teacherData.alfa}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Terlambat
              </div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5 leading-tight">
                {teacherData.terlambatCount}x{' '}
                <span className="block text-[11px] font-normal text-slate-500">
                  ({teacherData.terlambatMenit} mnt)
                </span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Digantikan
              </div>
              <div className="text-lg font-extrabold text-slate-800 mt-0.5">
                {teacherData.digantikan}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                Tidak Terlaksana
              </div>
              <div className="text-lg font-extrabold text-rose-600 mt-0.5">
                {teacherData.tidakTerlaksana}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
              <div className="text-[11px] font-semibold text-slate-500">
                % Kehadiran
              </div>
              <div className="text-base font-extrabold text-slate-800 mt-0.5">
                {teacherData.pct.toFixed(1)}%
              </div>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded border text-[10px] font-bold ${getPredikatBadgeClass(
                  teacherData.predikat
                )}`}
              >
                {teacherData.predikat}
              </span>
            </div>
          </div>

          {/* Tabel Rincian Sesi Harian */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                <CalendarCheck className="w-4 h-4" />
                <span>Rincian Kehadiran Mengajar Harian</span>
              </div>

              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari tanggal, kelas, status..."
                  className="w-full pl-8 pr-6 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3 text-center">TANGGAL</th>
                    <th className="py-2.5 px-3 text-center">HARI</th>
                    <th className="py-2.5 px-3 text-center">JAM</th>
                    <th className="py-2.5 px-3 text-left">KELAS</th>
                    <th className="py-2.5 px-3 text-left">FAN</th>
                    <th className="py-2.5 px-3 text-center">STATUS</th>
                    <th className="py-2.5 px-3 text-left">KETERANGAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedDetails.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-slate-400 text-xs"
                      >
                        Tidak ada rincian data absensi tersimpan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedDetails.map((d, idx) => {
                      const ketText =
                        d.keterangan ||
                        (d.status === 'Terlambat' && d.menitTerlambat
                          ? `Terlambat ${d.menitTerlambat} mnt`
                          : d.status === 'Digantikan' && d.pengganti
                          ? `Diganti: ${d.pengganti}`
                          : '-');

                      return (
                        <tr
                          key={`${d.tanggal}-${d.jam}-${idx}`}
                          className="hover:bg-slate-50"
                        >
                          <td className="py-2 px-3 text-center font-mono text-slate-700">
                            {d.tanggal}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600">
                            {d.hari}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-700">
                            {d.jam}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {d.kelas || '-'}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {d.fan || '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full border font-bold text-[10px] ${getStatusBadge(
                                d.status
                              )}`}
                            >
                              {d.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 text-[11px]">
                            {ketText}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {sortedDetails.length > 0 && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>
                  Menampilkan {(page - 1) * pageSize + 1} -{' '}
                  {Math.min(page * pageSize, sortedDetails.length)} dari{' '}
                  {sortedDetails.length} sesi
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-semibold disabled:opacity-40"
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-semibold disabled:opacity-40"
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 bg-white border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-600 hover:bg-slate-700 text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
