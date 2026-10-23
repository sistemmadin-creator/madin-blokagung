'use client';

import React from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { User, Home, GraduationCap, MapPin, Edit, Trash2 } from 'lucide-react';

export default function ModalDetailAsatidz() {
  const {
    isDetailModalOpen,
    closeDetailModal,
    selectedAsatidz,
    openInputModal,
    deleteAsatidz,
  } = useAsatidzStore();

  if (!selectedAsatidz) return null;

  const handleEdit = () => {
    const asatidz = selectedAsatidz;
    closeDetailModal();
    openInputModal(asatidz);
  };

  const handleDelete = async () => {
    if (await deleteAsatidz(selectedAsatidz.nia)) {
      closeDetailModal();
    }
  };

  return (
    <Dialog
      isOpen={isDetailModalOpen}
      onClose={closeDetailModal}
      title="Profil Lengkap Dewan Asatidz"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Profil Asatidz */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-blue-50/50 border border-blue-200">
          <div className="w-24 h-32 rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center">
            {selectedAsatidz.foto_asatidz ? (
              <img
                src={selectedAsatidz.foto_asatidz}
                alt={selectedAsatidz.nama_asatidz}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-slate-400 p-2">
                <User className="w-10 h-10 mx-auto mb-1 opacity-50 text-blue-700" />
                <span className="text-[10px] font-medium">Foto Asatidz</span>
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedAsatidz.pa_pi === 'PA'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-pink-100 text-pink-800 border border-pink-200'
                }`}
              >
                {selectedAsatidz.pa_pi === 'PA' ? 'Asatidz (PA)' : 'Ustadzah (PI)'}
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-white">
                NIA: {selectedAsatidz.nia}
              </span>

              {selectedAsatidz.jah_asatidz && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {selectedAsatidz.jah_asatidz}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-800">{selectedAsatidz.nama_asatidz}</h2>

            <p className="text-xs text-slate-500">
              Tempat, Tgl Lahir:{' '}
              <span className="font-semibold text-slate-700">
                {selectedAsatidz.tempat_lahir || '-'}, {selectedAsatidz.tgl_lahir || ''}-
                {selectedAsatidz.bln_lahir || ''}-{selectedAsatidz.thn_lahir || ''}
              </span>
            </p>
          </div>
        </div>

        {/* Matriks Rincian Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Domisili Asrama */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b pb-1">
              <Home className="w-4 h-4 text-blue-700" />
              Domisili Pondok Pesantren
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Blok Asrama</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.blok || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Nama Asrama</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.asrama || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kode Kamar</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.kode || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Nomor Kamar</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.kamar || '-'}</p>
              </div>
            </div>
          </div>

          {/* Tugas Mengajar Diniyyah */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b pb-1">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Tugas Mengajar Diniyyah
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Tingkat</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.tingkat_asatidz || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kelas</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.din_kls_asatidz || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Bagian</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.din_bag_asatidz || '-'}</p>
              </div>
              <div className="col-span-3 pt-1">
                <p className="text-slate-400 text-[11px]">Lokasi Diniyyah / Takror</p>
                <p className="font-semibold text-slate-700">
                  {selectedAsatidz.lokasi_diniyyah || '-'} / {selectedAsatidz.lokasi_takror || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Alamat Wilayah Asal */}
          <div className="md:col-span-2 p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b pb-1">
              <MapPin className="w-4 h-4 text-rose-500" />
              Alamat Asal
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Dusun / Desa</p>
                <p className="font-semibold text-slate-700">
                  {selectedAsatidz.dusun || '-'}, {selectedAsatidz.desa || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kecamatan</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.kecamatan || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kabupaten</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.kabupaten || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Provinsi</p>
                <p className="font-semibold text-slate-700">{selectedAsatidz.provinsi || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Asatidz
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={closeDetailModal}
              className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              Tutup
            </button>
            <button
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white shadow-sm transition"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Data Asatidz
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
