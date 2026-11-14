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
  deviceBrand?: string;
  deviceModel?: string;
  osVersion?: string;
  currentPath: string;
  connectedAt: string;
}

export interface ForceLogoutPayload {
  targetUsername: string;
  targetDeviceId?: string;
  kickedBy: string;
  timestamp: string;
}

interface PresenceState {
  activeSessions: ActiveUserSession[];
  isConnected: boolean;
  myDeviceId: string | null;
  sendForceLogout: ((payload: ForceLogoutPayload) => Promise<boolean>) | null;
  setActiveSessions: (sessions: ActiveUserSession[]) => void;
  setConnected: (connected: boolean) => void;
  setMyDeviceId: (deviceId: string | null) => void;
  setSendForceLogout: (fn: ((payload: ForceLogoutPayload) => Promise<boolean>) | null) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  activeSessions: [],
  isConnected: false,
  myDeviceId: null,
  sendForceLogout: null,
  setActiveSessions: (activeSessions) => set({ activeSessions }),
  setConnected: (isConnected) => set({ isConnected }),
  setMyDeviceId: (myDeviceId) => set({ myDeviceId }),
  setSendForceLogout: (sendForceLogout) => set({ sendForceLogout }),
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

export function resolveAndroidBrand(model: string): string {
  const m = (model || '').trim();
  if (!m) return 'Android';
  const upper = m.toUpperCase();
  if (upper.startsWith('SM-') || upper.startsWith('GT-') || upper.includes('SAMSUNG')) return 'Samsung';
  if (upper.includes('REDMI') || upper.includes('POCO') || upper.startsWith('MI ') || /^(22|23|24|M2)\d{2}/.test(upper)) return 'Xiaomi';
  if (upper.startsWith('CPH') || upper.includes('OPPO')) return 'OPPO';
  if (upper.startsWith('RMX') || upper.includes('REALME')) return 'Realme';
  if (upper.startsWith('V2') || upper.includes('VIVO')) return 'Vivo';
  if (upper.includes('INFINIX') || upper.startsWith('X6')) return 'Infinix';
  if (upper.includes('TECNO')) return 'Tecno';
  if (upper.includes('PIXEL')) return 'Google Pixel';
  if (upper.startsWith('ASUS') || upper.includes('ROG')) return 'ASUS';
  if (upper.includes('ONEPLUS')) return 'OnePlus';
  if (upper.includes('HUAWEI') || upper.startsWith('ELE-') || upper.startsWith('VOG-')) return 'Huawei';
  return 'Android';
}

export async function detectDetailedDeviceInfo(userAgent: string): Promise<{
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  os: string;
  browser: string;
  deviceBrand: string;
  deviceModel: string;
  osVersion: string;
}> {
  const base = detectDeviceInfo(userAgent);
  const ua = userAgent || '';

  let deviceBrand = base.os === 'Windows' ? 'Windows PC' : base.os === 'Linux' ? 'Linux PC' : base.os;
  let deviceModel = '';
  let osVersion = base.os;

  try {
    const nav = typeof navigator !== 'undefined'
      ? (navigator as unknown as {
          userAgentData?: {
            getHighEntropyValues?: (hints: string[]) => Promise<{
              model?: string;
              platform?: string;
              platformVersion?: string;
            }>;
          };
        })
      : null;

    if (nav?.userAgentData?.getHighEntropyValues) {
      const hints = await nav.userAgentData.getHighEntropyValues([
        'model',
        'platform',
        'platformVersion',
      ]);
      if (hints.model) {
        deviceModel = hints.model.trim();
      }
      if (base.os === 'Windows' && hints.platformVersion) {
        const major = parseInt(hints.platformVersion.split('.')[0] || '0', 10);
        if (major >= 13) osVersion = 'Windows 11';
        else if (major > 0) osVersion = 'Windows 10';
      } else if (base.os === 'Android' && hints.platformVersion) {
        const major = hints.platformVersion.split('.')[0];
        if (major) osVersion = `Android ${major}`;
      }
    }
  } catch {
    // Abaikan jika browser membatasi High-Entropy Client Hints
  }

  if (base.os === 'Android') {
    if (!deviceModel) {
      const match = ua.match(/Android\s+([\d.]+)?[^;]*;\s*([^;)]+?)(?:\s+Build\/|\))/i);
      if (match) {
        if (match[1] && osVersion === 'Android') osVersion = `Android ${match[1].split('.')[0]}`;
        const rawModel = (match[2] || '').trim();
        if (rawModel && rawModel.toUpperCase() !== 'K') {
          deviceModel = rawModel;
        }
      }
    }
    deviceBrand = resolveAndroidBrand(deviceModel);
  } else if (base.os === 'iOS') {
    deviceBrand = 'Apple';
    deviceModel = /iPad/i.test(ua) ? 'iPad' : 'iPhone';
  } else if (base.os === 'macOS') {
    deviceBrand = 'Apple';
    deviceModel = 'Mac';
  }

  return {
    ...base,
    deviceBrand,
    deviceModel,
    osVersion,
  };
}
