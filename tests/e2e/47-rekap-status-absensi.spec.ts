import { test, expect } from '@playwright/test';

test.describe('Sub-Menu Rekap Status Absensi Asatidz (/rekap-absensi/status)', () => {
  test.setTimeout(120000);

  test('Menampilkan sub-menu Rekap Status di Sidebar, tab pengelompokan Semua/Ula/Wustho/Ulya, tabel % 7 status (Hadir, Izin, Sakit, Alfa, Kosong, Terlambat, Ganti) tanpa nama Asatidz di tabel utama, modal daftar Asatidz saat baris diklik, filter tanggal dari > sampai, pencarian, dan Unduh PDF/Print', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Buka halaman Rekap Absensi terlebih dahulu
    await page.goto('/rekap-absensi');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/rekap-absensi', { timeout: 25000 });
    }

    // 2. Pastikan sub-menu "Rekap Status" tampil di Sidebar Desktop maupun di Sub-Tab Header
    const sidebarRekapStatusLink = page
      .locator('aside')
      .getByRole('link', { name: 'Rekap Status', exact: true });
    await expect(sidebarRekapStatusLink).toBeVisible({ timeout: 20000 });

    // Klik sub-menu Rekap Status dari Sidebar
    await sidebarRekapStatusLink.click();
    await page.waitForURL('**/rekap-absensi/status', { timeout: 20000 });

    const heading = page.getByTestId('heading-rekap-status');
    await expect(heading).toBeVisible({ timeout: 20000 });
    await expect(heading).toContainText('Rekap Status Absensi Asatidz');

    // 3. Verifikasi keberadaan 4 tab pengelompokan jenjang: Semua, Ula, Wustho, Ulya
    const tabSemua = page.getByTestId('tab-jenjang-SEMUA');
    const tabUla = page.getByTestId('tab-jenjang-ULA');
    const tabWustho = page.getByTestId('tab-jenjang-WUSTHO');
    const tabUlya = page.getByTestId('tab-jenjang-ULYA');

    await expect(tabSemua).toBeVisible();
    await expect(tabUla).toBeVisible();
    await expect(tabWustho).toBeVisible();
    await expect(tabUlya).toBeVisible();

    // 4. Verifikasi Tabel Utama menampilkan 7 baris status dengan % dan kolom perbandingan % ULA, % WUSTHO, % ULYA (Opsi A)
    const mainTable = page.getByTestId('table-rekap-status-utama');
    await expect(mainTable).toBeVisible();
    await expect(mainTable.locator('thead')).toContainText('% ULA');
    await expect(mainTable.locator('thead')).toContainText('% WUSTHO');
    await expect(mainTable.locator('thead')).toContainText('% ULYA');

    const statusKeys = [
      'hadir',
      'izin',
      'sakit',
      'alfa',
      'kosong',
      'terlambat',
      'ganti',
    ];
    for (const sKey of statusKeys) {
      const row = page.getByTestId(`row-status-${sKey}`);
      await expect(row).toBeVisible();
      await expect(page.getByTestId(`pct-value-${sKey}`)).toContainText('%');
      await expect(page.getByTestId(`pct-ula-${sKey}`)).toContainText('%');
      await expect(page.getByTestId(`pct-wustho-${sKey}`)).toContainText('%');
      await expect(page.getByTestId(`pct-ulya-${sKey}`)).toContainText('%');
    }

    // 5. Uji Filter Rentang Tanggal (Tanggal Dari > Tanggal Sampai) dan opsi Hitung Jadwal Kosong
    const startDateInput = page.getByTestId('input-rekap-status-start-date');
    const endDateInput = page.getByTestId('input-rekap-status-end-date');
    await startDateInput.fill('2026-11-01');
    await endDateInput.fill('2026-11-07');
    await expect(startDateInput).toHaveValue('2026-11-01');
    await expect(endDateInput).toHaveValue('2026-11-07');

    // Aktifkan checkbox agar jadwal yang belum diinput dihitung ke Kosong sehingga pasti ada daftar Asatidz untuk diuji drilldown
    await page.getByTestId('checkbox-include-unrecorded-kosong').check();

    // 6. Uji perpindahan tab jenjang ke Ula, Wustho, Ulya, lalu kembali ke Semua
    await tabUla.click();
    await expect(mainTable.locator('thead')).toContainText(
      'PERSENTASE (%) STATUS (ULA)'
    );
    await tabWustho.click();
    await expect(mainTable.locator('thead')).toContainText(
      'PERSENTASE (%) STATUS (WUSTHO)'
    );
    await tabUlya.click();
    await expect(mainTable.locator('thead')).toContainText(
      'PERSENTASE (%) STATUS (ULYA)'
    );
    await tabSemua.click();
    await expect(mainTable.locator('thead')).toContainText(
      'PERSENTASE (%) STATUS (SEMUA)'
    );

    // 7. Uji Pencarian Status (ketik "Terlambat" -> hanya baris Terlambat yang tampil, lalu bersihkan)
    const searchInput = page.getByTestId('input-rekap-status-search');
    await searchInput.fill('Terlambat');
    await expect(mainTable.locator('tbody tr')).toHaveCount(1);
    await expect(page.getByTestId('row-status-terlambat')).toBeVisible();
    await searchInput.fill('');
    await expect(mainTable.locator('tbody tr')).toHaveCount(7);

    // 8. Klik salah satu baris status (Opsi A: membuka Modal Daftar Asatidz pada status tersebut)
    // Intercept window.print agar tidak memblokir eksekusi headless browser
    await page.evaluate(() => {
      (window as unknown as { __printCalledCount: number }).__printCalledCount = 0;
      window.print = () => {
        (window as unknown as { __printCalledCount: number }).__printCalledCount += 1;
      };
    });

    await page.getByTestId('row-status-kosong').click();
    const modal = page.getByTestId('modal-drilldown-status-asatidz');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Daftar Asatidz Berstatus: Kosong');
    await expect(page.getByTestId('table-modal-status-asatidz')).toBeVisible();

    // Uji tombol Unduh PDF / Print Daftar Ini di dalam modal
    await page.getByTestId('btn-print-modal-status-asatidz').click();
    await expect(async () => {
      const count = await page.evaluate(
        () => (window as unknown as { __printCalledCount: number }).__printCalledCount
      );
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 5000 });

    // Tutup modal
    await page.getByTestId('btn-close-modal-status-asatidz').click();
    await expect(modal).toBeHidden();

    // 9. Uji tombol Unduh PDF / Print (% Status) di halaman utama
    await page.getByTestId('btn-print-rekap-status').click();
    await expect(async () => {
      const count = await page.evaluate(
        () => (window as unknown as { __printCalledCount: number }).__printCalledCount
      );
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 5000 });
  });
});
