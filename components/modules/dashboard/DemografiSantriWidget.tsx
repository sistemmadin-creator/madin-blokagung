'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Users, Building, ArrowUpRight } from 'lucide-react';

interface DistrikItem {
  daerah: string;
  jumlah: number;
  pct: number;
  color: string;
}

export default function DemografiSantriWidget() {
  const distrikList: DistrikItem[] = [
    { daerah: 'Kab. Banyuwangi', jumlah: 3120, pct: 57.6, color: 'bg-emerald-600' },
    { daerah: 'Kab. Jember', jumlah: 1140, pct: 21.0, color: 'bg-teal-600' },
    { daerah: 'Kab. Situbondo & Bondowoso', jumlah: 640, pct: 11.8, color: 'bg-amber-600' },
    { daerah: 'Luar Jawa Timur / Nusantara', jumlah: 512, pct: 9.6, color: 'bg-indigo-600' },
  ];

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header Widget */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-indigo-50 text-indigo-700">
              <MapPin className="w-4 h-4 text-indigo-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Sebaran Geografis & Demografi Santri
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Konsentrasi daerah asal 5.412 santri aktif madrasah
              </p>
            </div>
          </div>

          <Link
            href="/santri"
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-800 flex items-center gap-1 hover:underline"
          >
            <span>Data Santri</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Multi-Segment Proportion Bar */}
        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 my-3">
          {distrikList.map((item) => (
            <div
              key={item.daerah}
              className={`${item.color} h-full transition-all duration-300`}
              style={{ width: `${item.pct}%` }}
              title={`${item.daerah}: ${item.pct}% (${item.jumlah.toLocaleString('id-ID')} santri)`}
            />
          ))}
        </div>

        {/* Legend & Breakdown List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {distrikList.map((item) => (
            <div
              key={item.daerah}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`} />
                <span className="text-xs font-bold text-slate-800 truncate">
                  {item.daerah}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-slate-900">
                  {item.jumlah.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">({item.pct}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-slate-400" />
          <span>Tersebar di 26 Asrama / Komplek Kamar Pesantren</span>
        </div>
        <span className="text-slate-400 text-[11px]">Database Santri Diniyyah</span>
      </div>
    </div>
  );
}
