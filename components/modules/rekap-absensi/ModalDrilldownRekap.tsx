'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';

interface DrilldownItem {
  tanggal: string;
  jam: number;
  kelas: string;
  fan: string;
  status: string;
  keterangan?: string;
  pengganti?: string;
}

export default function ModalDrilldownRekap({
  isOpen,
  onClose,
  teacherName,
  items,
}: {
  isOpen: boolean;
  onClose: () => void;
  teacherName: string;
  items: DrilldownItem[];
}) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Riwayat Ketidakhadiran: ${teacherName}`}
      maxWidth="lg"
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          Daftar tanggal dan rincian jam di mana <strong>{teacherName}</strong> tercatat Izin, Sakit, Alfa, atau Badal.
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold sticky top-0">
              <tr>
                <th className="p-2.5 w-10 text-center">No</th>
                <th className="p-2.5">Tanggal</th>
                <th className="p-2.5 text-center">Sesi Jam</th>
                <th className="p-2.5">Kelas & Fan</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5">Keterangan / Badal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Tidak ada catatan ketidakhadiran (Hadir 100%).
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="p-2.5 font-mono text-slate-600 whitespace-nowrap">{item.tanggal}</td>
                    <td className="p-2.5 text-center font-bold">Jam {item.jam}</td>
                    <td className="p-2.5 font-medium whitespace-nowrap">
                      {item.kelas} ({item.fan})
                    </td>
                    <td className="p-2.5 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'Izin'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'Sakit'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'Alfa'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-500 text-[11px]">
                      {item.pengganti ? `Badal: ${item.pengganti}` : item.keterangan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 text-white hover:bg-slate-900"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
