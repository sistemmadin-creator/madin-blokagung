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

test.describe('E2E: Modal Santri Capaian 4 Kategori, Adaptive Fit Tabel HP, & Tombol Hamburger Aksi Cepat', () => {
  test.setTimeout(90000);

  test('1. Modal Rincian Data Santri di Beranda: Tampilan max-w-5xl & Panel Daftar Capaian 4 Kategori', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/beranda');

    // 1. Cari santri melalui omni-search input
    const searchInput = page.getByPlaceholder(/Cari modul, grup, atau sub-menu/i);
    await expect(searchInput).toBeVisible({ timeout: 30000 });
    await searchInput.fill('taufik');

    // 2. Tunggu hasil pencarian cerdas universal muncul
    await expect(page.getByText('Hasil Pencarian Cerdas Universal')).toBeVisible({ timeout: 15000 });

    // 3. Klik kartu santri untuk membuka Modal Rincian Data Santri
    const santriCard = page.locator('button', { hasText: /TAUFIK HIDAYAT/i }).first();
    await expect(santriCard).toBeVisible();
    await santriCard.click();

    // 4. Verifikasi Modal Terbuka
    const santriModal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(santriModal.getByRole('heading', { name: 'Rincian Data Santri' })).toBeVisible();
    await expect(santriModal.getByText('TAUFIK HIDAYAT')).toBeVisible();

    // 5. Verifikasi Komponen Baru: Panel Daftar Capaian Santri (Gambar 1)
    await expect(santriModal.getByText('Daftar Capaian Santri')).toBeVisible();
    await expect(santriModal.getByText('Wajib', { exact: true })).toBeVisible();
    await expect(santriModal.getByText('Sunnah', { exact: true })).toBeVisible();
    await expect(santriModal.getByText('Kitab', { exact: true })).toBeVisible();
    await expect(santriModal.getByText('Tahfidz', { exact: true })).toBeVisible();

    // 6. Verifikasi Tab Filter Kategori di Panel Capaian
    await expect(santriModal.getByRole('button', { name: 'Semua Kategori' })).toBeVisible();
    await expect(santriModal.getByRole('button', { name: 'Wajib', exact: true })).toBeVisible();
    await expect(santriModal.getByRole('button', { name: 'Sunnah', exact: true })).toBeVisible();
    await expect(santriModal.getByRole('button', { name: 'Kitab', exact: true })).toBeVisible();

    // 7. Tutup modal
    const closeBtn = santriModal.locator('button').filter({ hasText: '' }).first();
    await closeBtn.click();
    await expect(santriModal.getByRole('heading', { name: 'Rincian Data Santri' })).not.toBeVisible();
  });

  test('2. Adaptive Fit Tabel HP di /rekap-hafalan: Tidak Terpotong & Pas Selebar Layar', async ({
    page,
  }) => {
    // Set viewport ke ukuran HP (iPhone / Android)
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithAuth(page, '/rekap-hafalan');

    // 1. Verifikasi Heading & Tabel Ada
    await expect(page.getByRole('heading', { name: /Rekapitulasi Hafalan Pertingkatan/i })).toBeVisible({
      timeout: 30000,
    });

    // 2. Verifikasi Wrapper Adaptive Table Fit ada
    const tableWrapper = page.getByTestId('table-rekap-hafalan-wrapper');
    await expect(tableWrapper).toBeVisible();

    const table = page.getByTestId('table-rekap-hafalan');
    await expect(table).toBeVisible();

    // 3. Verifikasi bounding box tabel berada dalam batas layar ponsel
    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  });

  test('3. Adaptive Fit Tabel HP di /hari-kbm: Tidak Terpotong & Pas Selebar Layar', async ({
    page,
  }) => {
    // Set viewport ke ukuran HP (iPhone / Android)
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithAuth(page, '/hari-kbm');

    // 1. Verifikasi Heading & Tabel Ada
    await expect(page.getByText(/DAFTAR TUGAS MENGAJAR ASATIDZ/i)).toBeVisible({
      timeout: 30000,
    });

    // 2. Verifikasi Wrapper Adaptive Table Fit ada
    const tableWrapper = page.getByTestId('table-hari-kbm-wrapper');
    await expect(tableWrapper).toBeVisible();

    const table = page.locator('#tableHariKBM');
    await expect(table).toBeVisible();

    // 3. Verifikasi bounding box tabel berada dalam batas layar ponsel
    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(390);
    }
  });

  test('4. Tombol Hamburger (☰) Mobile: Menu Aksi Cepat (Pencarian Universal & Zoom Tabel)', async ({
    page,
  }) => {
    // Set viewport ke ukuran HP
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithAuth(page, '/jadwal-kbm');

    // 1. Verifikasi Tombol Hamburger Mobile di Pojok Kiri Atas
    const btnHamburger = page.getByTestId('btn-hamburger-mobile');
    await expect(btnHamburger).toBeVisible({ timeout: 30000 });
    await btnHamburger.click();

    // 2. Verifikasi Pop-Up Menu Aksi Cepat Muncul
    const dropdownMenu = page.getByTestId('menu-hamburger-dropdown');
    await expect(dropdownMenu).toBeVisible();
    await expect(dropdownMenu.getByText('Aksi Cepat Mobile')).toBeVisible();

    // 3. Verifikasi Opsi 1: Pencarian Universal
    const btnOmnisearch = page.getByTestId('btn-hamburger-omnisearch');
    await expect(btnOmnisearch).toBeVisible();

    // 4. Verifikasi Opsi 2: Zoom untuk Zoom Tabel
    const btnZoom = page.getByTestId('btn-hamburger-zoom-tabel');
    await expect(btnZoom).toBeVisible();

    // 5. Uji Klik Pencarian Universal -> Membuka ModalUniversalSearch
    await btnOmnisearch.click();
    await expect(dropdownMenu).not.toBeVisible();

    const universalInput = page.getByTestId('input-universal-omnisearch');
    await expect(universalInput).toBeVisible();

    // Ketik pencarian instan
    await universalInput.fill('taufik');
    await expect(page.getByText('Santri (')).toBeVisible();

    // Tutup Pencarian Universal
    await page.getByRole('button', { name: /Tutup \(Esc\)/i }).click();
    await expect(universalInput).not.toBeVisible();

    // 6. Uji Klik Zoom Tabel dari Hamburger -> Memunculkan FloatingTableTools
    await btnHamburger.click();
    await expect(page.getByTestId('menu-hamburger-dropdown')).toBeVisible();
    await page.getByTestId('btn-hamburger-zoom-tabel').click();

    // Panel alat bantu tabel muncul
    await expect(page.getByLabel('Panel Alat Bantu Tabel')).toBeVisible();
    await expect(page.getByText('Pas Layar')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });
});
