'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useJadwalStore, KEY_DB_JADWAL_ASATIDZ } from '@/stores/useJadwalStore';
import { useAbsensiStore, KEY_DB_ABSENSI, KEY_DB_LIBUR } from '@/stores/useAbsensiStore';
import { useMuhafadzohStore, KEY_DB_RIWAYAT_MUHAFADZOH } from '@/stores/useMuhafadzohStore';
import { Radio } from 'lucide-react';

export default function RealtimeSyncListener() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Daftarkan listener Supabase Realtime multi-tabel untuk sinkronisasi konkuren (Fase 3)
    const channel = supabase
      .channel('madin-collaborative-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'santri' },
        (payload) => {
          useSantriStore.getState().handleRealtimeSantri(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asatidz' },
        (payload) => {
          useAsatidzStore.getState().handleRealtimeAsatidz(payload);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload: any) => {
          const key = payload.new?.key;
          const val = payload.new?.value;

          if (key === KEY_DB_JADWAL_ASATIDZ) {
            useJadwalStore.getState().handleRealtimeJadwal(val);
          } else if (key === KEY_DB_ABSENSI) {
            useAbsensiStore.getState().handleRealtimeAbsensi(val);
          } else if (key === KEY_DB_LIBUR) {
            useAbsensiStore.getState().handleRealtimeLibur(val);
          } else if (key === KEY_DB_RIWAYAT_MUHAFADZOH) {
            useMuhafadzohStore.getState().handleRealtimeMuhafadzoh(val);
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Indikator visual halus status Realtime di pojok kiri bawah (hanya terlihat jika tersambung)
  if (!isConnected) return null;

  return (
    <div
      aria-label="Status Sinkronisasi Realtime"
      title="Sinkronisasi multi-pengguna realtime aktif"
      className="fixed bottom-2 left-3 z-40 hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 text-emerald-400 text-[10px] font-medium border border-slate-700/60 backdrop-blur-xs select-none pointer-events-none opacity-80 hover:opacity-100 transition-opacity"
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <span className="text-slate-300">Sync Aktif</span>
    </div>
  );
}
