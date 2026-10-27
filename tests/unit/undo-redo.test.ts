import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUndoRedoStore, MAX_HISTORY_STEPS } from '@/stores/useUndoRedoStore';
import { useJadwalStore } from '@/stores/useJadwalStore';

// Mock supabase dan audit
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: () => ({
      upsert: async () => ({ error: null }),
      insert: async () => ({ error: null }),
      select: () => ({
        eq: () => ({ single: async () => ({ data: null, error: null }) }),
      }),
    }),
  },
}));

vi.mock('@/lib/utils/audit', () => ({
  logActivity: async () => {},
}));

describe('useUndoRedoStore', () => {
  beforeEach(() => {
    useUndoRedoStore.getState().clearHistory();
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
    expect(nilai).toBe(0); // Nilai berhasil dikembalikan
    expect(useUndoRedoStore.getState().undoStack.length).toBe(0);
    expect(useUndoRedoStore.getState().redoStack.length).toBe(1);

    // Jalankan Redo
    const redoRes = await useUndoRedoStore.getState().redo();
    expect(redoRes).toBe(true);
    expect(nilai).toBe(10); // Nilai berhasil diterapkan ulang
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

  describe('Integrasi Undo & Redo pada Jadwal KBM', () => {
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

      // Update jadwal Ust. Ahmad di hari sabtu jam 1 diganti Fiqih
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

      // Periksa bahwa aksi telah direkam ke undoRedoStore
      const historyState = useUndoRedoStore.getState();
      expect(historyState.undoStack.length).toBe(1);
      expect(historyState.undoStack[0].title).toBe('Ganti Mapel Jam 1 menjadi Fiqih');
      expect(historyState.undoStack[0].module).toBe('jadwal');

      // Jalankan Undo: Jadwal harus kembali ke Nahwu
      const undoRes = await useUndoRedoStore.getState().undo();
      expect(undoRes).toBe(true);
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toContain('Nahwu');
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).not.toContain('Fiqih');
      expect(useUndoRedoStore.getState().redoStack.length).toBe(1);

      // Jalankan Redo: Jadwal harus kembali ke Fiqih
      const redoRes = await useUndoRedoStore.getState().redo();
      expect(redoRes).toBe(true);
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toContain('Fiqih');
      expect(useUndoRedoStore.getState().undoStack.length).toBe(1);
      expect(useUndoRedoStore.getState().redoStack.length).toBe(0);
    });

    it('mendukung rangkaian hingga 5 langkah undo berurutan pada jadwal', async () => {
      const jadwalStore = useJadwalStore.getState();

      // Lakukan 5 mutasi berturut-turut
      for (let i = 1; i <= 5; i++) {
        await jadwalStore.simpanBatchJadwalAsatidz(
          {
            'USTADZ AHMAD': {
              nama_asatidz: 'USTADZ AHMAD',
              sabtu: `Jam 1|1A|Mapel${i}`,
              total_jam: 1,
            },
          },
          `Ubah ke Mapel ${i}`
        );
      }

      expect(useUndoRedoStore.getState().undoStack.length).toBe(5);
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toBe('Jam 1|1A|Mapel5');

      // Undo langkah ke-5 (kembali ke Mapel 4)
      await useUndoRedoStore.getState().undo();
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toBe('Jam 1|1A|Mapel4');

      // Undo langkah ke-4 (kembali ke Mapel 3)
      await useUndoRedoStore.getState().undo();
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toBe('Jam 1|1A|Mapel3');

      // Undo langkah ke-3 (kembali ke Mapel 2)
      await useUndoRedoStore.getState().undo();
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toBe('Jam 1|1A|Mapel2');

      // Redo satu langkah (kembali ke Mapel 3)
      await useUndoRedoStore.getState().redo();
      expect(useJadwalStore.getState().jadwalMap['USTADZ AHMAD'].sabtu).toBe('Jam 1|1A|Mapel3');
    });
  });
});
