import { create } from 'zustand';
import { WartaBerita, TopikBerita, StatusBerita, DisplayTypeBerita, SEED_BERITA, getPostTopics } from '@/types/berita';
import { supabase } from '@/lib/supabase/client';

const STORAGE_KEY = 'madina_warta_berita_cache';

interface BeritaState {
  posts: WartaBerita[];
  isLoading: boolean;
  error: string | null;

  // Filter & Search
  filterTopic: TopikBerita | 'all';
  filterStatus: StatusBerita | 'all';
  searchKeyword: string;

  // Form Modal State
  isFormModalOpen: boolean;
  editingPost: WartaBerita | null;
  selectedPostForDetail: WartaBerita | null;

  // Actions
  fetchPosts: () => Promise<void>;
  createPost: (post: Omit<WartaBerita, 'id' | 'views_count' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  updatePost: (id: string, post: Partial<WartaBerita>) => Promise<boolean>;
  deletePost: (id: string) => Promise<boolean>;
  toggleStatus: (id: string) => Promise<boolean>;
  setDisplayType: (id: string, display_type: DisplayTypeBerita) => Promise<boolean>;

  setFilterTopic: (topic: TopikBerita | 'all') => void;
  setFilterStatus: (status: StatusBerita | 'all') => void;
  setSearchKeyword: (keyword: string) => void;

  openFormModal: (post?: WartaBerita | null) => void;
  closeFormModal: () => void;
  openDetailModal: (post: WartaBerita | null) => void;
  closeDetailModal: () => void;
}

function normalizePostRecord(item: WartaBerita): WartaBerita {
  const normalizedTopics = getPostTopics(item);
  const primaryTopic = normalizedTopics[0] || item.topic || 'umum';
  let cover = item.cover_image_url;
  if (cover?.includes('photo-1584697964190-705b89369947')) {
    cover = 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80';
  } else if (cover?.includes('photo-1532012164546-f432f2e3edd4')) {
    cover = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=800&q=80';
  }
  return {
    ...item,
    topic: primaryTopic,
    topics: normalizedTopics,
    cover_image_url: cover,
  };
}

// Helper sinkronisasi local storage
function saveToLocal(posts: WartaBerita[]) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch {
      // Ignore quota errors
    }
  }
}

function loadFromLocal(): WartaBerita[] {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as WartaBerita[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const repaired = parsed.map((item) => {
            const seedMatch = SEED_BERITA.find((s) => s.id === item.id);
            const mergedItem: WartaBerita =
              seedMatch && (!Array.isArray(item.topics) || item.topics.length === 0)
                ? { ...item, topics: seedMatch.topics || [item.topic] }
                : item;
            return normalizePostRecord(mergedItem);
          });
          // Tambahkan seed baru jika data lokal lama masih kurang dari daftar seed terbaru
          const existingIds = new Set(repaired.map((p) => p.id));
          const missingSeeds = SEED_BERITA.filter((p) => !existingIds.has(p.id));
          if (missingSeeds.length > 0) {
            return [...repaired, ...missingSeeds.map(normalizePostRecord)];
          }
          return repaired;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }
  return SEED_BERITA.map(normalizePostRecord);
}

export const useBeritaStore = create<BeritaState>((set, get) => ({
  // Mulai secara deterministik dengan SEED_BERITA agar SSR dan hidrasi awal klien identik;
  // cache localStorage dimuat di fetchPosts() pasca-mount.
  posts: SEED_BERITA,
  isLoading: false,
  error: null,

  filterTopic: 'all',
  filterStatus: 'all',
  searchKeyword: '',

  isFormModalOpen: false,
  editingPost: null,
  selectedPostForDetail: null,

  fetchPosts: async () => {
    const cachedLocal = loadFromLocal();
    set({ posts: cachedLocal, isLoading: true, error: null });

    // Coba ambil dari Supabase
    try {
      const { data, error } = await supabase
        .from('warta_berita')
        .select('*')
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const normalized = (data as WartaBerita[]).map(normalizePostRecord);
        set({ posts: normalized, isLoading: false });
        saveToLocal(normalized);
        return;
      }
    } catch {
      // Jika Supabase belum dimigrasi atau offline, beralih ke local storage
    }

    // Fallback: LocalStorage atau SEED_BERITA
    const localData = loadFromLocal();
    set({ posts: localData, isLoading: false });
    saveToLocal(localData);
  },

  createPost: async (postData) => {
    set({ isLoading: true });
    // Gunakan UUID standar agar valid saat disimpan ke kolom UUID di Supabase PostgreSQL
    let newId: string;
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        newId = crypto.randomUUID();
      } else {
        newId = `warta-${Date.now()}`;
      }
    } catch {
      newId = `warta-${Date.now()}`;
    }

    const normalizedTopics = getPostTopics(postData);
    const primaryTopic = normalizedTopics[0] || postData.topic || 'umum';

    const newPost: WartaBerita = {
      ...postData,
      topic: primaryTopic,
      topics: normalizedTopics,
      id: newId,
      views_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update state & local storage
    const updated = [newPost, ...get().posts];
    set({ posts: updated, isLoading: false, isFormModalOpen: false, editingPost: null });
    saveToLocal(updated);

    // Coba simpan ke Supabase jika terhubung
    try {
      const { error } = await supabase.from('warta_berita').insert([newPost]);
      if (error) {
        // Fallback jika kolom topics belum dimigrasi di database remote
        const { topics: _ignoredTopics, ...legacyPayload } = newPost;
        await supabase.from('warta_berita').insert([legacyPayload]);
      }
    } catch {
      // Disimpan di local storage
    }

    return true;
  },

  updatePost: async (id, updates) => {
    set({ isLoading: true });
    const current = get().posts;
    const normalizedUpdates: Partial<WartaBerita> = { ...updates };
    if (updates.topics && updates.topics.length > 0) {
      normalizedUpdates.topic = updates.topics[0];
    } else if (updates.topic && !updates.topics) {
      normalizedUpdates.topics = [updates.topic];
    }

    const updated = current.map((p) => {
      if (p.id === id) {
        return normalizePostRecord({
          ...p,
          ...normalizedUpdates,
          updated_at: new Date().toISOString(),
        });
      }
      return p;
    });

    set({ posts: updated, isLoading: false, isFormModalOpen: false, editingPost: null });
    saveToLocal(updated);

    try {
      const { error } = await supabase.from('warta_berita').update(normalizedUpdates).eq('id', id);
      if (error && 'topics' in normalizedUpdates) {
        const { topics: _ignoredTopics, ...legacyUpdates } = normalizedUpdates;
        await supabase.from('warta_berita').update(legacyUpdates).eq('id', id);
      }
    } catch {
      // Local fallback
    }

    return true;
  },

  deletePost: async (id) => {
    const current = get().posts;
    const updated = current.filter((p) => p.id !== id);
    set({ posts: updated });
    saveToLocal(updated);

    try {
      await supabase.from('warta_berita').delete().eq('id', id);
    } catch {
      // Local fallback
    }

    return true;
  },

  toggleStatus: async (id) => {
    const post = get().posts.find((p) => p.id === id);
    if (!post) return false;

    const newStatus: StatusBerita = post.status === 'published' ? 'draft' : 'published';
    return get().updatePost(id, { status: newStatus });
  },

  setDisplayType: async (id, display_type) => {
    return get().updatePost(id, { display_type });
  },

  setFilterTopic: (filterTopic) => set({ filterTopic }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setSearchKeyword: (searchKeyword) => set({ searchKeyword }),

  openFormModal: (post = null) => set({ isFormModalOpen: true, editingPost: post }),
  closeFormModal: () => set({ isFormModalOpen: false, editingPost: null }),

  openDetailModal: (post) => set({ selectedPostForDetail: post }),
  closeDetailModal: () => set({ selectedPostForDetail: null }),
}));
