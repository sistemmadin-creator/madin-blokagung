/**
 * Layanan Integrasi WhatsApp HTTP API (WAHA / Baileys Gateway)
 * Mendukung pengiriman pesan teks, Kartu Rapor Digital Hafalan bergambar,
 * pemeriksaan sesi QR, proxy anti-CORS, dan fallback ke WhatsApp Web.
 */

export interface WahaConfig {
  baseUrl: string;
  apiKey: string;
  session: string;
  autoSendOnInput: boolean;
  delayMin: number; // detik
  delayMax: number; // detik
  messageTemplate: string;
}

export interface WahaSessionStatus {
  online: boolean;
  status: 'WORKING' | 'STARTING' | 'SCAN_QR_CODE' | 'FAILED' | 'STOPPED' | 'OFFLINE';
  phone?: string;
  qrCode?: string;
  message?: string;
}

export interface DeliveryLog {
  id: string;
  noInduk: string;
  namaSantri: string;
  noWa: string;
  materi: string;
  kategori: string;
  capaian: string;
  status: 'success' | 'failed' | 'manual';
  tanggalKirim: string;
  error?: string;
}

export const DEFAULT_WAHA_CONFIG: WahaConfig = {
  baseUrl: 'http://localhost:3008',
  apiKey: '',
  session: 'default',
  autoSendOnInput: false,
  delayMin: 4,
  delayMax: 7,
  messageTemplate: `Assalamu'alaikum Wr. Wb.

Yth. Bapak/Ibu Wali dari Ananda:
*{nama}*
NIS: {nis} | Kelas: {kelas} | Kamar: {kamar}
Mustahiq: {mustahiq}

Berikut laporan perkembangan setoran hafalan mingguan ananda di *Madrasah Diniyyah Al Amiriyyah Blokagung*:
• Kategori: *Hafalan {kategori}*
• Target Hafalan Saat Ini: *{materi} ({target})*
• Capaian Setoran Hafalan: *{capaian} ({persen}%)*
• Status Target: *{status}*

*3 Riwayat Setor Terakhir:*
{riwayat_terakhir}

Bersama pesan ini kami lampirkan *Kartu Rapor Digital Hafalan* resmi. Semoga ananda senantiasa diberikan kemudahan, kelancaran, dan keberkahan ilmu.

Wassalamu'alaikum Wr. Wb.
*PKM. Muhafadzoh Madin Al Amiriyyah Blokagung*`,
};

const CONFIG_STORAGE_KEY = 'madin_waha_config_v1';
const LOGS_STORAGE_KEY = 'madin_wa_delivery_logs_v1';

export function getWahaConfig(): WahaConfig {
  if (typeof window === 'undefined') return DEFAULT_WAHA_CONFIG;
  const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
  if (!saved) return DEFAULT_WAHA_CONFIG;
  try {
    return { ...DEFAULT_WAHA_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_WAHA_CONFIG;
  }
}

export function saveWahaConfig(config: WahaConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Memformat nomor HP Indonesia ke format standar internasional (628...)
 * Menghilangkan strip, spasi, simbol +, dan mengubah awalan 08 / 8 menjadi 628.
 */
export function formatPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  let cleaned = String(rawPhone).replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  } else if (!cleaned.startsWith('62') && cleaned.length > 5) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function formatChatId(rawPhone?: string | null): string {
  const num = formatPhoneNumber(rawPhone);
  if (!num) return '';
  return `${num}@c.us`;
}

export function generateDirectWaLink(rawPhone: string, text: string): string {
  const num = formatPhoneNumber(rawPhone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${num}?text=${encodedText}`;
}

export function compileMessage(
  template: string,
  params: {
    nama: string;
    nis: string;
    kelas: string;
    kamar: string;
    mustahiq: string;
    materi: string;
    kategori: string;
    target: string;
    capaian: string;
    persen: string;
    status: string;
    riwayat_terakhir: string;
  }
): string {
  return template
    .replace(/{nama}/g, params.nama)
    .replace(/{nis}/g, params.nis)
    .replace(/{kelas}/g, params.kelas)
    .replace(/{kamar}/g, params.kamar)
    .replace(/{mustahiq}/g, params.mustahiq)
    .replace(/{materi}/g, params.materi)
    .replace(/{kategori}/g, params.kategori)
    .replace(/{target}/g, params.target)
    .replace(/{capaian}/g, params.capaian)
    .replace(/{persen}/g, params.persen)
    .replace(/{status}/g, params.status)
    .replace(/{riwayat_terakhir}/g, params.riwayat_terakhir);
}

async function fetchWithProxyFallback(
  config: WahaConfig,
  subPath: string,
  options: RequestInit
): Promise<Response> {
  const cleanUrl = (config.baseUrl || DEFAULT_WAHA_CONFIG.baseUrl).replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (config.apiKey) {
    headers['X-Api-Key'] = config.apiKey;
  }

  try {
    return await fetch(`${cleanUrl}/api/${subPath}`, {
      ...options,
      headers,
    });
  } catch (directErr) {
    // Fallback melalui API proxy internal Next.js jika terhalang CORS di lokal
    if (typeof window !== 'undefined') {
      const proxyHeaders: Record<string, string> = {
        ...headers,
        'x-waha-target': cleanUrl,
      };
      if (config.apiKey) {
        proxyHeaders['x-api-key'] = config.apiKey;
      }
      return await fetch(`/api/waha/${subPath}`, {
        ...options,
        headers: proxyHeaders,
      });
    }
    throw directErr;
  }
}

export async function checkWahaSession(config: WahaConfig): Promise<WahaSessionStatus> {
  const cleanUrl = (config.baseUrl || DEFAULT_WAHA_CONFIG.baseUrl).replace(/\/+$/, '');

  try {
    const res = await fetchWithProxyFallback(
      config,
      `sessions/${encodeURIComponent(config.session || 'default')}`,
      { method: 'GET' }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return {
          online: false,
          status: 'STOPPED',
          message: `Sesi "${config.session}" belum dibuat di server WAHA.`,
        };
      }
      return {
        online: false,
        status: 'FAILED',
        message: `Server gateway belum aktif atau merespons kode ${res.status}.`,
      };
    }

    const data = await res.json();
    if (data.status === 'OFFLINE' || data.online === false) {
      return {
        online: false,
        status: 'OFFLINE',
        message: data.error || 'Server WAHA sedang offline.',
      };
    }

    const status = data.status || 'WORKING';

    return {
      online: status === 'WORKING',
      status,
      phone: data.me?.id ? String(data.me.id).split('@')[0] : undefined,
      qrCode: data.qrCode || data.qr || undefined,
      message: data.message,
    };
  } catch (err: unknown) {
    const isHttpsOrigin =
      typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpTarget = cleanUrl.startsWith('http://');
    let errorMsg = err instanceof Error ? err.message : 'Network Error';

    if (isHttpsOrigin && isHttpTarget) {
      errorMsg =
        "Browser memblokir koneksi 'http://' dari situs HTTPS (Mixed Content). Gunakan URL HTTPS Tunnel atau buka aplikasi secara lokal.";
    }

    return {
      online: false,
      status: 'OFFLINE',
      message: `Tidak dapat terhubung ke WAHA (${errorMsg}).`,
    };
  }
}

export async function logoutWahaSession(
  config: WahaConfig
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetchWithProxyFallback(
      config,
      `sessions/${encodeURIComponent(config.session || 'default')}/logout`,
      { method: 'POST' }
    );
    if (!res.ok) {
      return { success: false, message: `Gagal memutuskan sesi (${res.status})` };
    }
    const data = await res.json();
    return { success: true, message: data.message || 'Berhasil memutuskan sesi WhatsApp.' };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal menghubungi server WAHA.',
    };
  }
}

async function resolveImageAsDataUrl(imageUrl: string): Promise<string> {
  if (!imageUrl || imageUrl.startsWith('data:image') || typeof window === 'undefined') {
    return imageUrl;
  }
  try {
    const imgRes = await fetch(imageUrl, { credentials: 'include' });
    if (!imgRes.ok) return imageUrl;
    const blob = await imgRes.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string' && reader.result.startsWith('data:image')) {
          resolve(reader.result);
        } else {
          resolve(imageUrl);
        }
      };
      reader.onerror = () => resolve(imageUrl);
      reader.readAsDataURL(blob);
    });
  } catch {
    return imageUrl;
  }
}

export async function sendWahaImage(
  config: WahaConfig,
  phone: string,
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const chatId = formatChatId(phone);

  if (!chatId) {
    return { success: false, error: 'Nomor WhatsApp tidak valid.' };
  }

  const resolvedFileUrl = await resolveImageAsDataUrl(imageUrl);

  const payload = {
    session: config.session || 'default',
    chatId,
    file: {
      url: resolvedFileUrl,
      filename: 'Kartu_Rapor_Hafalan_Madin.png',
      caption,
    },
  };

  try {
    const res = await fetchWithProxyFallback(config, 'sendImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text();
      let parsedError = errBody || res.statusText;
      try {
        const errJson = JSON.parse(errBody);
        if (errJson?.error) parsedError = String(errJson.error);
        else if (errJson?.message) parsedError = String(errJson.message);
      } catch {
        // Gunakan teks asli bila bukan JSON
      }
      return {
        success: false,
        error: parsedError,
      };
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Gagal menghubungi server WAHA.',
    };
  }
}

export function getDeliveryLogs(): DeliveryLog[] {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(LOGS_STORAGE_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function saveDeliveryLog(log: Omit<DeliveryLog, 'id' | 'tanggalKirim'>): void {
  if (typeof window === 'undefined') return;
  const current = getDeliveryLogs();
  const newLog: DeliveryLog = {
    ...log,
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    tanggalKirim: new Date().toISOString(),
  };

  const updated = [newLog, ...current].slice(0, 500);
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
}

export function getLatestDeliveryLog(
  noInduk: string,
  materi: string
): DeliveryLog | undefined {
  const logs = getDeliveryLogs();
  return logs.find((l) => l.noInduk === noInduk && l.materi === materi);
}

export function isAlreadyDelivered(noInduk: string, materi: string): boolean {
  const latest = getLatestDeliveryLog(noInduk, materi);
  if (!latest) return false;
  return latest.status === 'success' || latest.status === 'manual';
}
