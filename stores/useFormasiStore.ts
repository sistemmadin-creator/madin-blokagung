import { create } from 'zustand';
import { FormasiKelas, FormasiWithStats } from '@/types/formasi';
import { Santri } from '@/types/santri';
import { Asatidz } from '@/types/asatidz';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

interface FormasiState {
  formasiList: FormasiKelas[];
  isLoading: boolean;
  selectedFormasi: FormasiWithStats | null;
  editFormasiData: FormasiKelas | null;
  
  isInputModalOpen: boolean;
  isDetailModalOpen: boolean;
  isGeneratorModalOpen: boolean;

  fetchFormasi: () => Promise<void>;
  openInputModal: (formasiToEdit?: FormasiKelas | null) => void;
  closeInputModal: () => void;
  openDetailModal: (formasi: FormasiWithStats) => void;
  closeDetailModal: () => void;
  openGeneratorModal: () => void;
  closeGeneratorModal: () => void;

  saveFormasi: (data: Partial<FormasiKelas>, isEdit: boolean, id?: string) => Promise<boolean>;
  deleteFormasi: (id: string) => Promise<boolean>;
  generateFormasiBatch: (
    tingkat: string,
    din_kls: string,
    jumlahBagian: number,
    pa_pi: 'PA' | 'PI',
    kapasitas: number,
    is_unggulan?: boolean
  ) => Promise<boolean>;
}

export const useFormasiStore = create<FormasiState>((set, get) => ({
  formasiList: [],
  isLoading: false,
  selectedFormasi: null,
  editFormasiData: null,

  isInputModalOpen: false,
  isDetailModalOpen: false,
  isGeneratorModalOpen: false,

  fetchFormasi: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('formasi_kelas')
        .select('*')
        .order('tingkat', { ascending: true })
        .order('din_kls', { ascending: true })
        .order('din_bag', { ascending: true });

      if (error) throw error;
      set({ formasiList: data || [] });
    } catch (err: any) {
      console.error('Fetch formasi error:', err.message);
    } finally {
      set({ isLoading: false });
    }
  },

  openInputModal: (formasiToEdit = null) =>
    set({ isInputModalOpen: true, editFormasiData: formasiToEdit }),
  closeInputModal: () => set({ isInputModalOpen: false, editFormasiData: null }),

  openDetailModal: (formasi) =>
    set({ isDetailModalOpen: true, selectedFormasi: formasi }),
  closeDetailModal: () => set({ isDetailModalOpen: false, selectedFormasi: null }),

  openGeneratorModal: () => set({ isGeneratorModalOpen: true }),
  closeGeneratorModal: () => set({ isGeneratorModalOpen: false }),

  saveFormasi: async (data, isEdit, id) => {
    try {
      if (isEdit && id) {
        const { error } = await supabase
          .from('formasi_kelas')
          .update(data)
          .eq('id', id);
        if (error) throw error;
        await logActivity('EDIT FORMASI KELAS', `Mengubah formasi kelas: ${data.tingkat} ${data.din_kls}${data.din_bag} (${data.pa_pi})`);
      } else {
        const { error } = await supabase
          .from('formasi_kelas')
          .insert([data]);
        if (error) throw error;
        await logActivity('TAMBAH FORMASI KELAS', `Membuat formasi kelas baru: ${data.tingkat} ${data.din_kls}${data.din_bag} (${data.pa_pi})`);
      }
      await get().fetchFormasi();
      return true;
    } catch (err: any) {
      console.error('Save formasi error:', err.message);
      alert('Gagal menyimpan formasi kelas: ' + err.message);
      return false;
    }
  },

  deleteFormasi: async (id) => {
    if (!confirm('Yakin ingin menghapus formasi kelas ini?')) return false;
    try {
      const { error } = await supabase
        .from('formasi_kelas')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await logActivity('HAPUS FORMASI KELAS', `Menghapus formasi kelas ID: ${id}`);
      await get().fetchFormasi();
      return true;
    } catch (err: any) {
      console.error('Delete formasi error:', err.message);
      alert('Gagal menghapus formasi kelas: ' + err.message);
      return false;
    }
  },

  generateFormasiBatch: async (tingkat, din_kls, jumlahBagian, pa_pi, kapasitas, is_unggulan = false) => {
    try {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const payloads: Partial<FormasiKelas>[] = [];

      for (let i = 0; i < jumlahBagian; i++) {
        const bag = letters[i] || String(i + 1);
        payloads.push({
          tingkat,
          din_kls,
          din_bag: bag,
          pa_pi,
          kapasitas_maksimal: kapasitas || 45,
          is_unggulan: is_unggulan && i === 0, // Bagian A bisa unggulan
          id_mustahiq: '',
          domisili: '',
          lokasi_diniyyah: '',
          lokasi_takror: '',
        });
      }

      const { error } = await supabase.from('formasi_kelas').insert(payloads);
      if (error) throw error;

      await logActivity('GENERATOR FORMASI KELAS', `Membuat batch ${jumlahBagian} kelas untuk ${tingkat} ${din_kls} (${pa_pi})`);
      await get().fetchFormasi();
      return true;
    } catch (err: any) {
      console.error('Generator formasi error:', err.message);
      alert('Gagal generate formasi kelas: ' + err.message);
      return false;
    }
  },
}));
