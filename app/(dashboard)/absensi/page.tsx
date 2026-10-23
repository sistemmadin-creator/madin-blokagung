'use client';

import React, { useState } from 'react';
import { ClipboardCheck, Calendar, Lock, Unlock, Save } from 'lucide-react';

export default function AbsensiPage() {
  const [selectedJam, setSelectedJam] = useState<1 | 2 | 3 | 4>(1);

  return (
    <div className="space-y-6">
      {/* Header Absensi 4 Jam */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Presensi KBM 4 Jam Asatidz</h1>
            <p className="text-xs text-slate-500">Sistem Presensi Berurutan Jam 1 s.d. Jam 4</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Atur Hari Libur
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm">
            <Save className="w-3.5 h-3.5" />
            Simpan Presensi Hari Ini
          </button>
        </div>
      </div>

      {/* Tabs Jam 1, Jam 2, Jam 3, Jam 4 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((j) => {
          const isActive = selectedJam === j;
          return (
            <button
              key={j}
              onClick={() => setSelectedJam(j as 1 | 2 | 3 | 4)}
              className={`p-4 rounded-xl border text-left transition flex items-center justify-between ${
                isActive
                  ? 'bg-madin-700 text-white border-madin-700 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-madin-300'
              }`}
            >
              <div>
                <p className="text-[11px] opacity-80 uppercase font-semibold">Sesi KBM</p>
                <p className="text-base font-bold">Jam Ke-{j}</p>
              </div>
              <div>
                {j === 1 ? (
                  <Unlock className="w-5 h-5 opacity-90" />
                ) : (
                  <Lock className="w-5 h-5 opacity-40" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Konten Matriks Presensi Jam Aktif */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <h2 className="font-bold text-slate-800 text-sm">
            Daftar Jadwal Mengajar Jam Ke-{selectedJam}
          </h2>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Hadir
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> Izin
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Sakit
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Alfa
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center py-8">
          Matriks presensi 4 jam siap diintegrasikan dengan jadwal mengajar asatidz.
        </p>
      </div>
    </div>
  );
}
