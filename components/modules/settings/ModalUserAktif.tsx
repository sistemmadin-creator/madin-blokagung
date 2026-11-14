'use client';

import React, { useMemo } from 'react';
import Dialog from '@/components/ui/Dialog';
import { ActiveUserSession, usePresenceStore } from '@/stores/usePresenceStore';
import {
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Globe,
  Clock,
} from 'lucide-react';

interface ModalUserAktifProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedUserPresence {
  username: string;
  displayName: string;
  roleLabel: string;
  deviceCount: number;
  sessions: ActiveUserSession[];
}

function getDeviceIcon(deviceType: ActiveUserSession['deviceType']) {
  if (deviceType === 'Mobile') return <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />;
  if (deviceType === 'Tablet') return <Tablet className="w-4 h-4 text-amber-600 shrink-0" />;
  return <Monitor className="w-4 h-4 text-sky-600 shrink-0" />;
}

function formatConnectedTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '-';
  }
}

export default function ModalUserAktif({ isOpen, onClose }: ModalUserAktifProps) {
  const { activeSessions, isConnected } = usePresenceStore();

  const groupedUsers = useMemo<GroupedUserPresence[]>(() => {
    const map = new Map<string, ActiveUserSession[]>();
    activeSessions.forEach((sess) => {
      const key = sess.username || 'tamu';
      const list = map.get(key) || [];
      list.push(sess);
      map.set(key, list);
    });

    return Array.from(map.entries())
      .map(([username, sessions]) => {
        const uniqueDevices = new Set(sessions.map((s) => s.deviceId));
        const primary = sessions[0];
        return {
          username,
          displayName: primary.displayName,
          roleLabel: primary.roleLabel,
          deviceCount: uniqueDevices.size,
          sessions,
        };
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [activeSessions]);

  const totalUniqueDevices = useMemo(
    () => new Set(activeSessions.map((s) => s.deviceId)).size,
    [activeSessions]
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Monitoring User Aktif & Perangkat"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        {/* Status Koneksi & Ringkasan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-emerald-700">User Online</p>
              <p className="text-xl font-bold text-emerald-900">{groupedUsers.length}</p>
            </div>
            <Users className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="p-3 rounded-xl border border-sky-200 bg-sky-50/70 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-sky-700">Total Perangkat</p>
              <p className="text-xl font-bold text-sky-900">{totalUniqueDevices}</p>
            </div>
            <Monitor className="w-6 h-6 text-sky-600" />
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-500">Status Realtime</p>
              <p className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                {isConnected ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-700">Terhubung ({activeSessions.length} Tab)</span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="text-rose-700">Terputus</span>
                  </>
                )}
              </p>
            </div>
            {isConnected ? (
              <Wifi className="w-5 h-5 text-emerald-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-rose-500" />
            )}
          </div>
        </div>

        {/* Daftar User Aktif */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {groupedUsers.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
              Belum ada user aktif yang terdeteksi saat ini.
            </div>
          ) : (
            groupedUsers.map((user) => (
              <div
                key={user.username}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
              >
                {/* Header User */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">
                          {user.displayName}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          @{user.username}
                        </span>
                      </div>
                      <span className="inline-block text-[10px] font-semibold text-emerald-700">
                        {user.roleLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {user.deviceCount} Device
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {user.sessions.length} Tab
                    </span>
                  </div>
                </div>

                {/* Detail Perangkat & Tab */}
                <div className="divide-y divide-slate-100">
                  {user.sessions.map((sess) => (
                    <div
                      key={sess.tabId}
                      className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {getDeviceIcon(sess.deviceType)}
                        <div>
                          <div className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <span>{sess.deviceType}</span>
                            <span className="text-slate-300">•</span>
                            <span>
                              {sess.os} ({sess.browser})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID Perangkat: {sess.deviceId.slice(0, 8)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:justify-end text-[11px]">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                          <Globe className="w-3 h-3 text-slate-500" />
                          <span>{sess.currentPath}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Sejak {formatConnectedTime(sess.connectedAt)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
