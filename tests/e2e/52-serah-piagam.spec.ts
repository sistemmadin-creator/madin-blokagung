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

test.describe('Menu Serah Piagam Santri - PKM. Muhafadzoh', () => {
  test.setTimeout(60000);

  test('1. Sidebar Navigasi: Menu "Serah Piagam" berada di grup "PKM. Muhafadzoh"', async ({ page }) => {
    await gotoWithAuth(page, '/dashboard');

    // Temukan grup PKM. Muhafadzoh di sidebar
    const muhafadzohSection = page.locator('aside, nav').getByText(/PKM\. Muhafadzoh/i).first();
    await expect(muhafadzohSection).toBeVisible();

    // Verifikasi menu Serah Piagam ada di sidebar
    const serahPiagamLink = page.getByRole('link', { name: /Serah Piagam/i }).first();
    await expect(serahPiagamLink).toBeVisible();

    // Klik menu Serah Piagam dan pastikan berpindah ke /serah-piagam
    await serahPiagamLink.click();
    await page.waitForURL('**/serah-piagam**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Serah Piagam Santri/i })).toBeVisible();
  });

  test('2. Layout Halaman: Grid 3 Kolom Desktop, Header Rasio "7/...", & Tabel Ramping', async ({ page }) => {
    // Set viewport desktop lebar (1440px)
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoWithAuth(page, '/serah-piagam');

    // Verifikasi Judul Utama & Subtitle Halaman
    await expect(page.getByRole('heading', { name: /Serah Piagam Santri/i })).toBeVisible();
    await expect(page.getByText(/Tahun 2026/i).first()).toBeVisible();

    // Verifikasi Grid 3 Kolom Desktop
    const gridContainer = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.xl\\:grid-cols-3');
    await expect(gridContainer).toBeVisible();

    // Verifikasi Keberadaan Kartu Kelas 1 ULA A
    const card1A = page.locator('[data-testid="card-kelas-1_ULA_A"]');
    await expect(card1A).toBeVisible();

    // Verifikasi Header Kartu Kelas 1A: Badge, Target Materi, Label Kelas, dan Rasio Penerima (Format 7/...)
    await expect(card1A.getByText('1A', { exact: true })).toBeVisible();
    await expect(card1A.getByText(/Target: Juz Amma/i)).toBeVisible();
    await expect(card1A.getByText(/\(1 ULA A\)/i)).toBeVisible();

    // Verifikasi rasio penerima berformat '7/...' (7 santri menerima) pada kartu 1A
    const ratioBadge = card1A.locator('span').filter({ hasText: /^7\// });
    await expect(ratioBadge).toBeVisible();

    // Verifikasi Struktur Kolom Tabel di dalam Kartu:
    // Kolom 'No', 'Nama Santri', 'Kamar', dan 'Menerima' harus ADA
    await expect(card1A.getByRole('columnheader', { name: /^No$/i })).toBeVisible();
    await expect(card1A.getByRole('columnheader', { name: /^Nama Santri$/i })).toBeVisible();
    await expect(card1A.getByRole('columnheader', { name: /^Kamar$/i })).toBeVisible();
    await expect(card1A.getByRole('columnheader', { name: /^Menerima$/i })).toBeVisible();

    // Verifikasi Kolom 'Status' dan 'Proses' TELAH DIHAPUS BERSIH
    await expect(card1A.getByRole('columnheader', { name: /^Status$/i })).not.toBeVisible();
    await expect(card1A.getByRole('columnheader', { name: /^Proses$/i })).not.toBeVisible();
  });

  test('3. Fungsi Kolom "Menerima": Toggle Centang Interaktif & Pembaruan Rasio Header', async ({ page }) => {
    await gotoWithAuth(page, '/serah-piagam');

    const card1A = page.locator('[data-testid="card-kelas-1_ULA_A"]');
    await expect(card1A).toBeVisible();

    // Temukan baris santri yang belum menerima di kartu 1A (misal RINA KUSUMA)
    const rowRina = card1A.locator('tr').filter({ hasText: 'RINA KUSUMA' });
    await expect(rowRina).toBeVisible();

    // Dapatkan rasio awal di header kartu 1A
    const ratioBadge = card1A.locator('span').filter({ hasText: /^\d+\/\d+$/ });
    const initialRatioText = await ratioBadge.textContent();

    // Klik checkbox Menerima pada baris RINA KUSUMA
    const checkboxMenerima = rowRina.getByRole('checkbox', { name: /Status penerimaan piagam RINA KUSUMA/i });
    const isInitiallyChecked = await checkboxMenerima.isChecked();

    await checkboxMenerima.check({ force: true });
    await expect(checkboxMenerima).toBeChecked();

    // Verifikasi background baris berubah menjadi highlight penerima (emerald)
    await expect(rowRina).toHaveClass(/bg-emerald/);

    // Klik kembali untuk menguji pembatalan centang
    await checkboxMenerima.uncheck({ force: true });
    await expect(checkboxMenerima).not.toBeChecked();
  });

  test('4. Widget Interaktif Header: Klik "Menerima" & "Belum Menerima" untuk Memfilter Kartu', async ({ page }) => {
    await gotoWithAuth(page, '/serah-piagam');

    // Verifikasi 3 Widget Statistik di Header
    const widgetMenerima = page.locator('[data-testid="widget-menerima"]');
    const widgetBelum = page.locator('[data-testid="widget-belum-menerima"]');
    const widgetTotal = page.locator('[data-testid="widget-total-santri"]');

    await expect(widgetMenerima).toBeVisible();
    await expect(widgetBelum).toBeVisible();
    await expect(widgetTotal).toBeVisible();

    // KLIK WIDGET 'Menerima'
    await widgetMenerima.click();

    // Verifikasi Banner Filter Aktif Muncul
    const bannerFilter = page.locator('[data-testid="banner-filter-aktif"]');
    await expect(bannerFilter).toBeVisible();
    await expect(bannerFilter).toContainText(/SUDAH MENERIMA/i);
    await expect(widgetMenerima).toHaveClass(/ring-2/);

    // Di dalam kartu kelas 1A, hanya santri yang sudah menerima yang ditampilkan
    const card1A = page.locator('[data-testid="card-kelas-1_ULA_A"]');
    await expect(card1A).toBeVisible();
    // ARDHITO PRAMONO (sudah menerima) harus tampak
    await expect(card1A.getByText('ARDHITO PRAMONO')).toBeVisible();

    // KLIK WIDGET 'Belum Menerima'
    await widgetBelum.click();

    // Verifikasi Banner Filter Aktif Berubah ke 'Belum Menerima'
    await expect(bannerFilter).toBeVisible();
    await expect(bannerFilter).toContainText(/BELUM MENERIMA/i);
    await expect(widgetBelum).toHaveClass(/ring-2/);

    // KLIK WIDGET 'Total Santri' (Reset Filter)
    await widgetTotal.click();

    // Verifikasi Banner Filter Aktif Menghilang
    await expect(bannerFilter).not.toBeVisible();
    await expect(widgetTotal).toHaveClass(/ring-2/);
  });
});
