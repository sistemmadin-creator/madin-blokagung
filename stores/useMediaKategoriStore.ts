import { create } from 'zustand';
import {
  DEFAULT_SUB_TOPIK_MEDIA,
  ParentTopicWithSub,
  SubTopikMedia,
} from '@/types/berita';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

const STORAGE_KEY_SUBKATEGORI = 'madina_media_subkategori_v1';

function generateSubTopicId(parent: ParentTopicWithSub, nama: string): string {
  const slug = nama
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 6);
  return `sub-${parent.slice(0, 3)}-${slug || 'item'}-${rand}`;
}

function saveToLocal(list: SubTopikMedia[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SUBKATEGORI, JSON.stringify(list));
  } catch {
    // Ignore quota errors
  }
}

function loadFromLocal(): SubTopikMedia[] {
  if (typeof window === 'undefined') return DEFAULT_SUB_TOPIK_MEDIA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBKATEGORI);
    if (raw) {
      const parsed = JSON.parse(raw) as SubTopikMedia[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SUB_TOPIK_MEDIA;
}

interface MediaKategoriState {
  subKategoriList: SubTopikMedia[];
  isLoading: boolean;
  isTableMissing: boolean;
  error: string | null;
  isManagerModalOpen: boolean;

  fetchSubKategori: (includeInactive?: boolean) => Promise<void>;
  createSubKategori: (payload: {
    parent_topic: ParentTopicWithSub;
    nama: string;
    sort_order?: number;
  }) => Promise<SubTopikMedia | null>;
  updateSubKategori: (
    id: string,
    updates: Partial<Pick<SubTopikMedia, 'nama' | 'parent_topic' | 'sort_order' | 'is_active'>>
  ) => Promise<boolean>;
  deleteSubKategori: (id: string) => Promise<boolean>;

  openManagerModal: () => void;
  closeManagerModal: () => void;
}

export const useMediaKategoriStore = create<MediaKategoriState>((set, get) => ({
  subKategoriList: DEFAULT_SUB_TOPIK_MEDIA,
  isLoading: false,
  isTableMissing: false,
  error: null,
  isManagerModalOpen: false,

  fetchSubKategori: async (includeInactive = false) => {
    const cached = loadFromLocal();
    set({ subKategoriList: cached, isLoading: true, error: null });

    try {
      let query = supabase
        .from('media_subkategori' as any)
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        const errCode = (error as { code?: string }).code;
        const errMsg = String(error.message || '');
        const missing =
          errCode === '42P01' ||
          errCode === 'PGRST205' ||
          errMsg.toLowerCase().includes('does not exist') ||
          errMsg.toLowerCase().includes('schema cache');

        set({
          isLoading: false,
          isTableMissing: missing,
          error: missing ? null : errMsg,
        });
        return;
      }

      if (data && data.length > 0) {
        const list = data as unknown as SubTopikMedia[];
        saveToLocal(list);
        set({
          subKategoriList: list,
          isLoading: false,
          isTableMissing: false,
          error: null,
        });
      } else {
        set({
          subKategoriList: DEFAULT_SUB_TOPIK_MEDIA,
          isLoading: false,
          isTableMissing: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  createSubKategori: async ({ parent_topic, nama, sort_order }) => {
    const cleanName = nama.trim();
    if (!cleanName) return null;

    const current = get().subKategoriList;
    const sameParent = current.filter((s) => s.parent_topic === parent_topic);
    const nextOrder =
      typeof sort_order === 'number'
        ? sort_order
        : sameParent.reduce((max, s) => Math.max(max, s.sort_order), 0) + 10;

    const newItem: SubTopikMedia = {
      id: generateSubTopicId(parent_topic, cleanName),
      parent_topic,
      nama: cleanName,
      sort_order: nextOrder,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [...current, newItem];
    set({ subKategoriList: updated });
    saveToLocal(updated);

    try {
      const { error } = await supabase.from('media_subkategori' as any).insert([newItem]);
      if (error) throw error;
      await logActivity(
        'TAMBAH SUB-KATEGORI MEDIA',
        `Menambahkan sub-kategori "${cleanName}" pada ${parent_topic}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkron ke database';
      set({ error: msg });
    }

    return newItem;
  },

  updateSubKategori: async (id, updates) => {
    const now = new Date().toISOString();
    const updated = get().subKategoriList.map((item) =>
      item.id === id
        ? {
            ...item,
            ...updates,
            nama: updates.nama !== undefined ? updates.nama.trim() : item.nama,
            updated_at: now,
          }
        : item
    );
    set({ subKategoriList: updated });
    saveToLocal(updated);

    try {
      const payload: Record<string, unknown> = { ...updates, updated_at: now };
      if (updates.nama !== undefined) payload.nama = updates.nama.trim();
      const { error } = await supabase
        .from('media_subkategori' as any)
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      await logActivity('UBAH SUB-KATEGORI MEDIA', `Memperbarui sub-kategori (${id})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkron ke database';
      set({ error: msg });
    }

    return true;
  },

  deleteSubKategori: async (id) => {
    const target = get().subKategoriList.find((s) => s.id === id);
    const updated = get().subKategoriList.filter((s) => s.id !== id);
    set({ subKategoriList: updated });
    saveToLocal(updated);

    try {
      const { error } = await supabase
        .from('media_subkategori' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
      if (target) {
        await logActivity(
          'HAPUS SUB-KATEGORI MEDIA',
          `Menghapus sub-kategori "${target.nama}"`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkron ke database';
      set({ error: msg });
    }

    return true;
  },

  openManagerModal: () => set({ isManagerModalOpen: true }),
  closeManagerModal: () => set({ isManagerModalOpen: false }),
}));
