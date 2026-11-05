'use client';

import React, { useState, useMemo } from 'react';
import {
  KelasKonsorsium,
  AnggotaKonsorsium,
  SesiPresensiKonsorsium,
} from '@/types/konsorsium';
import { useKonsorsiumStore } from '@/stores/useKonsorsiumStore';
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
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface KartuKelasKonsorsiumProps {
  kelas: KelasKonsorsium;
  onDaftarkanAsatidz: (kelas: KelasKonsorsium) => void;
  onInputPresensi: (kelas: KelasKonsorsium) => void;
  onLihatRiwayat: (kelas: KelasKonsorsium) => void;
  onEditKelas: (kelas: KelasKonsorsium) => void;
}

export default function KartuKelasKonsorsium({
  kelas,
  onDaftarkanAsatidz,
  onInputPresensi,
  onLihatRiwayat,
  onEditKelas,
}: KartuKelasKonsorsiumProps) {
  const { anggotaList, sesiList, keluarkanAnggotaKonsorsium, hapusKelasKonsorsium } =
    useKonsorsiumStore();

  const [searchMember, setSearchMember] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Anggota terdaftar pada kelas ini
  const enrolledAnggota = useMemo(() => {
    return anggotaList.filter((a) => a.kelasId === kelas.id);
  }, [anggotaList, kelas.id]);

  // Sesi terakhir pertemuan kelas ini untuk melihat kehadiran terakhir
  const sesiTerakhir = useMemo(() => {
    const list = sesiList
      .filter((s) => s.kelasId === kelas.id)
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    return list[0] || null;
  }, [sesiList, kelas.id]);

  // Filter anggota berdasarkan pencarian dalam kartu
  const filteredAnggota = useMemo(() => {
    const q = searchMember.toLowerCase().trim();
    if (!q) return enrolledAnggota;
    return enrolledAnggota.filter(
      (a) =>
        a.nama?.toLowerCase().includes(q) || a.nia?.toLowerCase().includes(q)
    );
  }, [enrolledAnggota, searchMember]);

  // Dapatkan status presensi terakhir asatidz
  const getStatusTerakhir = (nia: string) => {
    if (!sesiTerakhir) return null;
    const record = sesiTerakhir.records.find((r) => r.nia === nia);
    if (!record) return null;
    return {
      status: record.status,
      tanggal: sesiTerakhir.tanggal,
    };
  };

  const handleDeleteKelas = () => {
    if (
      confirm(
        `Hapus kelas konsorsium "${kelas.namaKelas}"? Seluruh daftar anggota dan riwayat absen di kelas ini akan ikut terhapus.`
      )
    ) {
      hapusKelasKonsorsium(kelas.id);
    }
  };

  const handleKeluarkanAnggota = (anggota: AnggotaKonsorsium) => {
    if (
      confirm(
        `Keluarkan ${anggota.nama} (NIA: ${anggota.nia}) dari kelas konsorsium ${kelas.namaKelas}?`
      )
    ) {
      keluarkanAnggotaKonsorsium(anggota.id);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* 1. Header Kartu Kelas Konsorsium */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                {kelas.tingkat}
              </span>
              <h3 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
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
            </div>

            {kelas.keterangan && (
              <p className="text-xs text-slate-500 italic line-clamp-1 pt-0.5">
                {kelas.keterangan}
              </p>
            )}
          </div>

          {/* Menu Dropdown Opsi Kelas */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 text-xs"
                onMouseLeave={() => setIsMenuOpen(false)}
              >
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
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleDeleteKelas();
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Kelas</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar Kelas Konsorsium */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>{enrolledAnggota.length} Asatidz Terdaftar</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Utama: Daftar Asatidz */}
            <button
              type="button"
              onClick={() => onDaftarkanAsatidz(kelas)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Daftarkan Asatidz</span>
            </button>

            {/* Tombol: Input Presensi */}
            <button
              type="button"
              onClick={() => onInputPresensi(kelas)}
              disabled={enrolledAnggota.length === 0}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-40 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>Input Absensi</span>
            </button>

            {/* Tombol: Riwayat Absen */}
            <button
              type="button"
              onClick={() => onLihatRiwayat(kelas)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1"
              title="Lihat Riwayat Presensi"
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span>Riwayat</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Embedded Tabel Asatidz Terdaftar */}
      <div className="p-4 flex-1 flex flex-col">
        {enrolledAnggota.length > 5 && (
          <div className="mb-3 relative">
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

        {enrolledAnggota.length === 0 ? (
          <div className="py-8 text-center px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex-1 flex flex-col items-center justify-center">
            <Users className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500 font-medium">
              Belum ada asatidz yang didaftarkan ke kelas ini.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Klik tombol &quot;+ Daftarkan Asatidz&quot; di atas untuk memasukkan pengajar.
            </p>
            <button
              type="button"
              onClick={() => onDaftarkanAsatidz(kelas)}
              className="mt-3 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftarkan Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="border border-slate-200/80 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200/80 text-[10px]">
                <tr>
                  <th className="py-2 px-3 w-8 text-center">No</th>
                  <th className="py-2 px-3 w-24">NIA</th>
                  <th className="py-2 px-3">Nama Asatidz</th>
                  <th className="py-2 px-3 w-32">Kehadiran Terakhir</th>
                  <th className="py-2 px-3 w-16 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAnggota.map((a, idx) => {
                  const lastAbsen = getStatusTerakhir(a.nia);

                  return (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-2 px-3 text-center text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 font-medium text-[11px]">
                        {a.nia}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {a.nama}
                      </td>
                      <td className="py-2 px-3">
                        {lastAbsen ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              lastAbsen.status === 'Hadir'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : lastAbsen.status === 'Izin'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : lastAbsen.status === 'Sakit'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : lastAbsen.status === 'Alfa'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-orange-50 text-orange-700 border border-orange-200'
                            }`}
                          >
                            <span>{lastAbsen.status}</span>
                            <span className="text-slate-400 font-normal">
                              ({lastAbsen.tanggal.slice(5)})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Belum ada absen
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleKeluarkanAnggota(a)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                          title="Keluarkan dari kelas konsorsium ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
