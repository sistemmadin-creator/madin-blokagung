import { test, expect } from '@playwright/test';

test.describe('Hari KBM: Urutan Grup Blok Resmi & Kontrol Pagination', () => {
  test('1.0 Hari KBM (/hari-kbm): Urutan Grup Blok Resmi, Filter Blok & Pagination', async ({ page }) => {
    await page.goto('/hari-kbm');
    await expect(page.getByRole('heading', { name: /Hari KBM/i })).toBeVisible({ timeout: 15_000 });

    // Pilih Hari Senin
    const btnSenin = page.getByRole('button', { name: 'Senin', exact: true });
    if (await btnSenin.isVisible()) {
      await btnSenin.click();
    }

    // 1. Verifikasi Urutan Grup Blok Resmi: Blok pertama yang tampil adalah Blok Induk Putra
    const blockBanners = page.getByTestId('group-blok-header-kbm');
    await expect(blockBanners.first()).toBeVisible({ timeout: 10_000 });
    const firstBannerText = await blockBanners.first().innerText();
    expect(firstBannerText.toUpperCase()).toContain('BLOK INDUK PUTRA');

    // 2. Verifikasi Baris Pertama di Blok Induk Putra mengajar kelas ULA (1 A ULA)
    const firstRow = page.getByTestId('row-asatidz-kbm').first();
    await expect(firstRow).toBeVisible();
    const firstRowText = await firstRow.innerText();
    expect(firstRowText).toContain('1 A ULA');

    // 3. Verifikasi Filter Blok
    const selectBlok = page.locator('select').filter({ hasText: /Semua Blok/i });
    await expect(selectBlok).toBeVisible();

    // 4. Verifikasi Kontrol Ukuran Halaman Pagination
    const selectPageSize = page.locator('select').filter({ hasText: /25 Asatidz \/ Hal/i });
    await expect(selectPageSize).toBeVisible();

    // 5. Verifikasi Navigasi Footer Pagination (Berikutnya & Sebelumnya)
    const btnBerikutnya = page.getByRole('button', { name: 'Berikutnya', exact: true });
    if (await btnBerikutnya.isVisible()) {
      await expect(page.getByText(/Halaman 1 dari/i)).toBeVisible();

      // Navigasi ke Halaman 2
      await btnBerikutnya.click();
      await expect(page.getByText(/Halaman 2 dari/i)).toBeVisible();

      // Verifikasi penomoran baris pertama di Halaman 2 dimulai dari 26
      const secondPageFirstRow = page.getByTestId('row-asatidz-kbm').first();
      await expect(secondPageFirstRow.locator('td').first()).toHaveText('26');

      // Kembali ke Halaman 1
      const btnSebelumnya = page.getByRole('button', { name: 'Sebelumnya', exact: true });
      await btnSebelumnya.click();
      await expect(page.getByText(/Halaman 1 dari/i)).toBeVisible();
      await expect(page.getByTestId('row-asatidz-kbm').first().locator('td').first()).toHaveText('1');
    }
  });

  test('2.0 Hari KBM: Beralih ke Tampilan Mode Kartu dengan Pagination', async ({ page }) => {
    await page.goto('/hari-kbm');
    await expect(page.getByRole('heading', { name: /Hari KBM/i })).toBeVisible({ timeout: 15_000 });

    // Klik tombol switch mode kartu
    const btnModeKartu = page.locator('button[title="Tampilan Kartu"]');
    await expect(btnModeKartu).toBeVisible();
    await btnModeKartu.click();

    // Verifikasi banner blok pada tampilan kartu
    const blockBanners = page.getByTestId('group-blok-header-kbm');
    await expect(blockBanners.first()).toBeVisible({ timeout: 10_000 });
    const firstBannerText = await blockBanners.first().innerText();
    expect(firstBannerText.toUpperCase()).toContain('BLOK INDUK PUTRA');

    // Verifikasi Footer Pagination tetap aktif di mode kartu
    const btnBerikutnya = page.getByRole('button', { name: 'Berikutnya', exact: true });
    if (await btnBerikutnya.isVisible()) {
      await expect(page.getByText(/Halaman 1 dari/i)).toBeVisible();
    }
  });
});
