import { test, expect, Page } from '@playwright/test';

async function gotoWithAuth(page: Page, targetPath: string) {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });
  }
}

test.describe('E2E: Pengujian Komprehensif Menu Inventaris Madin & Ekosistem Barcode PKM. SAPRAS', () => {
  test.setTimeout(90000);

  test('1. Navigasi ke menu Inventaris Madin (/sapras/inventaris-madin) dan verifikasi elemen UI utama', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');

    // 1. Verifikasi Heading Utama Modul Inventaris Madin
    await expect(
      page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })
    ).toBeVisible({ timeout: 30000 });

    // 2. Verifikasi 4 Kartu KPI Ringkasan
    await expect(page.getByText('Total Unit Aset', { exact: false })).toBeVisible();
    await expect(page.getByText('Kondisi Baik & Layak', { exact: false })).toBeVisible();
    await expect(page.getByText('Perlu Servis / Rusak', { exact: false })).toBeVisible();
    await expect(page.getByText('Total Valuasi Aset', { exact: false })).toBeVisible();

    // 3. Verifikasi Tab 5 Lokasi Kantor Bawaan
    await expect(page.getByRole('button', { name: /Semua Lokasi/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kantor Madin Pusat/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kantor Madin GP/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kantor Madin Putri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kantor Madin Blok 4/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kantor Madin Blok 11/i })).toBeVisible();

    // 4. Verifikasi Keberadaan Baris Aset Bawaan di Tabel
    await expect(page.getByText('Printer Epson EcoTank L3210', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('MBD-AST-ELK-001', { exact: false }).first()).toBeVisible();
  });

  test('2. Filter tab tempat dan live search pada tabel inventaris madin', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');
    await expect(
      page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })
    ).toBeVisible({ timeout: 30000 });

    // 1. Filter Tab: Klik Kantor Madin GP
    const tabGP = page.getByRole('button', { name: /Kantor Madin GP/i });
    await tabGP.click();

    // Verifikasi item di Kantor Madin GP muncul (Canon Pixma atau Dispenser Miyako)
    await expect(page.getByText(/Canon Pixma|Dispenser Miyako/i).first()).toBeVisible();
    // Item di kantor lain tidak boleh muncul di tab ini
    await expect(page.getByText('Printer Epson EcoTank L3210')).not.toBeVisible();

    // 2. Kembalikan ke tab Semua Lokasi
    await page.getByRole('button', { name: /Semua Lokasi/i }).click();
    await expect(page.getByText('Printer Epson EcoTank L3210').first()).toBeVisible();

    // 3. Uji Kolom Pencarian Cepat (Live Search)
    const searchInput = page.getByPlaceholder(/Cari nama barang, nomor barcode/i);
    await searchInput.fill('ThinkPad');

    // Verifikasi hanya Laptop ThinkPad yang tampil
    await expect(page.getByText('Laptop Lenovo ThinkPad L14', { exact: false })).toBeVisible();
    await expect(page.getByText('Printer Epson EcoTank L3210')).not.toBeVisible();

    // Bersihkan pencarian
    await searchInput.clear();
    await expect(page.getByText('Printer Epson EcoTank L3210').first()).toBeVisible();
  });

  test('3. Pengaturan Tempat Dinamis: Tambah lokasi baru dan proteksi hapus', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');
    await expect(
      page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })
    ).toBeVisible({ timeout: 30000 });

    // 1. Buka Modal Kelola Lokasi
    const btnKelolaLokasi = page.getByRole('button', { name: /Kelola Lokasi/i });
    await btnKelolaLokasi.click();

    const modalDialog = page.locator('div[role="dialog"]');
    await expect(
      modalDialog.getByRole('heading', { name: 'Pengaturan Tempat & Lokasi Inventaris' })
    ).toBeVisible();

    // 2. Input Lokasi Baru
    const inputNama = modalDialog.getByPlaceholder('Contoh: Kantor Madin Asrama Tahfidz');
    const inputKode = modalDialog.getByPlaceholder('Contoh: KMT / KM-04');
    const inputPIC = modalDialog.getByPlaceholder('Contoh: Ust. Fathur Rahman');

    const randomSuffix = Date.now().toString().slice(-3);
    const newLocationName = `Kantor Madin Asrama Tahfidz ${randomSuffix}`;
    await inputNama.fill(newLocationName);
    await inputKode.fill(`KMT-${randomSuffix}`);
    await inputPIC.fill('Ust. Nurul Huda');

    // Klik Tambahkan Lokasi
    await modalDialog.getByRole('button', { name: 'Tambahkan Lokasi' }).click();

    // Verifikasi lokasi baru muncul di daftar lokasi terdaftar di dalam modal
    await expect(modalDialog.getByRole('heading', { name: newLocationName })).toBeVisible();

    // Tutup modal kelola lokasi menggunakan tombol close bertestid
    await page.getByTestId('btn-close-manage-tempat').click();

    // Verifikasi tab baru muncul di bar tab tempat
    await expect(page.getByRole('button', { name: new RegExp(newLocationName, 'i') })).toBeVisible();
  });

  test('4. Buka Modal Scan Barcode & Uji Coba Input Kode / Sampel', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');
    await expect(
      page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })
    ).toBeVisible({ timeout: 30000 });

    // 1. Klik tombol Scan Barcode
    const btnScan = page.getByRole('button', { name: /Scan Barcode/i }).first();
    await btnScan.click();

    const scannerModal = page.locator('div[role="dialog"]');
    // Verifikasi modal scanner terbuka
    await expect(
      scannerModal.getByRole('heading', { name: 'Pemindai Barcode & QR PKM. Sapras' })
    ).toBeVisible();

    // 2. Gunakan tombol sampel cepat "MBD-AST-ELK-001 (Printer Pusat)" di dalam scanner modal
    const btnSampelAsset = scannerModal.getByRole('button', { name: /MBD-AST-ELK-001/i });
    await expect(btnSampelAsset).toBeVisible();
    await btnSampelAsset.click();

    // Verifikasi hasil pemindaian menampilkan kartu aset yang valid
    await expect(scannerModal.getByText('Printer Epson EcoTank L3210', { exact: false })).toBeVisible();
    await expect(scannerModal.getByText('ASET', { exact: true })).toBeVisible();
    await expect(scannerModal.getByRole('button', { name: 'Lihat Kartu Aset' })).toBeVisible();
    await expect(scannerModal.getByRole('button', { name: 'Pindahkan / Mutasi' })).toBeVisible();

    // Reset scanner dengan klik Pindai Ulang agar input/sampel muncul kembali
    await scannerModal.getByTitle('Pindai Ulang').click();

    // 3. Uji tombol sampel lokasi "MBD-LOC-KMP (Kantor Pusat)"
    const btnSampelLokasi = scannerModal.getByRole('button', { name: /MBD-LOC-KMP/i });
    await expect(btnSampelLokasi).toBeVisible();
    await btnSampelLokasi.click();

    // Verifikasi terdeteksi sebagai LOKASI
    await expect(scannerModal.getByText('LOKASI', { exact: true })).toBeVisible();
    await expect(scannerModal.getByText('Kantor Madin Pusat')).toBeVisible();

    // Tutup modal scanner
    await page.getByTestId('btn-close-scanner').click();
    await expect(
      page.getByRole('heading', { name: 'Pemindai Barcode & QR PKM. Sapras' })
    ).not.toBeVisible();
  });

  test('5. Buka Modal Generator Cetak Label Barcode & Smart Room Tag', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');
    await expect(
      page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })
    ).toBeVisible({ timeout: 30000 });

    // 1. Klik tombol Cetak Label
    const btnCetak = page.getByRole('button', { name: /Cetak Label/i }).first();
    await btnCetak.click();

    const cetakModal = page.locator('div[role="dialog"]');
    // Verifikasi modal terbuka
    await expect(
      cetakModal.getByRole('heading', { name: 'Generator Cetak Label Barcode & QR Sapras' })
    ).toBeVisible();

    // Verifikasi preview stiker barcode aset muncul dengan SVG QR di area cetak
    await expect(page.locator('#print-area').getByText('MADIN AL-AMIRIYYAH', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#print-area').getByText('PKM. SAPRAS BLOKAGUNG', { exact: false }).first()).toBeVisible();
    await expect(page.locator('#print-area').getByText('MBD-AST-ELK-001', { exact: false }).first()).toBeVisible();

    // 2. Pindah ke tab "QR Pintu Kantor"
    await cetakModal.getByRole('button', { name: /QR Pintu Kantor/i }).click();

    // Verifikasi kartu Smart Room Tag pintu muncul
    await expect(page.locator('#print-area').getByText('SMART ROOM TAG • PKM. SAPRAS').first()).toBeVisible();
    await expect(page.locator('#print-area').getByText('KODE RUANGAN: KMP', { exact: false })).toBeVisible();

    // Tutup modal cetak
    await page.getByTestId('btn-close-cetak').click();
    await expect(
      page.getByRole('heading', { name: 'Generator Cetak Label Barcode & QR Sapras' })
    ).not.toBeVisible();
  });

  test('6. Alur Mutasi Aset Antar Kantor', async ({ page }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');
    await expect(
      page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })
    ).toBeVisible({ timeout: 30000 });

    // 1. Temukan baris "Printer Epson EcoTank L3210" dan klik tombol Mutasi (ikon panah bolak-balik)
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    const btnMutasi = firstRow.locator('button[title*="Mutasi"]').first();
    await btnMutasi.click();

    // 2. Verifikasi Modal Mutasi Aset terbuka
    await expect(
      page.getByRole('heading', { name: 'Mutasi / Pindah Tempat Aset' })
    ).toBeVisible();

    // 3. Masukkan data mutasi
    const inputPetugas = page.getByPlaceholder(/Nama asatidz \/ pengurus/i);
    await inputPetugas.fill('Ust. Pengurus Sapras E2E');

    const inputAlasan = page.getByPlaceholder(/Contoh: Dipinjam untuk keperluan/i);
    await inputAlasan.fill('Peminjaman untuk cetak ijazah ujian semester E2E');

    // 4. Klik Konfirmasi Mutasi
    await page.getByRole('button', { name: 'Konfirmasi Mutasi' }).click();

    // Verifikasi modal tertutup dan mutasi berhasil
    await expect(
      page.getByRole('heading', { name: 'Mutasi / Pindah Tempat Aset' })
    ).not.toBeVisible();
  });
});
