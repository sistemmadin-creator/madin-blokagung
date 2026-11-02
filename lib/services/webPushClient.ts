'use client';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const DEFAULT_VAPID_PUBLIC_KEY =
  'BHHyuMT9yL1ESkHwxDiLez3X56Iwq2kq27fVhDu40m9zqHvfqLY6LjwMq_T3OyYQeu7OirmiXodP8j_uQnZJLIU';

export type PushPermissionStatus = 'unsupported' | 'default' | 'granted' | 'denied';

export const WebPushClientService = {
  /**
   * Memeriksa apakah browser mendukung Web Push & Service Worker
   */
  isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },

  /**
   * Cek status izin notifikasi saat ini
   */
  getPermission(): PushPermissionStatus {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as PushPermissionStatus;
  },

  /**
   * Mendaftarkan Service Worker
   */
  async registerSW(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return reg;
    } catch (err) {
      console.error('Gagal mendaftarkan service worker /sw.js:', err);
      return null;
    }
  },

  /**
   * Mengambil langganan aktif jika ada
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isSupported()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
  },

  /**
   * Meminta izin kepada pengguna dan mendaftarkan perangkat ke server
   */
  async requestAndSubscribe(options?: {
    role?: string;
    targetIdentifier?: string;
  }): Promise<{ success: boolean; error?: string; permission: PushPermissionStatus }> {
    if (!this.isSupported()) {
      return {
        success: false,
        permission: 'unsupported',
        error: 'Browser di perangkat ini belum mendukung Web Push Notification.',
      };
    }

    // 1. Minta izin ke pengguna (menampilkan pop-up izin notifikasi di browser/HP)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        permission: permission as PushPermissionStatus,
        error: permission === 'denied' ? 'Izin notifikasi diblokir di pengaturan browser Anda.' : 'Izin notifikasi belum disetujui.',
      };
    }

    try {
      // 2. Pastikan service worker terdaftar
      const reg = await this.registerSW();
      if (!reg) {
        throw new Error('Gagal menginisialisasi service worker');
      }

      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;

      // 3. Daftarkan ke PushManager browser
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      }

      // 4. Simpan ke database melalui API route
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          role: options?.role || 'wali',
          target_identifier: options?.targetIdentifier || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menyimpan langganan di server');
      }

      return {
        success: true,
        permission: 'granted',
      };
    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error('Error proses subscribe push:', errorObj);
      return {
        success: false,
        permission: 'granted',
        error: errorObj.message || 'Terjadi kesalahan saat mengaktifkan notifikasi.',
      };
    }
  },

  /**
   * Menolak/Membatalkan langganan notifikasi
   */
  async unsubscribe(): Promise<{ success: boolean; error?: string }> {
    if (!this.isSupported()) return { success: false, error: 'Tidak didukung' };
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      return { success: true };
    } catch (err: unknown) {
      const errorObj = err as Error;
      return { success: false, error: errorObj.message };
    }
  },

  /**
   * Kirim notifikasi uji coba ke perangkat saat ini untuk memverifikasi langsung di layar HP
   */
  async sendTestPushToCurrentDevice(title?: string, message?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const sub = await this.getExistingSubscription();
      if (!sub) {
        return {
          success: false,
          error: 'Perangkat belum terdaftar. Silakan klik "Aktifkan Notifikasi" terlebih dahulu.',
        };
      }

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          title: title || 'Madin Blokagung',
          body: message || 'Uji coba berhasil! Notifikasi HP Madin Blokagung aktif.',
          url: '/',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Gagal mengirim uji coba notifikasi');
      }

      return { success: true };
    } catch (err: unknown) {
      const errorObj = err as Error;
      return { success: false, error: errorObj.message };
    }
  },
};
