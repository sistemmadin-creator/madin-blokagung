import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { extractUserProfile } from '@/lib/utils/authHelper';
import {
  canAccessSettingsAuthority,
  canCreateOnPage,
  canDeleteOnPage,
  canEditOnPage,
  canViewPage,
  ClassScopeTarget,
  createDefaultPagePermissions,
  createDefaultSpecialAuthorities,
  isBlokAllowed,
  isClassAllowedByAuthority,
  isGenderAllowed,
  normalizeUserAccountRecord,
} from '@/lib/utils/rbacHelper';
import {
  AppPageId,
  PagePermissionsMap,
  SpecialAuthorities,
  UserAccountRecord,
} from '@/types/rbac';

export interface UpsertAccountInput {
  id?: string | null;
  username: string;
  password?: string;
  full_name: string;
  role: 'master_admin' | 'pkm_kurikulum' | 'custom_user' | string;
  role_label: string;
  page_permissions: PagePermissionsMap;
  special_authorities: SpecialAuthorities;
}

interface RbacStoreState {
  currentAccount: UserAccountRecord | null;
  accountsList: UserAccountRecord[];
  isLoadingCurrent: boolean;
  isLoadingList: boolean;
  errorMsg: string | null;

  fetchCurrentAccount: () => Promise<UserAccountRecord | null>;
  fetchAllAccounts: () => Promise<void>;
  upsertAccount: (input: UpsertAccountInput) => Promise<{ ok: boolean; error?: string }>;
  deleteAccount: (id: string, username: string) => Promise<{ ok: boolean; error?: string }>;
  clearCurrentAccount: () => void;
}

export const useRbacStore = create<RbacStoreState>((set, get) => ({
  currentAccount: null,
  accountsList: [],
  isLoadingCurrent: false,
  isLoadingList: false,
  errorMsg: null,

  fetchCurrentAccount: async () => {
    set({ isLoadingCurrent: true });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        set({ currentAccount: null, isLoadingCurrent: false });
        return null;
      }

      const profile = extractUserProfile(user);
      const appMeta = (user.app_metadata || {}) as Record<string, unknown>;

      // Ambil dari tabel public.user_accounts untuk mendapatkan izin paling mutakhir
      const { data: row } = await supabase
        .from('user_accounts')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (row) {
        const normalized = normalizeUserAccountRecord({
          id: row.id,
          username: row.username,
          email: row.email,
          full_name: row.full_name,
          role: row.role,
          role_label: row.role_label,
          is_active: row.is_active,
          page_permissions: row.page_permissions,
          special_authorities: row.special_authorities,
          created_at: row.created_at,
          updated_at: row.updated_at,
        });
        set({ currentAccount: normalized, isLoadingCurrent: false });
        return normalized;
      }

      // Fallback dari app_metadata jika baris user_accounts belum termuat
      const fallback = normalizeUserAccountRecord({
        id: user.id,
        username: profile?.username || 'pengurus',
        email: user.email || '',
        full_name: profile?.fullName || 'Pengurus',
        role: profile?.role || 'custom_user',
        role_label: profile?.roleLabel || 'Pengurus',
        is_active: true,
        page_permissions:
          (appMeta.page_permissions as PagePermissionsMap) ||
          createDefaultPagePermissions('edit'),
        special_authorities:
          (appMeta.special_authorities as SpecialAuthorities) ||
          createDefaultSpecialAuthorities(),
      });

      set({ currentAccount: fallback, isLoadingCurrent: false });
      return fallback;
    } catch {
      set({ isLoadingCurrent: false });
      return get().currentAccount;
    }
  },

  fetchAllAccounts: async () => {
    set({ isLoadingList: true, errorMsg: null });
    try {
      const { data, error } = await supabase
        .from('user_accounts')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        set({ isLoadingList: false, errorMsg: error.message });
        return;
      }

      const normalizedList = (data || []).map((row) =>
        normalizeUserAccountRecord({
          id: row.id,
          username: row.username,
          email: row.email,
          full_name: row.full_name,
          role: row.role,
          role_label: row.role_label,
          is_active: row.is_active,
          page_permissions: row.page_permissions,
          special_authorities: row.special_authorities,
          created_at: row.created_at,
          updated_at: row.updated_at,
        })
      );

      set({ accountsList: normalizedList, isLoadingList: false });
    } catch (err) {
      set({
        isLoadingList: false,
        errorMsg: err instanceof Error ? err.message : 'Gagal memuat daftar akun.',
      });
    }
  },

  upsertAccount: async (input: UpsertAccountInput) => {
    set({ errorMsg: null });
    try {
      const normalized = normalizeUserAccountRecord({
        id: input.id || '00000000-0000-0000-0000-000000000000',
        username: input.username,
        full_name: input.full_name,
        role: input.role,
        role_label: input.role_label,
        page_permissions: input.page_permissions,
        special_authorities: input.special_authorities,
      });

      const { error } = await supabase.rpc('admin_upsert_user_account', {
        p_user_id: input.id || null,
        p_username: normalized.username,
        p_password: input.password && input.password.trim() ? input.password.trim() : null,
        p_full_name: normalized.full_name,
        p_role: normalized.role,
        p_role_label: normalized.role_label,
        p_page_permissions: normalized.page_permissions,
        p_special_authorities: normalized.special_authorities,
      });

      if (error) {
        set({ errorMsg: error.message });
        return { ok: false, error: error.message };
      }

      const actionLabel = input.id ? 'UBAH AKUN & OTORITAS' : 'TAMBAH AKUN BARU';
      await logActivity(
        actionLabel,
        `${input.id ? 'Memperbarui' : 'Membuat'} akun @${normalized.username} (${normalized.full_name} - ${normalized.role_label})`
      );

      await get().fetchAllAccounts();
      if (input.id && get().currentAccount?.id === input.id) {
        await get().fetchCurrentAccount();
      }

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan akun.';
      set({ errorMsg: msg });
      return { ok: false, error: msg };
    }
  },

  deleteAccount: async (id: string, username: string) => {
    set({ errorMsg: null });
    try {
      const { error } = await supabase.rpc('admin_delete_user_account', {
        p_user_id: id,
      });

      if (error) {
        set({ errorMsg: error.message });
        return { ok: false, error: error.message };
      }

      await logActivity(
        'HAPUS AKUN',
        `Menghapus akun pengurus @${username}`
      );

      await get().fetchAllAccounts();
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus akun.';
      set({ errorMsg: msg });
      return { ok: false, error: msg };
    }
  },

  clearCurrentAccount: () => {
    set({ currentAccount: null, accountsList: [] });
  },
}));

// Custom Hook Terpusat untuk Pengecekan Hak Akses & Filter Data Per Halaman
export function usePagePermission(pageId: AppPageId) {
  const currentAccount = useRbacStore((s) => s.currentAccount);

  const isMasterAdmin =
    !currentAccount ||
    currentAccount.role === 'master_admin' ||
    currentAccount.username === 'admin';

  const canView = canViewPage(currentAccount, pageId);
  const canCreate = canCreateOnPage(currentAccount, pageId);
  const canEdit = canEditOnPage(currentAccount, pageId);
  const canDelete = canDeleteOnPage(currentAccount, pageId);
  const canAccessSettings = canAccessSettingsAuthority(currentAccount);

  const blokScope = currentAccount?.special_authorities.blok_scope ?? 'SEMUA';
  const genderScope = currentAccount?.special_authorities.gender_scope ?? 'semua';

  const isPersonAllowed = (item: {
    blok?: string | null;
    pa_pi?: string | null;
  }): boolean => {
    if (!currentAccount || isMasterAdmin) return true;
    if (!isGenderAllowed(item.pa_pi, genderScope)) return false;
    if (!isBlokAllowed(item.blok, blokScope)) return false;
    return true;
  };

  const isClassAllowed = (
    kelas: ClassScopeTarget,
    santriList?: Array<{
      tingkat?: string;
      din_kls?: string;
      din_bag?: string;
      pa_pi?: string;
      blok?: string;
    }>,
    asatidzList?: Array<{
      tingkat_asatidz?: string;
      din_kls_asatidz?: string;
      din_bag_asatidz?: string;
      pa_pi?: string;
      blok?: string;
    }>
  ): boolean => {
    return isClassAllowedByAuthority(kelas, currentAccount, santriList, asatidzList);
  };

  return {
    currentAccount,
    isMasterAdmin,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAccessSettings,
    blokScope,
    genderScope,
    isPersonAllowed,
    isClassAllowed,
  };
}
