import { describe, it, expect, beforeEach } from 'vitest';
import { useSetorMustahiqStore } from '@/stores/useSetorMustahiqStore';
import { isPureTahfidz } from '@/lib/utils/setoranHelper';
import { ItemHafalanDetail } from '@/types/setoran';

describe('Setoran Deduplication & Pure Tahfidz Detection', () => {
  describe('Helper: isPureTahfidz', () => {
    it('membedakan Juz Al-Qur\'an asli dan Juz Amma kurikulum reguler secara akurat', () => {
      // Pure Tahfidz
      expect(isPureTahfidz('Juz 1', 'Tahfidz')).toBe(true);
      expect(isPureTahfidz('Juz 3', 'Tahfidz')).toBe(true);
      expect(isPureTahfidz('Juz 30', 'Tahfidz')).toBe(true);
      expect(isPureTahfidz('juz 5', 'Tahfidz')).toBe(true);

      // Reguler Wajib/Sunnah (TIDAK boleh dianggap Tahfidz meskipun ada kata "Juz")
      expect(isPureTahfidz("Juz Amma' (An-Naas - Adh-Dhuha)", 'Wajib')).toBe(false);
      expect(isPureTahfidz("Juz Amma'", 'Wajib')).toBe(false);
      expect(isPureTahfidz("JUZ AMMA", 'Wajib')).toBe(false);
      expect(isPureTahfidz("Nadhom Al-Imrithi", 'Wajib')).toBe(false);
      expect(isPureTahfidz("Tashrif Lughowi", 'Sunnah')).toBe(false);
    });
  });

  describe('useSetorMustahiqStore: Anti-Duplikasi Log Setoran', () => {
    beforeEach(() => {
      useSetorMustahiqStore.setState({
        logs: [],
        activeStates: {},
        isLoading: false,
      });
    });

    const dummyJuzAmma: ItemHafalanDetail = {
      id: 'juz-amma',
      nama: "Juz Amma' (An-Naas - Adh-Dhuha)",
      targetType: 'sentence',
      sentences: ['An-Nas', 'Al-Falaq', 'Al-Ikhlas'],
      sentenceUnitLabel: 'Kalimat',
    };

    it('menolak input kalimat ganda jika kalimat tersebut sudah pernah disetor', async () => {
      const store = useSetorMustahiqStore.getState();

      // Setoran pertama: An-Nas
      const ok1 = await store.addLogSetoran(
        {
          no_induk: '12347',
          nama_santri: 'DIMAS ANGGARA PUTRA',
          tingkat: 'ULA',
          din_kls: '1',
          din_bag: 'A',
          materi_nama: "Juz Amma' (An-Naas - Adh-Dhuha)",
          kategori: 'Wajib',
          target_type: 'sentence',
          tanggal: '2026-11-08',
          tahun: 2026,
          kalimat_dipilih: 'An-Nas',
          kalimat_index: 0,
        },
        dummyJuzAmma,
        true
      );
      expect(ok1).toBe(true);
      expect(useSetorMustahiqStore.getState().logs.length).toBe(1);

      // Coba setor An-Nas lagi untuk santri yang sama -> Harus DITOLAK
      const ok2 = await store.addLogSetoran(
        {
          no_induk: '12347',
          nama_santri: 'DIMAS ANGGARA PUTRA',
          tingkat: 'ULA',
          din_kls: '1',
          din_bag: 'A',
          materi_nama: "Juz Amma' (An-Naas - Adh-Dhuha)",
          kategori: 'Wajib',
          target_type: 'sentence',
          tanggal: '2026-11-08',
          tahun: 2026,
          kalimat_dipilih: 'An-Nas',
          kalimat_index: 0,
        },
        dummyJuzAmma,
        true
      );
      expect(ok2).toBe(false);
      // Jumlah log tidak bertambah
      expect(useSetorMustahiqStore.getState().logs.length).toBe(1);
    });

    it('menolak input Juz Tahfidz ganda jika Juz tersebut sudah pernah disetor', async () => {
      const store = useSetorMustahiqStore.getState();
      const tahfidzItem: ItemHafalanDetail = {
        id: 'tahfidz_juz_3',
        nama: 'Juz 3',
        kategori: 'Tahfidz',
        targetType: 'numeric',
        targetAkhirAngka: 1,
        satuanAngka: 'Juz',
      };

      // Setoran Tahfidz pertama: Juz 3
      const ok1 = await store.addLogSetoran(
        {
          no_induk: '12347',
          nama_santri: 'DIMAS ANGGARA PUTRA',
          tingkat: 'ULA',
          din_kls: '1',
          din_bag: 'A',
          materi_nama: 'Juz 3',
          kategori: 'Tahfidz',
          target_type: 'numeric',
          tanggal: '2026-11-08',
          tahun: 2026,
          tambah_angka: 1,
        },
        tahfidzItem,
        true
      );
      expect(ok1).toBe(true);
      const firstLog = useSetorMustahiqStore.getState().logs[0];
      expect(firstLog.satuan_angka).toBe('Juz');
      expect(firstLog.target_akhir_angka).toBe(1);
      expect(firstLog.status_ringkas).toBe('Juz 3 (Tuntas)');

      // Setoran Tahfidz kedua: Juz 3 lagi -> Harus DITOLAK
      const ok2 = await store.addLogSetoran(
        {
          no_induk: '12347',
          nama_santri: 'DIMAS ANGGARA PUTRA',
          tingkat: 'ULA',
          din_kls: '1',
          din_bag: 'A',
          materi_nama: 'Juz 3',
          kategori: 'Tahfidz',
          target_type: 'numeric',
          tanggal: '2026-11-08',
          tahun: 2026,
          tambah_angka: 1,
        },
        tahfidzItem,
        true
      );
      expect(ok2).toBe(false);
      expect(useSetorMustahiqStore.getState().logs.length).toBe(1);
    });

    it('fungsi deduplicateSantriLogs membersihkan entri ganda historis secara rapi', async () => {
      // Injeksi data riwayat simulasi yang memiliki duplikat seperti di kasus screenshot user
      useSetorMustahiqStore.setState({
        logs: [
          {
            id: 'log-1',
            no_induk: '12347',
            nama_santri: 'DIMAS ANGGARA PUTRA',
            materi_nama: 'Juz 1',
            kategori: 'Tahfidz',
            target_type: 'numeric',
            tanggal: '2026-11-08',
            tahun: 2026,
            tambah_angka: 1,
          },
          {
            id: 'log-2',
            no_induk: '12347',
            nama_santri: 'DIMAS ANGGARA PUTRA',
            materi_nama: "Juz Amma' (An-Naas - Adh-Dhuha)",
            kategori: 'Wajib',
            target_type: 'sentence',
            tanggal: '2026-11-08',
            tahun: 2026,
            kalimat_dipilih: 'An-Nas',
          },
          {
            id: 'log-3',
            no_induk: '12347',
            nama_santri: 'DIMAS ANGGARA PUTRA',
            materi_nama: 'Juz 2',
            kategori: 'Tahfidz',
            target_type: 'numeric',
            tanggal: '2026-11-08',
            tahun: 2026,
            tambah_angka: 1,
          },
          {
            id: 'log-4',
            no_induk: '12347',
            nama_santri: 'DIMAS ANGGARA PUTRA',
            materi_nama: 'Juz 3',
            kategori: 'Tahfidz',
            target_type: 'numeric',
            tanggal: '2026-11-08',
            tahun: 2026,
            tambah_angka: 1,
          },
          // Duplikat Juz 3
          {
            id: 'log-5',
            no_induk: '12347',
            nama_santri: 'DIMAS ANGGARA PUTRA',
            materi_nama: 'Juz 3',
            kategori: 'Tahfidz',
            target_type: 'numeric',
            tanggal: '2026-11-08',
            tahun: 2026,
            tambah_angka: 1,
          },
          // Duplikat An-Nas
          {
            id: 'log-6',
            no_induk: '12347',
            nama_santri: 'DIMAS ANGGARA PUTRA',
            materi_nama: "Juz Amma' (An-Naas - Adh-Dhuha)",
            kategori: 'Wajib',
            target_type: 'sentence',
            tanggal: '2026-11-08',
            tahun: 2026,
            kalimat_dipilih: 'An-Nas',
          },
        ] as any,
      });

      expect(useSetorMustahiqStore.getState().logs.length).toBe(6);

      const ok = await useSetorMustahiqStore
        .getState()
        .deduplicateSantriLogs('12347');

      expect(ok).toBe(true);
      expect(useSetorMustahiqStore.getState().logs.length).toBe(4);

      // Verifikasi bahwa sisa log unik
      const remainingLogs = useSetorMustahiqStore.getState().logs;
      const juz3Logs = remainingLogs.filter((l) => l.materi_nama === 'Juz 3');
      expect(juz3Logs.length).toBe(1);

      const anNasLogs = remainingLogs.filter((l) => l.kalimat_dipilih === 'An-Nas');
      expect(anNasLogs.length).toBe(1);
    });
  });
});
