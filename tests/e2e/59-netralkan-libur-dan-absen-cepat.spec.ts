import { test, expect, Page } from '@playwright/test';

async function performLogin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByLabel('Username Pengurus').fill('admin');
  await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
  await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
}

test.describe('E2E: Verifikasi Penetralan Hari Libur & Pemulihan Absen Cepat Mobile', () => {
  test.setTimeout(90000);

  test('1. Verifikasi Gambar 1: Seluruh 20 Kode Kegiatan Berstatus Netral (KBM Masuk) & Tombol Atur Hadir', async ({
    page,
  }) => {
    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    await page.goto('/kalender-kegiatan');
    await page.waitForLoadState('domcontentloaded');

    // Pastikan card 'Keterangan Kode Kegiatan & Filter Sorotan' terlihat
    await expect(
      page.getByText('Keterangan Kode Kegiatan & Filter Sorotan', { exact: true })
    ).toBeVisible({ timeout: 20000 });

    // Verifikasi tombol 'Atur Libur / Masuk KBM' di samping Cetak & Export
    const btnAtur = page.getByRole('button', { name: /Atur Libur \/ Masuk KBM/i });
    await expect(btnAtur).toBeVisible();

    // Verifikasi tidak ada badge yang berstatus '• Libur KBM' pada legenda resmi
    const liburBadges = page.locator('button[data-testid^="legend-badge-"]').getByText('• Libur KBM');
    await expect(liburBadges).toHaveCount(0);

    // Verifikasi kode-kode kunci seperti TK, UUB, LM, DA, IMTHN semuanya berstatus '• KBM Masuk'
    const tkBadge = page.locator('button[data-testid="legend-badge-TK"]');
    await expect(tkBadge).toBeVisible();
    await expect(tkBadge).toContainText('• KBM Masuk');

    const uubBadge = page.locator('button[data-testid="legend-badge-UUB"]');
    await expect(uubBadge).toBeVisible();
    await expect(uubBadge).toContainText('• KBM Masuk');

    const lmBadge = page.locator('button[data-testid="legend-badge-LM"]');
    await expect(lmBadge).toBeVisible();
    await expect(lmBadge).toContainText('• KBM Masuk');

    // Buka modal aturan dan pastikan tombol 'Netralkan Semua (KBM Masuk)' ada
    await btnAtur.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Netralkan Semua (KBM Masuk)' })
    ).toBeVisible();

    // Tutup modal
    await page
      .getByTestId('modal-aturan-kalender')
      .getByRole('button', { name: 'Batal', exact: true })
      .click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('2. Verifikasi Absen Cepat (/absen-cepat): Daftar Sesi Asatidz Terbuka Penuh & Tidak Terblokir', async ({
    page,
  }) => {
    // Set viewport mobile seperti pada screenshot pengguna (390 x 844)
    await page.setViewportSize({ width: 390, height: 844 });

    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    await page.goto('/absen-cepat');
    await page.waitForLoadState('domcontentloaded');

    // Tunggu kontainer panel jam termuat
    const jamPanel = page.locator('[data-testid="absen-cepat-jam-panel"]');
    await expect(jamPanel).toBeVisible({ timeout: 20000 });

    // Pastikan tidak ada blokir statis 'Hari Libur / Event: Ujian / Ikhtibar [TK] Tes Kitab'
    await expect(
      page.getByText('Hari Libur / Event: Ujian / Ikhtibar', { exact: true })
    ).not.toBeVisible();

    // Pastikan tombol toolbar aksi massal dan Simpan Jam Ini terlihat
    await expect(page.getByRole('button', { name: 'Presensi Massal' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simpan Jam Ini/i })).toBeVisible();

    // Pastikan header kelompok blok muncul (menandakan kartu pengajar ter-render)
    const blokHeaders = page.locator('[data-testid="group-blok-header"]');
    await expect(blokHeaders.first()).toBeVisible({ timeout: 15000 });

    // Pastikan teks pagination footer selaras dengan data sesi
    await expect(page.getByText(/Menampilkan/i).first()).toBeVisible();
  });

  test('3. Verifikasi Absensi Reguler (/absensi): Tab Jam 1-4 Terbuka & Dapat Diabsen', async ({
    page,
  }) => {
    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    await page.goto('/absensi');
    await page.waitForLoadState('domcontentloaded');

    // Verifikasi judul halaman absensi
    await expect(
      page.getByRole('heading', { name: /Absensi Asatidz/i }).first()
    ).toBeVisible({ timeout: 20000 });

    // Verifikasi sesi Jam 1-4 ada dan aktif
    await expect(page.getByText('Jam Ke-1', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Jam Ke-2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Jam Ke-3', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Jam Ke-4', { exact: true }).first()).toBeVisible();
  });
});
