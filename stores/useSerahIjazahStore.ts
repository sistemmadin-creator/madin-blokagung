import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { EbtadinSerahIjazah } from '@/types/ebtadin';
interface SerahIjazahState {
  records: EbtadinSerahIjazah[];
  isLoading: boolean;
  filterTingkat: string;
  filterKelas: string;
  filterStatus: 'SEMUA' | 'SUDAH' | 'BELUM';
  searchKeyword: string;
  fetchRecords: (tahunId: string) => Promise<void>;
  toggleMenerima: (id: string, currentStatus: boolean, username?: string) => Promise<void>;
  batchSetKelasMenerima: (formasiId: string, isMenerima: boolean, username?: string) => Promise<void>;
  setFilterTingkat: (t: string) => void;
  setFilterKelas: (k: string) => void;
  setFilterStatus: (s: 'SEMUA' | 'SUDAH' | 'BELUM') => void;
  setSearchKeyword: (kw: string) => void;
}
export const useSerahIjazahStore = create<SerahIjazahState>((set, get) => ({
  records: [],
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
        .from('ebtadin_serah_ijazah')
        .select('*')
        .eq('tahun_ebtadin_id', tahunId)
        .order('tingkat', { ascending: true })
        .order('din_kls', { ascending: true })
        .order('nama_santri', { ascending: true });
      if (error) throw error;
      set({ records: (data || []) as EbtadinSerahIjazah[] });
    } catch (err) {
      console.error(err);
    } finally {
      set({ isLoading: false });
    }
  },
  toggleMenerima: async (id, currentStatus, username = 'Petugas') => {
    const newStatus = !currentStatus;
    const now = newStatus ? new Date().toISOString() : null;
    set((state) => ({
      records: state.records.map((r) =>
        r.id === id ? { ...r, is_menerima: newStatus, tanggal_serah: now } : r
      ),
    }));
    try {
      await supabase
        .from('ebtadin_serah_ijazah')
        .update({
          is_menerima: newStatus,
          tanggal_serah: now,
          diserahkan_oleh: newStatus ? username : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
    } catch (err) {
      console.error(err);
    }
  },
  batchSetKelasMenerima: async (formasiId, isMenerima, username = 'Petugas') => {
    const now = isMenerima ? new Date().toISOString() : null;
    try {
      await supabase
        .from('ebtadin_serah_ijazah')
        .update({
          is_menerima: isMenerima,
          tanggal_serah: now,
          diserahkan_oleh: isMenerima ? username : null,
          updated_at: new Date().toISOString(),
        })
        .eq('ebtadin_formasi_id', formasiId);
      set((state) => ({
        records: state.records.map((r) =>
          r.ebtadin_formasi_id === formasiId
            ? { ...r, is_menerima: isMenerima, tanggal_serah: now }
            : r
        ),
      }));
    } catch (err) {
      console.error(err);
    }
  },
  setFilterTingkat: (t) => set({ filterTingkat: t }),
  setFilterKelas: (k) => set({ filterKelas: k }),
  setFilterStatus: (s) => set({ filterStatus: s }),
  setSearchKeyword: (kw) => set({ searchKeyword: kw }),
}));
