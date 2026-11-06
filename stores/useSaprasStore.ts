import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import { useUndoRedoStore } from '@/stores/useUndoRedoStore';
import { FormasiKelas } from '@/types/formasi';
import { Santri } from '@/types/santri';
import {
  ItemSaprasTambahan,
  KelasSaprasOverride,
  KelasSaprasRow,
  KondisiSapras,
  SaprasDistribusiLog,
  SaprasLogistikStok,
  SaprasTiketPerbaikan,
  StatusTiketPerbaikan,
  UrgensiPerbaikan,
} from '@/types/sapras';

export const KEY_DB_SAPRAS_DATA = 'MADIN_PKM_SAPRAS_DATA_V1';
export const LS_SAPRAS_DATA = 'MADIN_PKM_SAPRAS_LOCAL_V1';

export const DEFAULT_LOGISTIK_STOK: SaprasLogistikStok[] = [
  {
    id: 'log-spidol-hitam',
    kode: 'ATK-001',
    namaBarang: 'Spidol Boardmarker Hitam (Snowman BG-12)',
    kategori: 'ATK_PAPAN',
    satuan: 'Pcs',
    stokSaatIni: 185,
    batasMinimum: 40,
    updatedAt: '2026-11-06T07:00:00.000Z',
  },
  {
    id: 'log-tinta-refill',
    kode: 'ATK-002',
    namaBarang: 'Tinta Refill Spidol Whiteboard Hitam',
    kategori: 'ATK_PAPAN',
    satuan: 'Botol',
    stokSaatIni: 64,
    batasMinimum: 20,
    updatedAt: '2026-11-06T07:00:00.000Z',
  },
  {
    id: 'log-penghapus-papan',
    kode: 'ATK-003',
    namaBarang: 'Penghapus Papan Tulis Whiteboard',
    kategori: 'ATK_PAPAN',
    satuan: 'Pcs',
    stokSaatIni: 48,
    batasMinimum: 15,
    updatedAt: '2026-11-06T07:00:00.000Z',
  },
  {
    id: 'log-spidol-biru',
    kode: 'ATK-004',
    namaBarang: 'Spidol Boardmarker Biru / Merah',
    kategori: 'ATK_PAPAN',
    satuan: 'Pcs',
    stokSaatIni: 42,
    batasMinimum: 15,
    updatedAt: '2026-11-06T07:00:00.000Z',
  },
  {
    id: 'log-lampu-led',
    kode: 'ELK-001',
    namaBarang: 'Lampu LED Ruang Kelas 18 Watt',
    kategori: 'KELISTRIKAN',
    satuan: 'Unit',
    stokSaatIni: 12,
    batasMinimum: 15,
    updatedAt: '2026-11-06T07:00:00.000Z',
  },
];

export const DEFAULT_DISTRIBUSI_LOGS: SaprasDistribusiLog[] = [
  {
    id: 'dist-default-1',
    logistikId: 'log-spidol-hitam',
    namaBarang: 'Spidol Boardmarker Hitam (Snowman BG-12)',
    satuan: 'Pcs',
    jumlah: 2,
    kelasKey: '1_ULA_A',
    kelasLabel: '1 ULA A',
    penerima: 'FIKRUL UMAM AL HANIF',
    tanggal: '2026-11-06',
    catatan: 'Pembagian rutin awal pekan KBM',
  },
  {
    id: 'dist-default-2',
    logistikId: 'log-penghapus-papan',
    namaBarang: 'Penghapus Papan Tulis Whiteboard',
    satuan: 'Pcs',
    jumlah: 1,
    kelasKey: '1_WUSTHO_A',
    kelasLabel: '1 WUSTHO A',
    penerima: 'RIZQI MAULANA ACHMAD',
    tanggal: '2026-11-06',
    catatan: 'Penggantian penghapus kelas yang aus',
  },
];

const FALLBACK_CLASSES: Array<{
  tingkat: string;
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  mustahiq: string;
  blokDiniyyah: string;
  lokasiDiniyyah: string;
  blokTakror: string;
  lokasiTakror: string;
}> = [
  {
    tingkat: 'ULA',
    din_kls: '1',
    din_bag: 'A',
    pa_pi: 'PA',
    mustahiq: 'FIKRUL UMAM AL HANIF',
    blokDiniyyah: 'Gedung Utama Ula Putra',
    lokasiDiniyyah: 'Ruang 1 Ula A (Lantai 1)',
    blokTakror: 'Serambi Masjid Agung',
    lokasiTakror: 'Sektor Utara 1',
  },
  {
    tingkat: 'ULA',
    din_kls: '1',
    din_bag: 'E',
    pa_pi: 'PA',
    mustahiq: 'AHMAD ZAINURI',
    blokDiniyyah: 'Gedung Utama Ula Putra',
    lokasiDiniyyah: 'Ruang 1 Ula E (Lantai 1)',
    blokTakror: 'Serambi Masjid Agung',
    lokasiTakror: 'Sektor Utara 5',
  },
  {
    tingkat: 'WUSTHO',
    din_kls: '1',
    din_bag: 'A',
    pa_pi: 'PA',
    mustahiq: 'RIZQI MAULANA ACHMAD',
    blokDiniyyah: 'Gedung Wustho Al Amiriyyah',
    lokasiDiniyyah: 'Ruang 1 Wustho A (Lantai 2)',
    blokTakror: 'Aula Darussalam',
    lokasiTakror: 'Blok Tengah A',
  },
  {
    tingkat: 'ULYA',
    din_kls: '1',
    din_bag: 'A',
    pa_pi: 'PA',
    mustahiq: 'KH. AHMAD SYAFII',
    blokDiniyyah: 'Gedung Ulya Timur',
    lokasiDiniyyah: 'Ruang 1 Ulya A',
    blokTakror: 'Musholla Al-Amiriyyah',
    lokasiTakror: 'Sektor Utama',
  },
];

function normUpper(val?: string | null): string {
  return String(val || '')
    .trim()
    .toUpperCase();
}

export function normalizeTingkatLabel(raw?: string | null): string {
  const up = normUpper(raw);
  if (up.includes('ULA')) return 'ULA';
  if (up.includes('WUSTHO') || up.includes('WUSTHA')) return 'WUSTHO';
  if (up.includes('ULYA')) return 'ULYA';
  if (up.includes('ISTI')) return 'ISTIDAD';
  return up || 'ULA';
}

export function buildKelasSaprasRows(
  formasiList: FormasiKelas[],
  santriList: Santri[],
  overrides: Record<string, KelasSaprasOverride>
): KelasSaprasRow[] {
  const map = new Map<
    string,
    {
      kelasKey: string;
      shortBadge: string;
      kelasLabel: string;
      tingkat: string;
      din_kls: string;
      din_bag: string;
      pa_pi: 'PA' | 'PI';
      mustahiq: string;
      blokDiniyyah: string;
      lokasiDiniyyah: string;
      blokTakror: string;
      lokasiTakror: string;
    }
  >();

  // 1. Masukkan dari formasiList
  formasiList.forEach((f) => {
    const tk = normalizeTingkatLabel(f.tingkat);
    const kls = String(f.din_kls || '1').trim();
    const bag = normUpper(f.din_bag || 'A');
    const key = `${kls}_${tk}_${bag}`;
    map.set(key, {
      kelasKey: key,
      shortBadge: `${kls}${bag}`,
      kelasLabel: `${kls} ${tk} ${bag}`,
      tingkat: tk,
      din_kls: kls,
      din_bag: bag,
      pa_pi: f.pa_pi === 'PI' ? 'PI' : 'PA',
      mustahiq: f.id_mustahiq || '-',
      blokDiniyyah: f.blok_diniyyah || 'Gedung Madrasah',
      lokasiDiniyyah: f.lokasi_diniyyah || `Ruang ${kls} ${tk} ${bag}`,
      blokTakror: f.blok_takror || '-',
      lokasiTakror: f.lokasi_takror || '-',
    });
  });

  // 2. Pastikan kelas dari santriList juga tercakup
  santriList.forEach((s) => {
    const tk = normalizeTingkatLabel(s.tingkat);
    const kls = String(s.din_kls || '1').trim();
    const bag = normUpper(s.din_bag || 'A');
    if (!kls || !bag || kls === '-' || bag === '-') return;
    const key = `${kls}_${tk}_${bag}`;
    if (!map.has(key)) {
      map.set(key, {
        kelasKey: key,
        shortBadge: `${kls}${bag}`,
        kelasLabel: `${kls} ${tk} ${bag}`,
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        pa_pi: normUpper(s.pa_pi) === 'PI' ? 'PI' : 'PA',
        mustahiq: '-',
        blokDiniyyah: 'Gedung Madrasah',
        lokasiDiniyyah: `Ruang ${kls} ${tk} ${bag}`,
        blokTakror: '-',
        lokasiTakror: '-',
      });
    }
  });

  // 3. Pastikan kelas bawaan (1 ULA A, 1 WUSTHO A, 1 ULYA A, dst.) selalu tersedia
  FALLBACK_CLASSES.forEach((fc) => {
    const key = `${fc.din_kls}_${fc.tingkat}_${fc.din_bag}`;
    if (!map.has(key)) {
      map.set(key, {
        kelasKey: key,
        shortBadge: `${fc.din_kls}${fc.din_bag}`,
        kelasLabel: `${fc.din_kls} ${fc.tingkat} ${fc.din_bag}`,
        tingkat: fc.tingkat,
        din_kls: fc.din_kls,
        din_bag: fc.din_bag,
        pa_pi: fc.pa_pi,
        mustahiq: fc.mustahiq,
        blokDiniyyah: fc.blokDiniyyah,
        lokasiDiniyyah: fc.lokasiDiniyyah,
        blokTakror: fc.blokTakror,
        lokasiTakror: fc.lokasiTakror,
      });
    }
  });

  const orderTk: Record<string, number> = {
    ISTIDAD: 0,
    ULA: 1,
    WUSTHO: 2,
    ULYA: 3,
  };

  return Array.from(map.values())
    .sort((a, b) => {
      const tA = orderTk[a.tingkat] ?? 99;
      const tB = orderTk[b.tingkat] ?? 99;
      if (tA !== tB) return tA - tB;
      const kCmp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
      if (kCmp !== 0) return kCmp;
      return a.din_bag.localeCompare(b.din_bag, 'id');
    })
    .map((base) => {
      const ov = overrides[base.kelasKey];
      const papanKondisi: KondisiSapras = ov?.papanTulisKondisi || 'BAIK';
      const mejaKondisi: KondisiSapras = ov?.mejaGuruKondisi || 'BAIK';
      const penghapusKondisi: KondisiSapras = ov?.penghapusKondisi || 'BAIK';
      const spidolKondisi: KondisiSapras = ov?.spidolKondisi || 'BAIK';

      const isFullyHealthy =
        papanKondisi === 'BAIK' &&
        mejaKondisi === 'BAIK' &&
        penghapusKondisi === 'BAIK' &&
        spidolKondisi === 'BAIK';

      return {
        ...base,
        papanTulisKondisi: papanKondisi,
        papanTulisJumlah: ov?.papanTulisJumlah ?? 1,
        papanTulisSpesifikasi:
          ov?.papanTulisSpesifikasi || 'Whiteboard Kelas Standar (120 x 240 cm)',
        mejaGuruKondisi: mejaKondisi,
        mejaGuruJumlah: ov?.mejaGuruJumlah ?? 1,
        mejaGuruSpesifikasi:
          ov?.mejaGuruSpesifikasi || 'Meja Guru / Dampar Kayu Asatidz',
        penghapusKondisi,
        spidolKondisi,
        itemTambahan: ov?.itemTambahan || [],
        catatanKelas: ov?.catatanKelas,
        updatedAt: ov?.updatedAt || '2026-11-06T07:00:00.000Z',
        isFullyHealthy,
      };
    });
}

interface PersistedSaprasBundle {
  overrides: Record<string, KelasSaprasOverride>;
  tiketPerbaikan: SaprasTiketPerbaikan[];
  logistikStok: SaprasLogistikStok[];
  distribusiLogs: SaprasDistribusiLog[];
}

function readLocalSapras(): PersistedSaprasBundle {
  const fallback: PersistedSaprasBundle = {
    overrides: {},
    tiketPerbaikan: [],
    logistikStok: DEFAULT_LOGISTIK_STOK,
    distribusiLogs: DEFAULT_DISTRIBUSI_LOGS,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(LS_SAPRAS_DATA);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedSaprasBundle>;
    return {
      overrides:
        parsed.overrides && typeof parsed.overrides === 'object'
          ? parsed.overrides
          : {},
      tiketPerbaikan: Array.isArray(parsed.tiketPerbaikan)
        ? parsed.tiketPerbaikan
        : [],
      logistikStok:
        Array.isArray(parsed.logistikStok) && parsed.logistikStok.length > 0
          ? parsed.logistikStok
          : DEFAULT_LOGISTIK_STOK,
      distribusiLogs: Array.isArray(parsed.distribusiLogs)
        ? parsed.distribusiLogs
        : DEFAULT_DISTRIBUSI_LOGS,
    };
  } catch {
    return fallback;
  }
}

function writeLocalSapras(bundle: PersistedSaprasBundle) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_SAPRAS_DATA, JSON.stringify(bundle));
  } catch {
    // Abaikan error quota
  }
}

async function persistSaprasToCloud(bundle: PersistedSaprasBundle) {
  writeLocalSapras(bundle);
  try {
    await supabase.from('app_settings').upsert(
      {
        key: KEY_DB_SAPRAS_DATA,
        value: bundle,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );
  } catch {
    // Cadangan localStorage tetap tersimpan
  }
}

interface SaprasState {
  overrides: Record<string, KelasSaprasOverride>;
  tiketPerbaikan: SaprasTiketPerbaikan[];
  logistikStok: SaprasLogistikStok[];
  distribusiLogs: SaprasDistribusiLog[];
  isLoading: boolean;

  fetchSaprasData: () => Promise<void>;
  updateKondisiCepatKelas: (
    row: KelasSaprasRow,
    field:
      | 'papanTulisKondisi'
      | 'mejaGuruKondisi'
      | 'penghapusKondisi'
      | 'spidolKondisi',
    nextKondisi: KondisiSapras,
    actorName?: string
  ) => Promise<void>;
  saveDetailSaprasKelas: (
    row: KelasSaprasRow,
    updates: {
      papanTulisKondisi: KondisiSapras;
      papanTulisJumlah: number;
      papanTulisSpesifikasi: string;
      mejaGuruKondisi: KondisiSapras;
      mejaGuruJumlah: number;
      mejaGuruSpesifikasi: string;
      penghapusKondisi: KondisiSapras;
      spidolKondisi: KondisiSapras;
      itemTambahan: ItemSaprasTambahan[];
      catatanKelas?: string;
    },
    actorName?: string
  ) => Promise<void>;
  addTiketPerbaikan: (input: {
    row: KelasSaprasRow;
    itemType: 'PAPAN_TULIS' | 'MEJA_GURU' | 'LAINNYA';
    itemNama: string;
    kondisiAwal: KondisiSapras;
    deskripsiKerusakan: string;
    urgensi: UrgensiPerbaikan;
    pelapor: string;
  }) => Promise<void>;
  updateStatusTiket: (
    tiketId: string,
    nextStatus: StatusTiketPerbaikan,
    options?: { biayaPerbaikan?: number; catatanPenyelesaian?: string }
  ) => Promise<void>;
  deleteTiketPerbaikan: (tiketId: string) => Promise<void>;
  adjustStokLogistik: (logistikId: string, tambahJumlah: number) => Promise<void>;
  addDistribusiLogistik: (input: {
    logistikId: string;
    jumlah: number;
    kelasKey: string;
    kelasLabel: string;
    penerima: string;
    tanggal: string;
    catatan?: string;
  }) => Promise<void>;
}

export const useSaprasStore = create<SaprasState>((set, get) => ({
  overrides: {},
  tiketPerbaikan: [],
  logistikStok: DEFAULT_LOGISTIK_STOK,
  distribusiLogs: DEFAULT_DISTRIBUSI_LOGS,
  isLoading: false,

  fetchSaprasData: async () => {
    set({ isLoading: true });
    const local = readLocalSapras();
    set({
      overrides: local.overrides,
      tiketPerbaikan: local.tiketPerbaikan,
      logistikStok: local.logistikStok,
      distribusiLogs: local.distribusiLogs,
    });

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', KEY_DB_SAPRAS_DATA)
        .maybeSingle();

      if (!error && data && data.value && typeof data.value === 'object') {
        const val = data.value as Partial<PersistedSaprasBundle>;
        const merged: PersistedSaprasBundle = {
          overrides: val.overrides || local.overrides,
          tiketPerbaikan: Array.isArray(val.tiketPerbaikan)
            ? val.tiketPerbaikan
            : local.tiketPerbaikan,
          logistikStok:
            Array.isArray(val.logistikStok) && val.logistikStok.length > 0
              ? val.logistikStok
              : local.logistikStok,
          distribusiLogs: Array.isArray(val.distribusiLogs)
            ? val.distribusiLogs
            : local.distribusiLogs,
        };
        writeLocalSapras(merged);
        set({ ...merged, isLoading: false });
        return;
      }
    } catch {
      // Gunakan data lokal jika koneksi terputus
    }

    set({ isLoading: false });
  },

  updateKondisiCepatKelas: async (row, field, nextKondisi, actorName = 'PKM. Sapras') => {
    const state = get();
    const prevBundle: PersistedSaprasBundle = {
      overrides: state.overrides,
      tiketPerbaikan: state.tiketPerbaikan,
      logistikStok: state.logistikStok,
      distribusiLogs: state.distribusiLogs,
    };

    const now = new Date().toISOString();
    const currentOv: KelasSaprasOverride = state.overrides[row.kelasKey] || {
      kelasKey: row.kelasKey,
      papanTulisKondisi: row.papanTulisKondisi,
      papanTulisJumlah: row.papanTulisJumlah,
      papanTulisSpesifikasi: row.papanTulisSpesifikasi,
      mejaGuruKondisi: row.mejaGuruKondisi,
      mejaGuruJumlah: row.mejaGuruJumlah,
      mejaGuruSpesifikasi: row.mejaGuruSpesifikasi,
      penghapusKondisi: row.penghapusKondisi,
      spidolKondisi: row.spidolKondisi,
      itemTambahan: row.itemTambahan,
      catatanKelas: row.catatanKelas,
      updatedAt: now,
    };

    const nextOv: KelasSaprasOverride = {
      ...currentOv,
      [field]: nextKondisi,
      updatedAt: now,
      updatedBy: actorName,
    };

    const nextOverrides = {
      ...state.overrides,
      [row.kelasKey]: nextOv,
    };

    let nextTiket = [...state.tiketPerbaikan];

    // Jika Papan Tulis atau Meja Guru diubah menjadi RUSAK_RINGAN / RUSAK_BERAT, otomatis buat tiket perbaikan jika belum ada tiket aktif
    if (
      (field === 'papanTulisKondisi' || field === 'mejaGuruKondisi') &&
      (nextKondisi === 'RUSAK_RINGAN' || nextKondisi === 'RUSAK_BERAT')
    ) {
      const targetItemType =
        field === 'papanTulisKondisi' ? 'PAPAN_TULIS' : 'MEJA_GURU';
      const targetItemNama =
        field === 'papanTulisKondisi' ? 'Papan Tulis Kelas' : 'Meja Guru / Dampar';

      const hasActiveTicket = nextTiket.some(
        (t) =>
          t.kelasKey === row.kelasKey &&
          t.itemType === targetItemType &&
          t.status !== 'SELESAI'
      );

      if (!hasActiveTicket) {
        const autoTicket: SaprasTiketPerbaikan = {
          id: `tkt-${Date.now()}`,
          kelasKey: row.kelasKey,
          kelasLabel: row.kelasLabel,
          shortBadge: row.shortBadge,
          tingkat: row.tingkat,
          paPi: row.pa_pi,
          blokKbm: row.blokDiniyyah,
          itemType: targetItemType,
          itemNama: targetItemNama,
          kondisiAwal: nextKondisi,
          deskripsiKerusakan: `${targetItemNama} di kelas ${row.kelasLabel} tercatat dalam kondisi ${
            nextKondisi === 'RUSAK_BERAT' ? 'Rusak Berat' : 'Rusak Ringan'
          }.`,
          urgensi: nextKondisi === 'RUSAK_BERAT' ? 'DARURAT' : 'SEDANG',
          status: 'DILAPORKAN',
          pelapor: actorName,
          biayaPerbaikan: 0,
          createdAt: now,
          updatedAt: now,
        };
        nextTiket = [autoTicket, ...nextTiket];
      }
    }

    // Jika diubah kembali ke BAIK, tandai tiket aktif untuk item tersebut sebagai SELESAI
    if (
      (field === 'papanTulisKondisi' || field === 'mejaGuruKondisi') &&
      nextKondisi === 'BAIK'
    ) {
      const targetItemType =
        field === 'papanTulisKondisi' ? 'PAPAN_TULIS' : 'MEJA_GURU';
      nextTiket = nextTiket.map((t) =>
        t.kelasKey === row.kelasKey &&
        t.itemType === targetItemType &&
        t.status !== 'SELESAI'
          ? {
              ...t,
              status: 'SELESAI',
              catatanPenyelesaian: 'Kondisi ditandai Baik kembali pada Inventaris Kelas.',
              updatedAt: now,
            }
          : t
      );
    }

    const nextBundle: PersistedSaprasBundle = {
      overrides: nextOverrides,
      tiketPerbaikan: nextTiket,
      logistikStok: state.logistikStok,
      distribusiLogs: state.distribusiLogs,
    };

    set(nextBundle);
    await persistSaprasToCloud(nextBundle);

    useUndoRedoStore.getState().recordAction({
      module: 'umum',
      title: `[SAPRAS] Ubah Kondisi ${row.kelasLabel}`,
      undo: async () => {
        set(prevBundle);
        await persistSaprasToCloud(prevBundle);
      },
      redo: async () => {
        set(nextBundle);
        await persistSaprasToCloud(nextBundle);
      },
    });

    void logActivity(
      'UPDATE_SAPRAS_KELAS',
      `Mengubah kondisi ${field} kelas ${row.kelasLabel} menjadi ${nextKondisi}`
    );
  },

  saveDetailSaprasKelas: async (row, updates, actorName = 'PKM. Sapras') => {
    const state = get();
    const now = new Date().toISOString();
    const nextOv: KelasSaprasOverride = {
      kelasKey: row.kelasKey,
      ...updates,
      updatedAt: now,
      updatedBy: actorName,
    };

    const nextOverrides = {
      ...state.overrides,
      [row.kelasKey]: nextOv,
    };

    const nextBundle: PersistedSaprasBundle = {
      overrides: nextOverrides,
      tiketPerbaikan: state.tiketPerbaikan,
      logistikStok: state.logistikStok,
      distribusiLogs: state.distribusiLogs,
    };

    set(nextBundle);
    await persistSaprasToCloud(nextBundle);
  },

  addTiketPerbaikan: async (input) => {
    const state = get();
    const now = new Date().toISOString();
    const newTicket: SaprasTiketPerbaikan = {
      id: `tkt-${Date.now()}`,
      kelasKey: input.row.kelasKey,
      kelasLabel: input.row.kelasLabel,
      shortBadge: input.row.shortBadge,
      tingkat: input.row.tingkat,
      paPi: input.row.pa_pi,
      blokKbm: input.row.blokDiniyyah,
      itemType: input.itemType,
      itemNama: input.itemNama,
      kondisiAwal: input.kondisiAwal,
      deskripsiKerusakan: input.deskripsiKerusakan.trim(),
      urgensi: input.urgensi,
      status: 'DILAPORKAN',
      pelapor: input.pelapor || 'PKM. Sapras',
      biayaPerbaikan: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Sinkronkan juga kondisi di Inventaris Kelas apabila menyangkut Papan Tulis / Meja Guru
    const currentOv: KelasSaprasOverride = state.overrides[input.row.kelasKey] || {
      kelasKey: input.row.kelasKey,
      papanTulisKondisi: input.row.papanTulisKondisi,
      papanTulisJumlah: input.row.papanTulisJumlah,
      papanTulisSpesifikasi: input.row.papanTulisSpesifikasi,
      mejaGuruKondisi: input.row.mejaGuruKondisi,
      mejaGuruJumlah: input.row.mejaGuruJumlah,
      mejaGuruSpesifikasi: input.row.mejaGuruSpesifikasi,
      penghapusKondisi: input.row.penghapusKondisi,
      spidolKondisi: input.row.spidolKondisi,
      itemTambahan: input.row.itemTambahan,
      catatanKelas: input.row.catatanKelas,
      updatedAt: now,
    };

    const nextOverrides = { ...state.overrides };
    if (input.itemType === 'PAPAN_TULIS') {
      nextOverrides[input.row.kelasKey] = {
        ...currentOv,
        papanTulisKondisi: input.kondisiAwal,
        updatedAt: now,
      };
    } else if (input.itemType === 'MEJA_GURU') {
      nextOverrides[input.row.kelasKey] = {
        ...currentOv,
        mejaGuruKondisi: input.kondisiAwal,
        updatedAt: now,
      };
    }

    const nextBundle: PersistedSaprasBundle = {
      overrides: nextOverrides,
      tiketPerbaikan: [newTicket, ...state.tiketPerbaikan],
      logistikStok: state.logistikStok,
      distribusiLogs: state.distribusiLogs,
    };

    set(nextBundle);
    await persistSaprasToCloud(nextBundle);
  },

  updateStatusTiket: async (tiketId, nextStatus, options) => {
    const state = get();
    const now = new Date().toISOString();
    const targetTicket = state.tiketPerbaikan.find((t) => t.id === tiketId);
    if (!targetTicket) return;

    const nextTiket = state.tiketPerbaikan.map((t) => {
      if (t.id !== tiketId) return t;
      return {
        ...t,
        status: nextStatus,
        biayaPerbaikan:
          options?.biayaPerbaikan !== undefined
            ? options.biayaPerbaikan
            : t.biayaPerbaikan,
        catatanPenyelesaian:
          options?.catatanPenyelesaian !== undefined
            ? options.catatanPenyelesaian
            : t.catatanPenyelesaian,
        updatedAt: now,
      };
    });

    // Apabila tiket perbaikan ditandai SELESAI, otomatis kembalikan kondisi Papan Tulis / Meja Guru di kelas tersebut menjadi BAIK
    const nextOverrides = { ...state.overrides };
    if (nextStatus === 'SELESAI') {
      const existingOv = nextOverrides[targetTicket.kelasKey];
      if (existingOv) {
        nextOverrides[targetTicket.kelasKey] = {
          ...existingOv,
          papanTulisKondisi:
            targetTicket.itemType === 'PAPAN_TULIS'
              ? 'BAIK'
              : existingOv.papanTulisKondisi,
          mejaGuruKondisi:
            targetTicket.itemType === 'MEJA_GURU'
              ? 'BAIK'
              : existingOv.mejaGuruKondisi,
          updatedAt: now,
        };
      }
    }

    const nextBundle: PersistedSaprasBundle = {
      overrides: nextOverrides,
      tiketPerbaikan: nextTiket,
      logistikStok: state.logistikStok,
      distribusiLogs: state.distribusiLogs,
    };

    set(nextBundle);
    await persistSaprasToCloud(nextBundle);
  },

  deleteTiketPerbaikan: async (tiketId) => {
    const state = get();
    const nextBundle: PersistedSaprasBundle = {
      overrides: state.overrides,
      tiketPerbaikan: state.tiketPerbaikan.filter((t) => t.id !== tiketId),
      logistikStok: state.logistikStok,
      distribusiLogs: state.distribusiLogs,
    };
    set(nextBundle);
    await persistSaprasToCloud(nextBundle);
  },

  adjustStokLogistik: async (logistikId, tambahJumlah) => {
    const state = get();
    const now = new Date().toISOString();
    const nextStok = state.logistikStok.map((item) =>
      item.id === logistikId
        ? {
            ...item,
            stokSaatIni: Math.max(0, item.stokSaatIni + tambahJumlah),
            updatedAt: now,
          }
        : item
    );

    const nextBundle: PersistedSaprasBundle = {
      overrides: state.overrides,
      tiketPerbaikan: state.tiketPerbaikan,
      logistikStok: nextStok,
      distribusiLogs: state.distribusiLogs,
    };

    set(nextBundle);
    await persistSaprasToCloud(nextBundle);
  },

  addDistribusiLogistik: async (input) => {
    const state = get();
    const targetItem = state.logistikStok.find((i) => i.id === input.logistikId);
    if (!targetItem) return;

    const now = new Date().toISOString();
    const newDist: SaprasDistribusiLog = {
      id: `dist-${Date.now()}`,
      logistikId: targetItem.id,
      namaBarang: targetItem.namaBarang,
      satuan: targetItem.satuan,
      jumlah: input.jumlah,
      kelasKey: input.kelasKey,
      kelasLabel: input.kelasLabel,
      penerima: input.penerima,
      tanggal: input.tanggal,
      catatan: input.catatan,
    };

    const nextStok = state.logistikStok.map((item) =>
      item.id === targetItem.id
        ? {
            ...item,
            stokSaatIni: Math.max(0, item.stokSaatIni - input.jumlah),
            updatedAt: now,
          }
        : item
    );

    const nextBundle: PersistedSaprasBundle = {
      overrides: state.overrides,
      tiketPerbaikan: state.tiketPerbaikan,
      logistikStok: nextStok,
      distribusiLogs: [newDist, ...state.distribusiLogs],
    };

    set(nextBundle);
    await persistSaprasToCloud(nextBundle);
  },
}));
