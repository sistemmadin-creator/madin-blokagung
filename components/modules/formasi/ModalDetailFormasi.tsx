'use client';

import React, { useState, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { getSantriInFormasi } from '@/lib/utils/formasiSync';
import {
  Users,
  Edit,
  Trash2,
  Search,
  Star,
  Camera,
  Inbox,
} from 'lucide-react';

export default function ModalDetailFormasi() {
  const {
    isDetailModalOpen,
    closeDetailModal,
    selectedFormasi,
    openInputModal,
    deleteFormasi,
    openFotoModal,
    toggleUnggulan,
  } = useFormasiStore();

  const { santriList } = useSantriStore();
  const [santriSearch, setSantriSearch] = useState('');

  // Find real-time list of enrolled students in this formation
  const daftarSantri = useMemo(() => {
    if (!selectedFormasi) return [];
    return getSantriInFormasi(selectedFormasi, santriList);
  }, [selectedFormasi, santriList]);

  // Filter students based on search input
  const filteredSantri = useMemo(() => {
    if (!santriSearch.trim()) return daftarSantri;
    const q = santriSearch.toLowerCase().trim();
    return daftarSantri.filter((s) => {
      const matchNama = (s.nama || '').toLowerCase().includes(q);
      const matchInduk = (s.no_induk || '').toLowerCase().includes(q);
      const matchKamar = `${s.blok || ''} ${s.asrama || ''} ${s.kamar || ''}`
        .toLowerCase()
        .includes(q);
      const matchFormal = `${s.unit || ''} ${s.kelas || ''}`
        .toLowerCase()
        .includes(q);
      return matchNama || matchInduk || matchKamar || matchFormal;
    });
  }, [daftarSantri, santriSearch]);

  if (!selectedFormasi) return null;

  const f = selectedFormasi;
  const namaKelasLengkap = `${f.din_kls || ''} ${f.din_bag || ''} ${f.tingkat || ''}`.trim();
  const kapasitasMaks = f.kapasitas_maksimal || 80;
  const isFull = daftarSantri.length >= kapasitasMaks;

  const handleEdit = () => {
    closeDetailModal();
    openInputModal(f);
  };

  const handleDelete = async () => {
    if (f.id && (await deleteFormasi(f.id))) {
      closeDetailModal();
    }
  };

  const handleOpenFoto = (jenis: 'takror' | 'diniyyah') => {
    const isTakror = jenis === 'takror';
    const url = isTakror
      ? f.foto_takror_sync || f.foto_takror || ''
      : f.foto_diniyyah_sync || f.foto_diniyyah || '';
    const label = isTakror
      ? `Lokal Takror: ${f.takror_sync || f.lokasi_takror || '-'}`
      : `Lokasi Diniyyah: ${f.diniyyah_sync || f.lokasi_diniyyah || '-'}`;

    openFotoModal({
      id: f.id || '',
      jenis,
      url,
      label,
      namaKelas: namaKelasLengkap,
    });
  };

  return (
    <Dialog
      isOpen={isDetailModalOpen}
      onClose={closeDetailModal}
      title={`Detail Formasi Kelas - ${namaKelasLengkap}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* 1. Kartu Informasi Kelas & Wali Kelas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h6 className="text-xs font-bold text-madin-800 uppercase tracking-wide flex items-center gap-1.5">
              <span>Informasi Kelas &amp; Wali Kelas</span>
            </h6>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                f.pa_pi === 'PA'
                  ? 'bg-sky-100 text-sky-800 border border-sky-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {f.pa_pi === 'PA' ? 'Santri Putra (PA)' : 'Santri Putri (PI)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Sisi Kiri */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tingkat Diniyyah:</span>
                <span className="font-bold text-slate-800">{f.tingkat}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kelas / Bagian:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  {f.din_kls} - {f.din_bag}
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!f.id) return;
                      await toggleUnggulan(f.id, !!f.is_unggulan);
                    }}
                    title={
                      f.is_unggulan
                        ? 'Klik untuk menonaktifkan status kelas unggulan'
                        : 'Klik untuk mengaktifkan status kelas unggulan'
                    }
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                      f.is_unggulan
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300'
                    }`}
                  >
                    <Star
                      className={`w-3 h-3 ${
                        f.is_unggulan ? 'fill-amber-500 text-amber-600' : 'text-slate-400'
                      }`}
                    />
                    {f.is_unggulan ? 'Unggulan' : 'Reguler'}
                  </button>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kapasitas Maksimal:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    isFull
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {daftarSantri.length} / {kapasitasMaks} Santri
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Domisili:</span>
                <span className="font-semibold text-slate-700">
                  {f.domisili_sync || f.domisili || '-'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Blok Diniyyah:</span>
                <span className="font-semibold text-emerald-800">{f.blok_diniyyah || f.blok_diniyyah_sync || '-'}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Blok Takror:</span>
                <span className="font-semibold text-amber-800">{f.blok_takror || f.blok_takror_sync || '-'}</span>
              </div>
            </div>

            {/* Sisi Kanan */}
            <div className="space-y-2">
              <div>
                <span className="text-slate-500 block mb-0.5">Wali Kelas (Mustahiq):</span>
                <div className="font-bold text-madin-700 flex items-center gap-1.5 flex-wrap">
                  <span>{f.wali_kelas_text || f.id_mustahiq || '-'}</span>
                  {f.mustahiq_kg && f.mustahiq_kg !== '-' && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-mono">
                      {f.mustahiq_kg}
                    </span>
                  )}
                </div>
              </div>

              {/* Lokal Takror */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">Lokal Takror:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">
                    {f.takror_sync || f.lokasi_takror || '-'}
                  </span>
                  {(f.foto_takror_sync || f.foto_takror) && (
                    <button
                      type="button"
                      onClick={() => handleOpenFoto('takror')}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                      title="Lihat Foto Lokal Takror"
                    >
                      <Camera className="w-3.5 h-3.5 text-madin-700" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lokasi Diniyyah */}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lokasi Diniyyah:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800">
                    {f.diniyyah_sync || f.lokasi_diniyyah || '-'}
                  </span>
                  {(f.foto_diniyyah_sync || f.foto_diniyyah) && (
                    <button
                      type="button"
                      onClick={() => handleOpenFoto('diniyyah')}
                      className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition"
                      title="Lihat Foto Lokasi Diniyyah"
                    >
                      <Camera className="w-3.5 h-3.5 text-madin-700" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Kartu Daftar Santri di Kelas Ini */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h6 className="text-xs font-bold text-madin-800 uppercase tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4 text-madin-700" />
              <span>Daftar Santri Terdaftar</span>
              <span className="px-2 py-0.5 rounded-full bg-madin-100 text-madin-800 text-[11px] font-bold">
                {daftarSantri.length} Santri
              </span>
            </h6>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={santriSearch}
                onChange={(e) => setSantriSearch(e.target.value)}
                placeholder="Cari nama / NIS / kamar..."
                className="w-full sm:w-56 text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-slate-100 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-center w-10">No</th>
                  <th className="py-2 px-3 w-28">No. Induk</th>
                  <th className="py-2 px-3 min-w-[180px]">Nama Lengkap Santri</th>
                  <th className="py-2 px-3 min-w-[140px]">Domisili Kamar</th>
                  <th className="py-2 px-3 min-w-[140px]">Sekolah Formal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSantri.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      <Inbox className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                      <p className="text-xs">
                        {daftarSantri.length === 0
                          ? `Belum ada santri yang terdaftar di kelas ${namaKelasLengkap}.`
                          : 'Tidak ada santri yang sesuai dengan pencarian.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredSantri.map((s, idx) => {
                    const domisiliKamar =
                      [s.blok, s.asrama, s.kode, s.kamar].filter(Boolean).join(' - ') || '-';
                    const sekolahFormal =
                      [s.unit, s.kelas].filter(Boolean).join(' - ') || '-';

                    return (
                      <tr key={s.no_induk || idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-center text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-slate-700">
                          {s.no_induk || '-'}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {s.nama || '-'}
                        </td>
                        <td className="py-2 px-3 text-slate-600">{domisiliKamar}</td>
                        <td className="py-2 px-3 text-slate-600">{sekolahFormal}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Kelas</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeDetailModal}
              className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-xs transition"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Formasi</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
