import { supabase } from '@/lib/supabase/client';
import { normalizeSpecialAuthorities } from '@/lib/utils/rbacHelper';

export const COOKIE_PERSISTENT_ABSEN_CEPAT = 'madin_persistent_absen_cepat';
export const LS_PERSISTENT_ABSEN_CEPAT_VAULT =
  'MADIN_PERSISTENT_ABSEN_CEPAT_VAULT_V1';

const FOUR_HUNDRED_DAYS_SECONDS = 400 * 24 * 60 * 60; // 34.560.000 detik (Batas maksimal cookie browser modern)
const DEVICE_SALT = 'MADINA_BLOKAGUNG_DEVICE_LOCK_2026';

export interface PersistentDeviceVaultPayload {
  userId: string;
  username: string;
  email: string;
  tokenB64?: string;
  accessToken?: string;
  refreshToken?: string;
  savedAt: string;
}

function encodeDeviceSecret(plain: string): string {
  if (!plain) return '';
  try {
    const combined = `${DEVICE_SALT}::${plain}`;
    return typeof window !== 'undefined'
      ? window.btoa(encodeURIComponent(combined))
      : Buffer.from(combined, 'utf-8').toString('base64');
  } catch {
    return '';
  }
}

function decodeDeviceSecret(encoded?: string): string {
  if (!encoded) return '';
  try {
    const raw =
      typeof window !== 'undefined'
        ? decodeURIComponent(window.atob(encoded))
        : Buffer.from(encoded, 'base64').toString('utf-8');
    const prefix = `${DEVICE_SALT}::`;
    return raw.startsWith(prefix) ? raw.slice(prefix.length) : '';
  } catch {
    return '';
  }
}

export function setPersistentAbsenCepatCookie(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  if (enabled) {
    document.cookie = `${COOKIE_PERSISTENT_ABSEN_CEPAT}=1; path=/; max-age=${FOUR_HUNDRED_DAYS_SECONDS}; SameSite=Lax`;
  } else {
    document.cookie = `${COOKIE_PERSISTENT_ABSEN_CEPAT}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function getPersistentDeviceSession(): PersistentDeviceVaultPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_PERSISTENT_ABSEN_CEPAT_VAULT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistentDeviceVaultPayload>;
    if (!parsed || !parsed.userId || !parsed.email) return null;
    return {
      userId: String(parsed.userId),
      username: String(parsed.username || ''),
      email: String(parsed.email),
      tokenB64: parsed.tokenB64 ? String(parsed.tokenB64) : undefined,
      accessToken: parsed.accessToken ? String(parsed.accessToken) : undefined,
      refreshToken: parsed.refreshToken ? String(parsed.refreshToken) : undefined,
      savedAt: String(parsed.savedAt || new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

export function hasPersistentDeviceSession(): boolean {
  return Boolean(getPersistentDeviceSession());
}

export function savePersistentDeviceSession(params: {
  userId: string;
  username: string;
  email: string;
  password?: string;
  accessToken?: string;
  refreshToken?: string;
}): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getPersistentDeviceSession();
    const tokenB64 = params.password
      ? encodeDeviceSecret(params.password)
      : existing?.userId === params.userId
      ? existing.tokenB64
      : undefined;

    const payload: PersistentDeviceVaultPayload = {
      userId: params.userId,
      username: params.username.trim().toLowerCase(),
      email: params.email.trim().toLowerCase(),
      tokenB64,
      accessToken: params.accessToken || existing?.accessToken,
      refreshToken: params.refreshToken || existing?.refreshToken,
      savedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(
      LS_PERSISTENT_ABSEN_CEPAT_VAULT,
      JSON.stringify(payload)
    );
    setPersistentAbsenCepatCookie(true);
  } catch {
    // Abaikan jika mode penyimpanan privat membatasi localStorage
  }
}

export function clearPersistentDeviceSession(): void {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(LS_PERSISTENT_ABSEN_CEPAT_VAULT);
    } catch {
      // Abaikan
    }
  }
  setPersistentAbsenCepatCookie(false);
}

/**
 * Memulihkan sesi perangkat tetap secara otomatis tanpa meminta username & password lagi,
 * selama pengguna belum menekan tombol Logout sendiri dan saklar Otoritas Spesial masih Aktif.
 */
export async function restorePersistentDeviceSession(): Promise<{
  restored: boolean;
  targetPath: string;
  username?: string;
}> {
  const vault = getPersistentDeviceSession();
  if (!vault) {
    setPersistentAbsenCepatCookie(false);
    return { restored: false, targetPath: '/login' };
  }

  try {
    // 1. Cek apakah sesi Supabase saat ini masih aktif
    let {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Jika sesi cookie habis namun ada refreshToken di vault perangkat, pulihkan via setSession
    if (!user && vault.accessToken && vault.refreshToken) {
      const { data: refreshed } = await supabase.auth.setSession({
        access_token: vault.accessToken,
        refresh_token: vault.refreshToken,
      });
      if (refreshed?.user) {
        user = refreshed.user;
        if (refreshed.session) {
          savePersistentDeviceSession({
            userId: refreshed.user.id,
            username: vault.username,
            email: vault.email,
            accessToken: refreshed.session.access_token,
            refreshToken: refreshed.session.refresh_token,
          });
        }
      }
    }

    // 3. Jika refreshToken juga sudah kedaluwarsa (misal browser ditutup berminggu-minggu),
    //    lakukan silent re-auth menggunakan kredensial perangkat yang diikat saat login pertama
    if (!user && vault.tokenB64) {
      const savedPass = decodeDeviceSecret(vault.tokenB64);
      if (savedPass) {
        const { data: reauthData } = await supabase.auth.signInWithPassword({
          email: vault.email,
          password: savedPass,
        });
        if (reauthData?.user) {
          user = reauthData.user;
          savePersistentDeviceSession({
            userId: reauthData.user.id,
            username: vault.username,
            email: vault.email,
            accessToken: reauthData.session?.access_token,
            refreshToken: reauthData.session?.refresh_token,
          });
        }
      }
    }

    if (!user) {
      return { restored: false, targetPath: '/login' };
    }

    // 4. Pastikan saklar Otoritas Spesial (persistent_absen_cepat) untuk akun ini masih AKTIF di database
    let isStillAuthorized = false;
    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const metaSpecial = normalizeSpecialAuthorities(
      appMeta.special_authorities as Record<string, unknown> | undefined
    );
    if (metaSpecial.persistent_absen_cepat) {
      isStillAuthorized = true;
    }

    const { data: row } = await supabase
      .from('user_accounts')
      .select('special_authorities, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (row) {
      if (row.is_active === false) {
        clearPersistentDeviceSession();
        await supabase.auth.signOut();
        return { restored: false, targetPath: '/login' };
      }
      const dbSpecial = normalizeSpecialAuthorities(
        row.special_authorities as Record<string, unknown> | undefined
      );
      isStillAuthorized = Boolean(dbSpecial.persistent_absen_cepat);
    }

    if (!isStillAuthorized) {
      clearPersistentDeviceSession();
      return { restored: false, targetPath: '/dashboard' };
    }

    setPersistentAbsenCepatCookie(true);
    return {
      restored: true,
      targetPath: '/absen-cepat',
      username: vault.username,
    };
  } catch {
    return { restored: false, targetPath: '/login' };
  }
}
