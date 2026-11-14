'use client';

import React, { useMemo, useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import { ActiveUserSession, usePresenceStore } from '@/stores/usePresenceStore';
import { useRbacStore } from '@/stores/useRbacStore';
import { logActivity } from '@/lib/utils/audit';
import {
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  Globe,
  Clock,
  LogOut,
  MousePointerClick,
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

function formatDeviceLabel(sess: ActiveUserSession): string {
  const brand = sess.deviceBrand;
  const model = sess.deviceModel;
  const osVer = sess.osVersion || sess.os;

  if (brand && model && model !== brand) {
    return `${brand} (${model}) • ${osVer} (${sess.browser})`;
  }
  if (brand && brand !== osVer) {
    return `${brand} • ${osVer} (${sess.browser})`;
  }
  return `${osVer} (${sess.browser})`;
}

export default function ModalUserAktif({ isOpen, onClose }: ModalUserAktifProps) {
  const { activeSessions, isConnected, myDeviceId, sendForceLogout } = usePresenceStore();
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const [kickingKey, setKickingKey] = useState<string | null>(null);
  const [kickNotice, setKickNotice] = useState<string | null>(null);

  const handleForceLogout = async (targetUsername: string, targetDeviceId?: string) => {
    if (!sendForceLogout || !isConnected) return;

    const label = targetDeviceId
      ? `perangkat ${targetDeviceId.slice(0, 8)} milik @${targetUsername}`
      : `seluruh perangkat milik @${targetUsername}`;

    if (!window.confirm(`Yakin ingin mengeluarkan ${label} dari aplikasi sekarang?`)) {
      return;
    }

    const actionKey = targetDeviceId ? `${targetUsername}:${targetDeviceId}` : targetUsername;
    setKickingKey(actionKey);
    setKickNotice(null);

    try {
      const ok = await sendForceLogout({
        targetUsername,
        targetDeviceId,
        kickedBy: currentAccount?.username || 'admin',
        timestamp: new Date().toISOString(),
      });

      if (ok) {
        await logActivity(
          'FORCE_LOGOUT',
          `Master Admin mengeluarkan ${label} secara remote`
        ).catch(() => {});
        setKickNotice(`Perintah keluar telah dikirim ke ${label}.`);
      } else {
        setKickNotice(`Gagal mengirim perintah keluar ke ${label}.`);
      }
    } finally {
      setKickingKey(null);
    }
  };

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

        {/* Notifikasi Aksi Keluarkan */}
        {kickNotice && (
          <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center justify-between gap-2">
            <span>{kickNotice}</span>
            <button
              type="button"
              onClick={() => setKickNotice(null)}
              className="text-amber-700 hover:text-amber-900 font-bold text-[11px]"
            >
              Tutup
            </button>
          </div>
        )}

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

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                      {user.deviceCount} Device
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {user.sessions.length} Tab
                    </span>
                    {user.sessions.some((s) => s.deviceId !== myDeviceId) && (
                      <button
                        type="button"
                        data-testid={`btn-kick-user-${user.username}`}
                        disabled={!isConnected || kickingKey === user.username}
                        onClick={() => handleForceLogout(user.username)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition disabled:opacity-50"
                        title={`Keluarkan semua sesi @${user.username}`}
                      >
                        <LogOut className="w-3 h-3" />
                        <span>
                          {kickingKey === user.username ? 'Mengeluarkan...' : 'Keluarkan Semua'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Detail Perangkat & Tab */}
                <div className="divide-y divide-slate-100">
                  {user.sessions.map((sess) => {
                    const isCurrentDevice = Boolean(myDeviceId && sess.deviceId === myDeviceId);
                    const deviceActionKey = `${user.username}:${sess.deviceId}`;

                    return (
                      <div
                        key={sess.tabId}
                        className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          {getDeviceIcon(sess.deviceType)}
                          <div>
                            <div className="font-semibold text-slate-700 flex flex-wrap items-center gap-1.5">
                              <span>{sess.deviceType}</span>
                              <span className="text-slate-300">•</span>
                              <span>{formatDeviceLabel(sess)}</span>
                              {isCurrentDevice && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Perangkat Ini
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID Perangkat: {sess.deviceId.slice(0, 8)}
                            </div>
                            {sess.lastAction && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50/80 border border-emerald-200/70 px-1.5 py-0.5 rounded">
                                <MousePointerClick className="w-3 h-3 shrink-0" />
                                <span className="truncate max-w-[260px]">
                                  Terakhir klik: &ldquo;{sess.lastAction}&rdquo;
                                  {sess.lastActionAt ? ` (${formatConnectedTime(sess.lastActionAt)})` : ''}
                                </span>
                              </div>
                            )}
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
                          {!isCurrentDevice && (
                            <button
                              type="button"
                              data-testid={`btn-kick-device-${sess.deviceId.slice(0, 8)}`}
                              disabled={!isConnected || kickingKey === deviceActionKey}
                              onClick={() => handleForceLogout(user.username, sess.deviceId)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold transition disabled:opacity-50"
                              title="Keluarkan perangkat ini"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>
                                {kickingKey === deviceActionKey ? 'Proses...' : 'Keluarkan'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
