'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Bell, X, UserCheck, Building2 } from 'lucide-react';
import {
  JamKbm,
  SesiJadwalHarian,
  RiwayatAbsensiItem,
} from '@/types/absensi';
import { UserAkunMadin } from '@/types/absen-cepat';
import { supabase } from '@/lib/supabase/client';
import { getSesiKey, formatTanggalPanjangIndo } from '@/lib/utils/absensiHelper';
import {
  bandingkanBlokHariKBM,
  formatLabelBlokHariKBM,
} from '@/lib/utils/jadwalHelper';

interface ModalNotifAbsenBlokProps {
  isOpen: boolean;
  onClose: () => void;
  tanggal: string;
  sesiHariIni: Record<JamKbm, SesiJadwalHarian[]>;
  savedRecords: Record<string, RiwayatAbsensiItem>;
  currentJam: JamKbm;
}

export default function ModalNotifAbsenBlok({
  isOpen,
  onClose,
  tanggal,
  sesiHariIni,
  savedRecords,
  currentJam,
}: ModalNotifAbsenBlokProps) {
  const [filterUser, setFilterUser] = useState<string>('ALL');
  const [filterJam, setFilterJam] = useState<string>(String(currentJam));
  const [dbUsers, setDbUsers] = useState<UserAkunMadin[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFilterJam(String(currentJam));
      // Ambil daftar akun pengguna dari app_settings ('AKUN_PENGGUNA_MADIN')
      supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'AKUN_PENGGUNA_MADIN')
        .maybeSingle()
        .then(({ data }) => {
          if (data?.value) {
            let parsed: unknown = data.value;
            if (typeof parsed === 'string') {
              try {
                parsed = JSON.parse(parsed);
              } catch {
                parsed = [];
              }
            }
            if (Array.isArray(parsed)) {
              setDbUsers(parsed as UserAkunMadin[]);
            }
          }
        });
    }
  }, [isOpen, currentJam]);

  // Daftar blok unik yang memiliki jadwal hari ini
  const daftarBlokHariIni = useMemo(() => {
    const setBlok = new Set<string>();
    ([1, 2, 3, 4] as JamKbm[]).forEach((j) => {
      (sesiHariIni[j] || []).forEach((s) => {
        const b = String(s.blok || 'Belum Diatur').trim();
        if (b) setBlok.add(b);
      });
    });
    return Array.from(setBlok).sort((a, b) => bandingkanBlokHariKBM(a, b));
  }, [sesiHariIni]);

  // Gabungkan daftar akun pengguna + Master Administrator + Petugas per Blok
  const userList = useMemo(() => {
    const map = new Map<string, UserAkunMadin>();
    map.set('admin', {
      username: 'admin',
      nama: 'Master Administrator',
      role: 'Super Admin',
      aktif: true,
    });

    dbUsers.forEach((u) => {
      if (u && u.username && u.aktif !== false) {
        map.set(u.username.toLowerCase(), u);
      }
    });

    daftarBlokHariIni.forEach((blok) => {
      const label = formatLabelBlokHariKBM(blok);
      const uKey = `petugas_${blok.toLowerCase().replace(/\s+/g, '_')}`;
      if (!map.has(uKey)) {
        map.set(uKey, {
          username: uKey,
          nama: `Petugas ${label}`,
          role: `Koordinator ${label}`,
          aktif: true,
        });
      }
    });

    return Array.from(map.values());
  }, [dbUsers, daftarBlokHariIni]);

  // Hitung status absensi per blok pada jam yang dipilih
  const statsBlok = useMemo(() => {
    const targetJams: JamKbm[] =
      filterJam === 'ALL'
        ? [1, 2, 3, 4]
        : [parseInt(filterJam, 10) as JamKbm];

    const mapStats = new Map<
      string,
      { blok: string; total: number; tersimpan: number }
    >();

    daftarBlokHariIni.forEach((b) => {
      mapStats.set(b, { blok: b, total: 0, tersimpan: 0 });
    });

    targetJams.forEach((j) => {
      (sesiHariIni[j] || []).forEach((sesi) => {
        const b = String(sesi.blok || 'Belum Diatur').trim();
        if (!mapStats.has(b)) {
          mapStats.set(b, { blok: b, total: 0, tersimpan: 0 });
        }
        const st = mapStats.get(b)!;
        st.total++;
        const sKey = getSesiKey(tanggal, sesi);
        if (savedRecords[sKey]) {
          st.tersimpan++;
        }
      });
    });

    return Array.from(mapStats.values()).sort((a, b) =>
      bandingkanBlokHariKBM(a.blok, b.blok)
    );
  }, [filterJam, daftarBlokHariIni, sesiHariIni, savedRecords, tanggal]);

  const filteredUsers = useMemo(() => {
    if (filterUser === 'ALL') return userList;
    return userList.filter((u) => u.username === filterUser);
  }, [userList, filterUser]);

  if (!isOpen) return null;

  const labelJamAktif =
    filterJam === 'ALL' ? 'Semua Jam (1 - 4)' : `Jam Ke-${filterJam}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Monitoring & Notifikasi Absensi Per Blok
              </h3>
              <p className="text-[11px] text-emerald-100">
                {formatTanggalPanjangIndo(tanggal)} • Pantau progres absensi tiap blok
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar & Legend */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Filter Akun Pengguna / Petugas
              </label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Pengguna Aktif ({userList.length})</option>
                {userList.map((u) => (
                  <option key={u.username} value={u.username}>
                    {u.nama} (@{u.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Filter Jam Mengajar
              </label>
              <select
                value={filterJam}
                onChange={(e) => setFilterJam(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {([1, 2, 3, 4] as JamKbm[]).map((j) => (
                  <option key={j} value={String(j)}>
                    Jam Ke-{j} {j === currentJam ? '(Sedang Aktif)' : ''}
                  </option>
                ))}
                <option value="ALL">Semua Jam (1 Hari Penuh)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-600 pt-1">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Hijau: Selesai Diabsen
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Merah: Belum Selesai
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              Abu-abu: Tidak Ada Jadwal
            </span>
          </div>
        </div>

        {/* Body Cards */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredUsers.map((user) => {
            // Jika petugas blok spesifik, tampilkan blok terkait, jika admin tampilkan semua blok
            const isPetugasSpesifik = user.username.startsWith('petugas_');
            const userBloks = isPetugasSpesifik
              ? statsBlok.filter(
                  (b) =>
                    `petugas_${b.blok.toLowerCase().replace(/\s+/g, '_')}` ===
                    user.username
                )
              : statsBlok;

            const activeBloks = userBloks.filter((b) => b.total > 0);
            const doneBloks = activeBloks.filter(
              (b) => b.total > 0 && b.tersimpan >= b.total
            );
            const totalSesiUser = userBloks.reduce((acc, b) => acc + b.total, 0);
            const doneSesiUser = userBloks.reduce(
              (acc, b) => acc + b.tersimpan,
              0
            );
            const pct =
              totalSesiUser > 0
                ? Math.round((doneSesiUser / totalSesiUser) * 100)
                : 0;

            return (
              <div
                key={user.username}
                className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {user.nama}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        @{user.username} • {user.role}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                      activeBloks.length > 0 &&
                      doneBloks.length === activeBloks.length
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {doneBloks.length}/{activeBloks.length} Blok Selesai
                  </span>
                </div>

                {/* Daftar Pill Blok */}
                <div className="flex flex-wrap gap-1.5">
                  {userBloks.map((b) => {
                    const isEmpty = b.total === 0;
                    const isDone = !isEmpty && b.tersimpan >= b.total;
                    const pillClass = isEmpty
                      ? 'bg-slate-100 text-slate-400 border-slate-200'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300';

                    return (
                      <span
                        key={b.blok}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border ${pillClass}`}
                      >
                        <Building2 className="w-3 h-3" />
                        {formatLabelBlokHariKBM(b.blok).toUpperCase()}: {b.tersimpan}/
                        {b.total}
                      </span>
                    );
                  })}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Progres Absensi {labelJamAktif}</span>
                    <strong className="text-slate-700">
                      {doneSesiUser}/{totalSesiUser} Sesi ({pct}%)
                    </strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
