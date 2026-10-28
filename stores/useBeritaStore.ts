import { create } from 'zustand';
import { WartaBerita, TopikBerita, StatusBerita, DisplayTypeBerita, SEED_BERITA } from '@/types/berita';
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
        return JSON.parse(data);
      }
    } catch {
      // Ignore parse errors
    }
  }
  return SEED_BERITA;
}

export const useBeritaStore = create<BeritaState>((set, get) => ({
  posts: [],
  isLoading: false,
  error: null,

  filterTopic: 'all',
  filterStatus: 'all',
  searchKeyword: '',

  isFormModalOpen: false,
  editingPost: null,
  selectedPostForDetail: null,

  fetchPosts: async () => {
    set({ isLoading: true, error: null });

    // Coba ambil dari Supabase
    try {
      const { data, error } = await supabase
        .from('warta_berita')
        .select('*')
        .order('published_at', { ascending: false });

      if (!error && data && data.length > 0) {
        set({ posts: data as WartaBerita[], isLoading: false });
        saveToLocal(data as WartaBerita[]);
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
    const newId = `warta-${Date.now()}`;
    const newPost: WartaBerita = {
      ...postData,
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
      await supabase.from('warta_berita').insert([newPost]);
    } catch {
      // Disimpan di local storage
    }

    return true;
  },

  updatePost: async (id, updates) => {
    set({ isLoading: true });
    const current = get().posts;
    const updated = current.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          updated_at: new Date().toISOString(),
        };
      }
      return p;
    });

    set({ posts: updated, isLoading: false, isFormModalOpen: false, editingPost: null });
    saveToLocal(updated);

    try {
      await supabase.from('warta_berita').update(updates).eq('id', id);
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
