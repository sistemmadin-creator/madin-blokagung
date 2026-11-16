import { create } from 'zustand';
import {
  GaleriSosmedItem,
  PlatformSosmed,
  CreatorChannelConfig,
  DEFAULT_CREATOR_CHANNEL_CONFIG,
  SEED_GALERI_SOSMED,
  getSosmedTopics,
} from '@/types/galeri-sosmed';
import { TopikBerita, StatusBerita } from '@/types/berita';
import { supabase } from '@/lib/supabase/client';

const STORAGE_KEY_ITEMS = 'madina_galeri_sosmed_cache_v1';
const STORAGE_KEY_CHANNELS = 'madina_creator_channels_cache_v1';

interface GaleriSosmedState {
  items: GaleriSosmedItem[];
  channelConfig: CreatorChannelConfig;
  isLoading: boolean;
  error: string | null;

  // Filter & Pencarian
  filterPlatform: PlatformSosmed | 'all';
  filterTopic: TopikBerita | 'all';
  filterStatus: StatusBerita | 'all';
  searchKeyword: string;

  // State Modal Form & Lightbox Player
  isFormModalOpen: boolean;
  editingItem: GaleriSosmedItem | null;
  activeLightboxItem: GaleriSosmedItem | null;
  isChannelModalOpen: boolean;

  // Actions
  fetchItems: () => Promise<void>;
  createItem: (
    payload: Omit<GaleriSosmedItem, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<boolean>;
  updateItem: (id: string, updates: Partial<GaleriSosmedItem>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  toggleStatus: (id: string) => Promise<boolean>;
  togglePinned: (id: string) => Promise<boolean>;
  saveChannelConfig: (config: CreatorChannelConfig) => Promise<boolean>;

  setFilterPlatform: (platform: PlatformSosmed | 'all') => void;
  setFilterTopic: (topic: TopikBerita | 'all') => void;
  setFilterStatus: (status: StatusBerita | 'all') => void;
  setSearchKeyword: (keyword: string) => void;

  openFormModal: (item?: GaleriSosmedItem | null) => void;
  closeFormModal: () => void;
  openLightbox: (item: GaleriSosmedItem | null) => void;
  closeLightbox: () => void;
  openChannelModal: () => void;
  closeChannelModal: () => void;
}

function normalizeSosmedItem(item: GaleriSosmedItem): GaleriSosmedItem {
  return {
    ...item,
    topics: getSosmedTopics(item),
    is_pinned: Boolean(item.is_pinned),
    status: item.status || 'published',
  };
}

function saveItemsToLocal(items: GaleriSosmedItem[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }
}

function loadItemsFromLocal(): GaleriSosmedItem[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (raw) {
        const parsed = JSON.parse(raw) as GaleriSosmedItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(normalizeSosmedItem);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return SEED_GALERI_SOSMED.map(normalizeSosmedItem);
}

function saveChannelToLocal(config: CreatorChannelConfig) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_CHANNELS, JSON.stringify(config));
    } catch {}
  }
}

function loadChannelFromLocal(): CreatorChannelConfig {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CHANNELS);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CreatorChannelConfig>;
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_CREATOR_CHANNEL_CONFIG,
            ...parsed,
          };
        }
      }
    } catch {}
  }
  return DEFAULT_CREATOR_CHANNEL_CONFIG;
}

export const useGaleriSosmedStore = create<GaleriSosmedState>((set, get) => ({
  items: SEED_GALERI_SOSMED,
  channelConfig: DEFAULT_CREATOR_CHANNEL_CONFIG,
  isLoading: false,
  error: null,

  filterPlatform: 'all',
  filterTopic: 'all',
  filterStatus: 'all',
  searchKeyword: '',

  isFormModalOpen: false,
  editingItem: null,
  activeLightboxItem: null,
  isChannelModalOpen: false,

  fetchItems: async () => {
    const cachedItems = loadItemsFromLocal();
    const cachedChannels = loadChannelFromLocal();
    set({
      items: cachedItems,
      channelConfig: cachedChannels,
      isLoading: true,
      error: null,
    });

    try {
      const [{ data: sosmedData, error: sosmedErr }, { data: settingData }] = await Promise.all([
        supabase
          .from('galeri_sosmed')
          .select('*')
          .order('is_pinned', { ascending: false })
          .order('published_at', { ascending: false }),
        supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'MEDIA_MADIN_CHANNEL_CONFIG')
          .maybeSingle(),
      ]);

      if (settingData?.value && typeof settingData.value === 'object') {
        const mergedChannel: CreatorChannelConfig = {
          ...DEFAULT_CREATOR_CHANNEL_CONFIG,
          ...(settingData.value as Partial<CreatorChannelConfig>),
        };
        set({ channelConfig: mergedChannel });
        saveChannelToLocal(mergedChannel);
      }

      if (!sosmedErr && sosmedData && sosmedData.length > 0) {
        const normalized = (sosmedData as GaleriSosmedItem[]).map(normalizeSosmedItem);
        set({ items: normalized, isLoading: false });
        saveItemsToLocal(normalized);
        return;
      }
    } catch {
      // Fallback ke penyimpanan lokal
    }

    const localData = loadItemsFromLocal();
    set({ items: localData, isLoading: false });
    saveItemsToLocal(localData);
  },

  createItem: async (payload) => {
    set({ isLoading: true });
    let newId: string;
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        newId = crypto.randomUUID();
      } else {
        newId = `sosmed-${Date.now()}`;
      }
    } catch {
      newId = `sosmed-${Date.now()}`;
    }

    const now = new Date().toISOString();
    const newItem: GaleriSosmedItem = normalizeSosmedItem({
      ...payload,
      id: newId,
      created_at: now,
      updated_at: now,
    });

    // Jika item baru disetel sebagai is_pinned, matikan pin pada item lain agar showreel utama tunggal & jelas
    const current = get().items.map((it) =>
      newItem.is_pinned ? { ...it, is_pinned: false } : it
    );
    const updated = [newItem, ...current];

    set({
      items: updated,
      isLoading: false,
      isFormModalOpen: false,
      editingItem: null,
    });
    saveItemsToLocal(updated);

    try {
      if (newItem.is_pinned) {
        await supabase
          .from('galeri_sosmed')
          .update({ is_pinned: false })
          .eq('is_pinned', true);
      }
      await supabase.from('galeri_sosmed').insert([newItem]);
    } catch {
      // Fallback lokal
    }

    return true;
  },

  updateItem: async (id, updates) => {
    set({ isLoading: true });
    const current = get().items;
    const updated = current.map((it) => {
      if (it.id === id) {
        return normalizeSosmedItem({
          ...it,
          ...updates,
          updated_at: new Date().toISOString(),
        });
      }
      if (updates.is_pinned === true) {
        return { ...it, is_pinned: false };
      }
      return it;
    });

    set({
      items: updated,
      isLoading: false,
      isFormModalOpen: false,
      editingItem: null,
    });
    saveItemsToLocal(updated);

    try {
      if (updates.is_pinned === true) {
        await supabase
          .from('galeri_sosmed')
          .update({ is_pinned: false })
          .neq('id', id);
      }
      await supabase.from('galeri_sosmed').update(updates).eq('id', id);
    } catch {
      // Fallback lokal
    }

    return true;
  },

  deleteItem: async (id) => {
    const updated = get().items.filter((it) => it.id !== id);
    set({ items: updated });
    saveItemsToLocal(updated);

    try {
      await supabase.from('galeri_sosmed').delete().eq('id', id);
    } catch {
      // Fallback lokal
    }

    return true;
  },

  toggleStatus: async (id) => {
    const target = get().items.find((it) => it.id === id);
    if (!target) return false;
    const nextStatus: StatusBerita = target.status === 'published' ? 'draft' : 'published';
    return get().updateItem(id, { status: nextStatus });
  },

  togglePinned: async (id) => {
    const target = get().items.find((it) => it.id === id);
    if (!target) return false;
    return get().updateItem(id, { is_pinned: !target.is_pinned });
  },

  saveChannelConfig: async (config) => {
    set({ channelConfig: config, isChannelModalOpen: false });
    saveChannelToLocal(config);
    try {
      await supabase.from('app_settings').upsert([
        {
          key: 'MEDIA_MADIN_CHANNEL_CONFIG',
          value: config,
        },
      ]);
    } catch {}
    return true;
  },

  setFilterPlatform: (filterPlatform) => set({ filterPlatform }),
  setFilterTopic: (filterTopic) => set({ filterTopic }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setSearchKeyword: (searchKeyword) => set({ searchKeyword }),

  openFormModal: (item = null) => set({ isFormModalOpen: true, editingItem: item }),
  closeFormModal: () => set({ isFormModalOpen: false, editingItem: null }),

  openLightbox: (item) => set({ activeLightboxItem: item }),
  closeLightbox: () => set({ activeLightboxItem: null }),

  openChannelModal: () => set({ isChannelModalOpen: true }),
  closeChannelModal: () => set({ isChannelModalOpen: false }),
}));
