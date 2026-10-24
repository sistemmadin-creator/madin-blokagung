'use client';

import React, { useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import {
  User,
  Home,
  GraduationCap,
  MapPin,
  Edit,
  Trash2,
  Users,
  ZoomIn,
  BookOpen,
} from 'lucide-react';

export default function ModalDetailAsatidz() {
  const {
    isDetailModalOpen,
    closeDetailModal,
    selectedAsatidz,
    openInputModal,
    openFotoZoom,
    deleteAsatidz,
  } = useAsatidzStore();

  const { santriList, fetchSantri } = useSantriStore();
  const { setoranList, fetchSetoranData } = useMuhafadzohStore();

  useEffect(() => {
    if (isDetailModalOpen) {
      if (santriList.length === 0) fetchSantri();
      if (setoranList.length === 0) fetchSetoranData();
    }
  }, [isDetailModalOpen, santriList.length, setoranList.length, fetchSantri, fetchSetoranData]);

  const santriBinaan = useMemo(() => {
    if (!selectedAsatidz) return [];

    const matchTingkat = (selectedAsatidz.tingkat_asatidz || '').trim().toUpperCase();
    const matchDinKls = (selectedAsatidz.din_kls_asatidz || '').trim().toUpperCase();
    const matchDinBag = (selectedAsatidz.din_bag_asatidz || '').trim().toUpperCase();
    const matchPaPi = (selectedAsatidz.pa_pi || '').trim().toUpperCase();

    if (!matchTingkat && !matchDinKls) return [];

    return santriList.filter((s) => {
      const sTingkat = (s.tingkat || '').trim().toUpperCase();
      const sDinKls = (s.din_kls || '').trim().toUpperCase();
      const sDinBag = (s.din_bag || '').trim().toUpperCase();
      const sPaPi = (s.pa_pi || '').trim().toUpperCase();

      const matchT = !matchTingkat || sTingkat === matchTingkat;
      const matchK = !matchDinKls || sDinKls === matchDinKls;
      const matchB = !matchDinBag || sDinBag === matchDinBag;
      const matchG = !matchPaPi || sPaPi === matchPaPi;

      return matchT && matchK && matchB && matchG;
    });
  }, [selectedAsatidz, santriList]);

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

  const kelasGabung = `${selectedAsatidz.din_kls_asatidz || ''}${selectedAsatidz.din_bag_asatidz || ''} ${selectedAsatidz.tingkat_asatidz || ''}`.trim();

  return (
    <Dialog
      isOpen={isDetailModalOpen}
      onClose={closeDetailModal}
      title="Detail Profil Asatidz & Santri Binaan"
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Header Profil Asatidz */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
          <div
            onClick={() =>
              selectedAsatidz.foto_asatidz &&
              openFotoZoom(selectedAsatidz.foto_asatidz, selectedAsatidz.nama_asatidz, selectedAsatidz.nia)
            }
            className={`w-24 h-32 rounded-xl border border-slate-300 bg-white shadow-xs overflow-hidden shrink-0 flex items-center justify-center relative group ${
              selectedAsatidz.foto_asatidz ? 'cursor-zoom-in' : ''
            }`}
          >
            {selectedAsatidz.foto_asatidz ? (
              <>
                <img
                  src={selectedAsatidz.foto_asatidz}
                  alt={selectedAsatidz.nama_asatidz}
                  className="w-full h-full object-cover transition group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                  <ZoomIn className="w-5 h-5 drop-shadow-md" />
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 p-2">
                <User className="w-9 h-9 mx-auto mb-1 opacity-50 text-slate-500" />
                <span className="text-[10px] font-medium">Foto Asatidz</span>
              </div>
            )}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  selectedAsatidz.pa_pi === 'PA'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-pink-50 text-pink-700 border border-pink-200'
                }`}
              >
                {selectedAsatidz.pa_pi === 'PA' ? 'Asatidz (PA)' : 'Ustadzah (PI)'}
              </span>

              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-800 text-white">
                NIA: {selectedAsatidz.nia}
              </span>

              {selectedAsatidz.nis && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-600 bg-slate-200 border border-slate-300">
                  NIS: {selectedAsatidz.nis}
                </span>
              )}

              {selectedAsatidz.jah_asatidz && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                  {selectedAsatidz.jah_asatidz}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-800">{selectedAsatidz.nama_asatidz}</h2>

            <p className="text-xs text-slate-500">
              Tempat, Tgl Lahir:{' '}
              <span className="font-semibold text-slate-700">
                {selectedAsatidz.tempat_lahir || '-'}, {selectedAsatidz.tgl_lahir || ''}{' '}
                {selectedAsatidz.bln_lahir || ''} {selectedAsatidz.thn_lahir || ''}
              </span>
            </p>
          </div>
        </div>

        {/* Matriks Rincian Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Tugas Mengajar Diniyyah */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Tugas Mengajar & Lokasi KBM
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

          {/* Domisili Pondok Pesantren */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Home className="w-4 h-4 text-blue-600" />
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

          {/* Alamat Wilayah Asal */}
          <div className="md:col-span-2 p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              Alamat Domisili Asal
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
              <div>
                <p className="text-slate-400 text-[11px]">Dusun / Desa</p>
                <p className="font-semibold text-slate-700">
                  {selectedAsatidz.dusun ? `${selectedAsatidz.dusun}, ` : ''}{selectedAsatidz.desa || '-'}
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

        {/* Tabel Daftar Santri Binaan */}
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Daftar Santri Binaan Kelas {kelasGabung || '-'}</span>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                {santriBinaan.length} Santri
              </span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Otomatis dicocokkan berdasarkan Tingkat, Kelas & Bagian
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 sticky top-0 border-b border-slate-200 text-slate-600 font-semibold z-10">
                <tr>
                  <th className="p-2.5 w-10 text-center">No</th>
                  <th className="p-2.5 w-32">Kamar</th>
                  <th className="p-2.5 w-48">Nama Santri</th>
                  <th className="p-2.5">Hafalan &amp; Kategori</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                {santriBinaan.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      Tidak ada santri yang terdaftar di kelas binaan ini ({kelasGabung}).
                    </td>
                  </tr>
                ) : (
                  santriBinaan.map((s, idx) => {
                    const santriNoInduk = String(s.no_induk || '').trim();
                    const riwayat = setoranList.filter(
                      (m) => String(m.no_induk || '').trim() === santriNoInduk
                    );
                    const kamarStr =
                      s.kode && s.kamar ? `${s.kode} - ${s.kamar}` : s.kode || s.kamar || '-';

                    return (
                      <tr key={s.no_induk || idx} className="hover:bg-slate-50/70 transition">
                        <td className="p-2.5 text-center text-slate-400 font-medium">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200">
                            {kamarStr}
                          </span>
                        </td>
                        <td className="p-2.5 font-semibold text-slate-800 whitespace-nowrap">
                          {s.nama}
                        </td>
                        <td className="p-2.5">
                          {riwayat.length === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">
                              Belum ada riwayat setoran
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {riwayat.map((m, mIdx) => {
                                const kat = (m.kategori || 'Wajib').trim();
                                const katUpper = kat.toUpperCase();
                                const colorClass =
                                  katUpper === 'TAHFIDZ'
                                    ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                    : katUpper === 'SUNNAH'
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : katUpper === 'KITAB'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200';

                                return (
                                  <span
                                    key={m.id || mIdx}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${colorClass}`}
                                  >
                                    <BookOpen className="w-2.5 h-2.5 opacity-60" />
                                    <span>{m.item_hafalan || '-'}</span>
                                    <span className="px-1 py-0.2 rounded bg-white text-slate-600 border border-slate-200 text-[9px]">
                                      {kat}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition border border-rose-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Asatidz</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeDetailModal}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-sm transition"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Data Asatidz</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
