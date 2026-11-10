import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { EbtadinPesertaUjian, EbtadinAlasanOption } from '@/types/ebtadin';

interface EbtadinUjianState {
  records: EbtadinPesertaUjian[];
  alasanOptions: EbtadinAlasanOption[];
  isLoading: boolean;
  filterTingkat: string;
  filterKelas: string;
  filterStatus: 'SEMUA' | 'IKUT' | 'TIDAK_IKUT';
  searchKeyword: string;

  fetchRecords: (tahunId: string) => Promise<void>;
  fetchAlasanOptions: () => Promise<void>;
  toggleIkutUjian: (
    id: string,
    currentStatus: boolean,
    alasanKode?: string | null,
    alasanTeks?: string | null,
    username?: string
  ) => Promise<void>;
  updateDetailUjian: (
    id: string,
    updates: {
      is_ikut_ujian: boolean;
      alasan_kode?: string | null;
      alasan_teks?: string | null;
      catatan?: string | null;
      dicatat_oleh?: string | null;
    }
  ) => Promise<void>;
  batchSetKelasIkut: (
    formasiId: string,
    isIkut: boolean,
    username?: string
  ) => Promise<void>;
  addAlasanOption: (label: string) => Promise<{ success: boolean; message?: string }>;
  toggleAlasanOptionStatus: (id: string, isActive: boolean) => Promise<void>;
  deleteAlasanOption: (id: string) => Promise<void>;

  setFilterTingkat: (t: string) => void;
  setFilterKelas: (k: string) => void;
  setFilterStatus: (s: 'SEMUA' | 'IKUT' | 'TIDAK_IKUT') => void;
  setSearchKeyword: (kw: string) => void;
}

export const useEbtadinUjianStore = create<EbtadinUjianState>((set, get) => ({
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
        .from('ebtadin_peserta_ujian')
        .select('*')
        .eq('tahun_ebtadin_id', tahunId)
        .order('tingkat', { ascending: true })
        .order('din_kls', { ascending: true })
        .order('nama_santri', { ascending: true });

      if (error) throw error;
      set({ records: (data || []) as EbtadinPesertaUjian[] });
    } catch (err) {
      console.error('Error fetching peserta ujian:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchAlasanOptions: async () => {
    try {
      const { data, error } = await supabase
        .from('ebtadin_alasan_options')
        .select('*')
        .eq('kategori', 'UJIAN')
        .order('urutan', { ascending: true });

      if (error) throw error;
      set({ alasanOptions: (data || []) as EbtadinAlasanOption[] });
    } catch (err) {
      console.error('Error fetching alasan ujian options:', err);
    }
  },

  toggleIkutUjian: async (id, currentStatus, alasanKode = null, alasanTeks = null, username = 'Petugas') => {
    const newStatus = !currentStatus;
    const now = new Date().toISOString();

    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              is_ikut_ujian: newStatus,
              alasan_kode: newStatus ? null : alasanKode,
              alasan_teks: newStatus ? null : alasanTeks,
              dicatat_oleh: username,
              tanggal_verifikasi: now,
            }
          : r
      ),
    }));

    try {
      await supabase
        .from('ebtadin_peserta_ujian')
        .update({
          is_ikut_ujian: newStatus,
          alasan_kode: newStatus ? null : alasanKode,
          alasan_teks: newStatus ? null : alasanTeks,
          dicatat_oleh: username,
          tanggal_verifikasi: now,
          updated_at: now,
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating status ikut ujian:', err);
    }
  },

  updateDetailUjian: async (id, updates) => {
    const now = new Date().toISOString();
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id
          ? {
              ...r,
              ...updates,
              tanggal_verifikasi: now,
            }
          : r
      ),
    }));

    try {
      await supabase
        .from('ebtadin_peserta_ujian')
        .update({
          ...updates,
          tanggal_verifikasi: now,
          updated_at: now,
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error updating detail ujian:', err);
    }
  },

  batchSetKelasIkut: async (formasiId, isIkut, username = 'Petugas') => {
    const now = new Date().toISOString();
    set((state) => ({
      records: state.records.map((r) =>
        r.ebtadin_formasi_id === formasiId
          ? {
              ...r,
              is_ikut_ujian: isIkut,
              alasan_kode: isIkut ? null : r.alasan_kode,
              alasan_teks: isIkut ? null : r.alasan_teks,
              dicatat_oleh: username,
              tanggal_verifikasi: now,
            }
          : r
      ),
    }));

    try {
      await supabase
        .from('ebtadin_peserta_ujian')
        .update({
          is_ikut_ujian: isIkut,
          alasan_kode: isIkut ? null : undefined,
          alasan_teks: isIkut ? null : undefined,
          dicatat_oleh: username,
          tanggal_verifikasi: now,
          updated_at: now,
        })
        .eq('ebtadin_formasi_id', formasiId);
    } catch (err) {
      console.error('Error batch set kelas ikut ujian:', err);
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
          kategori: 'UJIAN',
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
      console.error('Error adding alasan option:', err);
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
      console.error('Error toggling alasan option status:', err);
    }
  },

  deleteAlasanOption: async (id: string) => {
    set((state) => ({
      alasanOptions: state.alasanOptions.filter((o) => o.id !== id),
    }));
    try {
      await supabase.from('ebtadin_alasan_options').delete().eq('id', id);
    } catch (err) {
      console.error('Error deleting alasan option:', err);
    }
  },

  setFilterTingkat: (t) => set({ filterTingkat: t }),
  setFilterKelas: (k) => set({ filterKelas: k }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setSearchKeyword: (kw) => set({ searchKeyword: kw }),
}));
