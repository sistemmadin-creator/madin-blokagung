import { test, expect } from '@playwright/test';

test.describe('Kalender Kegiatan (TA 2026/2027), Pengaturan Tahun Ajaran Global & Fitur Hapus Agenda', () => {
  test.setTimeout(120000);

  test('Menampilkan default TA 2026/2027 (tanpa 2025/2026), sinkronisasi Pengaturan Tahun Ajaran Global ke 2027/2028, serta fitur Hapus Salah Satu, Hapus Terpilih, dan Hapus Semua pada tabel rincian agenda', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Buka halaman Kalender Kegiatan (jika Saklar Keamanan Aktif, login terlebih dahulu sebagai Master Admin)
    await page.goto('/kalender-kegiatan');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/kalender-kegiatan', { timeout: 25000 });
    }

    const heading = page.getByTestId('heading-kalender-kegiatan');
    await expect(heading).toBeVisible({ timeout: 35000 });
    await expect(heading).toContainText('Kalender Kegiatan Madrasah Diniyyah');

    // Tunggu hingga sinkronisasi awal fetchKalenderData selesai
    await expect(page.getByText(/Tersinkron:/i)).toBeVisible({
      timeout: 20000,
    });

    // 2. Pastikan opsi TIDAK ada lagi 2025/2026 dan opsi pertama adalah 2026/2027 (Opsi A)
    const selectTA = page.getByTestId('select-tahun-ajaran-kalender');
    const optionTexts = await selectTA.locator('option').allTextContents();
    expect(optionTexts.some((t) => t.includes('2025/2026'))).toBe(false);
    expect(optionTexts[0]).toContain('2026/2027');

    if ((await selectTA.inputValue()) !== '2026/2027') {
      await selectTA.selectOption('2026/2027');
    }
    await expect(selectTA).toHaveValue('2026/2027');

    await expect(page.getByTestId('kpi-tahun-ajaran-aktif')).toContainText(
      '2026/2027'
    );
    await expect(page.getByTestId('card-bulan-masehi-2026-6')).toBeVisible();
    await expect(page.getByTestId('card-bulan-masehi-2027-6')).toBeVisible();

    // 3. Uji Fitur Tabel Rincian Agenda: Hapus Salah Satu, Hapus Terpilih, Hapus Semua & Pulihkan (Opsi A)
    const tableRincian = page.getByTestId('table-rincian-agenda-kalender');
    await expect(tableRincian).toBeVisible();

    // Jika dari pengujian sebelumnya jadwal sempat dikosongkan / berkurang, pulihkan jadwal standar terlebih dahulu
    if (
      (await page.getByTestId('empty-rincian-agenda-row').count()) > 0 ||
      (await tableRincian.locator('tbody tr').count()) < 10
    ) {
      await page.getByTestId('btn-pulihkan-agenda-standar').click();
      await expect(async () => {
        const cnt = await tableRincian.locator('tbody tr').count();
        expect(cnt).toBeGreaterThan(10);
      }).toPass({ timeout: 15000 });
    }

    const initialRowCount = await tableRincian.locator('tbody tr').count();
    expect(initialRowCount).toBeGreaterThan(10);

    // 3a. Hapus Salah Satu (baris pertama)
    const firstDeleteBtn = tableRincian
      .locator('[data-testid^="btn-hapus-agenda-row-"]')
      .first();
    await firstDeleteBtn.click();
    await expect(tableRincian.locator('tbody tr')).toHaveCount(
      initialRowCount - 1
    );
    const countAfterFirstDelete = await tableRincian
      .locator('tbody tr')
      .count();

    // 3b. Pilih 2 baris lewat checkbox lalu klik "Hapus Terpilih (2)"
    const rowCheckboxes = tableRincian.locator(
      '[data-testid^="checkbox-select-agenda-"]'
    );
    await rowCheckboxes.nth(0).check();
    await rowCheckboxes.nth(1).check();

    const btnHapusTerpilih = page.getByTestId('btn-hapus-agenda-terpilih');
    await expect(btnHapusTerpilih).toBeVisible();
    await expect(btnHapusTerpilih).toContainText('Hapus Terpilih (2)');
    await btnHapusTerpilih.click();
    await expect(tableRincian.locator('tbody tr')).toHaveCount(
      countAfterFirstDelete - 2
    );

    // 3c. Klik "Hapus Semua" -> konfirmasi modal -> pastikan tabel kosong -> klik "Pulihkan Jadwal Standar"
    await page.getByTestId('btn-hapus-semua-agenda').click();
    const modalHapusSemua = page.getByTestId(
      'modal-konfirmasi-hapus-semua-agenda'
    );
    await expect(modalHapusSemua).toBeVisible();
    await page.getByTestId('btn-konfirmasi-hapus-semua-agenda').click();
    await expect(modalHapusSemua).toBeHidden();

    await expect(page.getByTestId('empty-rincian-agenda-row')).toBeVisible();

    const btnPulihkan = page.getByTestId('btn-pulihkan-agenda-standar');
    await expect(btnPulihkan).toBeVisible();
    await btnPulihkan.click();
    await expect(async () => {
      const restoredCount = await tableRincian.locator('tbody tr').count();
      expect(restoredCount).toBeGreaterThanOrEqual(initialRowCount - 2);
      expect(restoredCount).toBeGreaterThan(100);
    }).toPass({ timeout: 15000 });

    // 4. Uji Menu Baru di Pengaturan: Tahun Ajaran Aktif (/pengaturan?tab=tahun-ajaran)
    await page.getByTestId('link-pengaturan-tahun-ajaran-global').click();
    await expect(
      page.getByTestId('card-pengaturan-tahun-ajaran')
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('active-global-ta-banner')).toContainText(
      'TAHUN AJARAN 2026-2027 M / 1447-1448 H'
    );

    // Ganti ke Tahun Ajaran 2027/2028 (1448/1449 H) dan terapkan
    await page.getByTestId('option-global-ta-2027-2028').click();
    await page.getByTestId('btn-save-global-tahun-ajaran').click();
    await expect(page.getByTestId('active-global-ta-banner')).toContainText(
      'TAHUN AJARAN 2027-2028 M / 1448-1449 H'
    );
    await expect(
      page.getByText(/berhasil diterapkan dan disinkronkan/i)
    ).toBeVisible({ timeout: 15000 });

    // Buka kembali /kalender-kegiatan dan pastikan otomatis tersinkron ke 2027/2028
    await page.goto('/kalender-kegiatan');
    await expect(page.getByTestId('select-tahun-ajaran-kalender')).toHaveValue(
      '2027/2028',
      { timeout: 15000 }
    );
    await expect(page.getByTestId('kpi-tahun-ajaran-aktif')).toContainText(
      '2027/2028'
    );

    // Kembalikan ke Tahun Ajaran 2026/2027 sebagai standar saat ini
    await page
      .getByTestId('select-tahun-ajaran-kalender')
      .selectOption('2026/2027');
    await expect(page.getByTestId('select-tahun-ajaran-kalender')).toHaveValue(
      '2026/2027'
    );
  });
});
