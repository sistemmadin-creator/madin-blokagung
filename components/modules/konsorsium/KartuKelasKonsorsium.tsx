'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  KelasKonsorsium,
  AnggotaKonsorsium,
} from '@/types/konsorsium';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
import {
  getDaftarPertemuanBulan,
  NAMA_BULAN_IND,
  getHariNamaKonsorsium,
  getLocalTodayISO,
} from '@/lib/utils/konsorsiumHelper';
import {
  Users,
  UserPlus,
  CalendarCheck,
  History,
  MoreVertical,
  Trash2,
  Edit3,
  UserCheck,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

interface KartuKelasKonsorsiumProps {
  kelas: KelasKonsorsium;
  canEdit?: boolean;
  onDaftarkanAsatidz: (kelas: KelasKonsorsium) => void;
  onInputPresensi: (kelas: KelasKonsorsium, tanggal?: string) => void;
  onLihatRiwayat: (kelas: KelasKonsorsium) => void;
  onEditKelas: (kelas: KelasKonsorsium) => void;
  onLihatDetailMatriks: (kelas: KelasKonsorsium) => void;
}

export default function KartuKelasKonsorsium({
  kelas,
  canEdit = true,
  onDaftarkanAsatidz,
  onInputPresensi,
  onLihatRiwayat,
  onEditKelas,
  onLihatDetailMatriks,
}: KartuKelasKonsorsiumProps) {
  const { anggotaList, sesiList, keluarkanAnggotaKonsorsium, hapusKelasKonsorsium } =
    useKonsorsiumStore();

  const [searchMember, setSearchMember] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // State Bulan Aktif (Default otomatis ke bulan & tahun kalender saat ini)
  const now = new Date();
  const [activeYear, setActiveYear] = useState(now.getFullYear());
  const [activeMonth, setActiveMonth] = useState(now.getMonth() + 1); // 1-12

  // Click-outside listener untuk menu 3 titik (mendukung desktop & perangkat sentuh)
  useEffect(() => {
    if (!isMenuOpen) return;
    function handleOutsideClick(e: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isMenuOpen]);

  // Anggota terdaftar pada kelas ini
  const enrolledAnggota = useMemo(() => {
    return anggotaList.filter((a) => a.kelasId === kelas.id);
  }, [anggotaList, kelas.id]);

  // Hitung kolom pertemuan (1, 2, 3, 4, [5]) sesuai bulan aktif & jenis konsorsium
  const pertemuanBulan = useMemo(() => {
    return getDaftarPertemuanBulan(
      activeYear,
      activeMonth,
      kelas.jenisKonsor || 'Mustahiq/qoh'
    );
  }, [activeYear, activeMonth, kelas.jenisKonsor]);

  // Filter anggota berdasarkan pencarian dalam kartu
  const filteredAnggota = useMemo(() => {
    const q = searchMember.toLowerCase().trim();
    if (!q) return enrolledAnggota;
    return enrolledAnggota.filter(
      (a) =>
        a.nama?.toLowerCase().includes(q) || a.nia?.toLowerCase().includes(q)
    );
  }, [enrolledAnggota, searchMember]);

  // Navigasi switcher bulan
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMonth === 1) {
      setActiveMonth(12);
      setActiveYear((y) => y - 1);
    } else {
      setActiveMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeMonth === 12) {
      setActiveMonth(1);
      setActiveYear((y) => y + 1);
    } else {
      setActiveMonth((m) => m + 1);
    }
  };

  // Lookup status presensi anggota per tanggal tertentu
  const getStatusPresensi = (anggota: AnggotaKonsorsium, tanggal: string) => {
    const sesi = sesiList.find(
      (s) => s.kelasId === kelas.id && s.tanggal === tanggal
    );
    if (!sesi) return null;
    const rec = sesi.records.find(
      (r) =>
        (r.anggotaId && r.anggotaId === anggota.id) ||
        (r.nia && r.nia !== '-' && r.nia === anggota.nia)
    );
    return rec ? rec.status : null;
  };

  const handleOpenPresensiBulanAktif = () => {
    const todayISO = getLocalTodayISO();
    const matchToday = pertemuanBulan.find((p) => p.tanggal === todayISO);
    if (matchToday) {
      onInputPresensi(kelas, matchToday.tanggal);
      return;
    }
    const firstUnsaved = pertemuanBulan.find(
      (p) => !sesiList.some((s) => s.kelasId === kelas.id && s.tanggal === p.tanggal)
    );
    onInputPresensi(kelas, firstUnsaved?.tanggal || pertemuanBulan[0]?.tanggal);
  };

  const handleDeleteKelas = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      confirm(
        `Hapus kelas konsorsium "${kelas.namaKelas}"? Seluruh daftar anggota dan riwayat absen di kelas ini akan ikut terhapus.`
      )
    ) {
      void hapusKelasKonsorsium(kelas.id);
    }
  };

  const handleKeluarkanAnggota = (e: React.MouseEvent, anggota: AnggotaKonsorsium) => {
    e.stopPropagation();
    if (
      confirm(
        `Keluarkan ${anggota.nama} (NIA: ${anggota.nia}) dari kelas konsorsium ${kelas.namaKelas}?`
      )
    ) {
      void keluarkanAnggotaKonsorsium(anggota.id);
    }
  };

  const hariJadwal = getHariNamaKonsorsium(kelas.jenisKonsor || 'Mustahiq/qoh');
  const totalColumns = 3 + pertemuanBulan.length + (canEdit ? 1 : 0);

  return (
    <div
      onClick={() => onLihatDetailMatriks(kelas)}
      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer group/card"
    >
      {/* 1. Header Kartu Kelas Konsorsium */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                {kelas.tingkat}
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  kelas.jenisKonsor === 'Mustahiq/qoh'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-teal-50 text-teal-800 border-teal-300'
                }`}
              >
                {kelas.jenisKonsor || 'Mustahiq/qoh'}
              </span>
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5 group-hover/card:text-emerald-800 transition-colors">
                <BookOpen className="w-4 h-4 text-emerald-700" />
                <span>{kelas.namaKelas}</span>
              </h3>
            </div>

            <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap pt-0.5">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Pembimbing:</span>
              <strong className="text-slate-800 font-semibold">
                {kelas.pembimbingNama}
              </strong>
              {kelas.pembimbingNia && (
                <span className="text-[11px] font-mono text-slate-400">
                  ({kelas.pembimbingNia})
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="text-slate-500 font-medium">
                Jadwal: <strong>Setiap {hariJadwal}</strong>
              </span>
            </div>

            {kelas.keterangan && (
              <p className="text-xs text-slate-500 italic line-clamp-1 pt-0.5">
                {kelas.keterangan}
              </p>
            )}
          </div>

          {/* Opsi Menu & Tombol Buka Matriks */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onLihatDetailMatriks(kelas)}
              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Klik untuk membuka Detail Matriks Tahunan"
              aria-label="Buka Detail Matriks Tahunan"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {canEdit && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Menu opsi kelas konsorsium"
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onEditKelas(kelas);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ubah Kelas</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        setIsMenuOpen(false);
                        handleDeleteKelas(e);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Kelas</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar Kelas & Switcher Bulan */}
        <div
          className="mt-4 pt-3 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Switcher Bulan Aktif */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title="Bulan Sebelumnya"
              aria-label="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-slate-800 px-1 min-w-[110px] text-center">
              {NAMA_BULAN_IND[activeMonth - 1]} {activeYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
              title="Bulan Berikutnya"
              aria-label="Bulan Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => onDaftarkanAsatidz(kelas)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daftarkan Asatidz</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPresensiBulanAktif}
                  disabled={enrolledAnggota.length === 0}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <CalendarCheck className="w-3.5 h-3.5" />
                  <span>Input Absensi</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onLihatRiwayat(kelas)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1"
              title="Lihat Riwayat Presensi"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Riwayat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Embedded Tabel Asatidz dengan Kolom 1..5 */}
      <div className="p-4 flex-1 flex flex-col">
        {enrolledAnggota.length > 5 && (
          <div className="mb-3 relative" onClick={(e) => e.stopPropagation()}>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Filter asatidz di kelas ini..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        <div className="border border-slate-200/80 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200/80 text-[10px]">
              <tr>
                <th className="py-2 px-2.5 w-8 text-center">No</th>
                <th className="py-2 px-2.5 w-20">NIA</th>
                <th className="py-2 px-2.5">Nama Asatidz</th>

                {/* Kolom Pertemuan 1, 2, 3, 4, [5] */}
                {pertemuanBulan.map((p) => (
                  <th
                    key={p.tanggal}
                    onClick={(e) => {
                      if (canEdit && enrolledAnggota.length > 0) {
                        e.stopPropagation();
                        onInputPresensi(kelas, p.tanggal);
                      }
                    }}
                    className={`py-1.5 px-1.5 text-center min-w-[42px] border-l border-slate-200/80 ${
                      canEdit && enrolledAnggota.length > 0
                        ? 'hover:bg-emerald-50 cursor-pointer transition-colors'
                        : ''
                    }`}
                    title={
                      canEdit && enrolledAnggota.length > 0
                        ? `${p.fullFormatted} (Klik untuk input/ubah presensi)`
                        : p.fullFormatted
                    }
                  >
                    <div className="font-bold text-slate-700">{p.ke}</div>
                    <div className="text-[9px] text-slate-400 font-mono -mt-0.5">
                      {p.labelTanggal}
                    </div>
                  </th>
                ))}

                {canEdit && (
                  <th className="py-2 px-2 text-center w-12 border-l border-slate-200/80">
                    Aksi
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {enrolledAnggota.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="py-8 text-center px-4 bg-slate-50/40"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs text-slate-500 font-medium">
                        Belum ada asatidz yang didaftarkan ke kelas ini.
                      </p>
                      {canEdit && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Klik tombol &quot;Daftarkan Asatidz&quot; untuk menambahkan anggota.
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filteredAnggota.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalColumns}
                    className="py-6 text-center px-4 text-xs text-slate-500 bg-slate-50/30"
                  >
                    Tidak ditemukan asatidz dengan kata kunci &quot;{searchMember}&quot; di kelas ini.
                  </td>
                </tr>
              ) : (
                filteredAnggota.map((a, idx) => (
                  <tr
                    key={a.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-2 px-2.5 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-600 font-medium text-[11px]">
                      {a.nia}
                    </td>
                    <td className="py-2 px-2.5 font-medium text-slate-800">
                      {a.nama}
                    </td>

                    {/* Sel Pertemuan 1..5 */}
                    {pertemuanBulan.map((p) => {
                      const st = getStatusPresensi(a, p.tanggal);
                      return (
                        <td
                          key={p.tanggal}
                          className="py-1.5 px-1.5 text-center border-l border-slate-100"
                        >
                          {st === 'Hadir' ? (
                            <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800" title={`Hadir (${p.fullFormatted})`}>
                              H
                            </span>
                          ) : st === 'Izin' ? (
                            <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-amber-100 text-amber-800" title={`Izin (${p.fullFormatted})`}>
                              I
                            </span>
                          ) : st === 'Sakit' ? (
                            <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-blue-100 text-blue-800" title={`Sakit (${p.fullFormatted})`}>
                              S
                            </span>
                          ) : st === 'Alfa' ? (
                            <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-rose-100 text-rose-800" title={`Alfa (${p.fullFormatted})`}>
                              A
                            </span>
                          ) : st === 'Terlambat' ? (
                            <span className="inline-block w-5 h-5 leading-5 rounded text-[10px] font-bold bg-orange-100 text-orange-800" title={`Terlambat (${p.fullFormatted})`}>
                              T
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-xs">-</span>
                          )}
                        </td>
                      );
                    })}

                    {canEdit && (
                      <td
                        className="py-2 px-2 text-center border-l border-slate-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => handleKeluarkanAnggota(e, a)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Keluarkan dari kelas konsorsium ini"
                          aria-label={`Keluarkan ${a.nama} dari kelas konsorsium`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-right">
          <span className="text-[10px] text-slate-400 group-hover/card:text-emerald-700 transition-colors font-medium">
            Klik kartu untuk melihat Matriks 1 Tahun Ajaran (Juli s/d Juni)
          </span>
        </div>
      </div>
    </div>
  );
}
