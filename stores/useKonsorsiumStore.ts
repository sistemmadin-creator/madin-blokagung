/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import {
  KelasKonsorsium,
  AnggotaKonsorsium,
  SesiPresensiKonsorsium,
  DetailPresensiKonsorsium,
  KonsorsiumDataPayload,
  JenisKonsorsium,
  StatusAbsenKonsorsium,
} from '@/types/konsorsium';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { getLocalTodayISO, getHariNamaKonsorsium } from '@/lib/utils/konsorsiumHelper';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';

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
  handleRealtimeKonsorsium: (payload?: any) => void;

  // Kelas Konsorsium
  tambahKelasKonsorsium: (
    data: Omit<KelasKonsorsium, 'id' | 'createdAt' | 'updatedAt'>,
    skipHistory?: boolean
  ) => Promise<boolean>;
  updateKelasKonsorsium: (
    id: string,
    data: Partial<Omit<KelasKonsorsium, 'id' | 'createdAt'>>,
    skipHistory?: boolean
  ) => Promise<boolean>;
  hapusKelasKonsorsium: (id: string, skipHistory?: boolean) => Promise<boolean>;

  // Pendaftaran Asatidz (Anggota)
  daftarkanAsatidzKeKelas: (
    kelasId: string,
    asatidzList: { nia: string; nama: string; gender?: string; asatidzId?: string }[],
    skipHistory?: boolean
  ) => Promise<{ success: boolean; addedCount: number }>;
  keluarkanAnggotaKonsorsium: (
    anggotaId: string,
    skipHistory?: boolean
  ) => Promise<boolean>;

  // Presensi Pertemuan
  simpanSesiPresensi: (
    sesi: Omit<SesiPresensiKonsorsium, 'id' | 'createdAt'>,
    existingId?: string,
    skipHistory?: boolean
  ) => Promise<boolean>;
  hapusSesiPresensi: (sesiId: string, skipHistory?: boolean) => Promise<boolean>;
}

// Helper: simpan ke localStorage & app_settings (tanpa kolom updated_at yang tidak ada di skema app_settings)
async function persistKonsorsiumSnapshot(
  kelasList: KelasKonsorsium[],
  anggotaList: AnggotaKonsorsium[],
  sesiList: SesiPresensiKonsorsium[]
): Promise<boolean> {
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
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: KEY_DB_KONSORSIUM,
          value: payload,
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.warn('Supabase app_settings upsert error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Gagal sync konsorsium ke app_settings:', err);
    return false;
  }
}

// Helper: sinkronisasi penuh ke 4 tabel relasional (digunakan saat migrasi awal atau pemulihan Undo/Redo)
async function syncFullPayloadToRelationalTables(
  kelasList: KelasKonsorsium[],
  anggotaList: AnggotaKonsorsium[],
  sesiList: SesiPresensiKonsorsium[]
): Promise<boolean> {
  try {
    if (kelasList.length > 0) {
      const kelasRows = kelasList.map((k) => ({
        id: k.id,
        tingkat: k.tingkat,
        jenis_konsor: k.jenisKonsor || 'Mustahiq/qoh',
        nama_kelas: k.namaKelas,
        kitab_rujukan: k.kitabRujukan || '',
        pembimbing_nama: k.pembimbingNama,
        pembimbing_nia: k.pembimbingNia || '',
        keterangan: k.keterangan || '',
        is_active: k.isActive ?? true,
        created_at: k.createdAt || new Date().toISOString(),
        updated_at: k.updatedAt || new Date().toISOString(),
      }));
      const { error: errKelas } = await supabase
        .from('kelas_konsorsium')
        .upsert(kelasRows, { onConflict: 'id' });
      if (errKelas) {
        console.warn('Gagal upsert kelas_konsorsium:', errKelas.message);
        return false;
      }
    }

    const validKelasIds = new Set(kelasList.map((k) => k.id));
    const validAnggota = anggotaList.filter((a) => validKelasIds.has(a.kelasId));

    if (validAnggota.length > 0) {
      const anggotaRows = validAnggota.map((a) => ({
        id: a.id,
        kelas_id: a.kelasId,
        asatidz_id: a.asatidzId || null,
        nia: a.nia,
        nama_asatidz: a.nama,
        gender: a.gender || '',
        peran: a.peran || 'Anggota',
        tanggal_bergabung: a.tanggalBergabung || getLocalTodayISO(),
        created_at: a.createdAt || new Date().toISOString(),
      }));
      const { error: errAnggota } = await supabase
        .from('anggota_konsorsium')
        .upsert(anggotaRows, { onConflict: 'id' });
      if (errAnggota) {
        console.warn('Gagal upsert anggota_konsorsium:', errAnggota.message);
      }
    }

    const validSesi = sesiList.filter((s) => validKelasIds.has(s.kelasId));
    if (validSesi.length > 0) {
      const sesiRows = validSesi.map((s) => ({
        id: s.id,
        kelas_id: s.kelasId,
        tanggal: s.tanggal,
        hari: s.hari || '',
        tahun: s.tahun ?? null,
        bulan: s.bulan ?? null,
        pertemuan_ke: s.pertemuanKe ?? null,
        topik_bahasan: s.topikBahasan || '',
        notulen: s.notulen || '',
        diinput_oleh: s.diinputOleh || 'Admin',
        created_at: s.createdAt || new Date().toISOString(),
      }));
      const { error: errSesi } = await supabase
        .from('sesi_presensi_konsorsium')
        .upsert(sesiRows, { onConflict: 'id' });
      if (errSesi) {
        console.warn('Gagal upsert sesi_presensi_konsorsium:', errSesi.message);
      }

      const detailRows: any[] = [];
      validSesi.forEach((s) => {
        (s.records || []).forEach((r) => {
          detailRows.push({
            id: r.id || `det-${s.id}-${r.nia}`,
            sesi_id: s.id,
            anggota_id: r.anggotaId || r.nia,
            nia: r.nia,
            nama_asatidz: r.nama,
            status: r.status,
            keterangan: r.keterangan || '',
            waktu_input: r.waktuInput || s.createdAt || new Date().toISOString(),
          });
        });
      });

      if (detailRows.length > 0) {
        const { error: errDet } = await supabase
          .from('detail_presensi_konsorsium')
          .upsert(detailRows, { onConflict: 'id' });
        if (errDet) {
          console.warn('Gagal upsert detail_presensi_konsorsium:', errDet.message);
        }
      }
    }

    return true;
  } catch (err) {
    console.warn('Error syncFullPayloadToRelationalTables:', err);
    return false;
  }
}

function mapRelationalToPayload(
  kelasRows: any[],
  anggotaRows: any[],
  sesiRows: any[],
  detailRows: any[]
): KonsorsiumDataPayload {
  const kelasList: KelasKonsorsium[] = kelasRows.map((row) => ({
    id: row.id,
    tingkat: row.tingkat,
    jenisKonsor: (row.jenis_konsor || 'Mustahiq/qoh') as JenisKonsorsium,
    namaKelas: row.nama_kelas,
    kitabRujukan: row.kitab_rujukan || '',
    pembimbingNama: row.pembimbing_nama,
    pembimbingNia: row.pembimbing_nia || '',
    keterangan: row.keterangan || '',
    isActive: row.is_active ?? true,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  }));

  const anggotaList: AnggotaKonsorsium[] = anggotaRows.map((row) => ({
    id: row.id,
    kelasId: row.kelas_id,
    asatidzId: row.asatidz_id || undefined,
    nia: row.nia,
    nama: row.nama_asatidz,
    gender: row.gender || '',
    peran: (row.peran as 'Koordinator' | 'Anggota') || 'Anggota',
    tanggalBergabung: row.tanggal_bergabung || '',
    createdAt: row.created_at || new Date().toISOString(),
  }));

  const detailBySesiId = new Map<string, DetailPresensiKonsorsium[]>();
  detailRows.forEach((d) => {
    const list = detailBySesiId.get(d.sesi_id) || [];
    list.push({
      id: d.id,
      anggotaId: d.anggota_id,
      nia: d.nia,
      nama: d.nama_asatidz,
      status: (d.status || 'Hadir') as StatusAbsenKonsorsium,
      keterangan: d.keterangan || '',
      waktuInput: d.waktu_input || undefined,
    });
    detailBySesiId.set(d.sesi_id, list);
  });

  const sesiList: SesiPresensiKonsorsium[] = sesiRows.map((row) => {
    const parts = String(row.tanggal || '').split('-');
    const parsedYear = parts.length >= 2 ? parseInt(parts[0], 10) : undefined;
    const parsedMonth = parts.length >= 2 ? parseInt(parts[1], 10) : undefined;
    return {
      id: row.id,
      kelasId: row.kelas_id,
      tanggal: row.tanggal,
      hari: row.hari || undefined,
      tahun: row.tahun ?? parsedYear,
      bulan: row.bulan ?? parsedMonth,
      pertemuanKe: row.pertemuan_ke ?? undefined,
      topikBahasan: row.topik_bahasan || '',
      notulen: row.notulen || '',
      diinputOleh: row.diinput_oleh || 'Admin',
      createdAt: row.created_at || new Date().toISOString(),
      records: detailBySesiId.get(row.id) || [],
    };
  });

  return { kelasList, anggotaList, sesiList };
}

function sanitizePayload(raw: any): KonsorsiumDataPayload {
  const kelasList: KelasKonsorsium[] = (
    Array.isArray(raw?.kelasList) ? raw.kelasList : []
  ).map((k: any) => ({
    ...k,
    jenisKonsor: k.jenisKonsor || 'Mustahiq/qoh',
  }));
  const validKelasIds = new Set(kelasList.map((k) => k.id));
  const anggotaList: AnggotaKonsorsium[] = (
    Array.isArray(raw?.anggotaList) ? raw.anggotaList : []
  ).filter((a: any) => a && validKelasIds.has(a.kelasId));

  // Deduplikasi sesi berdasarkan (kelasId, tanggal)
  const sesiMap = new Map<string, SesiPresensiKonsorsium>();
  (Array.isArray(raw?.sesiList) ? raw.sesiList : []).forEach((s: any) => {
    if (!s || !validKelasIds.has(s.kelasId) || !s.tanggal) return;
    const key = `${s.kelasId}__${s.tanggal}`;
    if (!sesiMap.has(key)) {
      sesiMap.set(key, s);
    }
  });

  return {
    kelasList,
    anggotaList,
    sesiList: Array.from(sesiMap.values()),
  };
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

  handleRealtimeKonsorsium: (val?: any) => {
    if (val && typeof val === 'object' && Array.isArray(val.kelasList)) {
      const clean = sanitizePayload(val);
      set({
        kelasList: clean.kelasList,
        anggotaList: clean.anggotaList,
        sesiList: clean.sesiList,
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LS_KONSORSIUM, JSON.stringify(clean));
        } catch {}
      }
    } else {
      void get().fetchKonsorsiumData();
    }
  },

  fetchKonsorsiumData: async () => {
    set({ isLoading: true });

    // 1. Baca cache localStorage untuk tampilan instan & kandidat migrasi otomatis
    let localPayload: KonsorsiumDataPayload | null = null;
    if (typeof window !== 'undefined') {
      try {
        const localRaw = localStorage.getItem(LS_KONSORSIUM);
        if (localRaw) {
          localPayload = sanitizePayload(JSON.parse(localRaw));
          if (localPayload.kelasList.length > 0 && get().kelasList.length === 0) {
            set({
              kelasList: localPayload.kelasList,
              anggotaList: localPayload.anggotaList,
              sesiList: localPayload.sesiList,
            });
          }
        }
      } catch (e) {
        console.warn('Gagal memuat konsorsium dari localStorage:', e);
      }
    }

    // 2. Muat dari 4 tabel relasional PostgreSQL
    try {
      const [resKelas, resAnggota, resSesi, resDetail] = await Promise.all([
        supabase
          .from('kelas_konsorsium')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('anggota_konsorsium')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('sesi_presensi_konsorsium')
          .select('*')
          .order('tanggal', { ascending: false }),
        supabase.from('detail_presensi_konsorsium').select('*'),
      ]);

      if (!resKelas.error && Array.isArray(resKelas.data) && resKelas.data.length > 0) {
        const relationalPayload = mapRelationalToPayload(
          resKelas.data,
          resAnggota.data || [],
          resSesi.data || [],
          resDetail.data || []
        );
        const clean = sanitizePayload(relationalPayload);
        set({
          kelasList: clean.kelasList,
          anggotaList: clean.anggotaList,
          sesiList: clean.sesiList,
          isLoading: false,
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LS_KONSORSIUM, JSON.stringify(clean));
          } catch {}
        }
        return;
      }
    } catch (e) {
      console.warn('Gagal membaca tabel relasional konsorsium:', e);
    }

    // 3. Fallback ke app_settings jika tabel relasional masih kosong
    let settingsPayload: KonsorsiumDataPayload | null = null;
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_KONSORSIUM)
        .maybeSingle();

      if (!error && data?.value) {
        const parsed =
          typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        settingsPayload = sanitizePayload(parsed);
      }
    } catch (e) {
      console.warn('Gagal memuat konsorsium dari app_settings:', e);
    }

    const bestFallback =
      settingsPayload && settingsPayload.kelasList.length > 0
        ? settingsPayload
        : localPayload;

    if (bestFallback && bestFallback.kelasList.length > 0) {
      set({
        kelasList: bestFallback.kelasList,
        anggotaList: bestFallback.anggotaList,
        sesiList: bestFallback.sesiList,
        isLoading: false,
      });

      // Backfill otomatis ke tabel relasional & app_settings agar data localStorage terselamatkan ke server
      void syncFullPayloadToRelationalTables(
        bestFallback.kelasList,
        bestFallback.anggotaList,
        bestFallback.sesiList
      );
      void persistKonsorsiumSnapshot(
        bestFallback.kelasList,
        bestFallback.anggotaList,
        bestFallback.sesiList
      );
    } else {
      set({ kelasList: [], anggotaList: [], sesiList: [], isLoading: false });
    }
  },

  tambahKelasKonsorsium: async (data, skipHistory = false) => {
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

    try {
      await supabase.from('kelas_konsorsium').upsert(
        {
          id: newKelas.id,
          tingkat: newKelas.tingkat,
          jenis_konsor: newKelas.jenisKonsor || 'Mustahiq/qoh',
          nama_kelas: newKelas.namaKelas,
          kitab_rujukan: newKelas.kitabRujukan || '',
          pembimbing_nama: newKelas.pembimbingNama,
          pembimbing_nia: newKelas.pembimbingNia || '',
          keterangan: newKelas.keterangan || '',
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        { onConflict: 'id' }
      );
    } catch (err) {
      console.warn('Gagal insert kelas_konsorsium:', err);
    }

    await persistKonsorsiumSnapshot(updatedKelasList, anggotaList, sesiList);

    if (!skipHistory) {
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Tambah Kelas Konsorsium: ${newKelas.namaKelas}`,
        undo: async () => {
          return get().hapusKelasKonsorsium(newKelas.id, true);
        },
        redo: async () => {
          const cur = get();
          const restored = [newKelas, ...cur.kelasList.filter((k) => k.id !== newKelas.id)];
          set({ kelasList: restored });
          await syncFullPayloadToRelationalTables(restored, cur.anggotaList, cur.sesiList);
          await persistKonsorsiumSnapshot(restored, cur.anggotaList, cur.sesiList);
          return true;
        },
      });
    }

    logActivity(
      'TAMBAH_KELAS_KONSORSIUM',
      `Membuat kelas konsorsium ${newKelas.namaKelas} (${newKelas.tingkat}) - Pembimbing: ${newKelas.pembimbingNama}`
    );

    return true;
  },

  updateKelasKonsorsium: async (id, data, skipHistory = false) => {
    const { kelasList, anggotaList, sesiList } = get();
    const prevKelas = kelasList.find((k) => k.id === id);
    if (!prevKelas) return false;

    const now = new Date().toISOString();
    const updatedKelas: KelasKonsorsium = { ...prevKelas, ...data, updatedAt: now };

    const updatedKelasList = kelasList.map((k) =>
      k.id === id ? updatedKelas : k
    );

    set({ kelasList: updatedKelasList });

    try {
      await supabase
        .from('kelas_konsorsium')
        .update({
          tingkat: updatedKelas.tingkat,
          jenis_konsor: updatedKelas.jenisKonsor || 'Mustahiq/qoh',
          nama_kelas: updatedKelas.namaKelas,
          kitab_rujukan: updatedKelas.kitabRujukan || '',
          pembimbing_nama: updatedKelas.pembimbingNama,
          pembimbing_nia: updatedKelas.pembimbingNia || '',
          keterangan: updatedKelas.keterangan || '',
          updated_at: now,
        })
        .eq('id', id);
    } catch (err) {
      console.warn('Gagal update kelas_konsorsium:', err);
    }

    await persistKonsorsiumSnapshot(updatedKelasList, anggotaList, sesiList);

    if (!skipHistory) {
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Ubah Kelas Konsorsium: ${updatedKelas.namaKelas}`,
        undo: async () => {
          return get().updateKelasKonsorsium(id, prevKelas, true);
        },
        redo: async () => {
          return get().updateKelasKonsorsium(id, data, true);
        },
      });
    }

    logActivity(
      'UPDATE_KELAS_KONSORSIUM',
      `Memperbarui kelas konsorsium ${updatedKelas.namaKelas} (${updatedKelas.tingkat})`
    );

    return true;
  },

  hapusKelasKonsorsium: async (id, skipHistory = false) => {
    const { kelasList, anggotaList, sesiList } = get();
    const targetKelas = kelasList.find((k) => k.id === id);
    if (!targetKelas) return false;

    const deletedAnggota = anggotaList.filter((a) => a.kelasId === id);
    const deletedSesi = sesiList.filter((s) => s.kelasId === id);

    const updatedKelasList = kelasList.filter((k) => k.id !== id);
    const updatedAnggotaList = anggotaList.filter((a) => a.kelasId !== id);
    const updatedSesiList = sesiList.filter((s) => s.kelasId !== id);

    set({
      kelasList: updatedKelasList,
      anggotaList: updatedAnggotaList,
      sesiList: updatedSesiList,
    });

    try {
      await supabase.from('kelas_konsorsium').delete().eq('id', id);
    } catch (err) {
      console.warn('Gagal hapus kelas_konsorsium:', err);
    }

    await persistKonsorsiumSnapshot(
      updatedKelasList,
      updatedAnggotaList,
      updatedSesiList
    );

    if (!skipHistory) {
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Hapus Kelas Konsorsium: ${targetKelas.namaKelas}`,
        undo: async () => {
          const cur = get();
          const nextKelas = [targetKelas, ...cur.kelasList.filter((k) => k.id !== id)];
          const nextAnggota = [...cur.anggotaList, ...deletedAnggota];
          const nextSesi = [...cur.sesiList, ...deletedSesi];
          set({
            kelasList: nextKelas,
            anggotaList: nextAnggota,
            sesiList: nextSesi,
          });
          await syncFullPayloadToRelationalTables(nextKelas, nextAnggota, nextSesi);
          await persistKonsorsiumSnapshot(nextKelas, nextAnggota, nextSesi);
          return true;
        },
        redo: async () => {
          return get().hapusKelasKonsorsium(id, true);
        },
      });
    }

    logActivity(
      'HAPUS_KELAS_KONSORSIUM',
      `Menghapus kelas konsorsium ${targetKelas.namaKelas} beserta asatidz dan riwayat absennya`
    );

    return true;
  },

  daftarkanAsatidzKeKelas: async (kelasId, asatidzSelected, skipHistory = false) => {
    const { kelasList, anggotaList, sesiList } = get();
    const kelasTarget = kelasList.find((k) => k.id === kelasId);
    if (!kelasTarget) return { success: false, addedCount: 0 };

    const now = new Date().toISOString();
    const todayLocal = getLocalTodayISO();
    const existingKeys = new Set(
      anggotaList
        .filter((a) => a.kelasId === kelasId)
        .map((a) => a.nia || a.asatidzId || a.nama)
    );

    const baruDitambahkan: AnggotaKonsorsium[] = [];

    for (const a of asatidzSelected) {
      const uniqueKey = a.nia || a.asatidzId || a.nama;
      if (uniqueKey && !existingKeys.has(uniqueKey)) {
        existingKeys.add(uniqueKey);
        baruDitambahkan.push({
          id: `ang-kon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          kelasId,
          asatidzId: a.asatidzId ? String(a.asatidzId) : undefined,
          nia: a.nia || '-',
          nama: a.nama,
          gender: a.gender || '',
          peran: 'Anggota',
          tanggalBergabung: todayLocal,
          createdAt: now,
        });
      }
    }

    if (baruDitambahkan.length === 0) {
      return { success: true, addedCount: 0 };
    }

    const updatedAnggotaList = [...anggotaList, ...baruDitambahkan];
    set({ anggotaList: updatedAnggotaList });

    try {
      const anggotaRows = baruDitambahkan.map((a) => ({
        id: a.id,
        kelas_id: a.kelasId,
        asatidz_id: a.asatidzId || null,
        nia: a.nia,
        nama_asatidz: a.nama,
        gender: a.gender || '',
        peran: a.peran || 'Anggota',
        tanggal_bergabung: a.tanggalBergabung || todayLocal,
        created_at: a.createdAt,
      }));
      await supabase
        .from('anggota_konsorsium')
        .upsert(anggotaRows, { onConflict: 'kelas_id,nia' });
    } catch (err) {
      console.warn('Gagal insert anggota_konsorsium:', err);
    }

    await persistKonsorsiumSnapshot(kelasList, updatedAnggotaList, sesiList);

    if (!skipHistory) {
      const addedIds = new Set(baruDitambahkan.map((b) => b.id));
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Daftarkan ${baruDitambahkan.length} Asatidz ke ${kelasTarget.namaKelas}`,
        undo: async () => {
          const cur = get();
          const nextAnggota = cur.anggotaList.filter((a) => !addedIds.has(a.id));
          set({ anggotaList: nextAnggota });
          await supabase
            .from('anggota_konsorsium')
            .delete()
            .in('id', Array.from(addedIds));
          await persistKonsorsiumSnapshot(cur.kelasList, nextAnggota, cur.sesiList);
          return true;
        },
        redo: async () => {
          const res = await get().daftarkanAsatidzKeKelas(
            kelasId,
            baruDitambahkan.map((b) => ({
              nia: b.nia,
              nama: b.nama,
              gender: b.gender,
              asatidzId: b.asatidzId,
            })),
            true
          );
          return res.success;
        },
      });
    }

    logActivity(
      'DAFTAR_ASATIDZ_KONSORSIUM',
      `Mendaftarkan ${baruDitambahkan.length} asatidz ke kelas konsorsium ${kelasTarget.namaKelas}`
    );

    return { success: true, addedCount: baruDitambahkan.length };
  },

  keluarkanAnggotaKonsorsium: async (anggotaId, skipHistory = false) => {
    const { kelasList, anggotaList, sesiList } = get();
    const target = anggotaList.find((a) => a.id === anggotaId);
    if (!target) return false;

    const updatedAnggotaList = anggotaList.filter((a) => a.id !== anggotaId);
    set({ anggotaList: updatedAnggotaList });

    try {
      await supabase.from('anggota_konsorsium').delete().eq('id', anggotaId);
    } catch (err) {
      console.warn('Gagal hapus anggota_konsorsium:', err);
    }

    await persistKonsorsiumSnapshot(kelasList, updatedAnggotaList, sesiList);

    if (!skipHistory) {
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Keluarkan ${target.nama} dari Konsorsium`,
        undo: async () => {
          const cur = get();
          const nextAnggota = [...cur.anggotaList, target];
          set({ anggotaList: nextAnggota });
          await supabase.from('anggota_konsorsium').upsert(
            {
              id: target.id,
              kelas_id: target.kelasId,
              asatidz_id: target.asatidzId || null,
              nia: target.nia,
              nama_asatidz: target.nama,
              gender: target.gender || '',
              peran: target.peran || 'Anggota',
              tanggal_bergabung: target.tanggalBergabung || getLocalTodayISO(),
              created_at: target.createdAt,
            },
            { onConflict: 'id' }
          );
          await persistKonsorsiumSnapshot(cur.kelasList, nextAnggota, cur.sesiList);
          return true;
        },
        redo: async () => {
          return get().keluarkanAnggotaKonsorsium(anggotaId, true);
        },
      });
    }

    logActivity(
      'KELUARKAN_ASATIDZ_KONSORSIUM',
      `Mengeluarkan asatidz ${target.nama} dari kelas konsorsium`
    );

    return true;
  },

  simpanSesiPresensi: async (sesiData, existingId, skipHistory = false) => {
    const { kelasList, anggotaList, sesiList } = get();
    const now = new Date().toISOString();
    const prevSesiSnapshot = [...sesiList];

    // Cari sesi eksisting pada kelas dan tanggal yang sama untuk mencegah duplikasi
    const sameDateSesi = sesiList.find(
      (s) => s.kelasId === sesiData.kelasId && s.tanggal === sesiData.tanggal
    );
    const targetId = sameDateSesi?.id || existingId;
    const obsoleteId =
      existingId && sameDateSesi && sameDateSesi.id !== existingId
        ? existingId
        : undefined;

    const kelasObj = kelasList.find((k) => k.id === sesiData.kelasId);
    const hariNama =
      sesiData.hari ||
      getHariNamaKonsorsium(kelasObj?.jenisKonsor || 'Mustahiq/qoh');

    let savedSesi: SesiPresensiKonsorsium;
    let updatedSesiList: SesiPresensiKonsorsium[];

    if (targetId) {
      const existingObj = sesiList.find((s) => s.id === targetId);
      savedSesi = {
        ...(existingObj || {}),
        ...sesiData,
        hari: hariNama,
        id: targetId,
        createdAt: existingObj?.createdAt || now,
      };
      updatedSesiList = sesiList
        .filter((s) => s.id !== obsoleteId)
        .map((s) => (s.id === targetId ? savedSesi : s));
    } else {
      savedSesi = {
        ...sesiData,
        hari: hariNama,
        id: `sesi-kon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        createdAt: now,
      };
      updatedSesiList = [savedSesi, ...sesiList];
    }

    set({ sesiList: updatedSesiList });

    try {
      if (obsoleteId) {
        await supabase
          .from('sesi_presensi_konsorsium')
          .delete()
          .eq('id', obsoleteId);
      }

      await supabase.from('sesi_presensi_konsorsium').upsert(
        {
          id: savedSesi.id,
          kelas_id: savedSesi.kelasId,
          tanggal: savedSesi.tanggal,
          hari: savedSesi.hari || '',
          tahun: savedSesi.tahun ?? null,
          bulan: savedSesi.bulan ?? null,
          pertemuan_ke: savedSesi.pertemuanKe ?? null,
          topik_bahasan: savedSesi.topikBahasan || '',
          notulen: savedSesi.notulen || '',
          diinput_oleh: savedSesi.diinputOleh || 'Admin',
          created_at: savedSesi.createdAt,
        },
        { onConflict: 'id' }
      );

      // Bersihkan detail lama pada sesi ini lalu simpan detail terbaru
      await supabase
        .from('detail_presensi_konsorsium')
        .delete()
        .eq('sesi_id', savedSesi.id);

      if (savedSesi.records.length > 0) {
        const detailRows = savedSesi.records.map((r) => ({
          id: r.id || `det-${savedSesi.id}-${r.nia}`,
          sesi_id: savedSesi.id,
          anggota_id: r.anggotaId || r.nia,
          nia: r.nia,
          nama_asatidz: r.nama,
          status: r.status,
          keterangan: r.keterangan || '',
          waktu_input: r.waktuInput || now,
        }));
        await supabase
          .from('detail_presensi_konsorsium')
          .upsert(detailRows, { onConflict: 'sesi_id,nia' });
      }
    } catch (err) {
      console.warn('Gagal simpan sesi/detail presensi konsorsium ke tabel relasional:', err);
    }

    await persistKonsorsiumSnapshot(kelasList, anggotaList, updatedSesiList);

    if (!skipHistory) {
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Simpan Presensi Konsorsium (${savedSesi.tanggal})`,
        undo: async () => {
          const cur = get();
          set({ sesiList: prevSesiSnapshot });
          if (!targetId) {
            await supabase
              .from('sesi_presensi_konsorsium')
              .delete()
              .eq('id', savedSesi.id);
          } else {
            await syncFullPayloadToRelationalTables(
              cur.kelasList,
              cur.anggotaList,
              prevSesiSnapshot
            );
          }
          await persistKonsorsiumSnapshot(cur.kelasList, cur.anggotaList, prevSesiSnapshot);
          return true;
        },
        redo: async () => {
          return get().simpanSesiPresensi(sesiData, existingId, true);
        },
      });
    }

    logActivity(
      'INPUT_PRESENSI_KONSORSIUM',
      `Menyimpan presensi konsorsium ${kelasObj?.namaKelas || ''} tanggal ${sesiData.tanggal}`
    );

    return true;
  },

  hapusSesiPresensi: async (sesiId, skipHistory = false) => {
    const { kelasList, anggotaList, sesiList } = get();
    const targetSesi = sesiList.find((s) => s.id === sesiId);
    if (!targetSesi) return false;

    const updatedSesiList = sesiList.filter((s) => s.id !== sesiId);
    set({ sesiList: updatedSesiList });

    try {
      await supabase
        .from('sesi_presensi_konsorsium')
        .delete()
        .eq('id', sesiId);
    } catch (err) {
      console.warn('Gagal hapus sesi_presensi_konsorsium:', err);
    }

    await persistKonsorsiumSnapshot(kelasList, anggotaList, updatedSesiList);

    if (!skipHistory) {
      useUndoRedoStore.getState().recordAction({
        module: 'absensi',
        title: `Hapus Sesi Konsorsium (${targetSesi.tanggal})`,
        undo: async () => {
          const cur = get();
          const nextSesi = [targetSesi, ...cur.sesiList];
          set({ sesiList: nextSesi });
          await syncFullPayloadToRelationalTables(cur.kelasList, cur.anggotaList, nextSesi);
          await persistKonsorsiumSnapshot(cur.kelasList, cur.anggotaList, nextSesi);
          return true;
        },
        redo: async () => {
          return get().hapusSesiPresensi(sesiId, true);
        },
      });
    }

    logActivity(
      'HAPUS_PRESENSI_KONSORSIUM',
      `Menghapus sesi presensi konsorsium tanggal ${targetSesi.tanggal}`
    );

    return true;
  },
}));
