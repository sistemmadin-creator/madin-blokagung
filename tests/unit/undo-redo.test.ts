import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUndoRedoStore, MAX_HISTORY_STEPS } from '@/stores/useUndoRedoStore';
import { useJadwalStore } from '@/stores/useJadwalStore';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { calculateFieldDelta } from '@/lib/utils/deltaHelper';

// In-memory mock databases
let mockSantriDb: any[] = [];
let mockAsatidzDb: any[] = [];
let mockAppSettingsDb: Record<string, any> = {};

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'santri') {
        return {
          select: (_cols?: string) => ({
            order: async () => ({ data: [...mockSantriDb], error: null }),
            eq: (_col: string, val: any) => ({
              maybeSingle: async () => {
                const row = mockSantriDb.find((s) => s.no_induk === val);
                return { data: row || null, error: null };
              },
            }),
            in: async (_col: string, vals: any[]) => ({
              data: mockSantriDb.filter((s) => vals.includes(s.no_induk)),
              error: null,
            }),
          }),
          insert: async (rows: any[]) => {
            mockSantriDb.push(...rows);
            return { error: null };
          },
          update: (fields: any) => ({
            eq: async (_col: string, val: any) => {
              const idx = mockSantriDb.findIndex((s) => s.no_induk === val);
              if (idx !== -1) mockSantriDb[idx] = { ...mockSantriDb[idx], ...fields };
              return { error: null };
            },
          }),
          delete: () => ({
            eq: async (_col: string, val: any) => {
              mockSantriDb = mockSantriDb.filter((s) => s.no_induk !== val);
              return { error: null };
            },
            in: async (_col: string, vals: any[]) => {
              mockSantriDb = mockSantriDb.filter((s) => !vals.includes(s.no_induk));
              return { error: null };
            },
          }),
        };
      }

      if (table === 'asatidz') {
        return {
          select: (_cols?: string) => ({
            order: async () => ({ data: [...mockAsatidzDb], error: null }),
            eq: (_col: string, val: any) => ({
              maybeSingle: async () => {
                const row = mockAsatidzDb.find((a) => a.nia === val);
                return { data: row || null, error: null };
              },
            }),
            in: async (_col: string, vals: any[]) => ({
              data: mockAsatidzDb.filter((a) => vals.includes(a.nia)),
              error: null,
            }),
          }),
          insert: async (rows: any[]) => {
            mockAsatidzDb.push(...rows);
            return { error: null };
          },
          update: (fields: any) => ({
            eq: async (_col: string, val: any) => {
              const idx = mockAsatidzDb.findIndex((a) => a.nia === val);
              if (idx !== -1) mockAsatidzDb[idx] = { ...mockAsatidzDb[idx], ...fields };
              return { error: null };
            },
          }),
          delete: () => ({
            eq: async (_col: string, val: any) => {
              mockAsatidzDb = mockAsatidzDb.filter((a) => a.nia !== val);
              return { error: null };
            },
            in: async (_col: string, vals: any[]) => {
              mockAsatidzDb = mockAsatidzDb.filter((a) => !vals.includes(a.nia));
              return { error: null };
            },
          }),
        };
      }

      // Default app_settings handler
      return {
        upsert: async (payload: any) => {
          if (Array.isArray(payload)) {
            payload.forEach((item) => {
              mockAppSettingsDb[item.key] = item.value;
            });
          } else if (payload && payload.key) {
            mockAppSettingsDb[payload.key] = payload.value;
          }
          return { error: null };
        },
        select: (_cols?: string) => ({
          in: async () => ({
            data: Object.entries(mockAppSettingsDb).map(([key, value]) => ({ key, value })),
            error: null,
          }),
          eq: (_col: string, val: any) => ({
            single: async () => ({ data: mockAppSettingsDb[val] ? { value: mockAppSettingsDb[val] } : null, error: null }),
            maybeSingle: async () => ({ data: mockAppSettingsDb[val] ? { value: mockAppSettingsDb[val] } : null, error: null }),
          }),
        }),
      };
    },
  },
}));

vi.mock('@/lib/utils/audit', () => ({
  logActivity: async () => {},
}));

// Setup global browser dialogs
globalThis.confirm = vi.fn(() => true);
globalThis.alert = vi.fn();

describe('Central useUndoRedoStore Core', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
    mockSantriDb = [];
    mockAsatidzDb = [];
    mockAppSettingsDb = {};
  });

  it('harus membatasi kapasitas undo stack maksimal 5 langkah', () => {
    const store = useUndoRedoStore.getState();

    // Tambahkan 7 aksi secara berurutan
    for (let i = 1; i <= 7; i++) {
      store.recordAction({
        module: 'jadwal',
        title: `Aksi Jadwal ${i}`,
        undo: async () => {},
        redo: async () => {},
      });
    }

    const currentState = useUndoRedoStore.getState();
    expect(currentState.undoStack.length).toBe(MAX_HISTORY_STEPS);
    expect(currentState.undoStack.length).toBe(5);

    // Pastikan aksi tertua (Aksi 1 dan 2) sudah terbuang, dan yang tersisa adalah 3, 4, 5, 6, 7
    expect(currentState.undoStack[0].title).toBe('Aksi Jadwal 3');
    expect(currentState.undoStack[4].title).toBe('Aksi Jadwal 7');
  });

  it('harus membalikkan aksi saat undo dipanggil dan mengisi redo stack', async () => {
    let nilai = 0;
    const store = useUndoRedoStore.getState();

    store.recordAction({
      module: 'jadwal',
      title: 'Tambah nilai ke 10',
      undo: async () => {
        nilai = 0;
      },
      redo: async () => {
        nilai = 10;
      },
    });

    nilai = 10;
    expect(useUndoRedoStore.getState().undoStack.length).toBe(1);
    expect(useUndoRedoStore.getState().redoStack.length).toBe(0);

    // Jalankan Undo
    const undoRes = await useUndoRedoStore.getState().undo();
    expect(undoRes).toBe(true);
    expect(nilai).toBe(0);
    expect(useUndoRedoStore.getState().undoStack.length).toBe(0);
    expect(useUndoRedoStore.getState().redoStack.length).toBe(1);

    // Jalankan Redo
    const redoRes = await useUndoRedoStore.getState().redo();
    expect(redoRes).toBe(true);
    expect(nilai).toBe(10);
    expect(useUndoRedoStore.getState().undoStack.length).toBe(1);
    expect(useUndoRedoStore.getState().redoStack.length).toBe(0);
  });

  it('harus mereset redo stack ketika ada aksi baru yang direkam', async () => {
    const store = useUndoRedoStore.getState();

    store.recordAction({
      module: 'jadwal',
      title: 'Aksi 1',
      undo: async () => {},
      redo: async () => {},
    });

    // Undo aksi 1 agar masuk ke redo stack
    await useUndoRedoStore.getState().undo();
    expect(useUndoRedoStore.getState().redoStack.length).toBe(1);

    // Lakukan aksi baru (Aksi 2)
    useUndoRedoStore.getState().recordAction({
      module: 'jadwal',
      title: 'Aksi 2',
      undo: async () => {},
      redo: async () => {},
    });

    // Redo stack harus kosong kembali
    expect(useUndoRedoStore.getState().redoStack.length).toBe(0);
    expect(useUndoRedoStore.getState().undoStack.length).toBe(1);
    expect(useUndoRedoStore.getState().undoStack[0].title).toBe('Aksi 2');
  });
});

describe('Integrasi Modul 1: Jadwal KBM Undo/Redo', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
    useJadwalStore.setState({
      jadwalMap: {
        'USTADZ AHMAD': {
          nama_asatidz: 'USTADZ AHMAD',
          sabtu: 'Jam 1|1A|Nahwu;;Jam 2|1A|Shorof',
          total_jam: 2,
        },
      },
    });
  });

  it('otomatis merekam aksi riwayat saat simpanBatchJadwalAsatidz dipanggil', async () => {
    const jadwalStore = useJadwalStore.getState();

    const updateResult = await jadwalStore.simpanBatchJadwalAsatidz(
      {
        'USTADZ AHMAD': {
          nama_asatidz: 'USTADZ AHMAD',
          sabtu: 'Jam 1|1A|Fiqih;;Jam 2|1A|Shorof',
          total_jam: 2,
        },
      },
      'Ganti Mapel Jam 1 menjadi Fiqih'
    );

    expect(updateResult).toBe(true);
    expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toContain('Fiqih');

    const historyState = useUndoRedoStore.getState();
    expect(historyState.undoStack.length).toBe(1);
    expect(historyState.undoStack[0].title).toBe('Ganti Mapel Jam 1 menjadi Fiqih');
    expect(historyState.undoStack[0].module).toBe('jadwal');

    // Undo -> kembali ke Nahwu
    await useUndoRedoStore.getState().undo();
    expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toContain('Nahwu');
    expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).not.toContain('Fiqih');

    // Redo -> kembali ke Fiqih
    await useUndoRedoStore.getState().redo();
    expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toContain('Fiqih');
  });
});

describe('Integrasi Modul 2: Absensi Asatidz Undo/Redo', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
    useAbsensiStore.setState({
      selectedDate: '2026-10-27',
      hari: 'Selasa',
      rawBucketMap: {},
      liburMapByDate: {},
      sesiHariIni: {
        1: [
          {
            nama: 'USTADZ KHALIL',
            nia: '101',
            tingkat: 'Wustho',
            dinKls: '1',
            dinBag: 'A',
            blok: 'Pusat',
            gender: 'PA',
            kelasMengajar: '1A',
            fan: 'Nahwu',
            lokasi: 'Gedung A',
          } as any,
        ],
        2: [],
        3: [],
        4: [],
      },
      savedRecords: {},
      pendingStatus: {},
    });
  });

  it('otomatis merekam aksi saat simpanAbsensiJam dan mendukung undo/redo', async () => {
    const absensiStore = useAbsensiStore.getState();

    // Simpan absensi jam 1
    const res = await absensiStore.simpanAbsensiJam(1, 'Admin Tester');
    expect(res.success).toBe(true);
    expect(Object.keys(useAbsensiStore.getState().rawBucketMap).length).toBe(1);

    const undoStore = useUndoRedoStore.getState();
    expect(undoStore.undoStack.length).toBe(1);
    expect(undoStore.undoStack[0].module).toBe('absensi');

    // Undo simpan absensi -> rawBucketMap kembali kosong
    await useUndoRedoStore.getState().undo();
    expect(Object.keys(useAbsensiStore.getState().rawBucketMap).length).toBe(0);

    // Redo simpan absensi -> rawBucketMap terisi kembali
    await useUndoRedoStore.getState().redo();
    expect(Object.keys(useAbsensiStore.getState().rawBucketMap).length).toBe(1);
  });

  it('merekam aksi setHariLibur dan mendukung undo/redo', async () => {
    const absensiStore = useAbsensiStore.getState();

    await absensiStore.setHariLibur('2026-10-27', {
      tanggal: '2026-10-27',
      hari: 'Selasa',
      kategori: 'Libur',
      keterangan: 'Hari Libur Nasional',
      waktuUpdate: '',
      diinputOleh: 'Admin',
    });
    expect(useAbsensiStore.getState().liburMapByDate['2026-10-27']?.keterangan).toBe('Hari Libur Nasional');

    // Undo -> hari libur dicabut (kembali undefined)
    await useUndoRedoStore.getState().undo();
    expect(useAbsensiStore.getState().liburMapByDate['2026-10-27']).toBeUndefined();

    // Redo -> hari libur aktif kembali
    await useUndoRedoStore.getState().redo();
    expect(useAbsensiStore.getState().liburMapByDate['2026-10-27']?.keterangan).toBe('Hari Libur Nasional');
  });
});

describe('Integrasi Modul 3: Data Santri & Asatidz Undo/Redo', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
    mockSantriDb = [];
    mockAsatidzDb = [];
    useSantriStore.setState({ santriList: [] });
    useAsatidzStore.setState({ asatidzList: [] });
  });

  it('merekam aksi tambah & hapus santri dan mendukung undo/redo', async () => {
    const santriStore = useSantriStore.getState();
    const santriBaru: any = {
      no_induk: 'S001',
      nama: 'Ahmad Faiz',
      tingkat: 'Ula',
      din_kls: '1',
      din_bag: 'A',
      pa_pi: 'PA',
    };

    // 1. Tambah Santri
    await santriStore.saveSantri(santriBaru, false);
    expect(useSantriStore.getState().santriList.length).toBe(1);
    expect(useUndoRedoStore.getState().undoStack[0].title).toBe('Tambah Santri: Ahmad Faiz');

    // Undo tambah -> santri terhapus
    await useUndoRedoStore.getState().undo();
    expect(useSantriStore.getState().santriList.length).toBe(0);

    // Redo tambah -> santri kembali ada
    await useUndoRedoStore.getState().redo();
    expect(useSantriStore.getState().santriList.length).toBe(1);

    // 2. Hapus Santri
    await santriStore.deleteSantri('S001');
    expect(useSantriStore.getState().santriList.length).toBe(0);

    // Undo hapus -> santri pulih
    await useUndoRedoStore.getState().undo();
    expect(useSantriStore.getState().santriList.length).toBe(1);
    expect(useSantriStore.getState().santriList[0].nama).toBe('Ahmad Faiz');
  });

  it('merekam aksi tambah & hapus asatidz dan mendukung undo/redo', async () => {
    const asatidzStore = useAsatidzStore.getState();
    const asatidzBaru: any = {
      nia: 'A001',
      nama_asatidz: 'Ust. Zaid',
      kategori: 'Tetap',
      tugas_mengajar: 'Nahwu',
    };

    // 1. Tambah Asatidz
    await asatidzStore.saveAsatidz(asatidzBaru, false);
    expect(useAsatidzStore.getState().asatidzList.length).toBe(1);
    expect(useUndoRedoStore.getState().undoStack[0].title).toBe('Tambah Asatidz: Ust. Zaid');

    // Undo tambah -> asatidz terhapus
    await useUndoRedoStore.getState().undo();
    expect(useAsatidzStore.getState().asatidzList.length).toBe(0);

    // Redo tambah -> asatidz kembali ada
    await useUndoRedoStore.getState().redo();
    expect(useAsatidzStore.getState().asatidzList.length).toBe(1);

    // 2. Hapus Asatidz
    await asatidzStore.deleteAsatidz('A001');
    expect(useAsatidzStore.getState().asatidzList.length).toBe(0);

    // Undo hapus -> asatidz pulih
    await useUndoRedoStore.getState().undo();
    expect(useAsatidzStore.getState().asatidzList.length).toBe(1);
    expect(useAsatidzStore.getState().asatidzList[0].nama_asatidz.toUpperCase()).toBe('UST. ZAID');
  });
});

describe('Integrasi Modul 4: Setoran Muhafadzoh Undo/Redo', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
    useMuhafadzohStore.setState({
      setoranList: [],
      config: {
        hafWajib: {},
        hafSunnah: {},
        hafKitab: {},
        penjagaBebas: [],
      },
    });
  });

  it('merekam aksi addSetoran dan mendukung undo/redo', async () => {
    const muhafadzohStore = useMuhafadzohStore.getState();
    const entry: any = {
      id: 'SET-1',
      no_induk: 'S001',
      nama: 'Ahmad Faiz',
      tanggal: '2026-10-27 08:00',
      item_hafalan: 'Juz Amma',
      kategori: 'Wajib',
      penjaga: 'Ust. Ali',
    };

    // Tambah setoran
    await muhafadzohStore.addSetoran(entry);
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(1);
    expect(useUndoRedoStore.getState().undoStack[0].title).toBe('Tambah Setoran: Ahmad Faiz (Juz Amma)');

    // Undo tambah -> setoran kembali kosong
    await useUndoRedoStore.getState().undo();
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(0);

    // Redo tambah -> setoran ada lagi
    await useUndoRedoStore.getState().redo();
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(1);
    expect(useMuhafadzohStore.getState().setoranList[0].item_hafalan).toBe('Juz Amma');
  });

  it('merekam aksi deleteSetoran & bulkDeleteSetoran dan mendukung undo/redo', async () => {
    const muhafadzohStore = useMuhafadzohStore.getState();
    useMuhafadzohStore.setState({
      setoranList: [
        {
          id: 'SET-1',
          no_induk: 'S001',
          nama: 'Santri 1',
          tanggal: '2026-10-27 08:00',
          item_hafalan: 'Juz 1',
          kategori: 'Wajib',
          penjaga: 'Ust. Ali',
        } as any,
        {
          id: 'SET-2',
          no_induk: 'S002',
          nama: 'Santri 2',
          tanggal: '2026-10-27 08:30',
          item_hafalan: 'Juz 2',
          kategori: 'Wajib',
          penjaga: 'Ust. Ali',
        } as any,
      ],
    });

    // 1. Delete single setoran
    await muhafadzohStore.deleteSetoran('SET-1');
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(1);
    expect(useMuhafadzohStore.getState().setoranList[0].id).toBe('SET-2');

    // Undo delete -> setoran SET-1 kembali
    await useUndoRedoStore.getState().undo();
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(2);

    // 2. Bulk delete
    await muhafadzohStore.bulkDeleteSetoran(['S001', 'S002']);
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(0);

    // Undo bulk delete -> kedua setoran kembali
    await useUndoRedoStore.getState().undo();
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(2);
  });

  it('merekam aksi saveConfig target hafalan dan mendukung undo/redo', async () => {
    const muhafadzohStore = useMuhafadzohStore.getState();
    const oldConfig = useMuhafadzohStore.getState().config;
    const newConfig = {
      hafWajib: { Ula_1: ['Surah An-Naba', 'Surah An-Naziat'] },
      hafSunnah: {},
      hafKitab: {},
      penjagaBebas: ['Ust. Zaid'],
    };

    await muhafadzohStore.saveConfig(newConfig);
    expect(useMuhafadzohStore.getState().config.penjagaBebas).toContain('Ust. Zaid');

    // Undo -> config kembali ke oldConfig
    await useUndoRedoStore.getState().undo();
    expect(useMuhafadzohStore.getState().config.penjagaBebas.length).toBe(0);

    // Redo -> config kembali ke newConfig
    await useUndoRedoStore.getState().redo();
    expect(useMuhafadzohStore.getState().config.penjagaBebas).toContain('Ust. Zaid');
  });
});

describe('Delta Helper Engine: calculateFieldDelta', () => {
  it('harus mendeteksi perbedaan kolom dengan benar dan membuat prevDelta & nextDelta', () => {
    const prev = { id: 1, nama: 'Ahmad', status: 'Aktif', alamat: 'Banyuwangi' };
    const next = { id: 1, nama: 'Ahmad Fauzi', status: 'Aktif', alamat: 'Genteng' };

    const { prevDelta, nextDelta, changedKeys, hasChanges } = calculateFieldDelta(prev, next);

    expect(hasChanges).toBe(true);
    expect(changedKeys).toEqual(['nama', 'alamat']);
    expect(prevDelta).toEqual({ nama: 'Ahmad', alamat: 'Banyuwangi' });
    expect(nextDelta).toEqual({ nama: 'Ahmad Fauzi', alamat: 'Genteng' });
  });

  it('harus mengabaikan kolom metadata (id, created_at, updated_at)', () => {
    const prev = { id: 'uuid-1', created_at: '2026-01-01', updated_at: '2026-01-01', status: 'Aktif' };
    const next = { id: 'uuid-1', created_at: '2026-01-01', updated_at: '2026-01-02', status: 'Aktif' };

    const { hasChanges, changedKeys } = calculateFieldDelta(prev, next);
    expect(hasChanges).toBe(false);
    expect(changedKeys.length).toBe(0);
  });

  it('mengembalikan hasChanges false jika kedua objek sama', () => {
    const objA = { nama: 'Zaid', nia: 'A001' };
    const objB = { nama: 'Zaid', nia: 'A001' };

    const { hasChanges } = calculateFieldDelta(objA, objB);
    expect(hasChanges).toBe(false);
  });
});

describe('Konkurensi & Multi-User Safety (Fase 1: Delta Inversion & Granular Scope)', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
    mockSantriDb = [];
    mockAsatidzDb = [];
    mockAppSettingsDb = {};
    useSantriStore.setState({ santriList: [] });
    useAsatidzStore.setState({ asatidzList: [] });
    useAbsensiStore.setState({ rawBucketMap: {}, liburMapByDate: {} });
    useMuhafadzohStore.setState({ setoranList: [] });
  });

  it('Data Santri: Undo hanya membatalkan field yang diedit (Delta Diff) tanpa merusak field yang diubah user lain', async () => {
    const santriStore = useSantriStore.getState();

    // Data awal
    const awal: any = {
      no_induk: 'S101',
      nama: 'Ahmad',
      status: 'Aktif',
      alamat: 'Banyuwangi',
    };
    mockSantriDb = [{ ...awal }];
    useSantriStore.setState({ santriList: [{ ...awal }] });

    // 1. User A mengedit status: Aktif -> Boyong
    const editUserA = { ...awal, status: 'Boyong' };
    await santriStore.saveSantri(editUserA, true, 'S101');
    expect(mockSantriDb[0].status).toBe('Boyong');

    // 2. Simulasi User B (concurrent user) mengubah alamat santri di database: Banyuwangi -> Genteng
    mockSantriDb[0].alamat = 'Genteng';

    // 3. User A melakukan Undo pada aksinya
    await useUndoRedoStore.getState().undo();

    // Status kembali ke 'Aktif' (Undo aksi User A)
    expect(mockSantriDb[0].status).toBe('Aktif');
    // Alamat 'Genteng' milik User B TETAP UTUH (tidak tertimpa kembali ke 'Banyuwangi')!
    expect(mockSantriDb[0].alamat).toBe('Genteng');
  });

  it('Absensi Asatidz: restoreAbsensiBucket hanya memodifikasi jam terkait tanpa menimpa jam lain dari user lain', async () => {
    const absensiStore = useAbsensiStore.getState();

    // Simulasi data awal: Jam 2 sudah diabsen oleh User B
    const bucketJam2: any = {
      tanggal: '2026-10-27',
      hari: 'Selasa',
      jamKe: 'Jam 2',
      waktuUpdate: '10:00',
      diinputOleh: 'User B',
      data: [['ABS-B1', '2026-10-27', 'Selasa', 'Jam 2', 'Ust. Umar', 'A02', 'Ula', '1', 'A', 'Blok A', 'PA', '1 A', 'Nahwu', 'R1', 'Hadir', '', '', '', 'User B', '10:00']],
    };
    useAbsensiStore.setState({
      rawBucketMap: {
        '2026-10-27|Jam 2': bucketJam2,
      },
    });

    // User A mengabsen Jam 1
    const bucketJam1: any = {
      tanggal: '2026-10-27',
      hari: 'Selasa',
      jamKe: 'Jam 1',
      waktuUpdate: '10:15',
      diinputOleh: 'User A',
      data: [['ABS-A1', '2026-10-27', 'Selasa', 'Jam 1', 'Ust. Zaid', 'A01', 'Ula', '1', 'A', 'Blok A', 'PA', '1 A', 'Fiqih', 'R1', 'Hadir', '', '', '', 'User A', '10:15']],
    };
    await absensiStore.restoreAbsensiBucket('2026-10-27|Jam 1', bucketJam1, 'Simpan Jam 1');

    // Kedua bucket ada
    expect(useAbsensiStore.getState().rawBucketMap['2026-10-27|Jam 1']).toBeDefined();
    expect(useAbsensiStore.getState().rawBucketMap['2026-10-27|Jam 2']).toBeDefined();

    // User A meng-undo pengabsenan Jam 1 (bucket Jam 1 dihapus kembali ke null)
    await absensiStore.restoreAbsensiBucket('2026-10-27|Jam 1', null, 'Undo Jam 1');

    // Bucket Jam 1 terhapus, tetapi Bucket Jam 2 milik User B tetap aman 100%!
    expect(useAbsensiStore.getState().rawBucketMap['2026-10-27|Jam 1']).toBeUndefined();
    expect(useAbsensiStore.getState().rawBucketMap['2026-10-27|Jam 2']).toBeDefined();
    expect(useAbsensiStore.getState().rawBucketMap['2026-10-27|Jam 2'].diinputOleh).toBe('User B');
  });

  it('Muhafadzoh: Granular Undo addSetoran hanya menghapus setoran sendiri tanpa merusak setoran yang ditambah user lain', async () => {
    const muhafadzohStore = useMuhafadzohStore.getState();

    // User A menambah setoran
    const setoranA: any = {
      id: 'SET-A',
      no_induk: 'S101',
      nama: 'Santri A',
      tanggal: '2026-10-27',
      item_hafalan: 'Juz 1',
      kategori: 'Wajib',
      penjaga: 'Ust. Zaid',
    };
    await muhafadzohStore.addSetoran(setoranA);
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(1);

    // Simulasi User B (concurrent) menambahkan setoran di waktu bersamaan
    const setoranB: any = {
      id: 'SET-B',
      no_induk: 'S102',
      nama: 'Santri B',
      tanggal: '2026-10-27',
      item_hafalan: 'Juz 2',
      kategori: 'Wajib',
      penjaga: 'Ust. Umar',
    };
    useMuhafadzohStore.setState((state) => ({
      setoranList: [setoranB, ...state.setoranList],
    }));
    expect(useMuhafadzohStore.getState().setoranList.length).toBe(2);

    // User A melakukan Undo
    await useUndoRedoStore.getState().undo();

    // Setoran A terhapus, namun Setoran B milik User B tetap aman!
    const remainingList = useMuhafadzohStore.getState().setoranList;
    expect(remainingList.length).toBe(1);
    expect(remainingList[0].nama).toBe('Santri B');
  });
});
