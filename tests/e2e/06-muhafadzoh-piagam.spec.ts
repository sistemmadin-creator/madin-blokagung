import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/auth';

test.describe('Modul 05: Muhafadzoh & Piagam Studio', () => {
  test('Setoran Muhafadzoh page and settings modal', async ({ page }) => {
    await gotoWithAuth(page, '/setoran');

    await expect(page.getByRole('heading', { name: /Setoran/i }).first()).toBeVisible();

    // Verify form exists
    await expect(page.getByRole('heading', { name: /Input Hafalan/i })).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();

    // Settings modal button (tunggu RBAC currentAccount selesai dimuat)
    const settingsBtn = page.getByRole('button', { name: /Opsi Hafalan|Target & Penjaga Bebas/i });
    await expect(settingsBtn).toBeVisible({ timeout: 20_000 });
    await settingsBtn.click();

    await expect(page.getByRole('heading', { name: /Pengaturan Target Muhafadzoh/i })).toBeVisible();

    // Verify 4 tabs inside settings modal
    await expect(page.getByRole('button', { name: 'Hafalan Wajib' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hafalan Sunnah' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hafalan Kitab' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Akses Penjaga' })).toBeVisible();

    // Close settings modal
    const modal = page.getByRole('dialog');
    const closeBtn = modal.getByRole('button', { name: /Tutup|Batal/i }).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  });

  test('Setoran Muhafadzoh: Form Input, Kategori Token, dan Kartu Bukti Fisik', async ({ page }) => {
    await gotoWithAuth(page, '/setoran');

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
    await gotoWithAuth(page, '/setoran');

    // 1. Verify 11 Column Headers
    const table = page.locator('table.tabel-kbm-resmi');
    await expect(table).toBeVisible();

    await expect(table.getByRole('columnheader', { name: 'NO', exact: true })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'NIS' })).toBeVisible();
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
    await gotoWithAuth(page, '/rekap-hafalan');

    await expect(page.getByRole('heading', { name: /Rekapitulasi Hafalan Pertingkatan/i }).first()).toBeVisible();

    // Tingkat & Gender Select
    const selectTingkat = page.getByRole('combobox').first();
    await expect(selectTingkat).toBeVisible();
    await expect(selectTingkat).toHaveValue('ALL');

    const selectGender = page.getByRole('combobox').nth(1);
    await expect(selectGender).toBeVisible();

    // Action Buttons
    await expect(page.getByRole('button', { name: /Cetak A4/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();

    // Table headers for Pertingkatan summary
    await expect(page.getByRole('columnheader', { name: /HAFALAN WAJIB/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /HAFALAN SUNNAH/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /HAFALAN KITAB/i })).toBeVisible();

    // Select WUSTHO and verify filter updates
    await selectTingkat.selectOption('WUSTHO');
    await expect(selectTingkat).toHaveValue('WUSTHO');
    await expect(page.locator('tbody tr').first()).toContainText(/WUSTHO/i);
  });

  test('Studio Piagam Kelulusan and coordinate inspector', async ({ page }) => {
    await gotoWithAuth(page, '/piagam');

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
    await expect(page.getByRole('button', { name: '+ NIS', exact: true })).toBeVisible();

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

  test('Cetak Piagam 3-Pane Studio: collapse panel kiri/kanan, mode fokus, dan auto-open saat klik kanvas', async ({ page }) => {
    await gotoWithAuth(page, '/piagam');

    await page.evaluate(() => window.localStorage.removeItem('madina_piagam_panels_v1'));
    await page.reload();

    // Kedua panel awalnya terbuka
    await expect(page.getByTestId('btn-collapse-left-panel')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('btn-collapse-right-panel')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pengaturan Piagam' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Elemen Teks Piagam' })).toBeVisible();

    // Kecilkan panel kiri ke samping kiri
    await page.getByTestId('btn-collapse-left-panel').click();
    await expect(page.getByTestId('btn-expand-left-panel')).toBeVisible();

    // Kecilkan panel kanan ke samping kanan
    await page.getByTestId('btn-collapse-right-panel').click();
    await expect(page.getByTestId('btn-expand-right-panel')).toBeVisible();

    // Klik elemen teks di kanvas -> panel kanan otomatis terbuka kembali
    await expect(async () => {
      await page.locator('.piagam-element').first().click({ force: true });
      await expect(page.getByTestId('btn-collapse-right-panel')).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15_000 });

    // Toggle Mode Fokus -> menutup kedua panel, lalu klik lagi -> membuka keduanya
    const focusBtn = page.getByTestId('btn-toggle-focus-mode');
    await focusBtn.scrollIntoViewIfNeeded();
    await focusBtn.click();
    await expect(page.getByTestId('btn-expand-left-panel')).toBeVisible();
    await expect(page.getByTestId('btn-expand-right-panel')).toBeVisible();

    await focusBtn.scrollIntoViewIfNeeded();
    await focusBtn.click();
    await expect(page.getByTestId('btn-collapse-left-panel')).toBeVisible();
    await expect(page.getByTestId('btn-collapse-right-panel')).toBeVisible();
  });
});
