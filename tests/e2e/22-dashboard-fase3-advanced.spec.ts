import { test, expect } from '@playwright/test';

test.describe('Fase 3: Advanced KBM Matrix, Leaderboard & Demographics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /Dashboard MADINA Blokagung/i })).toBeVisible();
  });

  test('Class KBM Matrix widget displays 6 days x 4 jam slots and interactive cell drilldown', async ({ page }) => {
    const matrixHeading = page.getByRole('heading', { name: /Peta Kepadatan KBM & Rombel \(6 Hari × 4 Jam\)/i });
    await expect(matrixHeading).toBeVisible();

    // Verifikasi kolom jam 1 s/d 4
    await expect(page.getByRole('columnheader', { name: /Jam 1/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Jam 2/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Jam 3/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Jam 4/i })).toBeVisible();

    // Verifikasi sesi KBM LIVE
    await expect(page.getByText(/LIVE/i).first()).toBeVisible();

    // Klik salah satu sel matriks (misal Sabtu Jam 1)
    const sabtuJam1Cell = page.getByTestId('kbm-cell-Sabtu-1');
    await expect(sabtuJam1Cell).toBeVisible();
    await sabtuJam1Cell.click();

    // Verifikasi drilldown detail muncul
    await expect(page.getByText(/Sabtu - Jam 1/i)).toBeVisible();
    await expect(page.getByText(/rombel terisi guru/i).first()).toBeVisible();

    // Verifikasi tautan ke jadwal KBM
    const jadwalLink = page.getByRole('link', { name: /Buka Jadwal KBM/i });
    await expect(jadwalLink).toHaveAttribute('href', '/jadwal-kbm');
  });

  test('Leaderboard widget displays Asatidz Teladan and switches to Rombel Hafalan', async ({ page }) => {
    const leaderboardHeading = page.getByRole('heading', { name: /Peringkat & Rekognisi Kinerja/i });
    await expect(leaderboardHeading).toBeVisible();

    // Tab default: Asatidz Teladan
    await expect(page.getByText(/Ust. H. Ahmad Shodiq/i)).toBeVisible();
    await expect(page.getByText(/100% Hadir/i).first()).toBeVisible();

    // Beralih ke Tab: Rombel Hafalan
    const rombelTabBtn = page.getByRole('button', { name: /Rombel Hafalan/i });
    await expect(rombelTabBtn).toBeVisible();
    await rombelTabBtn.click();

    // Verifikasi nama rombel unggul muncul
    await expect(page.getByText(/3 A ULA \(Ug\)/i)).toBeVisible();
    await expect(page.getByText(/100% Tuntas/i).first()).toBeVisible();
    await expect(page.getByText(/2 B WUSTHO/i)).toBeVisible();
  });

  test('Demographics widget displays top geographical origins and room distribution', async ({ page }) => {
    const demoHeading = page.getByRole('heading', { name: /Sebaran Geografis & Demografi Santri/i });
    await expect(demoHeading).toBeVisible();

    // Daerah asal utama
    await expect(page.getByText(/Kab. Banyuwangi/i)).toBeVisible();
    await expect(page.getByText(/Kab. Jember/i)).toBeVisible();
    await expect(page.getByText(/Kab. Situbondo & Bondowoso/i)).toBeVisible();
    await expect(page.getByText(/Luar Jawa Timur \/ Nusantara/i)).toBeVisible();

    // Asrama / Komplek santri
    await expect(page.getByText(/Tersebar di 26 Asrama \/ Komplek Kamar Pesantren/i)).toBeVisible();
  });
});
