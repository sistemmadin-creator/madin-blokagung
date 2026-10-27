import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CascadeAsatidzService } from '@/lib/services/cascadeAsatidzService';
import { SyncFanJadwalService } from '@/lib/services/syncFanJadwalService';
import { Asatidz } from '@/types/asatidz';

// Mock supabase client
vi.mock('@/lib/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              key: 'FAN_PELAJARAN_DETAIL',
              value: JSON.stringify({
                item: {
                  '1 ULA||(Pegon) Pegon Al-Itqon': {
                    pengajar: 'MS',
                    asatidz: ['DEWI MASYITOH ANNEIRA RAHMA', 'KUNI NAFI\'AH'],
                  },
                },
              }),
            },
            {
              key: 'JADWAL_MENGAJAR_ASATIDZ',
              value: JSON.stringify({
                'DEWI MASYITOH ANNEIRA RAHMA': {
                  nama_asatidz: 'Dewi Masyitoh Anneira Rahma',
                  mengajar: '1 B ULA',
                  totalJam: 20,
                  sabtu: 'Jam 1 | Pegon | 1 B ULA (PI) (Gp 5 utara C. 02)',
                },
                'KUNI NAFI\'AH': {
                  nama_asatidz: 'Kuni Nafi\'ah',
                  mengajar: '1 A ULA',
                  totalJam: 20,
                  sabtu: 'Jam 1 | Pegon | 1 A ULA (PI) (Gp 5 utara C. 01)',
                },
              }),
            },
          ],
        }),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }),
    },
  };
});

describe('Cascade Deletion & Synchronization Engine', () => {
  const mockTeacher: Asatidz = {
    id: 't1',
    nia: 'C2',
    nama_asatidz: 'DEWI MASYITOH ANNEIRA RAHMA',
    jah_asatidz: 'Mustahiqoh',
    tingkat_asatidz: 'ULA',
    din_kls_asatidz: '1',
    din_bag_asatidz: 'B',
    pa_pi: 'PI',
  };

  it('berhasil menghapus asatidz secara cascade dan menghasilkan snapshot undo', async () => {
    const snapshot = await CascadeAsatidzService.cascadeDeleteAsatidz([mockTeacher]);
    expect(snapshot).not.toBeNull();
    expect(snapshot?.deletedAsatidz[0].nia).toBe('C2');
    expect(snapshot?.fanDetailBefore).toBeDefined();
    expect(snapshot?.jadwalMapBefore).toBeDefined();
  });

  it('berhasil memulihkan snapshot ketika aksi dibatalkan (undo)', async () => {
    const snapshot = await CascadeAsatidzService.cascadeDeleteAsatidz([mockTeacher]);
    if (snapshot) {
      const restored = await CascadeAsatidzService.restoreSnapshot(snapshot);
      expect(restored).toBe(true);
    }
  });

  it('tidak error jika daftar asatidz yang dihapus kosong', async () => {
    const res = await CascadeAsatidzService.cascadeDeleteAsatidz([]);
    expect(res).toBeNull();
  });
});
