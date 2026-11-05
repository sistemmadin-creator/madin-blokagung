import { test, expect } from '@playwright/test';

test.describe('Modul 42: Import Excel Santri dengan Unduh Template', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/santri');
  });

  test('menampilkan tombol Impor Excel dan membuka dialog panduan import', async ({ page }) => {
    const importBtn = page.getByRole('button', { name: /Impor Excel/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    // Dialog heading
    const heading = page.getByRole('heading', { name: /Import Massal Database Santri/i });
    await expect(heading).toBeVisible();

    // Banner panduan
    await expect(page.getByText(/Unggah File Spreadsheet \(\.xlsx \/ \.xls \/ \.csv\)/i)).toBeVisible();
    await expect(page.getByText(/Format Kolom Wajib Baris Pertama:/i)).toBeVisible();

    // Tombol Unduh Template
    const btnDownload = page.getByTestId('btn-unduh-template-santri');
    await expect(btnDownload).toBeVisible();
    await expect(btnDownload).toHaveText(/Unduh Template Excel/i);

    // Dropzone info
    await expect(page.getByText(/Klik atau seret file Excel ke sini/i)).toBeVisible();
    await expect(page.getByText(/Mendukung format berkas \.xlsx, \.xls, dan \.csv/i)).toBeVisible();

    // Tombol aksi footer
    const batalBtn = page.getByRole('button', { name: 'Batal', exact: true });
    await expect(batalBtn).toBeVisible();
    const prosesBtn = page.getByTestId('btn-proses-import-santri');
    await expect(prosesBtn).toBeVisible();
    // Default disabled sebelum file diunggah
    await expect(prosesBtn).toBeDisabled();

    // Tutup dialog
    await batalBtn.click();
    await expect(heading).toBeHidden();
  });

  test('dapat memicu unduhan template Excel santri', async ({ page }) => {
    await page.getByRole('button', { name: /Impor Excel/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('btn-unduh-template-santri').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('Template_Import_Data_Santri.xlsx');
  });
});
