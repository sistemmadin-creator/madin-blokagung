'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { clearPersistentDeviceSession } from '@/lib/utils/deviceSessionVault';
import { useRbacStore } from '@/stores/useRbacStore';
import {
  ActiveUserSession,
  detectDetailedDeviceInfo,
  detectDeviceInfo,
  ForceLogoutPayload,
  usePresenceStore,
} from '@/stores/usePresenceStore';

const DEVICE_STORAGE_KEY = 'madina_presence_device_id';
const TAB_STORAGE_KEY = 'madina_presence_tab_id';

function getOrCreateStorageId(storage: Storage, key: string): string {
  try {
    let existing = storage.getItem(key);
    if (!existing) {
      existing =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      storage.setItem(key, existing);
    }
    return existing;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function ActivePresenceTracker() {
  const pathname = usePathname();
  const router = useRouter();
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const { setActiveSessions, setConnected, setMyDeviceId, setSendForceLogout } = usePresenceStore();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectedAtRef = useRef<string>(new Date().toISOString());
  const detailedDeviceRef = useRef<{
    deviceBrand?: string;
    deviceModel?: string;
    osVersion?: string;
  }>({});

  const buildPayload = (): ActiveUserSession => {
    const deviceId = getOrCreateStorageId(window.localStorage, DEVICE_STORAGE_KEY);
    const tabId = getOrCreateStorageId(window.sessionStorage, TAB_STORAGE_KEY);
    const { deviceType, os, browser } = detectDeviceInfo(window.navigator.userAgent);

    return {
      tabId,
      deviceId,
      username: currentAccount?.username || 'tamu',
      displayName: currentAccount?.full_name || 'Pengurus Sistem',
      roleLabel: currentAccount?.role_label || 'Pengurus',
      deviceType,
      os,
      browser,
      deviceBrand: detailedDeviceRef.current.deviceBrand,
      deviceModel: detailedDeviceRef.current.deviceModel,
      osVersion: detailedDeviceRef.current.osVersion,
      currentPath: pathname || '/beranda',
      connectedAt: connectedAtRef.current,
    };
  };

  useEffect(() => {
    const deviceId = getOrCreateStorageId(window.localStorage, DEVICE_STORAGE_KEY);
    const tabId = getOrCreateStorageId(window.sessionStorage, TAB_STORAGE_KEY);
    setMyDeviceId(deviceId);

    const channel = supabase.channel('madina-active-users', {
      config: {
        presence: {
          key: tabId,
        },
      },
    });

    channelRef.current = channel;

    // Deteksi detail merek/model perangkat (asinkron Client Hints)
    detectDetailedDeviceInfo(window.navigator.userAgent).then((detail) => {
      detailedDeviceRef.current = {
        deviceBrand: detail.deviceBrand,
        deviceModel: detail.deviceModel,
        osVersion: detail.osVersion,
      };
      if (usePresenceStore.getState().isConnected && channelRef.current) {
        channelRef.current.track(buildPayload()).catch(() => {});
      }
    });

    const syncPresence = () => {
      const state = channel.presenceState<ActiveUserSession>();
      const flattened: ActiveUserSession[] = [];
      Object.values(state).forEach((entries) => {
        if (Array.isArray(entries) && entries.length > 0) {
          flattened.push(entries[0]);
        }
      });
      setActiveSessions(flattened);
    };

    const handleForceLogout = (message: { payload?: ForceLogoutPayload }) => {
      const payload = message?.payload;
      if (!payload) return;

      const myUsername = useRbacStore.getState().currentAccount?.username || 'tamu';
      const matchesUser = payload.targetUsername === myUsername;
      const matchesDevice = !payload.targetDeviceId || payload.targetDeviceId === deviceId;

      if (!matchesUser || !matchesDevice) return;

      void (async () => {
        try {
          await channel.untrack().catch(() => {});
          clearPersistentDeviceSession();
          useRbacStore.getState().clearCurrentAccount();
          await supabase.auth.signOut().catch(() => {});
        } finally {
          router.replace('/login?reason=kicked');
          router.refresh();
        }
      })();
    };

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('broadcast', { event: 'force-logout' }, (message) => {
        handleForceLogout(message as { payload?: ForceLogoutPayload });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          setSendForceLogout(async (payload: ForceLogoutPayload) => {
            const res = await channel.send({
              type: 'broadcast',
              event: 'force-logout',
              payload,
            });
            return res === 'ok';
          });
          await channel.track(buildPayload());
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
          setSendForceLogout(null);
        }
      });

    return () => {
      setConnected(false);
      setSendForceLogout(null);
      channel.untrack().catch(() => {});
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel) return;
    if (usePresenceStore.getState().isConnected) {
      channel.track(buildPayload()).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentAccount?.username, currentAccount?.full_name, currentAccount?.role_label]);

  return null;
}
