'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import {
  KelasKonsorsium,
  StatusAbsenKonsorsium,
  DetailPresensiKonsorsium,
  SesiPresensiKonsorsium,
} from '@/types/konsorsium';
import {
  CheckCircle2,
  Calendar,
  Save,
  Clock,
  Sparkles,
  Info,
  CheckCheck,
} from 'lucide-react';

interface ModalInputPresensiKonsorsiumProps {
  isOpen: boolean;
  onClose: () => void;
  kelas: KelasKonsorsium | null;
  editSesi?: SesiPresensiKonsorsium | null;
}

const STATUS_OPTIONS: { label: string; value: StatusAbsenKonsorsium; color: string; activeColor: string }[] = [
  { label: 'Hadir', value: 'Hadir', color: 'hover:bg-emerald-50 text-emerald-700 border-emerald-300', activeColor: 'bg-emerald-600 text-white border-emerald-600' },
  { label: 'Izin', value: 'Izin', color: 'hover:bg-amber-50 text-amber-700 border-amber-300', activeColor: 'bg-amber-500 text-white border-amber-500' },
  { label: 'Sakit', value: 'Sakit', color: 'hover:bg-blue-50 text-blue-700 border-blue-300', activeColor: 'bg-blue-600 text-white border-blue-600' },
  { label: 'Alfa', value: 'Alfa', color: 'hover:bg-rose-50 text-rose-700 border-rose-300', activeColor: 'bg-rose-600 text-white border-rose-600' },
  { label: 'Terlambat', value: 'Terlambat', color: 'hover:bg-orange-50 text-orange-700 border-orange-300', activeColor: 'bg-orange-500 text-white border-orange-500' },
];

export default function ModalInputPresensiKonsorsium({
  isOpen,
  onClose,
  kelas,
  editSesi,
}: ModalInputPresensiKonsorsiumProps) {
  const { anggotaList, simpanSesiPresensi } = useKonsorsiumStore();

  const [tanggal, setTanggal] = useState('');
  const [topikBahasan, setTopikBahasan] = useState('');
  const [notulen, setNotulen] = useState('');
  const [recordsMap, setRecordsMap] = useState<
    Record<string, { status: StatusAbsenKonsorsium; keterangan: string }>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Anggota terdaftar pada kelas ini
  const enrolledAnggota = useMemo(() => {
    if (!kelas) return [];
    return anggotaList.filter((a) => a.kelasId === kelas.id);
  }, [anggotaList, kelas]);

  useEffect(() => {
    if (isOpen && kelas) {
      setErrorMsg('');
      if (editSesi) {
        setTanggal(editSesi.tanggal || '');
        setTopikBahasan(editSesi.topikBahasan || '');
        setNotulen(editSesi.notulen || '');

        const map: Record<string, { status: StatusAbsenKonsorsium; keterangan: string }> = {};
        editSesi.records.forEach((r) => {
          map[r.anggotaId] = {
            status: r.status,
            keterangan: r.keterangan || '',
          };
        });
        setRecordsMap(map);
      } else {
        const today = new Date().toISOString().split('T')[0];
        setTanggal(today);
        setTopikBahasan('');
        setNotulen('');

        // Default: semua anggota berstatus 'Hadir'
        const initialMap: Record<string, { status: StatusAbsenKonsorsium; keterangan: string }> = {};
        enrolledAnggota.forEach((a) => {
          initialMap[a.id] = { status: 'Hadir', keterangan: '' };
        });
        setRecordsMap(initialMap);
      }
    }
  }, [isOpen, kelas, editSesi, enrolledAnggota]);

  const handleStatusChange = (anggotaId: string, status: StatusAbsenKonsorsium) => {
    setRecordsMap((prev) => ({
      ...prev,
      [anggotaId]: {
        status,
        keterangan: prev[anggotaId]?.keterangan || '',
      },
    }));
  };

  const handleKeteranganChange = (anggotaId: string, keterangan: string) => {
    setRecordsMap((prev) => ({
      ...prev,
      [anggotaId]: {
        status: prev[anggotaId]?.status || 'Hadir',
        keterangan,
      },
    }));
  };

  const handleSetAllHadir = () => {
    const updated: Record<string, { status: StatusAbsenKonsorsium; keterangan: string }> = {};
    enrolledAnggota.forEach((a) => {
      updated[a.id] = {
        status: 'Hadir',
        keterangan: recordsMap[a.id]?.keterangan || '',
      };
    });
    setRecordsMap(updated);
  };

  // KPI Ringkasan
  const stats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;
    let terlambat = 0;

    Object.values(recordsMap).forEach((r) => {
      if (r.status === 'Hadir') hadir++;
      else if (r.status === 'Izin') izin++;
      else if (r.status === 'Sakit') sakit++;
      else if (r.status === 'Alfa') alfa++;
      else if (r.status === 'Terlambat') terlambat++;
    });

    return { total: enrolledAnggota.length, hadir, izin, sakit, alfa, terlambat };
  }, [recordsMap, enrolledAnggota.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kelas) return;
    if (!tanggal) {
      setErrorMsg('Pilih tanggal pertemuan.');
      return;
    }
    if (enrolledAnggota.length === 0) {
      setErrorMsg('Belum ada asatidz yang didaftarkan ke kelas konsorsium ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const records: DetailPresensiKonsorsium[] = enrolledAnggota.map((a) => {
        const entry = recordsMap[a.id] || { status: 'Hadir', keterangan: '' };
        return {
          id: `det-${Date.now()}-${a.id}`,
          anggotaId: a.id,
          nia: a.nia,
          nama: a.nama,
          status: entry.status,
          keterangan: entry.keterangan,
          waktuInput: new Date().toISOString(),
        };
      });

      await simpanSesiPresensi(
        {
          kelasId: kelas.id,
          tanggal,
          topikBahasan: topikBahasan.trim(),
          notulen: notulen.trim(),
          records,
        },
        editSesi?.id
      );

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Terjadi kesalahan saat menyimpan presensi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!kelas) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editSesi ? 'Ubah Presensi Konsorsium' : `Input Presensi: ${kelas.namaKelas}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Info Header Pertemuan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Tanggal Pertemuan <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Materi / Topik Bahasan Konsorsium
            </label>
            <input
              type="text"
              value={topikBahasan}
              onChange={(e) => setTopikBahasan(e.target.value)}
              placeholder="Contoh: Evaluasi Silabus Semester Ganjil & Penyeragaman Materi"
              className="w-full px-3 py-1.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Ringkasan Kehadiran & Tombol Cepat */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">Total: {stats.total}</span>
            <span className="text-slate-300">|</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
              Hadir: {stats.hadir}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-semibold">
              Izin: {stats.izin}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold">
              Sakit: {stats.sakit}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
              Alfa: {stats.alfa}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-semibold">
              Terlambat: {stats.terlambat}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSetAllHadir}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Set Semua Hadir
          </button>
        </div>

        {/* Tabel Asatidz Terdaftar untuk Presensi */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-96 overflow-y-auto">
          {enrolledAnggota.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Belum ada asatidz yang didaftarkan ke kelas ini. Silakan klik tombol{' '}
              <strong>Daftar Asatidz</strong> terlebih dahulu.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 text-slate-600 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 w-28">NIA</th>
                  <th className="py-2.5 px-3">Nama Asatidz</th>
                  <th className="py-2.5 px-3 w-72 text-center">Status Kehadiran</th>
                  <th className="py-2.5 px-3 w-48">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrolledAnggota.map((a, idx) => {
                  const currentStatus = recordsMap[a.id]?.status || 'Hadir';
                  const currentKet = recordsMap[a.id]?.keterangan || '';

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                        {a.nia}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {a.nama}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleStatusChange(a.id, opt.value)}
                              className={`px-2 py-1 text-[11px] font-medium rounded border transition-all ${
                                currentStatus === opt.value
                                  ? opt.activeColor + ' font-bold shadow-xs'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={currentKet}
                          onChange={(e) => handleKeteranganChange(a.id, e.target.value)}
                          placeholder="Alasan / catatan..."
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Notulen / Catatan Rapat Pertemuan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Notulen / Ringkasan Hasil Konsorsium (Opsional)
          </label>
          <textarea
            value={notulen}
            onChange={(e) => setNotulen(e.target.value)}
            rows={2}
            placeholder="Catatan hasil musyawarah / kesepakatan fan konsorsium..."
            className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 resize-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting || enrolledAnggota.length === 0}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Presensi'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
