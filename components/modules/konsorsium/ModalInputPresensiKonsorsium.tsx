'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import {
  KelasKonsorsium,
  StatusAbsenKonsorsium,
  DetailPresensiKonsorsium,
  SesiPresensiKonsorsium,
} from '@/types/konsorsium';
import {
  getDaftarPertemuanBulan,
  NAMA_BULAN_IND,
  getHariNamaKonsorsium,
  getLocalTodayISO,
} from '@/lib/utils/konsorsiumHelper';
import {
  Calendar,
  Save,
  Info,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ModalInputPresensiKonsorsiumProps {
  isOpen: boolean;
  onClose: () => void;
  kelas: KelasKonsorsium | null;
  editSesi?: SesiPresensiKonsorsium | null;
  targetTanggal?: string;
}

const STATUS_OPTIONS: {
  label: string;
  value: StatusAbsenKonsorsium;
  color: string;
  activeColor: string;
}[] = [
  {
    label: 'Hadir',
    value: 'Hadir',
    color: 'hover:bg-emerald-50 text-emerald-700 border-emerald-300',
    activeColor: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    label: 'Izin',
    value: 'Izin',
    color: 'hover:bg-amber-50 text-amber-700 border-amber-300',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    label: 'Sakit',
    value: 'Sakit',
    color: 'hover:bg-blue-50 text-blue-700 border-blue-300',
    activeColor: 'bg-blue-600 text-white border-blue-600',
  },
  {
    label: 'Alfa',
    value: 'Alfa',
    color: 'hover:bg-rose-50 text-rose-700 border-rose-300',
    activeColor: 'bg-rose-600 text-white border-rose-600',
  },
  {
    label: 'Terlambat',
    value: 'Terlambat',
    color: 'hover:bg-orange-50 text-orange-700 border-orange-300',
    activeColor: 'bg-orange-500 text-white border-orange-500',
  },
];

export default function ModalInputPresensiKonsorsium({
  isOpen,
  onClose,
  kelas,
  editSesi,
  targetTanggal,
}: ModalInputPresensiKonsorsiumProps) {
  const { anggotaList, sesiList, simpanSesiPresensi } = useKonsorsiumStore();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12
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

  // Daftar pertemuan sah (Kamis/Selasa) pada bulan & tahun terpilih
  const pertemuanList = useMemo(() => {
    if (!kelas) return [];
    return getDaftarPertemuanBulan(
      selectedYear,
      selectedMonth,
      kelas.jenisKonsor || 'Mustahiq/qoh'
    );
  }, [selectedYear, selectedMonth, kelas]);

  // Helper untuk mengisi recordsMap lengkap bagi seluruh enrolledAnggota
  const applySesiOrDefaultToForm = useCallback(
    (targetDate: string, explicitSesi?: SesiPresensiKonsorsium | null) => {
      if (!kelas) return;

      const baseMap: Record<string, { status: StatusAbsenKonsorsium; keterangan: string }> = {};
      enrolledAnggota.forEach((a) => {
        baseMap[a.id] = { status: 'Hadir', keterangan: '' };
      });

      const matchedSesi =
        explicitSesi && explicitSesi.tanggal === targetDate
          ? explicitSesi
          : sesiList.find((s) => s.kelasId === kelas.id && s.tanggal === targetDate);

      if (matchedSesi) {
        setTopikBahasan(matchedSesi.topikBahasan || '');
        setNotulen(matchedSesi.notulen || '');
        enrolledAnggota.forEach((a) => {
          const rec = matchedSesi.records.find(
            (r) =>
              r.anggotaId === a.id ||
              (r.nia && r.nia !== '-' && r.nia === a.nia)
          );
          if (rec) {
            baseMap[a.id] = {
              status: rec.status,
              keterangan: rec.keterangan || '',
            };
          }
        });
      } else {
        setTopikBahasan('');
        setNotulen('');
      }

      setRecordsMap(baseMap);
    },
    [kelas, enrolledAnggota, sesiList]
  );

  // Inisialisasi data form saat modal dibuka atau target sesi berubah
  useEffect(() => {
    if (!isOpen || !kelas) return;

    setErrorMsg('');
    const todayStr = getLocalTodayISO();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const defaultMonthMeetings = getDaftarPertemuanBulan(
      currentYear,
      currentMonth,
      kelas.jenisKonsor || 'Mustahiq/qoh'
    );

    const initDate =
      editSesi?.tanggal ||
      targetTanggal ||
      (defaultMonthMeetings.length > 0 ? defaultMonthMeetings[0].tanggal : todayStr);

    const parts = initDate.split('-');
    if (parts.length >= 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(y) && !isNaN(m)) {
        setSelectedYear(y);
        setSelectedMonth(m);
      }
    }

    setTanggal(initDate);
    applySesiOrDefaultToForm(initDate, editSesi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, kelas?.id, editSesi?.id, targetTanggal]);

  // Pastikan jika ada anggota baru saat modal terbuka, mereka tetap punya entry di recordsMap
  useEffect(() => {
    if (!isOpen || !kelas) return;
    setRecordsMap((prev) => {
      let changed = false;
      const next = { ...prev };
      enrolledAnggota.forEach((a) => {
        if (!next[a.id]) {
          next[a.id] = { status: 'Hadir', keterangan: '' };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [isOpen, kelas, enrolledAnggota]);

  // Ketika pengguna mengklik salah satu tombol Pertemuan 1..5
  const handlePilihPertemuan = (pTanggal: string) => {
    setTanggal(pTanggal);
    applySesiOrDefaultToForm(pTanggal, null);
  };

  const handlePrevMonth = () => {
    if (!kelas) return;
    const nextMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const nextYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);

    const nextMeetings = getDaftarPertemuanBulan(
      nextYear,
      nextMonth,
      kelas.jenisKonsor || 'Mustahiq/qoh'
    );
    const nextDate = nextMeetings[0]?.tanggal || '';
    setTanggal(nextDate);
    if (nextDate) {
      applySesiOrDefaultToForm(nextDate, null);
    }
  };

  const handleNextMonth = () => {
    if (!kelas) return;
    const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
    const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);

    const nextMeetings = getDaftarPertemuanBulan(
      nextYear,
      nextMonth,
      kelas.jenisKonsor || 'Mustahiq/qoh'
    );
    const nextDate = nextMeetings[0]?.tanggal || '';
    setTanggal(nextDate);
    if (nextDate) {
      applySesiOrDefaultToForm(nextDate, null);
    }
  };

  const handleStatusChange = (
    anggotaId: string,
    status: StatusAbsenKonsorsium
  ) => {
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

  // KPI Ringkasan selalu dihitung dari enrolledAnggota aktif
  const stats = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let sakit = 0;
    let alfa = 0;
    let terlambat = 0;

    enrolledAnggota.forEach((a) => {
      const status = recordsMap[a.id]?.status || 'Hadir';
      if (status === 'Hadir') hadir++;
      else if (status === 'Izin') izin++;
      else if (status === 'Sakit') sakit++;
      else if (status === 'Alfa') alfa++;
      else if (status === 'Terlambat') terlambat++;
    });

    return { total: enrolledAnggota.length, hadir, izin, sakit, alfa, terlambat };
  }, [recordsMap, enrolledAnggota]);

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

      // Hitung info pertemuan ke- berapa
      const currentPertemuan = pertemuanList.find((p) => p.tanggal === tanggal);

      // Utamakan sesi dengan tanggal yang sedang dipilih agar ganti tab tanggal tidak menimpa sesi lama
      const existingSesiByDate = sesiList.find(
        (s) => s.kelasId === kelas.id && s.tanggal === tanggal
      );
      const targetSesiId =
        existingSesiByDate?.id ||
        (editSesi && editSesi.tanggal === tanggal ? editSesi.id : undefined);

      await simpanSesiPresensi(
        {
          kelasId: kelas.id,
          tanggal,
          tahun: selectedYear,
          bulan: selectedMonth,
          pertemuanKe: currentPertemuan?.ke,
          topikBahasan: topikBahasan.trim(),
          notulen: notulen.trim(),
          records,
        },
        targetSesiId
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

  const hariWajib = getHariNamaKonsorsium(kelas.jenisKonsor || 'Mustahiq/qoh');

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Input Presensi: ${kelas.namaKelas} (${kelas.jenisKonsor || 'Mustahiq/qoh'} - Setiap ${hariWajib})`}
      maxWidth="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-center gap-2">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Selector Pertemuan Berdasarkan Kolom 1..5 Bulan Ini */}
        <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/90 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Pilih Pertemuan Pada Bulan:
              </span>
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:text-emerald-700 hover:bg-slate-100 rounded"
                  aria-label="Bulan Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="min-w-[100px] text-center">
                  {NAMA_BULAN_IND[selectedMonth - 1]} {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:text-emerald-700 hover:bg-slate-100 rounded"
                  aria-label="Bulan Berikutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500">
              Jadwal Wajib: <strong className="text-emerald-800 font-semibold">Hari {hariWajib}</strong> ({pertemuanList.length} pertemuan bulan ini)
            </div>
          </div>

          {/* Cards Pertemuan 1, 2, 3, 4, [5] */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
            {pertemuanList.map((p) => {
              const isSelected = tanggal === p.tanggal;
              const isAlreadySaved = sesiList.some(
                (s) => s.kelasId === kelas.id && s.tanggal === p.tanggal
              );

              return (
                <button
                  key={p.tanggal}
                  type="button"
                  onClick={() => handlePilihPertemuan(p.tanggal)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20'
                      : isAlreadySaved
                      ? 'bg-emerald-50/80 border-emerald-200 text-slate-800 hover:border-emerald-300'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      Pertemuan {p.ke}
                    </span>
                    {isAlreadySaved ? (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'}`}>
                        Sudah Diisi
                      </span>
                    ) : (
                      <span className={`text-[10px] ${isSelected ? 'text-emerald-200' : 'text-slate-400'}`}>
                        Belum
                      </span>
                    )}
                  </div>
                  <div className={`text-[11px] font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-600'}`}>
                    {p.fullFormatted}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Topik & Materi Bahasan */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Materi / Topik Bahasan Pertemuan Konsorsium (Opsional)
          </label>
          <input
            type="text"
            value={topikBahasan}
            onChange={(e) => setTopikBahasan(e.target.value)}
            placeholder="Contoh: Pembahasan Bab I'lal, Evaluasi Silabus & Penyeragaman Materi"
            className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 3. Ringkasan Kehadiran & Tombol Cepat */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs flex-wrap">
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

        {/* 4. Tabel Asatidz Terdaftar untuk Presensi */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-80 overflow-y-auto">
          {enrolledAnggota.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Belum ada asatidz yang didaftarkan ke kelas ini.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">No</th>
                  <th className="py-2.5 px-3 w-24">NIA</th>
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
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
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

        {/* 5. Notulen / Ringkasan Rapat */}
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
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Presensi Pertemuan Ini'}</span>
          </button>
        </div>
      </form>
    </Dialog>
  );
}
