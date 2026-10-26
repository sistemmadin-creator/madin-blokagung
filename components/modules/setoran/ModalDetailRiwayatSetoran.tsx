'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { SetoranHafalan } from '@/types/setoran';
import { Clock, Box, Pencil, Printer, Trash2 } from 'lucide-react';

interface ModalDetailRiwayatSetoranProps {
  isOpen: boolean;
  onClose: () => void;
  clickedSetoran: SetoranHafalan | null;
  allSetoranList: SetoranHafalan[];
  onEdit: (setoran: SetoranHafalan) => void;
  onPrint: (setoran: SetoranHafalan) => void;
  onDelete: (setoran: SetoranHafalan) => void;
}

export default function ModalDetailRiwayatSetoran({
  isOpen,
  onClose,
  clickedSetoran,
  allSetoranList,
  onEdit,
  onPrint,
  onDelete,
}: ModalDetailRiwayatSetoranProps) {
  if (!clickedSetoran) return null;

  const noInduk = String(clickedSetoran.no_induk || '').trim();
  const riwayatSantri = allSetoranList.filter(
    (r) => String(r.no_induk || '').trim() === noInduk
  );

  const kelasStr =
    clickedSetoran.kelas ||
    `${clickedSetoran.din_kls || ''} ${clickedSetoran.din_bag || ''} ${clickedSetoran.tingkat || ''}`.trim() ||
    '-';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Detail Muhafadzoh Santri"
      maxWidth="3xl"
    >
      <div className="space-y-5 -mt-2">
        {/* Kartu Profil Singkat Santri */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 shadow-2xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center md:text-left">
            <div className="md:border-r border-slate-200 pr-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Nama Santri
              </span>
              <h5 className="font-bold text-slate-800 text-sm mt-0.5">{clickedSetoran.nama || '-'}</h5>
              <span className="text-xs text-slate-500 font-mono">NIS: {clickedSetoran.no_induk || '-'}</span>
            </div>

            <div className="md:border-r border-slate-200 pr-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Kelas Diniyyah
              </span>
              <h5 className="font-bold text-slate-800 text-sm mt-0.5">{kelasStr}</h5>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Asatidz (Mustahiq)
              </span>
              <h5 className="font-bold text-emerald-800 text-sm mt-0.5">
                {clickedSetoran.mustahiq || 'Belum Ditentukan'}
              </h5>
            </div>
          </div>
        </div>

        {/* Tabel 1: Setoran Terpilih */}
        <div>
          <h6 className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-2 uppercase tracking-wide">
            <Box className="w-3.5 h-3.5" /> Setoran Terpilih
          </h6>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">TGL SETOR</th>
                  <th className="py-2.5 px-3">HAFALAN</th>
                  <th className="py-2.5 px-3">KATEGORI</th>
                  <th className="py-2.5 px-3">PENJAGA</th>
                  <th className="py-2.5 px-3 text-center w-28">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/60 bg-emerald-50/20">
                  <td className="py-2.5 px-3 font-medium text-slate-700">{clickedSetoran.tanggal}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-800">{clickedSetoran.item_hafalan}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {clickedSetoran.kategori || 'Wajib'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{clickedSetoran.penjaga || '-'}</td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onEdit(clickedSetoran);
                        }}
                        title="Edit Data"
                        className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrint(clickedSetoran)}
                        title="Print Kartu"
                        className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(clickedSetoran)}
                        title="Hapus Data"
                        className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabel 2: Riwayat Keseluruhan Setoran Santri */}
        <div>
          <h6 className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mb-2 uppercase tracking-wide">
            <Clock className="w-3.5 h-3.5" /> Riwayat Keseluruhan Setoran ({riwayatSantri.length})
          </h6>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-56 overflow-y-auto shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3">TGL SETOR</th>
                  <th className="py-2 px-3">HAFALAN</th>
                  <th className="py-2 px-3">KATEGORI</th>
                  <th className="py-2 px-3">PENJAGA</th>
                  <th className="py-2 px-3 text-center w-28">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {riwayatSantri.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-400">
                      Belum ada rekaman setoran lainnya.
                    </td>
                  </tr>
                ) : (
                  riwayatSantri.map((r, idx) => (
                    <tr
                      key={r.id || `${r.no_induk}_${r.tanggal}_${idx}`}
                      className="hover:bg-slate-50 transition"
                    >
                      <td className="py-2 px-3 text-slate-700">{r.tanggal}</td>
                      <td className="py-2 px-3 font-semibold text-emerald-800">{r.item_hafalan}</td>
                      <td className="py-2 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {r.kategori || 'Wajib'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{r.penjaga || '-'}</td>
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onEdit(r);
                            }}
                            title="Edit Data"
                            className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrint(r)}
                            title="Print Kartu"
                            className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(r)}
                            title="Hapus Data"
                            className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </Dialog>
  );
}
