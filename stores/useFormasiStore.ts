import { create } from 'zustand';
import { FormasiKelas, FormasiWithStats } from '@/types/formasi';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

interface FotoModalData {
  id: string;
  jenis: 'takror' | 'diniyyah';
  url: string;
  label: string;
  namaKelas: string;
}

interface FormasiState {
  formasiList: FormasiKelas[];
  isLoading: boolean;
  selectedFormasi: FormasiWithStats | null;
  editFormasiData: FormasiKelas | null;
  inputModalDefaultGender: 'PA' | 'PI' | null;
  generatorModalDefaultGender: 'PA' | 'PI' | null;

  isInputModalOpen: boolean;
  isDetailModalOpen: boolean;
  isGeneratorModalOpen: boolean;
  isFilterModalOpen: boolean;
  isHideModalOpen: boolean;
  isFotoModalOpen: boolean;
  fotoModalData: FotoModalData | null;

  hiddenColumns: number[];
  customFilters: {
    tingkat?: string;
    pa_pi?: string;
    wali_kelas?: string;
    domisili?: string;
    blok?: string;
  };

  fetchFormasi: () => Promise<void>;
  openInputModal: (formasiToEdit?: FormasiKelas | null, defaultGender?: 'PA' | 'PI') => void;
  closeInputModal: () => void;
  openDetailModal: (formasi: FormasiWithStats) => void;
  closeDetailModal: () => void;
  openGeneratorModal: (defaultGender?: 'PA' | 'PI') => void;
  closeGeneratorModal: () => void;
  openFilterModal: () => void;
  closeFilterModal: () => void;
  openHideModal: () => void;
  closeHideModal: () => void;
  openFotoModal: (data: FotoModalData) => void;
  closeFotoModal: () => void;

  setHiddenColumns: (cols: number[]) => void;
  setCustomFilters: (filters: Partial<FormasiState['customFilters']>) => void;
  resetCustomFilters: () => void;

  saveFormasi: (data: Partial<FormasiKelas>, isEdit: boolean, id?: string) => Promise<boolean>;
  deleteFormasi: (id: string) => Promise<boolean>;
  bulkDeleteFormasi: (ids: string[]) => Promise<boolean>;
  quickUploadFoto: (id: string, jenis: 'takror' | 'diniyyah', base64: string) => Promise<boolean>;
  deleteFoto: (id: string, jenis: 'takror' | 'diniyyah') => Promise<boolean>;
  generateFormasiRange: (
    tingkat: string,
    pa_pi: 'PA' | 'PI',
    din_kls: string,
    bagAwal: string,
    bagAkhir: string,
    kapasitas?: number
  ) => Promise<{ inserted: number; skipped: number } | null>;
}

export const useFormasiStore = create<FormasiState>((set, get) => ({
  formasiList: [],
  isLoading: false,
  selectedFormasi: null,
  editFormasiData: null,
  inputModalDefaultGender: null,
  generatorModalDefaultGender: null,

  isInputModalOpen: false,
  isDetailModalOpen: false,
  isGeneratorModalOpen: false,
  isFilterModalOpen: false,
  isHideModalOpen: false,
  isFotoModalOpen: false,
  fotoModalData: null,

  hiddenColumns: [],
  customFilters: {},

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

  openInputModal: (formasiToEdit = null, defaultGender) =>
    set({
      isInputModalOpen: true,
      editFormasiData: formasiToEdit,
      inputModalDefaultGender: defaultGender || null,
    }),
  closeInputModal: () =>
    set({
      isInputModalOpen: false,
      editFormasiData: null,
      inputModalDefaultGender: null,
    }),

  openDetailModal: (formasi) =>
    set({ isDetailModalOpen: true, selectedFormasi: formasi }),
  closeDetailModal: () =>
    set({ isDetailModalOpen: false, selectedFormasi: null }),

  openGeneratorModal: (defaultGender) =>
    set({
      isGeneratorModalOpen: true,
      generatorModalDefaultGender: defaultGender || null,
    }),
  closeGeneratorModal: () =>
    set({
      isGeneratorModalOpen: false,
      generatorModalDefaultGender: null,
    }),

  openFilterModal: () => set({ isFilterModalOpen: true }),
  closeFilterModal: () => set({ isFilterModalOpen: false }),

  openHideModal: () => set({ isHideModalOpen: true }),
  closeHideModal: () => set({ isHideModalOpen: false }),

  openFotoModal: (data) => set({ isFotoModalOpen: true, fotoModalData: data }),
  closeFotoModal: () => set({ isFotoModalOpen: false, fotoModalData: null }),

  setHiddenColumns: (cols) => set({ hiddenColumns: cols }),
  setCustomFilters: (filters) =>
    set((state) => ({ customFilters: { ...state.customFilters, ...filters } })),
  resetCustomFilters: () => set({ customFilters: {} }),

  saveFormasi: async (data, isEdit, id) => {
    try {
      if (isEdit && id) {
        const { error } = await supabase
          .from('formasi_kelas')
          .update(data)
          .eq('id', id);
        if (error) {
          if (error.code === '23505') throw new Error('Kombinasi Tingkat, Kelas, Bagian, dan Gender duplikat!');
          throw error;
        }
        await logActivity(
          'EDIT FORMASI KELAS',
          `Mengubah formasi kelas: ${data.tingkat} ${data.din_kls}${data.din_bag} (${data.pa_pi})`
        );
      } else {
        const { error } = await supabase
          .from('formasi_kelas')
          .insert([data]);
        if (error) {
          if (error.code === '23505') throw new Error('Kombinasi Tingkat, Kelas, Bagian, dan Gender duplikat!');
          throw error;
        }
        await logActivity(
          'TAMBAH FORMASI KELAS',
          `Membuat formasi kelas baru: ${data.tingkat} ${data.din_kls}${data.din_bag} (${data.pa_pi})`
        );
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
    if (!confirm('Yakin ingin menghapus formasi kelas ini? Menghapus formasi tidak akan menghapus data santri di dalamnya.')) {
      return false;
    }
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

  bulkDeleteFormasi: async (ids: string[]) => {
    if (!ids || ids.length === 0) return false;
    if (!confirm(`Yakin ingin menghapus ${ids.length} formasi kelas terpilih? Data akan dihapus permanen.`)) {
      return false;
    }
    try {
      const { error } = await supabase
        .from('formasi_kelas')
        .delete()
        .in('id', ids);
      if (error) throw error;
      await logActivity('HAPUS BANYAK FORMASI', `Menghapus ${ids.length} formasi kelas`);
      await get().fetchFormasi();
      return true;
    } catch (err: any) {
      console.error('Bulk delete formasi error:', err.message);
      alert('Gagal menghapus formasi terpilih: ' + err.message);
      return false;
    }
  },

  quickUploadFoto: async (id: string, jenis: 'takror' | 'diniyyah', base64: string) => {
    const colName = jenis === 'takror' ? 'foto_takror' : 'foto_diniyyah';
    try {
      const { error } = await supabase
        .from('formasi_kelas')
        .update({ [colName]: base64 })
        .eq('id', id);
      if (error) throw error;

      // Update local state directly for responsive feedback
      set((state) => ({
        formasiList: state.formasiList.map((f) =>
          f.id === id ? { ...f, [colName]: base64 } : f
        ),
      }));
      await logActivity(
        'UPLOAD FOTO FORMASI',
        `Memperbarui foto ${jenis} formasi ID: ${id}`
      );
      return true;
    } catch (err: any) {
      console.error('Quick upload foto error:', err.message);
      alert('Gagal menyimpan foto: ' + err.message);
      return false;
    }
  },

  deleteFoto: async (id: string, jenis: 'takror' | 'diniyyah') => {
    const colName = jenis === 'takror' ? 'foto_takror' : 'foto_diniyyah';
    try {
      const { error } = await supabase
        .from('formasi_kelas')
        .update({ [colName]: '' })
        .eq('id', id);
      if (error) throw error;

      set((state) => ({
        formasiList: state.formasiList.map((f) =>
          f.id === id ? { ...f, [colName]: '' } : f
        ),
      }));
      await logActivity(
        'HAPUS FOTO FORMASI',
        `Menghapus foto ${jenis} formasi ID: ${id}`
      );
      return true;
    } catch (err: any) {
      console.error('Delete foto error:', err.message);
      alert('Gagal menghapus foto: ' + err.message);
      return false;
    }
  },

  generateFormasiRange: async (tingkat, pa_pi, din_kls, bagAwal, bagAkhir, kapasitas = 80) => {
    const t = String(tingkat || '').trim().toUpperCase();
    const g = String(pa_pi || '').trim().toUpperCase();
    const k = String(din_kls || '').trim().toUpperCase();
    const bAwal = String(bagAwal || '').trim().toUpperCase();
    const bAkhir = String(bagAkhir || '').trim().toUpperCase();

    const startCode = bAwal.charCodeAt(0);
    const endCode = bAkhir.charCodeAt(0);

    if (startCode < 65 || startCode > 90 || endCode < 65 || endCode > 90) {
      alert('Din. Bagian harus berupa huruf A sampai Z.');
      return null;
    }
    if (startCode > endCode) {
      alert(`Huruf awal (${bAwal}) tidak boleh melebihi huruf akhir (${bAkhir}). Contoh: A s/d J.`);
      return null;
    }

    try {
      const existingList = get().formasiList;
      const existingSet = new Set(
        existingList.map((f) =>
          `${String(f.tingkat || '').trim().toUpperCase()}|${String(f.din_kls || '').trim().toUpperCase()}|${String(f.din_bag || '').trim().toUpperCase()}|${String(f.pa_pi || '').trim().toUpperCase()}`
        )
      );

      const payloadsToInsert: Partial<FormasiKelas>[] = [];
      let skippedCount = 0;

      for (let code = startCode; code <= endCode; code++) {
        const hurufBag = String.fromCharCode(code);
        const uniqueKey = `${t}|${k}|${hurufBag}|${g}`;

        if (!existingSet.has(uniqueKey)) {
          payloadsToInsert.push({
            tingkat: t,
            din_kls: k,
            din_bag: hurufBag,
            pa_pi: g as 'PA' | 'PI',
            is_unggulan: false,
            kapasitas_maksimal: kapasitas || 80,
            id_mustahiq: '',
            domisili: '',
            lokasi_takror: '',
            lokasi_diniyyah: '',
            blok: '',
            foto_takror: '',
            foto_diniyyah: '',
          });
        } else {
          skippedCount++;
        }
      }

      if (payloadsToInsert.length === 0) {
        alert(`Seluruh kelas ${t} ${k} (${bAwal} s/d ${bAkhir}) ${g} sudah ada di dalam tabel.`);
        return { inserted: 0, skipped: skippedCount };
      }

      const { error } = await supabase.from('formasi_kelas').insert(payloadsToInsert);
      if (error) throw error;

      await logActivity(
        'GENERATOR FORMASI',
        `Input otomatis ${payloadsToInsert.length} kelas: ${t} ${k} (${bAwal} s/d ${bAkhir}) - ${g}`
      );
      await get().fetchFormasi();
      return { inserted: payloadsToInsert.length, skipped: skippedCount };
    } catch (err: any) {
      console.error('Generator formasi error:', err.message);
      alert('Gagal menginput kelas otomatis: ' + err.message);
      return null;
    }
  },
}));
