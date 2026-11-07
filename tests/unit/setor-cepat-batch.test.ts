import { describe, it, expect, beforeEach } from 'vitest';
import { useSetorMustahiqStore } from '@/stores/useSetorMustahiqStore';
import { ItemHafalanDetail } from '@/types/setoran';

describe('useSetorMustahiqStore - Multi-Kalimat Batch Setor Cepat', () => {
  beforeEach(() => {
    useSetorMustahiqStore.setState({
      logs: [],
      activeStates: {},
      isLoading: false,
    });
  });

  const dummyItem: ItemHafalanDetail = {
    id: 'juz-amma',
    nama: "Juz Amma'",
    targetType: 'sentence',
    sentences: [
      'An-Nas',
      'Al-Falaq',
      'Al-Ikhlas',
      'Al-Lahab',
      'An-Nasr',
      'Al-Kafirun',
    ],
    sentenceUnitLabel: 'Kalimat',
  };

  it('berhasil menyimpan batch multi-kalimat (An-Nas, Al-Falaq, Al-Ikhlas) sekaligus', async () => {
    const store = useSetorMustahiqStore.getState();

    const ok = await store.addLogSetoranBatch(
      {
        no_induk: '12451',
        nama_santri: 'ARDHITO PRAMONO',
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        materi_nama: "Juz Amma'",
        kategori: 'Wajib',
        target_type: 'sentence',
        tanggal: '2026-11-07',
        tahun: 2026,
        catatan: 'Lancar makhraj & tajwid',
        mustahiq: "KUNI NAFI'AH",
      },
      ['An-Nas', 'Al-Falaq', 'Al-Ikhlas'],
      dummyItem,
      true // skipHistory for unit test
    );

    expect(ok).toBe(true);

    const logs = useSetorMustahiqStore.getState().logs;
    expect(logs).toHaveLength(3);

    // Verifikasi masing-masing kalimat tercatat berurutan dengan kumulatif yang naik
    expect(logs[0].kalimat_dipilih).toBe('An-Nas');
    expect(logs[0].kumulatif_angka).toBe(1);

    expect(logs[1].kalimat_dipilih).toBe('Al-Falaq');
    expect(logs[1].kumulatif_angka).toBe(2);

    expect(logs[2].kalimat_dipilih).toBe('Al-Ikhlas');
    expect(logs[2].kumulatif_angka).toBe(3);
  });

  it('mengabaikan kalimat kosong dan tidak menduplikasi jika tidak perlu', async () => {
    const store = useSetorMustahiqStore.getState();

    const ok = await store.addLogSetoranBatch(
      {
        no_induk: '12451',
        nama_santri: 'ARDHITO PRAMONO',
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        materi_nama: "Juz Amma'",
        kategori: 'Wajib',
        tanggal: '2026-11-07',
        tahun: 2026,
        mustahiq: "KUNI NAFI'AH",
      },
      ['An-Nas', '', '   '],
      dummyItem,
      true
    );

    expect(ok).toBe(true);
    const logs = useSetorMustahiqStore.getState().logs;
    expect(logs).toHaveLength(1);
    expect(logs[0].kalimat_dipilih).toBe('An-Nas');
  });
});
