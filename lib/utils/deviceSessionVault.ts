import { supabase } from '@/lib/supabase/client';
import { normalizeSpecialAuthorities } from '@/lib/utils/rbacHelper';

export const COOKIE_PERSISTENT_ABSEN_CEPAT = 'madin_persistent_absen_cepat';
export const LS_PERSISTENT_ABSEN_CEPAT_VAULT =
  'MADIN_PERSISTENT_ABSEN_CEPAT_VAULT_V1';

const FOUR_HUNDRED_DAYS_SECONDS = 400 * 24 * 60 * 60; // 34.560.000 detik (Batas maksimal cookie browser modern)

/**
 * Brankas metadata sesi perangkat tetap.
 * CATATAN KEAMANAN: Tidak pernah menyimpan password (tokenB64) maupun JWT
 * (accessToken / refreshToken) di localStorage.
 */
export interface PersistentDeviceVaultPayload {
  userId: string;
  username: string;
  email: string;
  savedAt: string;
}

export function setPersistentAbsenCepatCookie(enabled: boolean): void {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const secureAttr = isSecure ? '; Secure' : '';

  if (enabled) {
    document.cookie = `${COOKIE_PERSISTENT_ABSEN_CEPAT}=1; path=/; max-age=${FOUR_HUNDRED_DAYS_SECONDS}; SameSite=Lax${secureAttr}`;
  } else {
    document.cookie = `${COOKIE_PERSISTENT_ABSEN_CEPAT}=; path=/; max-age=0; SameSite=Lax${secureAttr}`;
  }
}

export function getPersistentDeviceSession(): PersistentDeviceVaultPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_PERSISTENT_ABSEN_CEPAT_VAULT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed.userId !== 'string' || typeof parsed.email !== 'string') {
      return null;
    }

    const cleaned: PersistentDeviceVaultPayload = {
      userId: String(parsed.userId),
      username: String(parsed.username || ''),
      email: String(parsed.email),
      savedAt: String(parsed.savedAt || new Date().toISOString()),
    };

    // Bersihkan otomatis jika di localStorage masih tersimpan field rahasia warisan
    if ('tokenB64' in parsed || 'accessToken' in parsed || 'refreshToken' in parsed) {
      window.localStorage.setItem(
        LS_PERSISTENT_ABSEN_CEPAT_VAULT,
        JSON.stringify(cleaned)
      );
    }

    return cleaned;
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
}): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistentDeviceVaultPayload = {
      userId: params.userId,
      username: params.username.trim().toLowerCase(),
      email: params.email.trim().toLowerCase(),
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
 * Memverifikasi sesi perangkat tetap berdasarkan sesi cookie resmi Supabase Auth
 * dan status Otoritas Spesial di database (tanpa menyimpan password/token di localStorage).
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
    // 1. Cek apakah sesi Supabase Auth resmi saat ini masih aktif
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== vault.userId) {
      setPersistentAbsenCepatCookie(false);
      return { restored: false, targetPath: '/login' };
    }

    // 2. Pastikan saklar Otoritas Spesial (persistent_absen_cepat) untuk akun ini masih AKTIF di database
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
