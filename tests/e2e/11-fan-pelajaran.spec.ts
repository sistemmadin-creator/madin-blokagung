import { test, expect } from '@playwright/test';

test.describe('Fan Pelajaran & Pengajar Fan Migration Full Verification', () => {
  test('1.0 Fan Pelajaran: Toolbar, Controls & Filter Kategori', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Judul halaman & Subtitle
    await expect(page.getByRole('heading', { name: /Fan Pelajaran/i })).toBeVisible();
    await expect(page.getByText('Daftar Mata Pelajaran & Konfigurasi Kelas Madin')).toBeVisible();

    // Toolbar buttons
    await expect(page.getByRole('button', { name: /Hapus/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Atur Item Fan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Atur Fan MS/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segarkan Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();

    // Switch Category buttons
    const btnSemua = page.getByRole('button', { name: /Fan Pelajaran Semua/i });
    const btnReguler = page.getByRole('button', { name: /Fan Pelajaran Reguler/i });
    const btnUnggulan = page.getByRole('button', { name: /Fan Pelajaran Unggulan/i });

    await expect(btnSemua).toBeVisible();
    await expect(btnReguler).toBeVisible();
    await expect(btnUnggulan).toBeVisible();

    // Test clicking Reguler
    await btnReguler.click();
    await expect(page.getByText(/Menampilkan:.*Kelas Reguler Saja/i)).toBeVisible();

    // Test clicking Unggulan
    await btnUnggulan.click();
    await expect(page.getByText(/Menampilkan:.*Kelas Unggulan/i)).toBeVisible();

    // Test clicking Semua
    await btnSemua.click();
    await expect(page.getByText(/Menampilkan:.*Semua Kategori/i)).toBeVisible();
  });

  test('2.0 Fan Pelajaran: Matriks Kurikulum 8 Kolom & Inline Jam Input', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Header Dokumen Resmi
    await expect(page.getByText('DAFTAR MATA PELAJARAN KELAS')).toBeVisible();
    await expect(page.getByText('Madrasah Diniyyah Al Amiriyyah')).toBeVisible();

    // 8 Kolom Header
    await expect(page.locator('th', { hasText: 'NO' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'KLS' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'TNK' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'FAN' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'JAM' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'MATA PELAJARAN' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'PENGAJAR' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'KETERANGAN' })).toBeVisible();

    // Footer legenda
    await expect(page.getByText('*MS (Mustahiq) • MB (Munawib)')).toBeVisible();
  });

  test('3.0 Fan Pelajaran: Modal Pengaturan Item Fan', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    await page.getByRole('button', { name: /Atur Item Fan/i }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Item Fan \(Mata Pelajaran\)/i })).toBeVisible();
    await expect(page.getByText('1. Fan Kelas Reguler (Tingkat Umum)')).toBeVisible();
    await expect(page.getByText('2. Sub Pengaturan Fan Khusus Kelas Unggulan (Ug)')).toBeVisible();

    // Tutup dialog
    await page.getByRole('button', { name: /Batal/i }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Item Fan \(Mata Pelajaran\)/i })).not.toBeVisible();
  });

  test('4.0 Fan Pelajaran: Modal Atur Fan MS (Batch Setup)', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    await page.getByRole('button', { name: /Atur Fan MS/i }).click();
    await expect(page.getByRole('heading', { name: /Atur Fan Khusus MS \(Mustahiq\)/i })).toBeVisible();
    await expect(page.getByText('1. Tingkat')).toBeVisible();
    await expect(page.getByText('2. Din. Kls')).toBeVisible();
    await expect(page.getByText('3. Pilih Fan yang Wajib Diajar MS')).toBeVisible();

    // Tutup dialog
    await page.getByRole('button', { name: /Batal/i }).click();
    await expect(page.getByRole('heading', { name: /Atur Fan Khusus MS \(Mustahiq\)/i })).not.toBeVisible();
  });

  test('5.0 Fan Pelajaran: Modal Pilih Asatidz Fan dari Kolom Pengajar', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Cari salah satu sel pengajar yang bisa diklik
    const pengajarCell = page.locator('td[title*="Klik untuk memilih"]').first();
    if (await pengajarCell.isVisible()) {
      await pengajarCell.click();
      await expect(page.getByRole('heading', { name: /Pilih Asatidz Pengajar/i })).toBeVisible();
      await expect(page.getByText('Kategori Asatidz (Pilih Salah Satu / Keduanya):')).toBeVisible();
      await expect(page.getByPlaceholder('Ketik nama Asatidz / NIA...')).toBeVisible();

      // Tutup dialog
      await page.getByRole('button', { name: /Batal/i }).click();
      await expect(page.getByRole('heading', { name: /Pilih Asatidz Pengajar/i })).not.toBeVisible();
    }
  });

  test('6.0 Pengajar Fan: Toolbar, Filter Bar, Badges & Grup Asal Modal', async ({ page }) => {
    await page.goto('/fan/pengajar');

    // Header & Subtitle
    await expect(page.getByRole('heading', { name: 'Pengajar Fan', exact: true })).toBeVisible();
    await expect(page.getByText('Rekapitulasi Fan Mata Pelajaran yang Diajarkan oleh Masing-Masing Asatidz')).toBeVisible();

    // Buttons
    await expect(page.getByRole('button', { name: /Grup Asal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segarkan Data/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Print \/ Cetak Dokumen/i })).toBeVisible();

    // Filter controls
    await expect(page.getByPlaceholder('Cari Kode / Nama / Fan / Jah...')).toBeVisible();
    await expect(page.getByText(/Keterisian Fan:/i)).toBeVisible();

    // Table Dokumen Resmi & 6 Kolom
    await expect(page.getByText('DAFTAR PENGAJAR FAN MATA PELAJARAN')).toBeVisible();
    await expect(page.locator('th', { hasText: 'KODE' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'NAMA' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'ASAL' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'JAH' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'MENGAJAR FAN' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'JML' })).toBeVisible();

    // Buka Modal Grup Asal
    await page.getByRole('button', { name: /Grup Asal/i }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Grup Asal Asatidz/i })).toBeVisible();
    await expect(page.getByText('Buat / Edit Grup Asal')).toBeVisible();
    await expect(page.getByText(/Grup Tersimpan/i)).toBeVisible();

    // Tutup Modal Grup Asal
    await page.getByRole('button', { name: /Tutup dialog/i }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Grup Asal Asatidz/i })).not.toBeVisible();
  });
});
