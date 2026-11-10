import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { EbtadinKelulusan, EbtadinAlasanOption } from '@/types/ebtadin';

interface EbtadinKelulusanState {
  records: EbtadinKelulusan[];
  alasanOptions: EbtadinAlasanOption[];
  isLoading: boolean;
  filterTingkat: string;
  filterKelas: string;
  filterStatus: 'SEMUA' | 'LULUS' | 'TIDAK_LULUS';
  searchKeyword: string;

  fetchRecords: (tahunId: string) => Promise<void>;
  fetchAlasanOptions: () => Promise<void>;
  toggleLulus: (
    id: string,
    currentStatus: boolean,
    alasanKode?: string | null,
    alasanTeks?: string | null,
    username?: string
  ) => Promise<void>;
  updateDetailKelulusan: (
    id: string,
    updates: {
      is_lulus: boolean;
      alasan_kode?: string | null;
      alasan_teks?: string | null;
      predikat?: string | null;
      catatan?: string | null;
      ditetapkan_oleh?: string | null;
    }
  ) => Promise<void>;
  batchSetKelasLulus: (
    formasiId: string,
    isLulus: boolean,
    username?: string
  ) => Promise<void>;
  addAlasanOption: (label: string) => Promise<{ success: boolean; message?: string }>;
  toggleAlasanOptionStatus: (id: string, isActive: boolean) => Promise<void>;
  deleteAlasanOption: (id: string) => Promise<void>;

  setFilterTingkat: (t: string) => void;
  setFilterKelas: (k: string) => void;
  setFilterStatus: (s: 'SEMUA' | 'LULUS' | 'TIDAK_LULUS') => void;
  setSearchKeyword: (kw: string) => void;
}

export const useEbtadinKelulusanStore = create<EbtadinKelulusanState>((set, get) => ({
  records: [],
  alasanOptions: [],
  isLoading: false,
  filterTingkat: '',
  filterKelas: '',
  filterStatus: 'SEMUA',
  searchKeyword: '',

  fetchRecords: async (tahunId: string) => {
    if (!tahunId) return;
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('ebtadin_kelulusan')
        .select('*')
        .eq('tahun_ebtadin_id', tahunId)
        .order('tingkat', { ascending: true })
        .order('din_kls', { ascending: true })
        .order('nama_santri', { ascending: true });

      if (error) throw error;
      set({ records: (data || []) as EbtadinKelulusan[] });
    } catch (err) {
      console.error('Error fetching kelulusan santri:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlasanOptions: async () => {
    try {
      const { data, error } = await supabase
        .from('ebtadin_alasan_options')
        .select('*')
        .eq('kategori', 'LULUS')
        .order('urutan', { ascending: true });

      if (error) throw error;
      set({ alasanOptions: (data || []) as EbtadinAlasanOption[] });
    } catch (err) {
      console.error('Error fetching alasan lulus options:', err);
    }
  },

  toggleLulus: async (id, currentStatus, alasanKode = null, alasanTeks = null, username = 'Petugas Yudisium') => {
    const newStatus = !currentStatus;
    const now = new Date().toISOString();

    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              is_lulus: newStatus,
              alasan_kode: newStatus ? null : alasanKode,
              alasan_teks: newStatus ? null : alasanTeks,
              ditetapkan_oleh: username,
              tanggal_penetapan: now,
            }
          : r
      ),
    }));

    try {
      await supabase
        .from('ebtadin_kelulusan')
        .update({
          is_lulus: newStatus,
          alasan_kode: newStatus ? null : alasanKode,
          alasan_teks: newStatus ? null : alasanTeks,
          ditetapkan_oleh: username,
          tanggal_penetapan: now,
          updated_at: now,
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating status kelulusan:', err);
    }
  },

  updateDetailKelulusan: async (id, updates) => {
    const now = new Date().toISOString();
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              ...updates,
              tanggal_penetapan: now,
            }
          : r
      ),
    }));

    try {
      await supabase
        .from('ebtadin_kelulusan')
        .update({
          ...updates,
          tanggal_penetapan: now,
          updated_at: now,
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating detail kelulusan:', err);
    }
  },

  batchSetKelasLulus: async (formasiId, isLulus, username = 'Petugas Yudisium') => {
    const now = new Date().toISOString();
    set((state) => ({
      records: state.records.map((r) =>
        r.ebtadin_formasi_id === formasiId
          ? {
              ...r,
              is_lulus: isLulus,
              alasan_kode: isLulus ? null : r.alasan_kode,
              alasan_teks: isLulus ? null : r.alasan_teks,
              ditetapkan_oleh: username,
              tanggal_penetapan: now,
            }
          : r
      ),
    }));

    try {
      await supabase
        .from('ebtadin_kelulusan')
        .update({
          is_lulus: isLulus,
          alasan_kode: isLulus ? null : undefined,
          alasan_teks: isLulus ? null : undefined,
          ditetapkan_oleh: username,
          tanggal_penetapan: now,
          updated_at: now,
        })
        .eq('ebtadin_formasi_id', formasiId);
    } catch (err) {
      console.error('Error batch set kelas kelulusan:', err);
    }
  },

  addAlasanOption: async (label: string) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return { success: false, message: 'Label alasan tidak boleh kosong' };

    const kode = cleanLabel.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
    const options = get().alasanOptions;
    const maxUrutan = options.length > 0 ? Math.max(...options.map((o) => o.urutan)) : 0;

    try {
      const { data, error } = await supabase
        .from('ebtadin_alasan_options')
        .insert({
          kategori: 'LULUS',
          kode,
          label: cleanLabel,
          urutan: maxUrutan + 1,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ alasanOptions: [...state.alasanOptions, data as EbtadinAlasanOption] }));
      return { success: true };
    } catch (err: any) {
      console.error('Error adding alasan kelulusan option:', err);
      return { success: false, message: err.message };
    }
  },

  toggleAlasanOptionStatus: async (id: string, isActive: boolean) => {
    set((state) => ({
      alasanOptions: state.alasanOptions.map((o) => (o.id === id ? { ...o, is_active: isActive } : o)),
    }));
    try {
      await supabase
        .from('ebtadin_alasan_options')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('Error toggling alasan kelulusan option status:', err);
    }
  },

  deleteAlasanOption: async (id: string) => {
    set((state) => ({
      alasanOptions: state.alasanOptions.filter((o) => o.id !== id),
    }));
    try {
      await supabase.from('ebtadin_alasan_options').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting alasan kelulusan option:', err);
    }
  },

  setFilterTingkat: (t) => set({ filterTingkat: t }),
  setFilterKelas: (k) => set({ filterKelas: k }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setSearchKeyword: (kw) => set({ searchKeyword: kw }),
}));
