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

test.describe('Verifikasi Penghapusan Fitur Barcode pada Setor Mustahiq', () => {
  test.setTimeout(60000);

  test('Tombol Input Lewat Barcode telah dihapus dari header Setor Mustahiq', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setor-mustahiq');
    await expect(
      page.getByRole('heading', { name: 'Setoran Mingguan Santri (Mustahiq)' })
    ).toBeVisible({ timeout: 25000 });

    // Pastikan tombol 'Input Lewat Barcode' TIDAK ADA lagi di halaman
    const btnBarcode = page.getByTestId('btn-input-lewat-barcode');
    await expect(btnBarcode).toHaveCount(0);
  });
});
