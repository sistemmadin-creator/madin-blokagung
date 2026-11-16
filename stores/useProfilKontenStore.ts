import { create } from 'zustand';
import {
  DEFAULT_KHAZANAH_JENJANG,
  DEFAULT_METRIK_LEMBAGA,
  DEFAULT_MODEL_PEMBELAJARAN,
  DEFAULT_PROFIL_SECTION_META,
  DEFAULT_WAKTU_KBM,
  KhazanahKitabItem,
  ProfilKhazanahJenjangItem,
  ProfilMetrikItem,
  ProfilModelPembelajaranItem,
  ProfilSectionKey,
  ProfilSectionMeta,
  ProfilWaktuKbmItem,
  WaktuKbmSlotItem,
} from '@/types/profil-konten';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

const LS_KEY_PROFIL_KONTEN = 'madina_profil_konten_v1';

interface CachedProfilKonten {
  sectionMeta: Record<ProfilSectionKey, ProfilSectionMeta>;
  metrikList: ProfilMetrikItem[];
  modelList: ProfilModelPembelajaranItem[];
  jenjangList: ProfilKhazanahJenjangItem[];
  waktuKbmList: ProfilWaktuKbmItem[];
}

function saveLocalCache(payload: CachedProfilKonten) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY_PROFIL_KONTEN, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

function loadLocalCache(): CachedProfilKonten | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY_PROFIL_KONTEN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedProfilKonten>;
    return {
      sectionMeta: {
        ...DEFAULT_PROFIL_SECTION_META,
        ...(parsed.sectionMeta || {}),
      },
      metrikList: Array.isArray(parsed.metrikList) ? parsed.metrikList : DEFAULT_METRIK_LEMBAGA,
      modelList: Array.isArray(parsed.modelList) ? parsed.modelList : DEFAULT_MODEL_PEMBELAJARAN,
      jenjangList: Array.isArray(parsed.jenjangList) ? parsed.jenjangList : DEFAULT_KHAZANAH_JENJANG,
      waktuKbmList: Array.isArray(parsed.waktuKbmList) ? parsed.waktuKbmList : DEFAULT_WAKTU_KBM,
    };
  } catch {
    return null;
  }
}

function makeSlugId(prefix: string, label: string): string {
  const clean = label
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}-${clean || 'item'}-${rand}`;
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string };
  const msg = String(e.message || '').toLowerCase();
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

interface ProfilKontenState extends CachedProfilKonten {
  isLoading: boolean;
  isTableMissing: boolean;
  error: string | null;

  fetchProfilKonten: (includeInactive?: boolean) => Promise<void>;

  updateSectionMeta: (
    key: ProfilSectionKey,
    updates: Pick<ProfilSectionMeta, 'badge_label' | 'judul' | 'deskripsi'>
  ) => Promise<boolean>;

  createMetrik: (payload: Omit<ProfilMetrikItem, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateMetrik: (id: string, updates: Partial<ProfilMetrikItem>) => Promise<boolean>;
  deleteMetrik: (id: string) => Promise<boolean>;

  createModel: (payload: Omit<ProfilModelPembelajaranItem, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateModel: (id: string, updates: Partial<ProfilModelPembelajaranItem>) => Promise<boolean>;
  deleteModel: (id: string) => Promise<boolean>;

  createJenjang: (payload: Omit<ProfilKhazanahJenjangItem, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateJenjang: (id: string, updates: Partial<ProfilKhazanahJenjangItem>) => Promise<boolean>;
  deleteJenjang: (id: string) => Promise<boolean>;

  createWaktuKbm: (payload: Omit<ProfilWaktuKbmItem, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updateWaktuKbm: (id: string, updates: Partial<ProfilWaktuKbmItem>) => Promise<boolean>;
  deleteWaktuKbm: (id: string) => Promise<boolean>;
}

function snapshotFromState(s: ProfilKontenState): CachedProfilKonten {
  return {
    sectionMeta: s.sectionMeta,
    metrikList: s.metrikList,
    modelList: s.modelList,
    jenjangList: s.jenjangList,
    waktuKbmList: s.waktuKbmList,
  };
}

export const useProfilKontenStore = create<ProfilKontenState>((set, get) => ({
  sectionMeta: DEFAULT_PROFIL_SECTION_META,
  metrikList: DEFAULT_METRIK_LEMBAGA,
  modelList: DEFAULT_MODEL_PEMBELAJARAN,
  jenjangList: DEFAULT_KHAZANAH_JENJANG,
  waktuKbmList: DEFAULT_WAKTU_KBM,
  isLoading: false,
  isTableMissing: false,
  error: null,

  fetchProfilKonten: async (includeInactive = false) => {
    const cached = loadLocalCache();
    if (cached) {
      set({ ...cached });
    }
    set({ isLoading: true, error: null });

    try {
      let qMetrik = supabase
        .from('profil_metrik_lembaga' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      let qModel = supabase
        .from('profil_model_pembelajaran' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      let qJenjang = supabase
        .from('profil_khazanah_jenjang' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      let qWaktu = supabase
        .from('profil_waktu_kbm' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!includeInactive) {
        qMetrik = qMetrik.eq('is_active', true);
        qModel = qModel.eq('is_active', true);
        qJenjang = qJenjang.eq('is_active', true);
        qWaktu = qWaktu.eq('is_active', true);
      }

      const [resMeta, resMetrik, resModel, resJenjang, resWaktu] = await Promise.all([
        supabase.from('profil_section_meta' as any).select('*'),
        qMetrik,
        qModel,
        qJenjang,
        qWaktu,
      ]);

      const anyErr =
        resMeta.error || resMetrik.error || resModel.error || resJenjang.error || resWaktu.error;
      if (anyErr) {
        const missing = isMissingTableError(anyErr);
        set({
          isLoading: false,
          isTableMissing: missing,
          error: missing ? null : (anyErr as { message?: string }).message || 'Gagal memuat data.',
        });
        return;
      }

      const nextMeta: Record<ProfilSectionKey, ProfilSectionMeta> = {
        ...DEFAULT_PROFIL_SECTION_META,
      };
      if (Array.isArray(resMeta.data)) {
        (resMeta.data as unknown as ProfilSectionMeta[]).forEach((row) => {
          if (row.section_key in nextMeta) {
            nextMeta[row.section_key] = row;
          }
        });
      }

      const nextMetrik =
        resMetrik.data && resMetrik.data.length > 0
          ? (resMetrik.data as unknown as ProfilMetrikItem[])
          : DEFAULT_METRIK_LEMBAGA;

      const nextModel =
        resModel.data && resModel.data.length > 0
          ? (resModel.data as unknown as ProfilModelPembelajaranItem[]).map((m) => ({
              ...m,
              features: Array.isArray(m.features) ? m.features : [],
            }))
          : DEFAULT_MODEL_PEMBELAJARAN;

      const nextJenjang =
        resJenjang.data && resJenjang.data.length > 0
          ? (resJenjang.data as unknown as ProfilKhazanahJenjangItem[]).map((j) => ({
              ...j,
              kitab_list: Array.isArray(j.kitab_list) ? (j.kitab_list as KhazanahKitabItem[]) : [],
            }))
          : DEFAULT_KHAZANAH_JENJANG;

      const nextWaktu =
        resWaktu.data && resWaktu.data.length > 0
          ? (resWaktu.data as unknown as ProfilWaktuKbmItem[]).map((w) => ({
              ...w,
              slots: Array.isArray(w.slots) ? (w.slots as WaktuKbmSlotItem[]) : [],
            }))
          : DEFAULT_WAKTU_KBM;

      const nextPayload: CachedProfilKonten = {
        sectionMeta: nextMeta,
        metrikList: nextMetrik,
        modelList: nextModel,
        jenjangList: nextJenjang,
        waktuKbmList: nextWaktu,
      };

      saveLocalCache(nextPayload);
      set({
        ...nextPayload,
        isLoading: false,
        isTableMissing: false,
        error: null,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  updateSectionMeta: async (key, updates) => {
    const updatedRow: ProfilSectionMeta = {
      section_key: key,
      badge_label: updates.badge_label.trim(),
      judul: updates.judul.trim(),
      deskripsi: updates.deskripsi.trim(),
      updated_at: new Date().toISOString(),
    };

    set((state) => {
      const next = {
        ...snapshotFromState(state),
        sectionMeta: { ...state.sectionMeta, [key]: updatedRow },
      };
      saveLocalCache(next);
      return { sectionMeta: next.sectionMeta };
    });

    try {
      const { error } = await supabase
        .from('profil_section_meta' as any)
        .upsert([updatedRow], { onConflict: 'section_key' });
      if (error) throw error;
      await logActivity('UBAH HEADING PROFIL', `Memperbarui heading seksi ${key}`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  createMetrik: async (payload) => {
    const newItem: ProfilMetrikItem = {
      ...payload,
      id: makeSlugId('met', payload.label),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => {
      const nextList = [...state.metrikList, newItem].sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), metrikList: nextList });
      return { metrikList: nextList };
    });

    try {
      const { error } = await supabase.from('profil_metrik_lembaga' as any).insert([newItem]);
      if (error) throw error;
      await logActivity('TAMBAH METRIK LEMBAGA', `Menambahkan metrik "${newItem.label}"`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  updateMetrik: async (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const nextList = state.metrikList
        .map((m) => (m.id === id ? { ...m, ...updates, updated_at: now } : m))
        .sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), metrikList: nextList });
      return { metrikList: nextList };
    });

    try {
      const { error } = await supabase
        .from('profil_metrik_lembaga' as any)
        .update({ ...updates, updated_at: now })
        .eq('id', id);
      if (error) throw error;
      await logActivity('UBAH METRIK LEMBAGA', `Memperbarui metrik (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  deleteMetrik: async (id) => {
    set((state) => {
      const nextList = state.metrikList.filter((m) => m.id !== id);
      saveLocalCache({ ...snapshotFromState(state), metrikList: nextList });
      return { metrikList: nextList };
    });

    try {
      const { error } = await supabase.from('profil_metrik_lembaga' as any).delete().eq('id', id);
      if (error) throw error;
      await logActivity('HAPUS METRIK LEMBAGA', `Menghapus metrik (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  createModel: async (payload) => {
    const newItem: ProfilModelPembelajaranItem = {
      ...payload,
      id: makeSlugId('pilar', payload.title),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => {
      const nextList = [...state.modelList, newItem].sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), modelList: nextList });
      return { modelList: nextList };
    });

    try {
      const { error } = await supabase.from('profil_model_pembelajaran' as any).insert([newItem]);
      if (error) throw error;
      await logActivity('TAMBAH MODEL PEMBELAJARAN', `Menambahkan pilar "${newItem.title}"`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  updateModel: async (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const nextList = state.modelList
        .map((m) => (m.id === id ? { ...m, ...updates, updated_at: now } : m))
        .sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), modelList: nextList });
      return { modelList: nextList };
    });

    try {
      const { error } = await supabase
        .from('profil_model_pembelajaran' as any)
        .update({ ...updates, updated_at: now })
        .eq('id', id);
      if (error) throw error;
      await logActivity('UBAH MODEL PEMBELAJARAN', `Memperbarui pilar (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  deleteModel: async (id) => {
    set((state) => {
      const nextList = state.modelList.filter((m) => m.id !== id);
      saveLocalCache({ ...snapshotFromState(state), modelList: nextList });
      return { modelList: nextList };
    });

    try {
      const { error } = await supabase
        .from('profil_model_pembelajaran' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      await logActivity('HAPUS MODEL PEMBELAJARAN', `Menghapus pilar (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  createJenjang: async (payload) => {
    const newItem: ProfilKhazanahJenjangItem = {
      ...payload,
      id: makeSlugId('jen', payload.kode_tab),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => {
      const nextList = [...state.jenjangList, newItem].sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), jenjangList: nextList });
      return { jenjangList: nextList };
    });

    try {
      const { error } = await supabase.from('profil_khazanah_jenjang' as any).insert([newItem]);
      if (error) throw error;
      await logActivity('TAMBAH JENJANG KHAZANAH', `Menambahkan jenjang "${newItem.kode_tab}"`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  updateJenjang: async (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const nextList = state.jenjangList
        .map((j) => (j.id === id ? { ...j, ...updates, updated_at: now } : j))
        .sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), jenjangList: nextList });
      return { jenjangList: nextList };
    });

    try {
      const { error } = await supabase
        .from('profil_khazanah_jenjang' as any)
        .update({ ...updates, updated_at: now })
        .eq('id', id);
      if (error) throw error;
      await logActivity('UBAH JENJANG KHAZANAH', `Memperbarui jenjang/kitab (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  deleteJenjang: async (id) => {
    set((state) => {
      const nextList = state.jenjangList.filter((j) => j.id !== id);
      saveLocalCache({ ...snapshotFromState(state), jenjangList: nextList });
      return { jenjangList: nextList };
    });

    try {
      const { error } = await supabase
        .from('profil_khazanah_jenjang' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      await logActivity('HAPUS JENJANG KHAZANAH', `Menghapus jenjang (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  createWaktuKbm: async (payload) => {
    const newItem: ProfilWaktuKbmItem = {
      ...payload,
      id: makeSlugId('wkbm', payload.judul),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set((state) => {
      const nextList = [...state.waktuKbmList, newItem].sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), waktuKbmList: nextList });
      return { waktuKbmList: nextList };
    });

    try {
      const { error } = await supabase.from('profil_waktu_kbm' as any).insert([newItem]);
      if (error) throw error;
      await logActivity('TAMBAH WAKTU KBM', `Menambahkan sesi "${newItem.judul}"`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  updateWaktuKbm: async (id, updates) => {
    const now = new Date().toISOString();
    set((state) => {
      const nextList = state.waktuKbmList
        .map((w) => (w.id === id ? { ...w, ...updates, updated_at: now } : w))
        .sort((a, b) => a.sort_order - b.sort_order);
      saveLocalCache({ ...snapshotFromState(state), waktuKbmList: nextList });
      return { waktuKbmList: nextList };
    });

    try {
      const { error } = await supabase
        .from('profil_waktu_kbm' as any)
        .update({ ...updates, updated_at: now })
        .eq('id', id);
      if (error) throw error;
      await logActivity('UBAH WAKTU KBM', `Memperbarui sesi KBM (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },

  deleteWaktuKbm: async (id) => {
    set((state) => {
      const nextList = state.waktuKbmList.filter((w) => w.id !== id);
      saveLocalCache({ ...snapshotFromState(state), waktuKbmList: nextList });
      return { waktuKbmList: nextList };
    });

    try {
      const { error } = await supabase.from('profil_waktu_kbm' as any).delete().eq('id', id);
      if (error) throw error;
      await logActivity('HAPUS WAKTU KBM', `Menghapus sesi KBM (${id})`);
    } catch (err: unknown) {
      if (isMissingTableError(err)) set({ isTableMissing: true });
    }
    return true;
  },
}));
