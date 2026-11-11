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

test.describe('E2E: Verifikasi Perbaikan Header Sapras & Integrasi Detail Modal Beranda (Santri & Asatidz)', () => {
  test.setTimeout(90000);

  test('1. Layout Header Sapras: Verifikasi Tiered Navigation & Full-Width Breathing Room', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/sapras/inventaris-madin');

    // 1. Verifikasi Heading PKM Sapras Utama
    const mainHeading = page.getByTestId('heading-pkm-sapras');
    await expect(mainHeading).toBeVisible({ timeout: 30000 });
    await expect(mainHeading).toHaveText(/Inventaris Madin \(Universal Asset & Lokasi Kantor\)/i);

    // 2. Verifikasi Bilah Sub-Navigasi Sapras & Tombol Scan Barcode
    const btnScanBarcode = page.getByTestId('btn-global-sapras-scan');
    await expect(btnScanBarcode).toBeVisible();

    const navInventarisMadin = page.getByTestId('nav-sapras-inventaris-madin');
    await expect(navInventarisMadin).toBeVisible();

    const navInventarisKelas = page.getByTestId('nav-sapras-inventaris-kelas');
    await expect(navInventarisKelas).toBeVisible();

    // 3. Verifikasi Toolbar Modul Inventaris Madin tetap rapi & tombol-tombolnya ada
    await expect(page.getByRole('heading', { name: /Inventaris Madin & Lokasi Aset/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tambah Aset/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kelola Lokasi/i })).toBeVisible();
  });

  test('2. Modal Rincian Data Santri di Beranda: Menampilkan Kartu Progres Setoran Hafalan Real-Time', async ({
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

    // 5. Verifikasi Komponen Baru: Kartu Progres Setoran Hafalan (Gambar 3)
    await expect(santriModal.getByText('Progres Setoran Hafalan')).toBeVisible();
    await expect(santriModal.getByText('Target Saat Ini:', { exact: false })).toBeVisible();
    await expect(santriModal.getByText('Capaian Setoran Hafalan:', { exact: false })).toBeVisible();

    // 6. Tutup modal
    const closeBtn = santriModal.locator('button').filter({ hasText: '' }).first();
    await closeBtn.click();
    await expect(santriModal.getByRole('heading', { name: 'Rincian Data Santri' })).not.toBeVisible();
  });

  test('3. Modal Rincian Data Asatidz di Beranda: Menampilkan Keaktifan Absensi & Kelas Binaan Wali Kelas', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/beranda');

    // 1. Cari asatidz yang bertugas sebagai Mustahiq/Wali Kelas melalui omni-search
    const searchInput = page.getByPlaceholder(/Cari modul, grup, atau sub-menu/i);
    await expect(searchInput).toBeVisible({ timeout: 30000 });
    await searchInput.fill('saifurrouf');

    // 2. Tunggu hasil pencarian cerdas universal
    await expect(page.getByText('Hasil Pencarian Cerdas Universal')).toBeVisible({ timeout: 15000 });

    // 3. Klik kartu asatidz
    const asatidzCard = page.locator('button', { hasText: /SAIFURROUF/i }).first();
    await expect(asatidzCard).toBeVisible();
    await asatidzCard.click();

    // 4. Verifikasi Modal Terbuka
    const asatidzModal = page.locator('div[role="dialog"], .fixed.inset-0').last();
    await expect(asatidzModal.getByRole('heading', { name: 'Rincian Data Asatidz' })).toBeVisible();
    await expect(asatidzModal.getByText('ACHMAD SAIFURROUF', { exact: false })).toBeVisible();

    // 5. Verifikasi Komponen Baru: Keaktifan Absensi Mengajar
    await expect(asatidzModal.getByText('Keaktifan Absensi Mengajar')).toBeVisible();
    await expect(asatidzModal.getByText('Tingkat Kehadiran:', { exact: false })).toBeVisible();
    await expect(asatidzModal.getByText('Hadir', { exact: true })).toBeVisible();
    await expect(asatidzModal.getByText('Izin', { exact: true })).toBeVisible();
    await expect(asatidzModal.getByText('Sakit', { exact: true })).toBeVisible();
    await expect(asatidzModal.getByText('Alfa', { exact: true })).toBeVisible();

    // 6. Verifikasi Komponen Baru: Wali Kelas / Mustahiq & Daftar Santri Binaan
    const waliSection = asatidzModal.getByText(/Wali Kelas \/ Mustahiq/i);
    const fanSection = asatidzModal.getByText(/Pengampu Bidang Studi/i);
    await expect(waliSection.or(fanSection)).toBeVisible();

    // 7. Verifikasi Komponen Baru: Jadwal Mengajar (Sabtu s/d Kamis) Jam 1 & 2
    await expect(asatidzModal.getByText(/Jadwal Mengajar \(Sabtu s\/d Kamis\)/i)).toBeVisible();
    await expect(asatidzModal.getByText(/Sesi Inti Jam 1 & 2/i)).toBeVisible();
    // Pastikan Jam 3 & Jam 4 tidak ditampilkan pada panel jadwal mengajar KBM
    await expect(asatidzModal.getByText(/Jam 3:/i)).not.toBeVisible();
    await expect(asatidzModal.getByText(/Jam 4:/i)).not.toBeVisible();

    // Jika sebagai wali kelas, verifikasi bahwa terdapat list santri binaan yang dapat diklik
    if (await waliSection.isVisible()) {
      const studentButtonInAsatidz = asatidzModal.locator('button', { hasText: /NIS:/i }).first();
      if (await studentButtonInAsatidz.isVisible()) {
        // Klik santri untuk menguji transisi langsung ke modal santri
        await studentButtonInAsatidz.click();
        await expect(page.getByRole('heading', { name: 'Rincian Data Santri' })).toBeVisible();
      }
    }
  });
});
