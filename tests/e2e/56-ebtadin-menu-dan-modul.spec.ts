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

test.describe('E2E: Pengujian Grup Menu EBTADIN dan Seluruh Sub-Modulnya', () => {
  test.setTimeout(90000);

  test('1. Sidebar menampilkan Grup Menu EBTADIN dan menu Pusat Kendali & Serah Ijazah', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin');

    // Pastikan sidebar memuat grup menu EBTADIN
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('EBTADIN', { exact: true })).toBeVisible({ timeout: 25000 });

    // Menu "Pusat Kendali EBTADIN" dan "Serah Ijazah" harus ada di sidebar
    const linkPusatKendali = sidebar.getByRole('link', { name: 'Pusat Kendali EBTADIN', exact: true });
    const linkSerahIjazah = sidebar.getByRole('link', { name: 'Serah Ijazah', exact: true });

    await expect(linkPusatKendali).toBeVisible();
    await expect(linkSerahIjazah).toBeVisible();

    // Klik menu Serah Ijazah dari sidebar
    await linkSerahIjazah.click();
    await page.waitForURL('**/ebtadin/serah-ijazah**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Serah Ijazah Santri/i })).toBeVisible();

    // Kembali ke Pusat Kendali via sidebar
    await linkPusatKendali.click();
    await page.waitForURL('**/ebtadin', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Pusat Kendali Data EBTADIN/i })).toBeVisible();
  });

  test('2. Pusat Kendali EBTADIN (/ebtadin): Ringkasan Metrik, Dropdown Angkatan, Tombol Aksi, & Modal Kunci', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin');

    // 1. Verifikasi Judul & Status Badge
    await expect(
      page.getByRole('heading', { name: /Pusat Kendali Data EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });
    await expect(
      page.getByText(/SINKRON AKTIF|DATA DITETAPKAN/i).first()
    ).toBeVisible();

    // 2. Verifikasi 4 Kartu Metrik
    await expect(page.getByText(/Total Rombel Ebtadin/i)).toBeVisible();
    await expect(page.getByText(/Santri Peserta/i)).toBeVisible();
    await expect(page.getByText(/Mustahiq & Penguji/i)).toBeVisible();
    await expect(page.getByText(/Status Ijazah/i)).toBeVisible();

    // 3. Verifikasi Tombol Aksi Utama (Daftar Kelas, Sinkronkan, Tetapkan Data)
    const btnDaftarKelas = page.getByRole('button', { name: /Daftar Kelas/i });
    const btnSinkronkan = page.getByRole('button', { name: /Sinkronkan Ulang/i });
    const btnTetapkan = page.getByRole('button', { name: /Tetapkan Data/i });

    await expect(btnDaftarKelas).toBeVisible();
    await expect(btnSinkronkan).toBeVisible();
    await expect(btnTetapkan).toBeVisible();

    // 4. Buka Modal Konfirmasi Tetapkan Data
    await btnTetapkan.click();
    const modalDialog = page.locator('div.fixed.inset-0', { hasText: /Tetapkan Data EBTADIN Permanen\?/i });
    await expect(modalDialog).toBeVisible({ timeout: 10000 });

    // Verifikasi input kata kunci TETAPKAN
    const inputKeyword = modalDialog.getByPlaceholder('TETAPKAN');
    await expect(inputKeyword).toBeVisible();

    // Tombol Kunci harus disable jika belum ketik TETAPKAN
    const btnConfirmLock = modalDialog.getByRole('button', { name: /Kunci & Tetapkan/i });
    await expect(btnConfirmLock).toBeDisabled();

    // Ketik TETAPKAN lalu cek tombol aktif
    await inputKeyword.fill('TETAPKAN');
    await expect(btnConfirmLock).toBeEnabled();

    // Tutup modal dengan tombol Batal spesifik di modal
    await modalDialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modalDialog).not.toBeVisible();

    // 5. Verifikasi 5 Kartu Modul EBTADIN di Halaman Hub
    await expect(page.getByText(/Data Santri Ebtadin/i)).toBeVisible();
    await expect(page.getByText(/Data Asatidz & Penguji/i)).toBeVisible();
    await expect(page.getByText(/Formasi Kelas Putra/i)).toBeVisible();
    await expect(page.getByText(/Formasi Kelas Putri/i)).toBeVisible();
    await expect(page.getByText(/Serah Ijazah Santri/i)).toBeVisible();
  });

  test('3. Modul Serah Ijazah (/ebtadin/serah-ijazah): Ringkasan Metrik, Filter, & Interaksi Tanda Terima', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/serah-ijazah');

    // Heading dan Badge Tahun
    await expect(
      page.getByRole('heading', { name: /Serah Ijazah Santri/i })
    ).toBeVisible({ timeout: 25000 });

    // Tombol toolbar atas
    await expect(page.getByRole('button', { name: /Segarkan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ekspor Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak Rekap/i })).toBeVisible();

    // 3 Kartu Metrik
    await expect(page.getByText(/MENERIMA/i).first()).toBeVisible();
    await expect(page.getByText(/BELUM MENERIMA/i).first()).toBeVisible();
    await expect(page.getByText(/TOTAL PESERTA EBTADIN/i)).toBeVisible();

    // Filter controls
    const searchInput = page.getByPlaceholder(/Cari nama santri/i);
    await expect(searchInput).toBeVisible();

    // Tunggu kartu rombel atau baris santri termuat dari Supabase (Web-first assertion)
    const firstRombelBadge = page.locator('span', { hasText: /ULA|WUSTHO|ULYA/i }).first();
    await expect(firstRombelBadge).toBeVisible({ timeout: 20000 });

    // Test interaksi toggle status terima pada santri pertama jika ada
    const btnToggle = page.locator('table button').first();
    if (await btnToggle.isVisible()) {
      await btnToggle.click();
      // Tunggu aksi toggle
      await page.waitForTimeout(500);
      // Balikkan kembali ke kondisi semula
      await btnToggle.click();
    }
  });

  test('4. Modul Data Santri EBTADIN (/ebtadin/santri): Tabel Calon Penerima Ijazah, Pencarian, & Filter', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/santri');

    // Heading dan Deskripsi
    await expect(
      page.getByRole('heading', { name: /Data Santri EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });

    // Tombol Kembali ke Pusat Kendali di area konten utama
    const btnPusatKendali = page.locator('main, div.space-y-5').getByRole('link', { name: 'Pusat Kendali', exact: true }).first();
    await expect(btnPusatKendali).toBeVisible();

    // Statistik Santri
    await expect(page.getByText(/Total Peserta/i)).toBeVisible();
    await expect(page.getByText(/Santri Putra/i)).toBeVisible();
    await expect(page.getByText(/Santri Putri/i)).toBeVisible();

    // Input Pencarian
    const searchInput = page.getByPlaceholder(/Cari nama santri/i);
    await expect(searchInput).toBeVisible();

    // Verifikasi tabel termuat dengan baris santri secara web-first
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });

    // Filter Gender ke Putra
    const selectGender = page.locator('select', { hasText: /Semua Gender|Putra/i });
    await selectGender.selectOption('PA');
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('5. Modul Data Asatidz & Penguji (/ebtadin/asatidz): Tabel Asatidz, Peran EBTADIN, & Filter', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/asatidz');

    // Heading
    await expect(
      page.getByRole('heading', { name: /Data Asatidz & Penguji EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });

    // Tombol navigasi dan aksi
    const btnPusatKendali = page.locator('main, div.space-y-5').getByRole('link', { name: 'Pusat Kendali', exact: true }).first();
    await expect(btnPusatKendali).toBeVisible();
    await expect(page.getByRole('button', { name: /Ekspor Excel/i })).toBeVisible();

    // Ringkasan
    await expect(page.getByText(/Total Asatidz Terdaftar/i)).toBeVisible();

    // Tabel asatidz termuat secara web-first
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });
  });

  test('6. Modul Formasi Kelas Putra & Putri (/ebtadin/formasi/pa & /ebtadin/formasi/pi)', async ({
    page,
  }) => {
    // 1. Formasi Putra (PA)
    await gotoWithAuth(page, '/ebtadin/formasi/pa');
    await expect(
      page.getByRole('heading', { name: /Formasi Kelas Putra EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/Putra \(PA\)/i).first()).toBeVisible();

    // Verifikasi tabel formasi putra
    const firstRowPa = page.locator('tbody tr').first();
    await expect(firstRowPa).toBeVisible({ timeout: 20000 });

    // 2. Formasi Putri (PI)
    await gotoWithAuth(page, '/ebtadin/formasi/pi');
    await expect(
      page.getByRole('heading', { name: /Formasi Kelas Putri EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/Putri \(PI\)/i).first()).toBeVisible();

    // Verifikasi tabel formasi putri
    const firstRowPi = page.locator('tbody tr').first();
    await expect(firstRowPi).toBeVisible({ timeout: 20000 });
  });
});
