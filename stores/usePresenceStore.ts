import { create } from 'zustand';

export interface ActiveUserSession {
  tabId: string;
  deviceId: string;
  username: string;
  displayName: string;
  roleLabel: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  os: string;
  browser: string;
  currentPath: string;
  connectedAt: string;
}

interface PresenceState {
  activeSessions: ActiveUserSession[];
  isConnected: boolean;
  setActiveSessions: (sessions: ActiveUserSession[]) => void;
  setConnected: (connected: boolean) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  activeSessions: [],
  isConnected: false,
  setActiveSessions: (activeSessions) => set({ activeSessions }),
  setConnected: (isConnected) => set({ isConnected }),
}));

export function detectDeviceInfo(userAgent: string): {
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  os: string;
  browser: string;
} {
  const ua = userAgent || '';

  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    deviceType = 'Tablet';
  } else if (/Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/i.test(ua)) {
    deviceType = 'Mobile';
  }

  let os = 'Tidak Diketahui';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  return { deviceType, os, browser };
}
