'use client';

import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  MoreVertical,
  CheckCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { KelasSerahPiagamGroup, SantriSerahPiagamRow } from '@/types/serah-piagam';

interface KartuKelasSerahPiagamProps {
  group: KelasSerahPiagamGroup;
  filteredStudents: SantriSerahPiagamRow[];
  canEdit: boolean;
  onToggleMenerima: (
    santri: {
      no_induk: string;
      nama: string;
      tingkat?: string;
      din_kls?: string;
      din_bag?: string;
    },
    forcedStatus?: boolean
  ) => void;
  onBatchSetKelas: (
    students: Array<{
      no_induk: string;
      nama: string;
      tingkat?: string;
      din_kls?: string;
      din_bag?: string;
    }>,
    status: boolean
  ) => void;
}

export default function KartuKelasSerahPiagam({
  group,
  filteredStudents,
  canEdit,
  onToggleMenerima,
  onBatchSetKelas,
}: KartuKelasSerahPiagamProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const pct = group.percentage;
  const isAllReceived = group.totalSantri > 0 && group.menerimaCount === group.totalSantri;

  return (
    <div
      data-testid={`card-kelas-${group.groupKey}`}
      data-short-badge={group.shortBadge}
      className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col hover:border-slate-300 transition-all duration-200"
    >
      {/* 1. Header Kartu Kelas (Format Identik Gambar 1 dengan Tambahan Rasio 7/30) */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Sisi Kiri: Badge Kelas & Target Materi */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-200 shadow-2xs">
              {group.shortBadge}
            </span>
            <span
              title={`Target Kurikulum: ${group.targetMateri}`}
              className="text-xs font-semibold text-emerald-900 bg-emerald-50/70 px-2.5 py-0.5 rounded-md border border-emerald-200/70 truncate max-w-[160px] sm:max-w-[200px]"
            >
              Target: {group.targetMateri}
            </span>
          </div>

          {/* Sisi Kanan: Keterangan Kelas, Rasio Menerima (misal 7/30), & Menu Aksi */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium">
              ({group.kelasLabel})
            </span>

            {/* Keterangan Rasio Menerima '7/30' (Spesifik sesuai permintaan User) */}
            <span
              title={`${group.menerimaCount} dari ${group.totalSantri} santri telah menerima piagam (${pct}%)`}
              className={`px-2.5 py-0.5 rounded-full font-mono text-xs font-bold border transition-colors shadow-2xs ${
                isAllReceived
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : group.menerimaCount > 0
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200'
              }`}
            >
              {group.ratioText}
            </span>

            {/* Menu Aksi Batch Kelas (Tandai Semua / Batal) */}
            {canEdit && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  title="Opsi Aksi Kelas"
                  className="w-7 h-7 rounded-lg hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-40 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onBatchSetKelas(group.students, true);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Tandai Semua Menerima
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onBatchSetKelas(group.students, false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                        Batal Tandai Semua
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar Persentase Penyerahan Piagam Kelas */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isAllReceived
                ? 'bg-emerald-600'
                : group.menerimaCount > 0
                ? 'bg-emerald-500'
                : 'bg-slate-200'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 2. Card Student Table (Kolom Ramping: No, Nama Santri, Kamar, Menerima - Kolom Status Dihapus) */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 bg-slate-50/20">
              <th className="py-2 pl-3 pr-2 w-8 text-center">No</th>
              <th className="py-2 px-2">Nama Santri</th>
              <th className="py-2 px-2 text-center w-16">Kamar</th>
              <th className="py-2 pl-2 pr-3 text-center w-24">Menerima</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-slate-400 text-xs italic"
                >
                  Tidak ada santri yang sesuai filter di kelas ini.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, idx) => (
                <tr
                  key={s.no_induk}
                  className={`transition-colors group ${
                    s.is_menerima
                      ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                      : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Kolom 1: No */}
                  <td className="py-2.5 pl-3 pr-2 text-slate-400 font-mono text-[11px] text-center">
                    {idx + 1}
                  </td>

                  {/* Kolom 2: Nama Santri */}
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`block font-semibold truncate max-w-[150px] sm:max-w-[180px] transition-colors ${
                          s.is_menerima
                            ? 'text-emerald-950 font-bold'
                            : 'text-slate-800 group-hover:text-emerald-800'
                        }`}
                        title={`${s.nama} (${s.no_induk})`}
                      >
                        {s.nama}
                      </span>
                    </div>
                  </td>

                  {/* Kolom 3: Kamar */}
                  <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">
                    {s.kamar || '-'}
                  </td>

                  {/* Kolom 4: Menerima (Pengganti Kolom Proses - Checkbox Centang Interaktif) */}
                  <td className="py-2.5 pl-2 pr-3 text-center">
                    <div className="flex items-center justify-center">
                      <label
                        className={`relative inline-flex items-center justify-center w-7 h-7 rounded-lg border transition-all select-none ${
                          canEdit
                            ? 'cursor-pointer active:scale-95'
                            : 'cursor-not-allowed opacity-70'
                        } ${
                          s.is_menerima
                            ? 'bg-[#0b5751] border-[#0b5751] text-white shadow-2xs hover:bg-[#115e59]'
                            : 'bg-white border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-50/40'
                        }`}
                        title={
                          s.is_menerima
                            ? `Sudah menerima piagam${
                                s.tanggal_serah
                                  ? ` (${new Date(s.tanggal_serah).toLocaleDateString('id-ID')})`
                                  : ''
                              }. Klik untuk membatalkan.`
                            : 'Belum menerima. Klik untuk menandai sudah menerima piagam.'
                        }
                      >
                        <input
                          type="checkbox"
                          checked={s.is_menerima}
                          disabled={!canEdit}
                          onChange={() => {
                            if (!canEdit) return;
                            onToggleMenerima({
                              no_induk: s.no_induk,
                              nama: s.nama,
                              tingkat: s.tingkat,
                              din_kls: s.din_kls,
                              din_bag: s.din_bag,
                            });
                          }}
                          className="sr-only"
                          aria-label={`Status penerimaan piagam ${s.nama}`}
                        />
                        <Check
                          className={`w-4 h-4 transition-transform duration-150 ${
                            s.is_menerima ? 'scale-100' : 'scale-0'
                          }`}
                          strokeWidth={2.5}
                        />
                      </label>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info Kartu (Tercatat Penerima) */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between text-[11px] text-slate-500">
        <span className="text-slate-400">
          Total: {group.students.length} Santri
        </span>
        <span className="font-semibold text-emerald-800 font-mono">
          {group.menerimaCount} Menerima
        </span>
      </div>
    </div>
  );
}
