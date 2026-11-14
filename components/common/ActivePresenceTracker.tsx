'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useRbacStore } from '@/stores/useRbacStore';
import {
  ActiveUserSession,
  detectDeviceInfo,
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
  const currentAccount = useRbacStore((s) => s.currentAccount);
  const { setActiveSessions, setConnected } = usePresenceStore();

  const channelRef = useRef<RealtimeChannel | null>(null);
  const connectedAtRef = useRef<string>(new Date().toISOString());

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
      currentPath: pathname || '/beranda',
      connectedAt: connectedAtRef.current,
    };
  };

  useEffect(() => {
    const tabId = getOrCreateStorageId(window.sessionStorage, TAB_STORAGE_KEY);
    const channel = supabase.channel('madina-active-users', {
      config: {
        presence: {
          key: tabId,
        },
      },
    });

    channelRef.current = channel;

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

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          await channel.track(buildPayload());
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnected(false);
        }
      });

    return () => {
      setConnected(false);
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
