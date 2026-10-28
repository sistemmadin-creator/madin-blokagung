'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Calendar, Clock, AlertCircle, CheckCircle2, ArrowRight, Zap } from 'lucide-react';
import { getLabelWaktuJamKBM } from '@/lib/utils/absensiHelper';

interface SlotKbmCell {
  hari: string;
  jam: 1 | 2 | 3 | 4;
  totalKelas: number;
  terisi: number;
  kosong: number;
  isLive?: boolean;
}

export default function ClassKbmMatrixWidget() {
  const [selectedCell, setSelectedCell] = useState<SlotKbmCell | null>(null);

  const hariList = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis'];
  const jamList: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];

  // Data matriks 6 hari x 4 jam KBM
  const matrixData: Record<string, Record<number, SlotKbmCell>> = {
    Sabtu: {
      1: { hari: 'Sabtu', jam: 1, totalKelas: 161, terisi: 160, kosong: 1 },
      2: { hari: 'Sabtu', jam: 2, totalKelas: 161, terisi: 159, kosong: 2 },
      3: { hari: 'Sabtu', jam: 3, totalKelas: 161, terisi: 161, kosong: 0 },
      4: { hari: 'Sabtu', jam: 4, totalKelas: 161, terisi: 158, kosong: 3 },
    },
    Ahad: {
      1: { hari: 'Ahad', jam: 1, totalKelas: 161, terisi: 161, kosong: 0 },
      2: { hari: 'Ahad', jam: 2, totalKelas: 161, terisi: 160, kosong: 1 },
      3: { hari: 'Ahad', jam: 3, totalKelas: 161, terisi: 161, kosong: 0 },
      4: { hari: 'Ahad', jam: 4, totalKelas: 161, terisi: 159, kosong: 2 },
    },
    Senin: {
      1: { hari: 'Senin', jam: 1, totalKelas: 161, terisi: 161, kosong: 0 },
      2: { hari: 'Senin', jam: 2, totalKelas: 161, terisi: 158, kosong: 3 },
      3: { hari: 'Senin', jam: 3, totalKelas: 161, terisi: 160, kosong: 1 },
      4: { hari: 'Senin', jam: 4, totalKelas: 161, terisi: 161, kosong: 0 },
    },
    Selasa: {
      1: { hari: 'Selasa', jam: 1, totalKelas: 161, terisi: 159, kosong: 2 },
      2: { hari: 'Selasa', jam: 2, totalKelas: 161, terisi: 157, kosong: 4 },
      3: { hari: 'Selasa', jam: 3, totalKelas: 161, terisi: 161, kosong: 0 },
      4: { hari: 'Selasa', jam: 4, totalKelas: 161, terisi: 160, kosong: 1 },
    },
    Rabu: {
      1: { hari: 'Rabu', jam: 1, totalKelas: 161, terisi: 161, kosong: 0 },
      2: { hari: 'Rabu', jam: 2, totalKelas: 161, terisi: 158, kosong: 3, isLive: true },
      3: { hari: 'Rabu', jam: 3, totalKelas: 161, terisi: 160, kosong: 1 },
      4: { hari: 'Rabu', jam: 4, totalKelas: 161, terisi: 159, kosong: 2 },
    },
    Kamis: {
      1: { hari: 'Kamis', jam: 1, totalKelas: 161, terisi: 158, kosong: 3 },
      2: { hari: 'Kamis', jam: 2, totalKelas: 161, terisi: 156, kosong: 5 },
      3: { hari: 'Kamis', jam: 3, totalKelas: 161, terisi: 160, kosong: 1 },
      4: { hari: 'Kamis', jam: 4, totalKelas: 161, terisi: 157, kosong: 4 },
    },
  };

  const getCellBadge = (cell: SlotKbmCell) => {
    if (cell.isLive) {
      return 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-400 ring-offset-1 animate-pulse';
    }
    if (cell.kosong === 0) {
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100';
    }
    if (cell.kosong <= 2) {
      return 'bg-teal-50 text-teal-800 border border-teal-200/80 hover:bg-teal-100';
    }
    return 'bg-amber-50 text-amber-900 border border-amber-200/80 hover:bg-amber-100';
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-teal-50 text-teal-700">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Peta Kepadatan KBM & Rombel (6 Hari × 4 Jam)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi 161 rombel aktif pada KBM Malam (Jam 1-3) & Takror Siang (Jam 4)
            </p>
          </div>

          <Link
            href="/jadwal-kbm"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
          >
            <span>Buka Jadwal KBM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Tabel Matriks Responsif */}
        <div className="overflow-x-auto pb-1">
          <table className="w-full text-center border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2.5 px-3 text-left font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Hari KBM
                </th>
                {jamList.map((j) => {
                  const meta = getLabelWaktuJamKBM(j);
                  return (
                    <th key={j} className="py-2 px-2 font-bold text-slate-700 text-center min-w-[75px]">
                      <div>Jam {j}</div>
                      <div className="text-[9px] font-normal text-slate-400">{meta.deskripsi.split(' ')[0]}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hariList.map((hari) => (
                <tr key={hari} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-2.5 px-3 text-left font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>{hari}</span>
                  </td>
                  {jamList.map((j) => {
                    const cell = matrixData[hari]?.[j] || {
                      hari,
                      jam: j,
                      totalKelas: 161,
                      terisi: 161,
                      kosong: 0,
                    };
                    const isSelected =
                      selectedCell?.hari === hari && selectedCell?.jam === j;

                    return (
                      <td key={j} className="py-1.5 px-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCell(cell)}
                          data-testid={`kbm-cell-${hari}-${j}`}
                          className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${getCellBadge(
                            cell
                          )} ${isSelected ? 'ring-2 ring-slate-900 shadow-xs' : ''}`}
                          title={`${hari} Jam ${j}: ${cell.terisi}/${cell.totalKelas} Rombel Terisi`}
                        >
                          <div className="leading-tight">{cell.terisi}/{cell.totalKelas}</div>
                          {cell.isLive ? (
                            <div className="text-[9px] font-bold text-amber-200 flex items-center justify-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              <span>LIVE</span>
                            </div>
                          ) : cell.kosong > 0 ? (
                            <div className="text-[9px] text-amber-600 font-medium">-{cell.kosong} badal</div>
                          ) : (
                            <div className="text-[9px] text-emerald-600 font-medium">100% full</div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Drilldown Detail Sel Terpilih */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        {selectedCell ? (
          <div className="flex items-center gap-2 text-slate-800">
            <span className="p-1 rounded bg-emerald-100 text-emerald-800 font-bold">
              {selectedCell.hari} - Jam {selectedCell.jam}
            </span>
            <span className="text-slate-600">
              <strong>{selectedCell.terisi}</strong> rombel terisi guru •{' '}
              {selectedCell.kosong > 0 ? (
                <span className="text-amber-700 font-bold">
                  {selectedCell.kosong} rombel butuh badal
                </span>
              ) : (
                <span className="text-emerald-700 font-bold">Semua rombel aman</span>
              )}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Klik salah satu kotak sesi jam untuk melihat rincian rombel</span>
          </div>
        )}

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" />
            Sesi Live
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300 inline-block" />
            Terisi Penuh
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-100 border border-amber-300 inline-block" />
            Butuh Badal
          </span>
        </div>
      </div>
    </div>
  );
}
