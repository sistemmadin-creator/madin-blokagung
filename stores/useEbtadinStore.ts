import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import {
  EbtadinTahunAjaran,
  EbtadinFormasiKelas,
  EbtadinSantri,
  EbtadinAsatidz,
} from '@/types/ebtadin';
interface EbtadinState {
  tahunList: EbtadinTahunAjaran[];
  activeTahun: EbtadinTahunAjaran | null;
  formasiList: EbtadinFormasiKelas[];
  santriList: EbtadinSantri[];
  asatidzList: EbtadinAsatidz[];
  isLoading: boolean;
  isProcessingRpc: boolean;
  error: string | null;
  fetchTahunList: () => Promise<void>;
  setActiveTahun: (tahun: EbtadinTahunAjaran) => void;
  fetchEbtadinMasterData: (tahunId?: string) => Promise<void>;
  daftarKelasEbtadin: (tahunId: string) => Promise<{ success: boolean; message: string }>;
  sinkronkanDariMaster: (tahunId: string) => Promise<{ success: boolean; message: string }>;
  tetapkanDataEbtadin: (tahunId: string, username: string) => Promise<{ success: boolean; message: string }>;
}
export const useEbtadinStore = create<EbtadinState>((set, get) => ({
  tahunList: [],
  activeTahun: null,
  formasiList: [],
  santriList: [],
  asatidzList: [],
  isLoading: false,
  isProcessingRpc: false,
  error: null,
  fetchTahunList: async () => {
    try {
      const { data, error } = await supabase
        .from('ebtadin_tahun_ajaran')
        .select('*')
        .order('tahun_masehi', { ascending: false });
      if (error) throw error;
      const list = (data || []) as EbtadinTahunAjaran[];
      const active = list.find((t) => t.is_active) || list[0] || null;
      set({ tahunList: list, activeTahun: active });
      if (active) {
        await get().fetchEbtadinMasterData(active.id);
      }
    } catch (err: any) {
      set({ error: err.message });
    }
  },
  setActiveTahun: (tahun) => {
    set({ activeTahun: tahun });
    get().fetchEbtadinMasterData(tahun.id);
  },
  fetchEbtadinMasterData: async (tahunId) => {
    const targetId = tahunId || get().activeTahun?.id;
    if (!targetId) return;
    set({ isLoading: true, error: null });
    try {
      const [formasiRes, santriRes, asatidzRes] = await Promise.all([
        supabase
          .from('ebtadin_formasi_kelas')
          .select('*')
          .eq('tahun_ebtadin_id', targetId)
          .order('tingkat', { ascending: true })
          .order('din_kls', { ascending: true })
          .order('din_bag', { ascending: true }),
        supabase
          .from('ebtadin_santri')
          .select('*')
          .eq('tahun_ebtadin_id', targetId)
          .order('tingkat', { ascending: true })
          .order('din_kls', { ascending: true })
          .order('nama', { ascending: true }),
        supabase
          .from('ebtadin_asatidz')
          .select('*')
          .eq('tahun_ebtadin_id', targetId)
          .order('nama_asatidz', { ascending: true }),
      ]);
      if (formasiRes.error) throw formasiRes.error;
      if (santriRes.error) throw santriRes.error;
      if (asatidzRes.error) throw asatidzRes.error;
      set({
        formasiList: (formasiRes.data || []) as EbtadinFormasiKelas[],
        santriList: (santriRes.data || []) as EbtadinSantri[],
        asatidzList: (asatidzRes.data || []) as EbtadinAsatidz[],
      });
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },
  daftarKelasEbtadin: async (tahunId) => {
    set({ isProcessingRpc: true, error: null });
    try {
      const { data, error } = await supabase.rpc('fn_daftar_kelas_ebtadin', {
        p_tahun_ebtadin_id: tahunId,
      });
      if (error) throw error;
      await get().fetchEbtadinMasterData(tahunId);
      return { success: true, message: data?.message || 'Pendaftaran rombel Ebtadin berhasil.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      set({ isProcessingRpc: false });
    }
  },
  sinkronkanDariMaster: async (tahunId) => {
    set({ isProcessingRpc: true, error: null });
    try {
      const { data, error } = await supabase.rpc('fn_sinkronkan_ebtadin_dari_master', {
        p_tahun_ebtadin_id: tahunId,
      });
      if (error) throw error;
      await get().fetchEbtadinMasterData(tahunId);
      return { success: true, message: data?.message || 'Sinkronisasi berhasil diperbarui.' };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      set({ isProcessingRpc: false });
    }
  },
  tetapkanDataEbtadin: async (tahunId, username) => {
    set({ isProcessingRpc: true, error: null });
    try {
      const { data, error } = await supabase.rpc('fn_tetapkan_data_ebtadin', {
        p_tahun_ebtadin_id: tahunId,
        p_dikunci_oleh: username,
      });
      if (error) throw error;
      await get().fetchTahunList();
      return { success: true, message: data?.message || 'Data EBTADIN berhasil ditetapkan (LOCKED).' };
    } catch (err: any) {
      return { success: false, message: err.message };
    } finally {
      set({ isProcessingRpc: false });
    }
  },
}));
