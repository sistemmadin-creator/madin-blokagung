import { describe, it, expect, beforeEach } from 'vitest';
import { useSaprasStore, DEFAULT_TEMPAT_LOKASI, DEFAULT_INVENTARIS_MADIN } from '@/stores/useSaprasStore';
import { generateQrSvgPath } from '@/lib/utils/qrSvgGenerator';

describe('PKM. Sapras - Inventaris Madin & Dynamic Locations Unit Tests', () => {
  beforeEach(() => {
    // Reset state to defaults before each test
    useSaprasStore.setState({
      tempatList: [...DEFAULT_TEMPAT_LOKASI],
      inventarisMadinList: [...DEFAULT_INVENTARIS_MADIN],
    });
  });

  it('1. Memiliki 5 tempat/lokasi bawaan dengan kode dan PIC yang valid', () => {
    const { tempatList } = useSaprasStore.getState();
    expect(tempatList.length).toBeGreaterThanOrEqual(5);

    const kmp = tempatList.find((t) => t.kode === 'KMP');
    const gp = tempatList.find((t) => t.kode === 'KM-GP');
    const putri = tempatList.find((t) => t.kode === 'KM-PI');
    const blok4 = tempatList.find((t) => t.kode === 'KMB-04');
    const blok11 = tempatList.find((t) => t.kode === 'KMB-11');

    expect(kmp).toBeDefined();
    expect(kmp?.nama).toBe('Kantor Madin Pusat');
    expect(gp?.nama).toBe('Kantor Madin GP');
    expect(putri?.nama).toBe('Kantor Madin Putri');
    expect(blok4?.nama).toBe('Kantor Madin Blok 4');
    expect(blok11?.nama).toBe('Kantor Madin Blok 11');
  });

  it('2. Dapat menambahkan tempat/lokasi baru secara mandiri (Dynamic Location)', async () => {
    const { addTempatLokasi } = useSaprasStore.getState();

    const newLoc = await addTempatLokasi({
      nama: 'Kantor Madin Asrama Tahfidz',
      kode: 'KMT',
      penanggungJawab: 'Ust. Nurul Huda',
      kontakPIC: '081299998888',
      keterangan: 'Lantai 2 Kompleks Tahfidz',
    });

    expect(newLoc.id).toBeDefined();
    expect(newLoc.kode).toBe('KMT');

    const updatedList = useSaprasStore.getState().tempatList;
    const found = updatedList.find((t) => t.kode === 'KMT');
    expect(found).toBeDefined();
    expect(found?.nama).toBe('Kantor Madin Asrama Tahfidz');
  });

  it('3. Mencegah penghapusan lokasi jika masih terdapat barang inventaris di dalamnya', async () => {
    const { deleteTempatLokasi } = useSaprasStore.getState();

    // loc-pusat memiliki aset default (misal: Printer Epson, ThinkPad)
    const result = await deleteTempatLokasi('loc-pusat');
    expect(result.success).toBe(false);
    expect(result.message).toContain('masih ada barang inventaris');

    // Tempat tetap ada di store
    const locPusat = useSaprasStore.getState().tempatList.find((t) => t.id === 'loc-pusat');
    expect(locPusat).toBeDefined();
  });

  it('4. Dapat menghapus lokasi kosong tanpa aset', async () => {
    const { addTempatLokasi, deleteTempatLokasi } = useSaprasStore.getState();

    const emptyLoc = await addTempatLokasi({
      nama: 'Posko Sementara Ujian',
      kode: 'PSU',
    });

    const res = await deleteTempatLokasi(emptyLoc.id);
    expect(res.success).toBe(true);

    const found = useSaprasStore.getState().tempatList.find((t) => t.id === emptyLoc.id);
    expect(found).toBeUndefined();
  });

  it('5. Dapat menambahkan aset inventaris baru dengan kode barcode unik', async () => {
    const { addInventarisMadin } = useSaprasStore.getState();

    const item = await addInventarisMadin({
      kodeBarcode: 'MBD-AST-ELK-999',
      namaBarang: 'Proyektor Epson EB-E500 (Aula Pusat)',
      kategori: 'ELEKTRONIK_IT',
      tempatId: 'loc-pusat',
      spesifikasi: '3300 Lumens, HDMI, XGA',
      kondisi: 'BAIK',
      jumlah: 1,
      satuan: 'Unit',
      tahunPerolehan: 2026,
      sumberDana: 'Kas Madin',
      nilaiPerolehan: 5200000,
    });

    expect(item.id).toBeDefined();
    const currentList = useSaprasStore.getState().inventarisMadinList;
    const found = currentList.find((i) => i.kodeBarcode === 'MBD-AST-ELK-999');
    expect(found).toBeDefined();
    expect(found?.namaBarang).toBe('Proyektor Epson EB-E500 (Aula Pusat)');
  });

  it('6. Melakukan mutasi aset antar kantor dan mencatat histori pemindahan', async () => {
    const { mutasiInventarisMadin, inventarisMadinList } = useSaprasStore.getState();
    const targetItem = inventarisMadinList[0]; // Printer Epson di loc-pusat
    expect(targetItem.tempatId).toBe('loc-pusat');

    await mutasiInventarisMadin({
      itemId: targetItem.id,
      keTempatId: 'loc-putri',
      petugasPemindah: 'Ust. Fathur Rahman',
      alasan: 'Peminjaman operasional cetak ijazah mustahiqoh putri',
    });

    const updatedItem = useSaprasStore.getState().inventarisMadinList.find((i) => i.id === targetItem.id);
    expect(updatedItem?.tempatId).toBe('loc-putri');
    expect(updatedItem?.riwayatMutasi).toHaveLength(1);
    expect(updatedItem?.riwayatMutasi?.[0].dariTempatId).toBe('loc-pusat');
    expect(updatedItem?.riwayatMutasi?.[0].keTempatId).toBe('loc-putri');
    expect(updatedItem?.riwayatMutasi?.[0].petugasPemindah).toBe('Ust. Fathur Rahman');
  });

  it('7. Menghasilkan path SVG QR Code valid untuk format MBD-AST dan MBD-LOC', () => {
    const qrAsset = generateQrSvgPath('MBD-AST-ELK-001');
    expect(qrAsset.size).toBeGreaterThan(10);
    expect(qrAsset.path).toContain('M');

    const qrRoom = generateQrSvgPath('MBD-LOC-KMP');
    expect(qrRoom.size).toBeGreaterThan(10);
    expect(qrRoom.path).toContain('M');
  });
});
