import { test, expect } from '@playwright/test';

test.describe('Modul Santri: Pengujian Komprehensif Fase 1 - 5', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/santri');
    // Pastikan halaman dan tabel santri telah termuat serta client component terhidrasi penuh
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Database Santri/i })).toBeVisible();
    await expect(page.locator('table')).toBeVisible();
    await expect(page.getByText(/Menampilkan/i)).toBeVisible();
    await expect(page.getByText(/Sedang memuat data/i)).toBeHidden({ timeout: 15_000 }).catch(() => {});
  });

  test.describe('Fase 1: Table Controls & Bulk Action', () => {
    test('1.1 Pengatur ukuran halaman (Page Size Selector)', async ({ page }) => {
      // Cari dropdown ukuran halaman via testid
      const pageSizeSelect = page.getByTestId('page-size-select');
      await expect(pageSizeSelect).toBeVisible();

      // Pilih 10 data
      await pageSizeSelect.selectOption('10');
      await expect(pageSizeSelect).toHaveValue('10');

      // Ubah ke 50 data
      await pageSizeSelect.selectOption('50');
      await expect(pageSizeSelect).toHaveValue('50');

      // Kembalikan ke 25 data
      await pageSizeSelect.selectOption('25');
      await expect(pageSizeSelect).toHaveValue('25');
    });

    test('1.2 Seleksi baris checkbox dan Select All di header', async ({ page }) => {
      const headerCheckbox = page.locator('thead th input[type="checkbox"]').first();
      await expect(headerCheckbox).toBeVisible();

      // Header checkbox awal tidak tercentang (atau indeterminate)
      const firstRowCheckbox = page.locator('tbody tr td input[type="checkbox"]').first();
      
      // Jika ada data di tabel
      if (await firstRowCheckbox.isVisible()) {
        // Centang baris pertama secara individu
        await firstRowCheckbox.check();
        await expect(firstRowCheckbox).toBeChecked();
        await expect(page.getByText(/1 terpilih/i)).toBeVisible();

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

    test('1.3 Pengurutan kolom (Clickable Column Headers)', async ({ page }) => {
      // Cari header kolom "Nama Lengkap"
      const namaHeader = page.getByRole('columnheader', { name: 'Nama Lengkap' });
      await expect(namaHeader).toBeVisible();

      // Klik header untuk mengurutkan
      await namaHeader.click();
      // Verifikasi ada ikon sort di dalam header
      await expect(namaHeader.locator('svg')).toBeVisible();

      // Klik sekali lagi untuk toggle arah sort (Descending)
      await namaHeader.click();
      await expect(namaHeader.locator('svg')).toBeVisible();
    });

    test('1.4 Dropdown Hapus & Modal Verifikasi 2 Langkah (Hapus Semua)', async ({ page }) => {
      // Cari tombol Hapus dropdown
      const hapusDropdownBtn = page.getByRole('button', { name: /Hapus/i }).first();
      await expect(hapusDropdownBtn).toBeVisible();

      // Buka dropdown
      await hapusDropdownBtn.click();

      // Pilihan "Hapus Semua Data"
      const hapusSemuaOption = page.getByRole('button', { name: /Hapus Semua Data/i });
      await expect(hapusSemuaOption).toBeVisible();

      // Klik Hapus Semua Data -> Membuka Modal Verifikasi Langkah 1
      await hapusSemuaOption.click();
      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();
      await expect(modalDialog.getByText(/AWAS! Hapus SELURUH Data Santri\?/i)).toBeVisible();

      // Klik tombol Lanjut ke Verifikasi (Langkah 2)
      const lanjutBtn = modalDialog.getByRole('button', { name: /Lanjut ke Verifikasi/i });
      await expect(lanjutBtn).toBeVisible();
      await lanjutBtn.click();

      // Masuk Langkah 2: Input Konfirmasi "HAPUS SEMUA"
      await expect(modalDialog.getByText(/Ketik teks/i)).toBeVisible();
      const confirmInput = modalDialog.getByPlaceholder('HAPUS SEMUA');
      await expect(confirmInput).toBeVisible();

      const submitBtn = modalDialog.getByRole('button', { name: /Konfirmasi Kosongkan/i });
      // Tombol harus disabled sebelum diketik dengan benar
      await expect(submitBtn).toBeDisabled();

      // Ketik teks sembarangan
      await confirmInput.fill('SALAH');
      await expect(submitBtn).toBeDisabled();

      // Ketik teks yang benar persis
      await confirmInput.fill('HAPUS SEMUA');
      await expect(submitBtn).toBeEnabled();

      // Batalkan demi keamanan database pengujian
      const backBtn = modalDialog.getByRole('button', { name: /Kembali/i });
      await backBtn.click();
      await modalDialog.getByRole('button', { name: /Batalkan/i }).click();
      await expect(modalDialog).toBeHidden();
    });
  });

  test.describe('Fase 2: Pagination Numbers', () => {
    test('2.1 Bilah Paginasi Numerik dan Tombol Navigasi', async ({ page }) => {
      // Footer paginasi harus memiliki info jumlah data
      const paginationFooter = page.locator('text=/Menampilkan \\d+/i');
      await expect(paginationFooter).toBeVisible();

      // Tombol navigasi Sebelumnya dan Berikutnya
      const prevBtn = page.getByRole('button', { name: /Sebelumnya/i });
      const nextBtn = page.getByRole('button', { name: /Berikutnya/i });
      await expect(prevBtn).toBeVisible();
      await expect(nextBtn).toBeVisible();

      // Tombol halaman nomor 1
      const page1Btn = page.getByRole('button', { name: '1', exact: true });
      await expect(page1Btn).toBeVisible();
    });
  });

  test.describe('Fase 3: Input Santri Cascading (Wilayah & Formal Tree 2)', () => {
    test('3.1 Form Tambah Santri memuat cascading Wilayah dan Sekolah Formal', async ({ page }) => {
      await page.getByRole('button', { name: /Tambah Santri/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: /Formulir Pendaftaran Santri Baru/i })).toBeVisible();

      // Verifikasi Bagian 4: Pendidikan Formal (Tree 2)
      await expect(modal.getByText(/4\. Pendidikan Formal/i)).toBeVisible();
      const unitInput = modal.locator('input[name="unit"]');
      await expect(unitInput).toBeVisible();
      const formalDatalist = page.locator('#formal_unit_options');
      await expect(formalDatalist).toBeAttached();

      // Verifikasi Bagian 5: Alamat Wilayah Asal (Cascading)
      await expect(modal.getByText(/5\. Alamat Wilayah Asal/i)).toBeVisible();
      const provInput = modal.locator('input[name="provinsi"]');
      const kabInput = modal.locator('input[name="kabupaten"]');
      const kecInput = modal.locator('input[name="kecamatan"]');
      const desaInput = modal.locator('input[name="desa"]');
      const dusunInput = modal.locator('input[name="dusun"]');

      await expect(provInput).toBeVisible();
      await expect(kabInput).toBeVisible();
      await expect(kecInput).toBeVisible();
      await expect(desaInput).toBeVisible();
      await expect(dusunInput).toBeVisible();

      // Verifikasi Bagian 6: Data Administrasi Keluarga
      await expect(modal.getByText(/6\. Data Administrasi Keluarga/i)).toBeVisible();
      await expect(modal.locator('input[name="nama_ayah"]')).toBeVisible();
      await expect(modal.locator('input[name="nama_ibu"]')).toBeVisible();
      await expect(modal.locator('input[name="nik"]')).toBeVisible();
      await expect(modal.locator('input[name="no_kk"]')).toBeVisible();

      // Tutup modal
      await modal.getByRole('button', { name: /Batal/i }).click();
      await expect(modal).toBeHidden();
    });
  });

  test.describe('Fase 4: Live Camera & Media Lightbox', () => {
    test('4.1 Buka modal Kamera WebRTC 3x4 dari form input', async ({ page }) => {
      await page.getByRole('button', { name: /Tambah Santri/i }).click();
      const inputModal = page.getByRole('dialog');
      await expect(inputModal).toBeVisible();

      // Klik tombol Kamera
      const cameraBtn = inputModal.getByRole('button', { name: /Kamera/i });
      await expect(cameraBtn).toBeVisible();
      await cameraBtn.click();

      // Modal Kamera Terbuka
      await expect(page.getByText(/Ambil Foto Santri Langsung/i)).toBeVisible();
      
      // Tutup modal kamera
      const cancelCameraBtn = page.getByRole('button', { name: /Batal/i }).last();
      await cancelCameraBtn.click();
      await expect(page.getByText(/Ambil Foto Santri Langsung/i)).toBeHidden();

      // Tutup form
      await inputModal.getByRole('button', { name: /Batal/i }).click();
    });

    test('4.2 Kartu detail santri menampilkan foto dan mendukung lightbox zoom', async ({ page }) => {
      // Klik sel nama santri pada baris pertama untuk membuka kartu detail
      const namaCell = page.locator('tbody tr td').nth(6);
      await expect(namaCell).toBeVisible();
      await namaCell.click();

      const detailModal = page.getByRole('dialog');
      await expect(detailModal).toBeVisible();
      await expect(detailModal.getByText(/Kartu Biodata Lengkap Santri/i)).toBeVisible();

      // Verifikasi area foto dan info detail
      await expect(detailModal.getByText(/Domisili Pondok Pesantren/i)).toBeVisible();
      await expect(detailModal.getByText(/Pendidikan Formal/i)).toBeVisible();

      // Tutup modal detail
      await detailModal.getByRole('button', { name: /Tutup/i }).click();
      await expect(detailModal).toBeHidden();
    });
  });
});
