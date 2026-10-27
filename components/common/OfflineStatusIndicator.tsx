'use client';

import React, { useEffect, useState } from 'react';
import { OfflineSyncService } from '@/lib/services/offlineSyncService';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function OfflineStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Inisialisasi listener browser & IndexedDB
    OfflineSyncService.initAutoSync();

    const unsubscribe = OfflineSyncService.subscribe((online, count) => {
      setIsOnline(online);
      setPendingCount(count);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await OfflineSyncService.processSyncQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  // Jangan render jika online dan antrean kosong
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 bg-slate-900/90 border border-slate-700/80 text-white"
    >
      {!isOnline ? (
        <>
          <span className="flex items-center gap-1.5 text-amber-400">
            <WifiOff className="w-3.5 h-3.5 animate-pulse" />
            <span>Mode Offline</span>
          </span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
              {pendingCount} tersimpan lokal
            </span>
          )}
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>Online</span>
          </span>
          {pendingCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition text-[10px]"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sinkron {pendingCount} data</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
