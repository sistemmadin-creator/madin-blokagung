'use client';

import React, { useState, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import { KelasKonsorsium, SesiPresensiKonsorsium } from '@/types/konsorsium';
import * as XLSX from 'xlsx';
import {
  Calendar,
  FileSpreadsheet,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
} from 'lucide-react';

interface ModalRiwayatPresensiKonsorsiumProps {
  isOpen: boolean;
  onClose: () => void;
  kelas: KelasKonsorsium | null;
  onEditSesi: (sesi: SesiPresensiKonsorsium) => void;
}

export default function ModalRiwayatPresensiKonsorsium({
  isOpen,
  onClose,
  kelas,
  onEditSesi,
}: ModalRiwayatPresensiKonsorsiumProps) {
  const { sesiList, hapusSesiPresensi } = useKonsorsiumStore();
  const [expandedSesiId, setExpandedSesiId] = useState<string | null>(null);

  // Sesi milik kelas ini, diurutkan tanggal terbaru ke terlama
  const kelasSesiList = useMemo(() => {
    if (!kelas) return [];
    return sesiList
      .filter((s) => s.kelasId === kelas.id)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }, [sesiList, kelas]);

  const toggleExpand = (id: string) => {
    setExpandedSesiId((prev) => (prev === id ? null : id));
  };

  const handleExportExcel = () => {
    if (!kelas || kelasSesiList.length === 0) return;

    const rows: Record<string, any>[] = [];

    kelasSesiList.forEach((sesi) => {
      sesi.records.forEach((rec, idx) => {
        rows.push({
          'No': idx + 1,
          'Tanggal Pertemuan': sesi.tanggal,
          'Kelas Konsorsium': kelas.namaKelas,
          'Tingkat': kelas.tingkat,
          'Pembimbing': kelas.pembimbingNama,
          'Materi / Topik': sesi.topikBahasan || '-',
          'NIA': rec.nia,
          'Nama Asatidz': rec.nama,
          'Status Presensi': rec.status,
          'Keterangan': rec.keterangan || '-',
          'Notulen Rapat': sesi.notulen || '-',
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Presensi Konsorsium');
    XLSX.writeFile(
      workbook,
      `Presensi_Konsorsium_${kelas.namaKelas.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  if (!kelas) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Riwayat Pertemuan: ${kelas.namaKelas}`}
      maxWidth="lg"
    >
      <div className="p-6 space-y-4">
        {/* Header Action & Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <div className="text-sm font-bold text-slate-800">
              {kelas.namaKelas} (Tingkat {kelas.tingkat})
            </div>
            <div className="text-xs text-slate-500">
              Total {kelasSesiList.length} sesi pertemuan tercatat
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={kelasSesiList.length === 0}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export ke Excel
          </button>
        </div>

        {/* List Riwayat Pertemuan */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {kelasSesiList.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400 border border-dashed border-slate-200 rounded-xl">
              Belum ada pertemuan yang dicatat untuk kelas konsorsium ini.
            </div>
          ) : (
            kelasSesiList.map((sesi) => {
              const isExpanded = expandedSesiId === sesi.id;

              const hadirCount = sesi.records.filter((r) => r.status === 'Hadir').length;
              const izinCount = sesi.records.filter((r) => r.status === 'Izin').length;
              const sakitCount = sesi.records.filter((r) => r.status === 'Sakit').length;
              const alfaCount = sesi.records.filter((r) => r.status === 'Alfa').length;
              const terlambatCount = sesi.records.filter((r) => r.status === 'Terlambat').length;

              return (
                <div
                  key={sesi.id}
                  className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div
                    onClick={() => toggleExpand(sesi.id)}
                    className="p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer bg-slate-50/50 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <span>{sesi.tanggal}</span>
                          {sesi.topikBahasan && (
                            <span className="text-xs font-normal text-slate-600 truncate max-w-xs">
                              • {sesi.topikBahasan}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="text-emerald-700 font-semibold">
                            Hadir: {hadirCount}
                          </span>
                          <span>•</span>
                          <span className="text-amber-700">Izin: {izinCount}</span>
                          <span>•</span>
                          <span className="text-blue-700">Sakit: {sakitCount}</span>
                          <span>•</span>
                          <span className="text-rose-700">Alfa: {alfaCount}</span>
                          <span>•</span>
                          <span className="text-orange-700">Terlambat: {terlambatCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSesi(sesi);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Ubah Presensi"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            confirm(
                              `Apakah Anda yakin ingin menghapus catatan presensi tanggal ${sesi.tanggal}?`
                            )
                          ) {
                            hapusSesiPresensi(sesi.id);
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                        title="Hapus Presensi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Detail Expanded */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 p-3 bg-white space-y-3">
                      {sesi.notulen && (
                        <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-slate-700">
                          <strong className="text-slate-900 block mb-0.5">
                            Notulen Pertemuan:
                          </strong>
                          {sesi.notulen}
                        </div>
                      )}

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider">
                            <tr>
                              <th className="py-2 px-3 w-10 text-center">No</th>
                              <th className="py-2 px-3 w-28">NIA</th>
                              <th className="py-2 px-3">Nama Asatidz</th>
                              <th className="py-2 px-3 w-28 text-center">Status</th>
                              <th className="py-2 px-3">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {sesi.records.map((r, idx) => (
                              <tr key={r.id || idx} className="hover:bg-slate-50">
                                <td className="py-2 px-3 text-center text-slate-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2 px-3 font-mono text-slate-600">
                                  {r.nia}
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-800">
                                  {r.nama}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                      r.status === 'Hadir'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : r.status === 'Izin'
                                        ? 'bg-amber-100 text-amber-800'
                                        : r.status === 'Sakit'
                                        ? 'bg-blue-100 text-blue-800'
                                        : r.status === 'Alfa'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }`}
                                  >
                                    {r.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-600">
                                  {r.keterangan || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
