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

export interface BlokGroupMeta {
  namaBlok: string;
  gender: 'PA' | 'PI';
}

export const ALLOWED_FORMASI_COLUMNS = [
  'tingkat',
  'din_kls',
  'din_bag',
  'pa_pi',
  'is_unggulan',
  'kapasitas_maksimal',
  'id_mustahiq',
  'domisili',
  'lokasi_takror',
  'lokasi_diniyyah',
  'blok',
  'blok_diniyyah',
  'blok_takror',
  'foto_takror',
  'foto_diniyyah',
] as const;

export function sanitizeFormasiPayload(data: Partial<FormasiKelas>): Record<string, any> {
  const clean: Record<string, any> = {};

  if (data.tingkat !== undefined) clean.tingkat = String(data.tingkat).trim();
  if (data.din_kls !== undefined) clean.din_kls = String(data.din_kls).trim();
  if (data.din_bag !== undefined) clean.din_bag = String(data.din_bag).trim().toUpperCase();
  if (data.pa_pi !== undefined) clean.pa_pi = data.pa_pi;

  // Konversi eksplisit boolean agar status unggulan tersimpan sempurna ke PostgreSQL
  clean.is_unggulan = Boolean(data.is_unggulan);

  if (data.kapasitas_maksimal !== undefined) {
    clean.kapasitas_maksimal = Math.min(Math.max(Number(data.kapasitas_maksimal) || 80, 1), 80);
  }

  clean.id_mustahiq = data.id_mustahiq || '';
  clean.domisili = data.domisili || '';
  clean.lokasi_takror = data.lokasi_takror || '';
  clean.lokasi_diniyyah = data.lokasi_diniyyah || '';
  clean.blok = data.blok || data.blok_diniyyah || '';
  clean.blok_diniyyah = data.blok_diniyyah || data.blok || '';
  clean.blok_takror = data.blok_takror || '';
  clean.foto_takror = data.foto_takror || '';
  clean.foto_diniyyah = data.foto_diniyyah || '';

  return clean;
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

  isBlokModalOpen: boolean;
  blokModalDefaultGender: 'PA' | 'PI' | null;
  blokModalPreselectedIds: string[];
  blokModalEditGroupName: string | null;
  savedBlokGroups: BlokGroupMeta[];

  hiddenColumns: number[];
  customFilters: {
    tingkat?: string;
    pa_pi?: string;
    wali_kelas?: string;
    domisili?: string;
    blok?: string;
  };

  fetchFormasi: () => Promise<void>;
  fetchSavedBlokGroups: () => Promise<void>;
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
  openBlokModal: (
    defaultGender?: 'PA' | 'PI' | null,
    preselectedIds?: string[],
    editGroupName?: string | null
  ) => void;
  closeBlokModal: () => void;
  isHierarkiModalOpen: boolean;
  hierarkiModalDefaultCategory: 'diniyyah' | 'takror';
  openHierarkiModal: (category?: 'diniyyah' | 'takror') => void;
  closeHierarkiModal: () => void;

  setHiddenColumns: (cols: number[]) => void;
  setCustomFilters: (filters: Partial<FormasiState['customFilters']>) => void;
  resetCustomFilters: () => void;

  saveFormasi: (data: Partial<FormasiKelas>, isEdit: boolean, id?: string) => Promise<boolean>;
  toggleUnggulan: (id: string, currentStatus: boolean) => Promise<boolean>;
  deleteFormasi: (id: string) => Promise<boolean>;
  bulkDeleteFormasi: (ids: string[]) => Promise<boolean>;
  quickUploadFoto: (id: string, jenis: 'takror' | 'diniyyah', base64: string) => Promise<boolean>;
  deleteFoto: (id: string, jenis: 'takror' | 'diniyyah') => Promise<boolean>;
  saveBlokKelasGroup: (
    gender: 'PA' | 'PI',
    oldGroupName: string | null,
    newGroupName: string,
    selectedKelasIds: string[]
  ) => Promise<boolean>;
  deleteBlokKelasGroup: (gender: 'PA' | 'PI', groupName: string) => Promise<boolean>;
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

  isBlokModalOpen: false,
  blokModalDefaultGender: null,
  blokModalPreselectedIds: [],
  blokModalEditGroupName: null,
  savedBlokGroups: [],
  isHierarkiModalOpen: false,
  hierarkiModalDefaultCategory: 'diniyyah',

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

  fetchSavedBlokGroups: async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'PENGATURAN_BLOK_KELAS')
        .maybeSingle();

      if (!error && data && Array.isArray(data.value)) {
        set({
          savedBlokGroups: data.value
            .filter((item: any) => item && item.namaBlok)
            .map((item: any) => ({
              namaBlok: String(item.namaBlok).trim(),
              gender: String(item.gender || 'PA').toUpperCase() === 'PI' ? 'PI' : 'PA',
            })),
        });
      }
    } catch (err: any) {
      console.error('Fetch saved blok groups error:', err.message);
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

  openHierarkiModal: (category = 'diniyyah') =>
    set({
      isHierarkiModalOpen: true,
      hierarkiModalDefaultCategory: category,
      isBlokModalOpen: true,
    }),
  closeHierarkiModal: () =>
    set({
      isHierarkiModalOpen: false,
      isBlokModalOpen: false,
    }),

  openBlokModal: (defaultGender = null, preselectedIds = [], editGroupName = null) =>
    set({
      isHierarkiModalOpen: true,
      hierarkiModalDefaultCategory: 'diniyyah',
      isBlokModalOpen: true,
      blokModalDefaultGender: defaultGender || null,
      blokModalPreselectedIds: preselectedIds || [],
      blokModalEditGroupName: editGroupName || null,
    }),
  closeBlokModal: () =>
    set({
      isHierarkiModalOpen: false,
      isBlokModalOpen: false,
      blokModalDefaultGender: null,
      blokModalPreselectedIds: [],
      blokModalEditGroupName: null,
    }),

  setHiddenColumns: (cols) => set({ hiddenColumns: cols }),
  setCustomFilters: (filters) =>
    set((state) => ({ customFilters: { ...state.customFilters, ...filters } })),
  resetCustomFilters: () => set({ customFilters: {} }),

  saveFormasi: async (data, isEdit, id) => {
    try {
      const payload = sanitizeFormasiPayload(data);

      if (isEdit && id) {
        let { error } = await supabase
          .from('formasi_kelas')
          .update(payload)
          .eq('id', id);

        // Fallback anggun jika kolom baru di PostgreSQL belum dieksekusi via migrasi SQL
        if (error && error.code === 'PGRST204') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { blok_diniyyah, blok_takror, ...legacyPayload } = payload;
          const retry = await supabase
            .from('formasi_kelas')
            .update(legacyPayload)
            .eq('id', id);
          error = retry.error;
        }

        if (error) {
          if (error.code === '23505') throw new Error('Kombinasi Tingkat, Kelas, Bagian, dan Gender duplikat!');
          throw error;
        }
        await logActivity(
          'EDIT FORMASI KELAS',
          `Mengubah formasi kelas: ${payload.tingkat} ${payload.din_kls}${payload.din_bag} (${payload.pa_pi})`
        );
      } else {
        let { error } = await supabase
          .from('formasi_kelas')
          .insert([payload]);

        // Fallback anggun jika kolom baru di PostgreSQL belum dieksekusi via migrasi SQL
        if (error && error.code === 'PGRST204') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { blok_diniyyah, blok_takror, ...legacyPayload } = payload;
          const retry = await supabase
            .from('formasi_kelas')
            .insert([legacyPayload]);
          error = retry.error;
        }

        if (error) {
          if (error.code === '23505') throw new Error('Kombinasi Tingkat, Kelas, Bagian, dan Gender duplikat!');
          throw error;
        }
        await logActivity(
          'TAMBAH FORMASI KELAS',
          `Membuat formasi kelas baru: ${payload.tingkat} ${payload.din_kls}${payload.din_bag} (${payload.pa_pi})`
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

  toggleUnggulan: async (id: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const { error } = await supabase
        .from('formasi_kelas')
        .update({ is_unggulan: nextStatus })
        .eq('id', id);
      if (error) throw error;

      set((state) => ({
        formasiList: state.formasiList.map((f) =>
          f.id === id ? { ...f, is_unggulan: nextStatus } : f
        ),
        selectedFormasi:
          state.selectedFormasi?.id === id
            ? { ...state.selectedFormasi, is_unggulan: nextStatus }
            : state.selectedFormasi,
      }));

      await logActivity(
        'TOGGLE STATUS KELAS UNGGULAN',
        `Mengubah status kelas ID ${id} menjadi ${nextStatus ? 'Unggulan' : 'Reguler'}`
      );
      await get().fetchFormasi();
      return true;
    } catch (err: any) {
      console.error('Toggle unggulan error:', err.message);
      alert('Gagal mengubah status kelas unggulan: ' + err.message);
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

  saveBlokKelasGroup: async (gender, oldGroupName, newGroupName, selectedKelasIds) => {
    const trimmedName = String(newGroupName || '').trim();
    if (!trimmedName) {
      alert('Nama Blok tidak boleh kosong.');
      return false;
    }

    try {
      const currentList = get().formasiList;
      const selectedSet = new Set(selectedKelasIds);
      const oldUpper = oldGroupName ? oldGroupName.trim().toUpperCase() : null;
      const newUpper = trimmedName.toUpperCase();

      // Kelas yang sebelumnya berada di grup ini namun sekarang dilepas centangnya
      const idsToClear = currentList
        .filter((f) => {
          if (f.pa_pi !== gender || !f.id) return false;
          const fBlokUpper = String(f.blok || '').trim().toUpperCase();
          const wasInGroup =
            (oldUpper && fBlokUpper === oldUpper) || fBlokUpper === newUpper;
          return wasInGroup && !selectedSet.has(f.id);
        })
        .map((f) => f.id as string);

      // Kelas yang dicentang untuk masuk ke grup blok ini
      const idsToSet = currentList
        .filter((f) => f.pa_pi === gender && f.id && selectedSet.has(f.id))
        .map((f) => f.id as string);

      if (idsToClear.length > 0) {
        const { error: clearErr } = await supabase
          .from('formasi_kelas')
          .update({ blok: '' })
          .in('id', idsToClear);
        if (clearErr) throw clearErr;
      }

      if (idsToSet.length > 0) {
        const { error: setErr } = await supabase
          .from('formasi_kelas')
          .update({ blok: trimmedName })
          .in('id', idsToSet);
        if (setErr) throw setErr;
      }

      // Perbarui state formasiList lokal
      const updatedFormasiList = currentList.map((f) => {
        if (!f.id || f.pa_pi !== gender) return f;
        if (idsToSet.includes(f.id)) return { ...f, blok: trimmedName };
        if (idsToClear.includes(f.id)) return { ...f, blok: '' };
        return f;
      });

      // Perbarui daftar master grup blok di app_settings
      const existingGroups = [...get().savedBlokGroups];
      const nextGroups: BlokGroupMeta[] = [];
      let replacedOrFound = false;

      for (const g of existingGroups) {
        const gUpper = g.namaBlok.trim().toUpperCase();
        if (g.gender === gender && ((oldUpper && gUpper === oldUpper) || gUpper === newUpper)) {
          if (!replacedOrFound) {
            nextGroups.push({ namaBlok: trimmedName, gender });
            replacedOrFound = true;
          }
        } else {
          nextGroups.push(g);
        }
      }
      if (!replacedOrFound) {
        nextGroups.push({ namaBlok: trimmedName, gender });
      }

      // Pastikan seluruh blok aktif di formasi_kelas juga tercatat di nextGroups
      for (const f of updatedFormasiList) {
        const bName = String(f.blok || '').trim();
        if (!bName) continue;
        const exists = nextGroups.some(
          (g) => g.gender === f.pa_pi && g.namaBlok.trim().toUpperCase() === bName.toUpperCase()
        );
        if (!exists) {
          nextGroups.push({ namaBlok: bName, gender: f.pa_pi });
        }
      }

      await supabase
        .from('app_settings')
        .upsert({ key: 'PENGATURAN_BLOK_KELAS', value: nextGroups }, { onConflict: 'key' });

      set({
        formasiList: updatedFormasiList,
        savedBlokGroups: nextGroups,
      });

      await logActivity(
        'ATUR BLOK KELAS',
        `Menyimpan blok kelas ${gender}: ${trimmedName} (${idsToSet.length} kelas)`
      );
      return true;
    } catch (err: any) {
      console.error('Save blok kelas group error:', err.message);
      alert('Gagal menyimpan pengaturan blok kelas: ' + err.message);
      return false;
    }
  },

  deleteBlokKelasGroup: async (gender, groupName) => {
    const trimmed = String(groupName || '').trim();
    if (!trimmed) return false;

    try {
      const currentList = get().formasiList;
      const targetUpper = trimmed.toUpperCase();

      const idsToClear = currentList
        .filter(
          (f) =>
            f.pa_pi === gender &&
            f.id &&
            String(f.blok || '').trim().toUpperCase() === targetUpper
        )
        .map((f) => f.id as string);

      if (idsToClear.length > 0) {
        const { error } = await supabase
          .from('formasi_kelas')
          .update({ blok: '' })
          .in('id', idsToClear);
        if (error) throw error;
      }

      const updatedFormasiList = currentList.map((f) => {
        if (f.id && idsToClear.includes(f.id)) {
          return { ...f, blok: '' };
        }
        return f;
      });

      const nextGroups = get().savedBlokGroups.filter(
        (g) => !(g.gender === gender && g.namaBlok.trim().toUpperCase() === targetUpper)
      );

      await supabase
        .from('app_settings')
        .upsert({ key: 'PENGATURAN_BLOK_KELAS', value: nextGroups }, { onConflict: 'key' });

      set({
        formasiList: updatedFormasiList,
        savedBlokGroups: nextGroups,
      });

      await logActivity(
        'HAPUS BLOK KELAS',
        `Menghapus blok kelas ${gender}: ${trimmed} (${idsToClear.length} kelas dikosongkan)`
      );
      return true;
    } catch (err: any) {
      console.error('Delete blok kelas group error:', err.message);
      alert('Gagal menghapus grup blok kelas: ' + err.message);
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
