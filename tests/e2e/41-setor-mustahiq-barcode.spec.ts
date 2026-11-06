import { test, expect } from '@playwright/test';

test.describe('Fitur Input Lewat Barcode pada Setoran Mingguan Santri (Mustahiq)', () => {
  test.setTimeout(120000);

  test('Pop-up Kartu Barcode per Kelas, Switch Semua/ULA/WUSTHO/ULYA, Pencarian, dan Auto-Open Modal Input Hafalan (Gambar 2) saat Barcode Discan', async ({
    page,
  }) => {
    // 1. Buka halaman Setoran Mingguan Santri (Mustahiq) (Gambar 1)
    await page.goto('/setor-mustahiq');
    await expect(
      page.getByRole('heading', { name: 'Setoran Mingguan Santri (Mustahiq)' })
    ).toBeVisible({ timeout: 25000 });

    // Pastikan tombol 'Input Lewat Barcode' tampil di halaman
    const btnOpenBarcode = page.getByTestId('btn-input-lewat-barcode');
    await expect(btnOpenBarcode).toBeVisible();
    await expect(btnOpenBarcode).toContainText('Input Lewat Barcode');

    // 2. Klik tombol 'Input Lewat Barcode' dan verifikasi pop-up terbuka
    await btnOpenBarcode.click();
    const barcodeModal = page.getByTestId('modal-barcode-mustahiq');
    await expect(barcodeModal).toBeVisible();

    // 3. Verifikasi tombol switch 'Semua', 'ULA', 'WUSTHO', 'ULYA' tersedia
    const tabAll = page.getByTestId('switch-barcode-tingkat-ALL');
    const tabUla = page.getByTestId('switch-barcode-tingkat-ULA');
    const tabWustho = page.getByTestId('switch-barcode-tingkat-WUSTHO');
    const tabUlya = page.getByTestId('switch-barcode-tingkat-ULYA');

    await expect(tabAll).toBeVisible();
    await expect(tabUla).toBeVisible();
    await expect(tabWustho).toBeVisible();
    await expect(tabUlya).toBeVisible();

    // 4. Verifikasi kartu dikelompokkan sesuai kelasnya masing-masing dan hanya menampilkan Nama + Barcode
    await expect(barcodeModal.getByText('ROKIB MUNAWWIR')).toBeVisible();
    await expect(barcodeModal.getByText('ANDIKO DWI SAPUTRA')).toBeVisible();

    const rokibCard = barcodeModal
      .locator('[data-testid^="barcode-card-"]')
      .filter({ hasText: 'ROKIB MUNAWWIR' })
      .first();
    await expect(rokibCard).toBeVisible();
    await expect(rokibCard.locator('svg')).toBeVisible();

    // Pastikan kartu bersifat tampilan murni (Opsi B: diklik tidak menutup pop-up)
    await rokibCard.click();
    await expect(barcodeModal).toBeVisible();

    // Ambil URL yang tersimpan pada QR Barcode santri ROKIB MUNAWWIR (Opsi A)
    const qrTargetUrl = await rokibCard.getAttribute('data-qr-url');
    expect(qrTargetUrl).toBeTruthy();
    expect(qrTargetUrl).toContain('/setor-mustahiq?santri=');

    // 5. Uji Switch Tingkatan: pilih ULA -> hanya kelas ULA yang tampil (ANDIKO di WUSTHO tersembunyi)
    await tabUla.click();
    await expect(barcodeModal.getByText('ROKIB MUNAWWIR')).toBeVisible();
    await expect(barcodeModal.getByText('ANDIKO DWI SAPUTRA')).toBeHidden();

    // Pilih WUSTHO -> hanya kelas WUSTHO yang tampil (ANDIKO tampil, ROKIB tersembunyi)
    await tabWustho.click();
    await expect(barcodeModal.getByText('ANDIKO DWI SAPUTRA')).toBeVisible();
    await expect(barcodeModal.getByText('ROKIB MUNAWWIR')).toBeHidden();

    // Kembali ke Semua
    await tabAll.click();
    await expect(barcodeModal.getByText('ROKIB MUNAWWIR')).toBeVisible();
    await expect(barcodeModal.getByText('ANDIKO DWI SAPUTRA')).toBeVisible();

    // 6. Uji Fitur Pencarian di dalam Pop-up
    const searchInput = page.getByTestId('input-search-barcode-modal');
    await searchInput.fill('ANDIKO');
    await expect(barcodeModal.getByText('ANDIKO DWI SAPUTRA')).toBeVisible();
    await expect(barcodeModal.getByText('ROKIB MUNAWWIR')).toBeHidden();

    await page.getByTestId('btn-clear-search-barcode-modal').click();
    await expect(barcodeModal.getByText('ROKIB MUNAWWIR')).toBeVisible();

    // 7. Uji Responsivitas Pop-up pada layar HP (375x667) tanpa overflow horizontal
    await page.setViewportSize({ width: 375, height: 667 });
    await expect
      .poll(
        async () => {
          return await page.evaluate(() => {
            return document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
          });
        },
        { timeout: 3000 }
      )
      .toBe(false);

    // Tutup pop-up barcode
    await page.getByTestId('btn-close-barcode-modal').click();
    await expect(barcodeModal).toBeHidden();

    // 8. Simulasikan hasil scan QR Barcode: kunjungi qrTargetUrl dan pastikan langsung membuka Modal Detail Setoran Santri (Gambar 2)
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(qrTargetUrl!);

    const detailModal = page.getByTestId('modal-detail-setor-mustahiq');
    await expect(detailModal).toBeVisible({ timeout: 25000 });
    await expect(detailModal.locator('h3').first()).toHaveText('ROKIB MUNAWWIR');
    await expect(detailModal.getByRole('heading', { name: 'Proses Setoran' })).toBeVisible();
    await expect(page.getByTestId('btn-simpan-setoran-mustahiq')).toBeVisible();
  });
});
