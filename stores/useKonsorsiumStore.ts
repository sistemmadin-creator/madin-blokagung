/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
  KelasKonsorsium,
  AnggotaKonsorsium,
  SesiPresensiKonsorsium,
  KonsorsiumDataPayload,
} from '@/types/konsorsium';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';

export const KEY_DB_KONSORSIUM = 'KONSORSIUM_DATA';
export const LS_KONSORSIUM = 'MADIN_KONSORSIUM_DATA';

interface KonsorsiumState {
  kelasList: KelasKonsorsium[];
  anggotaList: AnggotaKonsorsium[];
  sesiList: SesiPresensiKonsorsium[];
  isLoading: boolean;
  selectedTingkat: string;
  searchKeyword: string;

  // Actions
  setSelectedTingkat: (tingkat: string) => void;
  setSearchKeyword: (keyword: string) => void;
  fetchKonsorsiumData: () => Promise<void>;

  // Kelas Konsorsium
  tambahKelasKonsorsium: (
    data: Omit<KelasKonsorsium, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<boolean>;
  updateKelasKonsorsium: (
    id: string,
    data: Partial<Omit<KelasKonsorsium, 'id' | 'createdAt'>>
  ) => Promise<boolean>;
  hapusKelasKonsorsium: (id: string) => Promise<boolean>;

  // Pendaftaran Asatidz (Anggota)
  daftarkanAsatidzKeKelas: (
    kelasId: string,
    asatidzList: { nia: string; nama: string; gender?: string; asatidzId?: string }[]
  ) => Promise<{ success: boolean; addedCount: number }>;
  keluarkanAnggotaKonsorsium: (anggotaId: string) => Promise<boolean>;

  // Presensi Pertemuan
  simpanSesiPresensi: (
    sesi: Omit<SesiPresensiKonsorsium, 'id' | 'createdAt'>,
    existingId?: string
  ) => Promise<boolean>;
  hapusSesiPresensi: (sesiId: string) => Promise<boolean>;
}

// Helper to save all data to app_settings & localStorage
async function persistKonsorsiumData(
  kelasList: KelasKonsorsium[],
  anggotaList: AnggotaKonsorsium[],
  sesiList: SesiPresensiKonsorsium[]
) {
  const payload: KonsorsiumDataPayload = {
    kelasList,
    anggotaList,
    sesiList,
  };

  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LS_KONSORSIUM, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn('Gagal menyimpan konsorsium ke localStorage:', err);
  }

  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: KEY_DB_KONSORSIUM,
      value: payload,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Supabase app_settings upsert error:', error);
    }
  } catch (err) {
    console.warn('Gagal sync konsorsium ke Supabase:', err);
  }
}

export const useKonsorsiumStore = create<KonsorsiumState>((set, get) => ({
  kelasList: [],
  anggotaList: [],
  sesiList: [],
  isLoading: false,
  selectedTingkat: 'SEMUA',
  searchKeyword: '',

  setSelectedTingkat: (tingkat: string) => set({ selectedTingkat: tingkat }),
  setSearchKeyword: (keyword: string) => set({ searchKeyword: keyword }),

  fetchKonsorsiumData: async () => {
    set({ isLoading: true });

    let loadedPayload: KonsorsiumDataPayload | null = null;

    // 1. Coba baca dari Supabase app_settings
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_KONSORSIUM)
        .maybeSingle();

      if (!error && data?.value) {
        loadedPayload =
          typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      }
    } catch (e) {
      console.warn('Gagal memuat konsorsium dari Supabase:', e);
    }

    // 2. Fallback ke localStorage jika Supabase kosong
    if (!loadedPayload && typeof window !== 'undefined') {
      try {
        const localRaw = localStorage.getItem(LS_KONSORSIUM);
        if (localRaw) {
          loadedPayload = JSON.parse(localRaw);
        }
      } catch (e) {
        console.warn('Gagal memuat konsorsium dari localStorage:', e);
      }
    }

    // 3. Set data ke store
    if (loadedPayload) {
      set({
        kelasList: Array.isArray(loadedPayload.kelasList)
          ? loadedPayload.kelasList
          : [],
        anggotaList: Array.isArray(loadedPayload.anggotaList)
          ? loadedPayload.anggotaList
          : [],
        sesiList: Array.isArray(loadedPayload.sesiList)
          ? loadedPayload.sesiList
          : [],
        isLoading: false,
      });
    } else {
      set({ kelasList: [], anggotaList: [], sesiList: [], isLoading: false });
    }
  },

  tambahKelasKonsorsium: async (data) => {
    const { kelasList, anggotaList, sesiList } = get();
    const newId = `kls-kon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newKelas: KelasKonsorsium = {
      ...data,
      id: newId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    const updatedKelasList = [newKelas, ...kelasList];
    set({ kelasList: updatedKelasList });

    await persistKonsorsiumData(updatedKelasList, anggotaList, sesiList);

    logActivity(
      'TAMBAH_KELAS_KONSORSIUM',
      `Membuat kelas konsorsium ${newKelas.namaKelas} (${newKelas.tingkat}) - Pembimbing: ${newKelas.pembimbingNama}`
    );

    return true;
  },

  updateKelasKonsorsium: async (id, data) => {
    const { kelasList, anggotaList, sesiList } = get();
    const now = new Date().toISOString();

    const updatedKelasList = kelasList.map((k) =>
      k.id === id ? { ...k, ...data, updatedAt: now } : k
    );

    set({ kelasList: updatedKelasList });
    await persistKonsorsiumData(updatedKelasList, anggotaList, sesiList);

    logActivity(
      'UPDATE_KELAS_KONSORSIUM',
      `Memperbarui kelas konsorsium ID: ${id}`
    );

    return true;
  },

  hapusKelasKonsorsium: async (id) => {
    const { kelasList, anggotaList, sesiList } = get();
    const target = kelasList.find((k) => k.id === id);

    const updatedKelasList = kelasList.filter((k) => k.id !== id);
    const updatedAnggotaList = anggotaList.filter((a) => a.kelasId !== id);
    const updatedSesiList = sesiList.filter((s) => s.kelasId !== id);

    set({
      kelasList: updatedKelasList,
      anggotaList: updatedAnggotaList,
      sesiList: updatedSesiList,
    });

    await persistKonsorsiumData(
      updatedKelasList,
      updatedAnggotaList,
      updatedSesiList
    );

    logActivity(
      'HAPUS_KELAS_KONSORSIUM',
      `Menghapus kelas konsorsium ${target?.namaKelas || id} beserta asatidz dan riwayat absennya`
    );

    return true;
  },

  daftarkanAsatidzKeKelas: async (kelasId, asatidzSelected) => {
    const { kelasList, anggotaList, sesiList } = get();
    const kelasTarget = kelasList.find((k) => k.id === kelasId);
    if (!kelasTarget) return { success: false, addedCount: 0 };

    const now = new Date().toISOString();
    const existingNias = new Set(
      anggotaList.filter((a) => a.kelasId === kelasId).map((a) => a.nia)
    );

    const baruDitambahkan: AnggotaKonsorsium[] = [];

    for (const a of asatidzSelected) {
      if (!existingNias.has(a.nia)) {
        baruDitambahkan.push({
          id: `ang-kon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          kelasId,
          asatidzId: a.asatidzId ? String(a.asatidzId) : undefined,
          nia: a.nia,
          nama: a.nama,
          gender: a.gender || '',
          peran: 'Anggota',
          tanggalBergabung: new Date().toISOString().split('T')[0],
          createdAt: now,
        });
      }
    }

    if (baruDitambahkan.length === 0) {
      return { success: true, addedCount: 0 };
    }

    const updatedAnggotaList = [...anggotaList, ...baruDitambahkan];
    set({ anggotaList: updatedAnggotaList });

    await persistKonsorsiumData(kelasList, updatedAnggotaList, sesiList);

    logActivity(
      'DAFTAR_ASATIDZ_KONSORSIUM',
      `Mendaftarkan ${baruDitambahkan.length} asatidz ke kelas konsorsium ${kelasTarget.namaKelas}`
    );

    return { success: true, addedCount: baruDitambahkan.length };
  },

  keluarkanAnggotaKonsorsium: async (anggotaId) => {
    const { kelasList, anggotaList, sesiList } = get();
    const target = anggotaList.find((a) => a.id === anggotaId);

    const updatedAnggotaList = anggotaList.filter((a) => a.id !== anggotaId);
    set({ anggotaList: updatedAnggotaList });

    await persistKonsorsiumData(kelasList, updatedAnggotaList, sesiList);

    logActivity(
      'KELUARKAN_ASATIDZ_KONSORSIUM',
      `Mengeluarkan asatidz ${target?.nama || anggotaId} dari kelas konsorsium`
    );

    return true;
  },

  simpanSesiPresensi: async (sesiData, existingId) => {
    const { kelasList, anggotaList, sesiList } = get();
    const now = new Date().toISOString();

    let updatedSesiList: SesiPresensiKonsorsium[];

    if (existingId) {
      updatedSesiList = sesiList.map((s) =>
        s.id === existingId
          ? {
              ...s,
              ...sesiData,
            }
          : s
      );
    } else {
      const newSesi: SesiPresensiKonsorsium = {
        ...sesiData,
        id: `sesi-kon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
      };
      updatedSesiList = [newSesi, ...sesiList];
    }

    set({ sesiList: updatedSesiList });
    await persistKonsorsiumData(kelasList, anggotaList, updatedSesiList);

    logActivity(
      'INPUT_PRESENSI_KONSORSIUM',
      `Menyimpan presensi konsorsium tanggal ${sesiData.tanggal}`
    );

    return true;
  },

  hapusSesiPresensi: async (sesiId) => {
    const { kelasList, anggotaList, sesiList } = get();
    const updatedSesiList = sesiList.filter((s) => s.id !== sesiId);

    set({ sesiList: updatedSesiList });
    await persistKonsorsiumData(kelasList, anggotaList, updatedSesiList);

    logActivity(
      'HAPUS_PRESENSI_KONSORSIUM',
      `Menghapus sesi presensi konsorsium ID: ${sesiId}`
    );

    return true;
  },
}));
