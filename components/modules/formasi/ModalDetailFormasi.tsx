'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { Users, MapPin, UserCheck, Edit, Trash2 } from 'lucide-react';

export default function ModalDetailFormasi() {
  const {
    isDetailModalOpen,
    closeDetailModal,
    selectedFormasi,
    openInputModal,
    deleteFormasi,
  } = useFormasiStore();

  if (!selectedFormasi) return null;

  const handleEdit = () => {
    const f = selectedFormasi;
    closeDetailModal();
    openInputModal(f);
  };

  const handleDelete = async () => {
    if (selectedFormasi.id && (await deleteFormasi(selectedFormasi.id))) {
      closeDetailModal();
    }
  };

  const isOverCapacity = selectedFormasi.jumlah_santri > selectedFormasi.kapasitas_maksimal;

  return (
    <Dialog
      isOpen={isDetailModalOpen}
      onClose={closeDetailModal}
      title="Detail Rombel & Formasi Kelas Diniyyah"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Header Kelas */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
          <div>
            <span
              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mb-1 ${
                selectedFormasi.pa_pi === 'PA'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-pink-100 text-pink-800'
              }`}
            >
              Santri {selectedFormasi.pa_pi === 'PA' ? 'Putra (PA)' : 'Putri (PI)'}
            </span>
            <h2 className="text-xl font-bold text-slate-800">
              Kelas {selectedFormasi.tingkat} {selectedFormasi.din_kls} - Bagian {selectedFormasi.din_bag}
              {selectedFormasi.is_unggulan && (
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Unggulan
                </span>
              )}
            </h2>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Kapasitas</span>
            <span className="text-lg font-bold font-mono text-slate-700">
              {selectedFormasi.kapasitas_maksimal} Kursi
            </span>
          </div>
        </div>

        {/* Rasio Santri */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-madin-700" />
              Jumlah Santri Terdaftar
            </span>
            <span className="font-bold font-mono text-slate-800">
              {selectedFormasi.jumlah_santri} / {selectedFormasi.kapasitas_maksimal} santri ({selectedFormasi.persentase}%)
            </span>
          </div>

          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all rounded-full ${
                isOverCapacity
                  ? 'bg-rose-500'
                  : selectedFormasi.persentase > 90
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(selectedFormasi.persentase, 100)}%` }}
            ></div>
          </div>
          {isOverCapacity && (
            <p className="text-[11px] text-rose-600 font-medium">
              Peringatan: Jumlah santri melebihi kapasitas ruangan maksimal!
            </p>
          )}
        </div>

        {/* Wali Kelas & Lokasi */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Wali Kelas (Mustahiq)
            </span>
            <p className="font-bold text-slate-800">
              {selectedFormasi.wali_kelas_text || selectedFormasi.id_mustahiq || 'Belum Diatur'}
            </p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              Domisili Blok Kelas
            </span>
            <p className="font-bold text-slate-800">{selectedFormasi.domisili || '-'}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <span className="text-slate-400 font-medium">Ruang KBM Diniyyah</span>
            <p className="font-semibold text-slate-700">{selectedFormasi.lokasi_diniyyah || '-'}</p>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
            <span className="text-slate-400 font-medium">Ruang Takror Malam</span>
            <p className="font-semibold text-slate-700">{selectedFormasi.lokasi_takror || '-'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Kelas
          </button>

          <div className="flex gap-2">
            <button
              onClick={closeDetailModal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
            >
              Tutup
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Formasi
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
