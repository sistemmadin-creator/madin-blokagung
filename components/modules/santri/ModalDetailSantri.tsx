'use client';

import React, { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
import { User, MapPin, Home, GraduationCap, Users, Phone, Edit, Trash2, ZoomIn } from 'lucide-react';
import ModalFotoZoom from './ModalFotoZoom';

export default function ModalDetailSantri() {
  const {
    isDetailModalOpen,
    closeDetailModal,
    selectedSantri,
    openInputModal,
    deleteSantri,
  } = useSantriStore();

  const [isZoomOpen, setIsZoomOpen] = useState(false);

  if (!selectedSantri) return null;

  const handleEdit = () => {
    const santri = selectedSantri;
    closeDetailModal();
    openInputModal(santri);
  };

  const handleDelete = async () => {
    if (await deleteSantri(selectedSantri.no_induk)) {
      closeDetailModal();
    }
  };

  return (
    <>
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        title="Kartu Biodata Lengkap Santri"
        maxWidth="3xl"
      >
        <div className="space-y-6">
          {/* Header Profil Santri */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div
              onClick={() => selectedSantri.foto && setIsZoomOpen(true)}
              className={`w-24 h-32 rounded-xl border-2 border-slate-200 bg-white shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center relative group ${
                selectedSantri.foto ? 'cursor-pointer hover:border-madin-600 transition' : ''
              }`}
              title={selectedSantri.foto ? 'Klik untuk memperbesar foto (Lightbox)' : undefined}
            >
              {selectedSantri.foto ? (
                <>
                  <img
                    src={selectedSantri.foto}
                    alt={selectedSantri.nama}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition duration-200">
                    <ZoomIn className="w-5 h-5 drop-shadow-md" />
                  </div>
                </>
              ) : (
                <div className="text-center text-slate-400 p-2">
                  <User className="w-10 h-10 mx-auto mb-1 opacity-50" />
                  <span className="text-[10px] font-medium">Foto 3x4</span>
                </div>
              )}
            </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedSantri.pa_pi === 'PA'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-pink-100 text-pink-800 border border-pink-200'
                }`}
              >
                {selectedSantri.pa_pi === 'PA' ? 'Santri Putra (PA)' : 'Santri Putri (PI)'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 text-slate-700">
                No. Induk: {selectedSantri.no_induk}
              </span>
              {selectedSantri.nisn && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-100 text-slate-600 border border-slate-200">
                  NISN: {selectedSantri.nisn}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-800">{selectedSantri.nama}</h2>

            <p className="text-xs text-slate-500">
              Tempat, Tgl Lahir:{' '}
              <span className="font-semibold text-slate-700">
                {selectedSantri.tempat_lahir || '-'}, {selectedSantri.tgl_lahir || ''}-
                {selectedSantri.bln_lahir || ''}-{selectedSantri.thn_lahir || ''}
              </span>
            </p>

            {selectedSantri.telepon && (
              <p className="text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{selectedSantri.telepon}</span>
              </p>
            )}
          </div>
        </div>

        {/* Matriks Informasi Rinci 4 Kolom Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Domisili Asrama & Kamar */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-bottom pb-1">
              <Home className="w-4 h-4 text-madin-700" />
              Domisili Pondok Pesantren
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Blok Asrama</p>
                <p className="font-semibold text-slate-700">{selectedSantri.blok || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Nama Asrama</p>
                <p className="font-semibold text-slate-700">{selectedSantri.asrama || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kode Kamar</p>
                <p className="font-semibold text-slate-700">{selectedSantri.kode || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Nomor Kamar</p>
                <p className="font-semibold text-slate-700">{selectedSantri.kamar || '-'}</p>
              </div>
            </div>
          </div>

          {/* Pendidikan Madrasah Diniyyah */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-bottom pb-1">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Madrasah Diniyyah Al Amiriyyah
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Tingkat</p>
                <p className="font-semibold text-slate-700">{selectedSantri.tingkat || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kelas Diniyyah</p>
                <p className="font-semibold text-slate-700">{selectedSantri.din_kls || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Bagian</p>
                <p className="font-semibold text-slate-700">{selectedSantri.din_bag || '-'}</p>
              </div>
            </div>
          </div>

          {/* Sekolah Formal */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-bottom pb-1">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              Pendidikan Formal
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Unit Formal</p>
                <p className="font-semibold text-slate-700">{selectedSantri.unit || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Jurusan</p>
                <p className="font-semibold text-slate-700">{selectedSantri.jurusan || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Semester / Kelas</p>
                <p className="font-semibold text-slate-700">
                  {selectedSantri.semester ? `Smtr ${selectedSantri.semester}` : '-'} / Kls {selectedSantri.kelas || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Wilayah Asal Santri */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-bottom pb-1">
              <MapPin className="w-4 h-4 text-rose-500" />
              Alamat Wilayah Asal
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Dusun / Desa</p>
                <p className="font-semibold text-slate-700">
                  {selectedSantri.dusun || '-'}, {selectedSantri.desa || '-'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kecamatan</p>
                <p className="font-semibold text-slate-700">{selectedSantri.kecamatan || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Kabupaten</p>
                <p className="font-semibold text-slate-700">{selectedSantri.kabupaten || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Provinsi</p>
                <p className="font-semibold text-slate-700">{selectedSantri.provinsi || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Data Keluarga & Kependudukan */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-bottom pb-1">
            <Users className="w-4 h-4 text-purple-600" />
            Data Kependudukan & Orang Tua / Wali
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
            <div>
              <p className="text-slate-400 text-[11px]">NIK Santri</p>
              <p className="font-mono font-medium text-slate-700">{selectedSantri.nik || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Nomor KK</p>
              <p className="font-mono font-medium text-slate-700">{selectedSantri.no_kk || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Nama Ayah (NIK)</p>
              <p className="font-semibold text-slate-700">
                {selectedSantri.nama_ayah || '-'} {selectedSantri.nik_ayah ? `(${selectedSantri.nik_ayah})` : ''}
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-[11px]">Nama Ibu (NIK)</p>
              <p className="font-semibold text-slate-700">
                {selectedSantri.nama_ibu || '-'} {selectedSantri.nik_ibu ? `(${selectedSantri.nik_ibu})` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Santri
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm transition"
            >
              <Edit className="w-3.5 h-3.5" />
              Edit Biodata Santri
            </button>
          </div>
        </div>
      </div>
    </Dialog>

      <ModalFotoZoom
        isOpen={isZoomOpen}
        onClose={() => setIsZoomOpen(false)}
        fotoUrl={selectedSantri.foto}
        nama={selectedSantri.nama}
        noInduk={selectedSantri.no_induk}
      />
    </>
  );
}
