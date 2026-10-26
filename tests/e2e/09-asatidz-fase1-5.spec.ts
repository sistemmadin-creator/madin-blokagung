import { test, expect } from '@playwright/test';

test.describe('Modul Asatidz: Pengujian Komprehensif Fitur & Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/asatidz');
    await expect(page.getByRole('heading', { name: /Database Asatidz/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText(/Menampilkan/i)).toBeVisible();
    await expect(page.getByText(/Sedang memuat direktori asatidz/i)).toBeHidden({ timeout: 15_000 }).catch(() => {});
  });

  test.describe('Fase 1: Kontrol Tabel & Bulk Action', () => {
    test('1.1 Pengatur ukuran data halaman (Page Size Selector 10/25/50/100)', async ({ page }) => {
      const pageSizeSelect = page.getByTestId('page-size-select');
      await expect(pageSizeSelect).toBeVisible();
      await expect(pageSizeSelect).toHaveValue('25');

      // Pilih 10 data
      await pageSizeSelect.selectOption('10');
      await expect(pageSizeSelect).toHaveValue('10');

      // Pilih 50 data
      await pageSizeSelect.selectOption('50');
      await expect(pageSizeSelect).toHaveValue('50');

      // Kembalikan ke 25 data
      await pageSizeSelect.selectOption('25');
      await expect(pageSizeSelect).toHaveValue('25');
    });

    test('1.2 Checkbox baris dan Select All di header tabel', async ({ page }) => {
      const headerCheckbox = page.locator('thead th input[type="checkbox"]').first();
      await expect(headerCheckbox).toBeVisible();

      const firstRowCheckbox = page.locator('tbody tr td input[type="checkbox"]').first();

      if (await firstRowCheckbox.isVisible()) {
        // Centang baris pertama
        await firstRowCheckbox.check();
        await expect(firstRowCheckbox).toBeChecked();
        await expect(page.getByText(/1 asatidz dicentang/i)).toBeVisible();

        // Hapus centang
        await firstRowCheckbox.uncheck();
        await expect(firstRowCheckbox).not.toBeChecked();

        // Centang Select All di header
        await headerCheckbox.check();
        await expect(firstRowCheckbox).toBeChecked();

        // Hapus centang Select All
        await headerCheckbox.uncheck();
        await expect(firstRowCheckbox).not.toBeChecked();
      }
    });

    test('1.3 Pengurutan kolom (Sorting Header Clickable)', async ({ page }) => {
      const namaHeader = page.getByRole('columnheader', { name: /NAMA ASATIDZ/i });
      await expect(namaHeader).toBeVisible();

      // Klik sort Ascending
      await namaHeader.click();
      await expect(namaHeader.locator('svg')).toBeVisible();

      // Klik sort Descending
      await namaHeader.click();
      await expect(namaHeader.locator('svg')).toBeVisible();
    });

    test('1.4 Dropdown Hapus & Konfirmasi Hapus Terpilih', async ({ page }) => {
      const hapusBtn = page.getByRole('button', { name: /Hapus/i }).first();
      await expect(hapusBtn).toBeVisible();

      // Buka dropdown
      await hapusBtn.click();
      const hapusTerpilihOption = page.getByRole('button', { name: /Hapus Terpilih/i });
      await expect(hapusTerpilihOption).toBeVisible();

      // Jika belum ada yang dicentang, klik memicu alert peringatan
      page.once('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Centang minimal satu data');
        await dialog.accept();
      });
      await hapusTerpilihOption.click();
    });
  });

  test.describe('Fase 2: Modal Sembunyikan & Kelola Kolom', () => {
    test('2.1 Buka modal Sembunyikan dan verifikasi kolom terkunci', async ({ page }) => {
      await page.getByRole('button', { name: /Sembunyikan/i }).click();

      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();
      await expect(modalDialog.getByText(/Kelola Tampilan Kolom Database Asatidz/i)).toBeVisible();

      // Tombol Sembunyikan Semua & Tampilkan Semua
      await expect(modalDialog.getByRole('button', { name: /Sembunyikan Semua/i })).toBeVisible();
      await expect(modalDialog.getByRole('button', { name: /Tampilkan Semua/i })).toBeVisible();

      // Kolom NAMA ASATIDZ harus terkunci (disabled)
      const namaAsatidzCheckbox = modalDialog.locator('label', { hasText: 'NAMA ASATIDZ' }).locator('input[type="checkbox"]');
      await expect(namaAsatidzCheckbox).toBeDisabled();

      // Tutup modal via tombol Simpan
      await modalDialog.getByRole('button', { name: /Simpan Tampilan/i }).click();
      await expect(modalDialog).toBeHidden();
    });
  });

  test.describe('Fase 3: Modal Import Massal Excel', () => {
    test('3.1 Buka modal Import Excel, verifikasi panduan format dan tombol unduh template', async ({ page }) => {
      await page.getByRole('button', { name: /Import Excel/i }).click();

      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();
      await expect(modalDialog.getByText(/Import Massal Database Asatidz/i)).toBeVisible();

      // Verifikasi panduan kolom wajib
      await expect(modalDialog.getByText(/Format Kolom Wajib Baris Pertama/i)).toBeVisible();
      await expect(modalDialog.getByRole('button', { name: /Unduh Template Excel/i })).toBeVisible();

      // Verifikasi area upload drag & drop
      await expect(modalDialog.getByText(/Klik atau seret file Excel ke sini/i)).toBeVisible();

      // Tutup modal
      await modalDialog.getByRole('button', { name: /Batal/i }).click();
      await expect(modalDialog).toBeHidden();
    });
  });

  test.describe('Fase 4: Modal Form Input / Tambah Asatidz', () => {
    test('4.1 Membuka form tambah asatidz dengan prefix NIA, dropdown tgl lahir, dan kamera', async ({ page }) => {
      await page.getByRole('button', { name: /Tambah Asatidz/i }).click();

      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();
      await expect(modalDialog.getByText(/Form Pendaftaran Data Asatidz/i)).toBeVisible();

      // Verifikasi tombol pintas Impor via Excel di header form
      await expect(modalDialog.getByRole('button', { name: /Impor via Excel/i })).toBeVisible();

      // Verifikasi tombol Kamera
      await expect(modalDialog.getByRole('button', { name: /Kamera/i })).toBeVisible();

      // Verifikasi selector prefix NIA
      const prefixSelect = modalDialog.locator('select[title="Pilih Prefix Huruf NIA"]');
      await expect(prefixSelect).toBeVisible();
      await prefixSelect.selectOption('B');

      // Verifikasi input Nama Lengkap
      const namaInput = modalDialog.getByPlaceholder(/Nama lengkap asatidz/i);
      await expect(namaInput).toBeVisible();

      // Verifikasi dropdown Tanggal, Bulan, Tahun
      await expect(modalDialog.locator('select[name="tgl_lahir"]')).toBeVisible();
      await expect(modalDialog.locator('select[name="bln_lahir"]')).toBeVisible();
      await expect(modalDialog.locator('select[name="thn_lahir"]')).toBeVisible();

      // Tutup modal
      await modalDialog.getByRole('button', { name: /Batal/i }).click();
      await expect(modalDialog).toBeHidden();
    });
  });

  test.describe('Fase 5: Modal Detail Asatidz & Santri Binaan', () => {
    test('5.1 Klik baris tabel membuka Detail Asatidz lengkap dengan Santri Binaan', async ({ page }) => {
      // Klik pada teks nama asatidz di baris pertama tabel
      const namaAsatidzCell = page.locator('tbody tr td').filter({ hasText: 'ABDUL JALIL' }).first();
      await expect(namaAsatidzCell).toBeVisible();
      await namaAsatidzCell.click();

      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();
      await expect(modalDialog.getByText(/Detail Profil Asatidz & Santri Binaan/i)).toBeVisible();

        // Verifikasi section Tugas Mengajar & Domisili
        await expect(modalDialog.getByText(/Tugas Mengajar & Lokasi KBM/i)).toBeVisible();
        await expect(modalDialog.getByText(/Domisili Pondok Pesantren/i)).toBeVisible();

        // Verifikasi Tabel Santri Binaan
        await expect(modalDialog.getByText(/Daftar Santri Binaan/i)).toBeVisible();

        // Verifikasi Tombol Hapus & Edit
        await expect(modalDialog.getByRole('button', { name: /Hapus Asatidz/i })).toBeVisible();
        await expect(modalDialog.getByRole('button', { name: /Edit Data Asatidz/i })).toBeVisible();

        // Tutup modal
        await modalDialog.getByRole('button', { name: 'Tutup', exact: true }).click();
        await expect(modalDialog).toBeHidden();
    });
  });
});
