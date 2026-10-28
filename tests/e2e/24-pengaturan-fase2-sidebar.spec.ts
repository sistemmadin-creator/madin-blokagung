import { test, expect } from '@playwright/test';

test.describe('Fase 2: Ubah Sidebar Tingkat Lanjut (Sub-menu, Visibility, Pindah Grup, & Cloud Sync)', () => {
  test.beforeEach(async ({ page }) => {
    // Bersihkan konfigurasi lokal sebelum setiap tes
    await page.addInitScript(() => {
      window.localStorage.removeItem('madina_sidebar_config_v1');
    });
  });

  test('1. Dapat mengubah nama sub-menu anak dan langsung tercermin di sidebar desktop', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    const sidebar = page.getByRole('complementary');

    // Buka accordion sub-menu pada item Jadwal KBM
    const expandBtn = page.getByTestId('btn-expand-sub-item-jadwal-kbm');
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();

    // Verifikasi sub-menu baris jadwal kelas muncul
    const subRow = page.getByTestId('subitem-row-sub-jadwal-kelas');
    await expect(subRow).toBeVisible();

    // Klik edit sub-item
    const editSubBtn = page.getByTestId('btn-edit-sub-sub-jadwal-kelas');
    await editSubBtn.click();

    // Masukkan judul baru
    const subInput = page.getByTestId('input-sub-sub-jadwal-kelas');
    await expect(subInput).toBeVisible();
    await subInput.fill('Jadwal Syariah Harian');

    const saveSubBtn = page.getByTestId('btn-save-sub-sub-jadwal-kelas');
    await saveSubBtn.click();

    // Verifikasi pesan konfirmasi
    await expect(page.getByText(/Nama sub-menu diperbarui menjadi "Jadwal Syariah Harian"/i)).toBeVisible();

    // Verifikasi pada Sidebar Desktop (anak sub-menu menampilkan nama baru)
    await expect(sidebar.getByText('Jadwal Syariah Harian')).toBeVisible();
  });

  test('2. Dapat menyembunyikan dan menampilkan kembali item menu dari sidebar (Visibility Toggle)', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    const sidebar = page.getByRole('complementary');

    // Awalnya menu Data Asatidz terlihat di sidebar
    await expect(sidebar.getByText('Data Asatidz')).toBeVisible();

    // Klik tombol sembunyikan (eye toggle) pada Data Asatidz
    const toggleAsatidz = page.getByTestId('btn-toggle-item-visibility-item-asatidz');
    await expect(toggleAsatidz).toBeVisible();
    await toggleAsatidz.click();

    // Verifikasi status pesan
    await expect(page.getByText(/Menu "Data Asatidz" disembunyikan dari sidebar/i)).toBeVisible();

    // Pada sidebar desktop, Data Asatidz kini TIDAK tampil
    await expect(sidebar.getByText('Data Asatidz')).not.toBeVisible();

    // Klik tombol tampilkan kembali
    await toggleAsatidz.click();
    await expect(page.getByText(/Menu "Data Asatidz" ditampilkan di sidebar/i)).toBeVisible();

    // Data Asatidz muncul kembali di sidebar desktop
    await expect(sidebar.getByText('Data Asatidz')).toBeVisible();
  });

  test('3. Dapat menyembunyikan seluruh grup menu dari sidebar desktop', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    const sidebar = page.getByRole('complementary');

    // Awalnya grup PKM. Publikasi & Warta terlihat di sidebar
    await expect(sidebar.getByText(/Publikasi & Warta/i)).toBeVisible();

    // Klik tombol toggle visibility grup Publikasi
    const togglePublikasi = page.getByTestId('btn-toggle-group-visibility-grp-publikasi');
    await togglePublikasi.click();

    // Verifikasi teks indikator di editor
    await expect(page.getByText('Grup Disembunyikan')).toBeVisible();

    // Di sidebar desktop, grup PKM. Publikasi & Warta tidak lagi dirender
    await expect(sidebar.getByText(/Publikasi & Warta/i)).not.toBeVisible();

    // Tampilkan kembali grup
    await togglePublikasi.click();
    await expect(sidebar.getByText(/Publikasi & Warta/i)).toBeVisible();
  });

  test('4. Dapat memindahkan item menu ke kategori grup lain', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    // Buka panel pindah grup pada menu 'Data Asatidz' (awalnya di grup Utama)
    const moveGroupBtn = page.getByTestId('btn-open-move-group-item-asatidz');
    await moveGroupBtn.click();

    // Pilih grup tujuan 'Beranda'
    const selectTarget = page.getByTestId('select-move-group-item-asatidz');
    await expect(selectTarget).toBeVisible();
    await selectTarget.selectOption('grp-beranda');

    // Klik konfirmasi pindah
    const confirmBtn = page.getByTestId('btn-confirm-move-group-item-asatidz');
    await confirmBtn.click();

    // Verifikasi pesan sukses
    await expect(page.getByText(/Menu berhasil dipindahkan ke grup "Beranda"/i)).toBeVisible();

    // Verifikasi di editor: item Data Asatidz sekarang berada di dalam baris grup Beranda
    const groupBeranda = page.getByTestId('group-row-grp-beranda');
    await expect(groupBeranda.getByText('Data Asatidz')).toBeVisible();
  });

  test('5. Tombol Simpan ke Cloud memberikan indikator feedback dan mencatat konfigurasi', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    // Klik tombol Simpan ke Cloud
    const saveCloudBtn = page.getByTestId('btn-save-cloud');
    await expect(saveCloudBtn).toBeVisible();
    await saveCloudBtn.click();

    // Menampilkan status sinkronisasi
    await expect(page.getByText(/Status Sinkron:/i)).toBeVisible();
  });
});
