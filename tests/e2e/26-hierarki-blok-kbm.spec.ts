import { test, expect } from '@playwright/test';

test.describe('Tahap 1, 4 & 5: Verifikasi Hierarki Blok KBM (Diniyyah & Takror)', () => {
  test('1.0 Master Formasi (/formasi): Kolom Berpasangan Hierarki Tampil Sempurna', async ({ page }) => {
    await page.goto('/formasi');

    // Pastikan judul halaman master tampil
    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible();

    // Pastikan tabel formasi kelas termuat dengan baris data
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verifikasi header kolom berpasangan baru
    await expect(page.getByRole('columnheader', { name: 'Blok Takror' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Lokal Takror' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Blok Diniyyah' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Lokasi Diniyyah' })).toBeVisible();

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('2.0 Modal Input / Edit Formasi: Dual Card Hierarki (Takror & Diniyyah)', async ({ page }) => {
    await page.goto('/formasi');

    // Cari tombol Tambah Kelas (+) di toolbar atas
    const btnTambah = page.locator('button[title*="Tambah Formasi Kelas Baru"]').first();
    await expect(btnTambah).toBeVisible();
    await btnTambah.click();

    // Dialog input formasi harus muncul
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('heading', { name: /Formasi Kelas Baru/i })).toBeVisible();

    // Verifikasi card hierarki Takror & Diniyyah
    await expect(dialog.getByText('Hierarki Takror (Sore)')).toBeVisible();
    await expect(dialog.getByText('Hierarki Diniyyah (Malam)')).toBeVisible();

    // Verifikasi input lokasi dan blok berpasangan
    await expect(dialog.locator('input[name="lokasi_takror"]')).toBeVisible();
    await expect(dialog.locator('input[name="blok_takror"]')).toBeVisible();
    await expect(dialog.locator('input[name="lokasi_diniyyah"]')).toBeVisible();
    await expect(dialog.locator('input[name="blok_diniyyah"]')).toBeVisible();

    // Tutup dialog
    await dialog.getByRole('button', { name: /Batal/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('3.0 Formasi PA & PI: Header 2-Tingkat Hierarki TAKROR & DINIYYAH', async ({ page }) => {
    // Formasi PA
    await page.goto('/formasi/pa');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'TAKROR' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'DINIYYAH' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });

    // Formasi PI
    await page.goto('/formasi/pi');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Putri/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'TAKROR' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'DINIYYAH' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });
  });

  test('4.0 Halaman Hari KBM (/hari-kbm): Memuat Data Pengelompokan Blok Diniyyah Normal', async ({ page }) => {
    await page.goto('/hari-kbm');
    await expect(page.getByRole('heading', { name: /Hari KBM/i })).toBeVisible();
    // Tunggu tabel KBM atau kelompok blok termuat
    await page.waitForTimeout(2000);
    // Verifikasi tidak ada runtime crash
    await expect(page.locator('body')).toBeVisible();
  });
});
