import { test, expect } from '@playwright/test';

test.describe('Modul 05: Muhafadzoh & Piagam Studio', () => {
  test('Setoran Muhafadzoh page and settings modal', async ({ page }) => {
    await page.goto('/setoran');

    await expect(page.getByRole('heading', { name: /Setoran/i }).first()).toBeVisible();

    // Verify form exists
    await expect(page.getByRole('heading', { name: /Input Hafalan/i })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Settings modal button
    const settingsBtn = page.getByRole('button', { name: /Opsi Hafalan|Target & Penjaga Bebas/i });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    await expect(page.getByRole('heading', { name: /Pengaturan Target Muhafadzoh/i })).toBeVisible();

    // Verify 4 tabs inside settings modal
    await expect(page.getByRole('button', { name: 'Hafalan Wajib' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hafalan Sunnah' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hafalan Kitab' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Akses Penjaga' })).toBeVisible();

    // Close settings modal
    const closeBtn = page.getByRole('button', { name: /Tutup|Batal/i }).or(page.locator('button:has-text("✕")')).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Setoran Muhafadzoh: Form Input, Kategori Token, dan Kartu Bukti Fisik', async ({ page }) => {
    await page.goto('/setoran');

    // 1. Verify Category Pill Tokens
    await expect(page.getByRole('button', { name: 'Wajib', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sunnah', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tahfidz', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kitab', exact: true })).toBeVisible();

    // 2. Verify Official Card Container
    const kartu = page.locator('.kartu-container');
    await expect(kartu).toBeVisible();
    await expect(kartu.getByText(/MADRASAH DINIYYAH AL AMIRIYYAH/i)).toBeVisible();
    await expect(kartu.getByText(/PKM MUHAFAZAH/i)).toBeVisible();

    // 3. Verify Action Buttons in Header
    await expect(page.getByTitle('Print Kartu')).toBeVisible();
    await expect(page.getByTitle('Unduh JPG')).toBeVisible();
  });

  test('Setoran Muhafadzoh: Tabel Riwayat 11 Kolom dan Checkbox Seleksi', async ({ page }) => {
    await page.goto('/setoran');

    // 1. Verify 11 Column Headers
    const table = page.locator('table.tabel-kbm-resmi');
    await expect(table).toBeVisible();

    await expect(table.getByRole('columnheader', { name: 'NO', exact: true })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'NO. INDUK' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'TGL SETOR' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'NAMA SANTRI' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'TEMPAT, TGL LAHIR' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'PENJAGA' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'ASATIDZ' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'KELAS' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'HAFALAN' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'KATEGORI' })).toBeVisible();

    // 2. Search Input for table
    const searchInput = page.getByRole('textbox', { name: 'Pencarian...' });
    await expect(searchInput).toBeVisible();
  });

  test('Rekap Hafalan: Toolbar, Mode Pills, Dropdown Tingkat, dan Tombol Export/Cetak', async ({ page }) => {
    await page.goto('/rekap-hafalan');

    await expect(page.getByRole('heading', { name: /Rekapitulasi Hafalan Pertingkatan/i }).first()).toBeVisible();

    // Mode buttons
    const btnWajib = page.getByRole('button', { name: 'Hafalan Wajib', exact: true });
    const btnTahfidz = page.getByRole('button', { name: 'Hafalan Tahfidz', exact: true });
    await expect(btnWajib).toBeVisible();
    await expect(btnTahfidz).toBeVisible();

    // Tingkat Select
    const selectTingkat = page.getByRole('combobox').first();
    await expect(selectTingkat).toBeVisible();
    await expect(selectTingkat).toHaveValue('ULA');

    // Action Buttons
    await expect(page.getByRole('button', { name: /Cetak A4/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();

    // Switch to Tahfidz
    await btnTahfidz.click();
    await expect(btnTahfidz).toHaveClass(/bg-emerald-700/);

    // Switch back to Wajib
    await btnWajib.click();
    await expect(btnWajib).toHaveClass(/bg-emerald-700/);

    // Empty state on ULA with quick action to WUSTHO
    await expect(page.getByText('Data Santri Tidak Ditemukan')).toBeVisible();
    await expect(page.getByText(/Belum ada data santri yang terdaftar pada Tingkat/i)).toBeVisible();

    // Select WUSTHO and verify santri table renders
    await selectTingkat.selectOption('WUSTHO');
    await expect(selectTingkat).toHaveValue('WUSTHO');

    // Verify Kelas 1 - Tingkat WUSTHO table rendered
    await expect(page.getByRole('heading', { name: /Kelas 1 - Tingkat WUSTHO/i })).toBeVisible();
    await expect(page.getByText('ANDIKO DWI SAPUTRA')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /fiy+ah 350/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /fiy+ah 500/i })).toBeVisible();
    await expect(page.getByText('1 / 2')).toBeVisible();
  });

  test('Studio Piagam Kelulusan and coordinate inspector', async ({ page }) => {
    await page.goto('/piagam');

    await expect(page.getByRole('heading', { name: /Cetak Piagam/i }).first()).toBeVisible();

    // Coordinate panel & Settings
    await expect(page.getByRole('heading', { name: /Pengaturan Piagam/i }).first()).toBeVisible();

    // Print & Reset buttons
    await expect(page.getByRole('button', { name: /Print Piagam/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Reset Kanvas/i })).toBeVisible();

    // Template selector & Simpan
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Simpan/i })).toBeVisible();

    // Orientasi buttons
    await expect(page.getByRole('button', { name: /Landscape/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Portrait/i })).toBeVisible();

    // Background tabs
    await expect(page.getByRole('button', { name: /Google Drive/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Upload File/i })).toBeVisible();

    // Quick Tags
    await expect(page.getByRole('button', { name: '+ Nama', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ No. Induk', exact: true })).toBeVisible();

    // Tambah Blok Teks button
    await expect(page.getByRole('button', { name: /Tambah Blok Teks/i })).toBeVisible();

    // Buka Modal Penerima Piagam Massal
    const btnMailing = page.getByRole('button', { name: /Klik untuk Memilih Santri/i });
    await expect(btnMailing).toBeVisible();
    await btnMailing.click();

    // Verifikasi modal terbuka
    await expect(page.getByRole('heading', { name: /Pilih Penerima Piagam/i })).toBeVisible();
    await expect(page.getByPlaceholder('Ketik/Pilih Asatidz...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Centang Yang Tampil' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal Centang' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batal', exact: true })).toBeVisible();

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Pilih Penerima Piagam/i })).not.toBeVisible();

    // Certificate preview element on canvas
    await expect(page.getByText(/MADRASAH DINIYYAH AL AMIRIYYAH BLOKAGUNG/i)).toBeVisible();
  });
});
