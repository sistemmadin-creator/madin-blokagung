import { test, expect } from '@playwright/test';

test.describe('Grup Menu PKM. Sapras - Inventaris, Perbaikan, Logistik & Rekap', () => {
  test('Menampilkan 4 menu PKM. Sapras, default 1 Papan Tulis & 1 Meja Guru (Baik), sinkronisasi 2 arah tiket perbaikan, logistik ATK, dan responsif mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Buka halaman Inventaris Kelas
    await page.goto('/sapras/inventaris-kelas', { waitUntil: 'domcontentloaded' });

    // 2. Pastikan halaman Inventaris Kelas tampil dengan judul utama
    const heading = page.getByRole('heading', { name: 'Inventaris Sarana Kelas (Papan Tulis & Meja Guru)' });
    await expect(heading).toBeVisible({ timeout: 20000 });

    // 3. Pastikan ke-4 tab sub-modul PKM. Sapras tersedia
    await expect(page.getByTestId('nav-sapras-inventaris-kelas')).toBeVisible();
    await expect(page.getByTestId('nav-sapras-perbaikan')).toBeVisible();
    await expect(page.getByTestId('nav-sapras-logistik')).toBeVisible();
    await expect(page.getByTestId('nav-sapras-rekap')).toBeVisible();

    // 4. Pastikan kartu kelas pertama tampil dengan default Papan Tulis = BAIK dan Meja Guru = BAIK
    const firstCard = page.locator('[data-testid^="sapras-card-"]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toContainText('1. Papan Tulis (1 Unit)');
    await expect(firstCard).toContainText('2. Meja Guru (1 Unit)');

    const firstPapanSelect = firstCard.locator('[data-testid^="select-papan-"]');
    const firstMejaSelect = firstCard.locator('[data-testid^="select-meja-"]');
    await expect(firstPapanSelect).toHaveValue('BAIK');
    await expect(firstMejaSelect).toHaveValue('BAIK');

    // 5. Ubah kondisi Papan Tulis pada kelas pertama menjadi RUSAK_BERAT
    await firstPapanSelect.selectOption('RUSAK_BERAT');
    await expect(firstPapanSelect).toHaveValue('RUSAK_BERAT');

    // 6. Pindah ke tab Kerusakan & Perbaikan dan pastikan tiket otomatis terbuat
    await page.getByTestId('nav-sapras-perbaikan').click();
    await expect(page.getByRole('heading', { name: 'Laporan Kerusakan & Pemeliharaan Sapras' })).toBeVisible();

    const firstTicket = page.locator('[data-testid^="tiket-card-"]').first();
    await expect(firstTicket).toBeVisible();
    await expect(firstTicket).toContainText('Papan Tulis');
    await expect(firstTicket).toContainText('DARURAT');

    // 7. Klik "Tandai Selesai & Pulihkan Kelas" pada tiket tersebut
    const resolveButton = firstTicket.locator('[data-testid^="btn-selesai-tiket-"]');
    await resolveButton.click();

    // 8. Kembali ke tab Inventaris Kelas dan pastikan Papan Tulis otomatis pulih menjadi BAIK
    await page.getByTestId('nav-sapras-inventaris-kelas').click();
    await expect(firstPapanSelect).toHaveValue('BAIK');

    // 9. Pindah ke tab Logistik & ATK KBM dan catat distribusi ATK ke kelas
    await page.getByTestId('nav-sapras-logistik').click();
    await expect(page.getByRole('heading', { name: 'Logistik & Distribusi ATK KBM Kelas' })).toBeVisible();

    await page.getByTestId('btn-open-distribusi-logistik').click();
    await expect(page.getByRole('heading', { name: 'Catat Pembagian Logistik / ATK ke Kelas' })).toBeVisible();
    await page.getByTestId('input-penerima-distribusi').fill('Ust. Ahmad Fauzi');
    await page.getByTestId('btn-simpan-distribusi').click();

    await expect(page.getByText('Ust. Ahmad Fauzi')).toBeVisible();

    // 10. Pindah ke tab Rekap & Audit Sapras dan pastikan tabel rekap tampil
    await page.getByTestId('nav-sapras-rekap').click();
    await expect(page.getByRole('heading', { name: 'Rekapitulasi & Audit Kesiapan Sapras' })).toBeVisible();
    await expect(page.getByTestId('table-rekap-sapras')).toBeVisible();

    // 11. Uji responsivitas mobile 375x667 tanpa horizontal overflow
    await page.setViewportSize({ width: 375, height: 667 });
    await page.getByTestId('nav-sapras-inventaris-kelas').click();

    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          return document.documentElement.scrollWidth <= window.innerWidth + 1;
        });
      })
      .toBe(true);
  });
});
