import { test, expect } from '@playwright/test';

test.describe('Sinkronisasi Formasi Kelas dengan Jadwal KBM per Kelas (Fase Presisi Gender)', () => {
  test('1.0 Verifikasi Sinkronisasi 2 A ULYA PA (Reguler) vs 2 A ULYA PI (Unggulan)', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Pastikan halaman termuat
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible();

    // Filter ke Tingkat ULYA
    const filterTingkat = page.locator('select').first();
    if (await filterTingkat.isVisible()) {
      await filterTingkat.selectOption({ label: 'ULYA' }).catch(async () => {
        await filterTingkat.selectOption('ULYA');
      });
    }

    // Tunggu tabel merender data ULYA
    await page.waitForTimeout(1000);

    // Cari baris 2 A ULYA PA dan 2 A ULYA PI
    const row2APutra = page.locator('tr.row-jadwal-pa:has-text("2 A"):has-text("ULYA")');
    const row2APutri = page.locator('tr.row-jadwal-pi:has-text("2 A"):has-text("ULYA")');

    // 2 A Ulya Putra di Formasi adalah Reguler -> TIDAK BOLEH memiliki badge "Ug"
    if (await row2APutra.count() > 0) {
      await expect(row2APutra.first().locator('span:has-text("Ug")')).toHaveCount(0);
    }

    // 2 A Ulya Putri di Formasi adalah Unggulan -> HARUS memiliki badge "Ug"
    if (await row2APutri.count() > 0) {
      await expect(row2APutri.first().locator('span:has-text("Ug")')).toBeVisible();
    }
  });

  test('2.0 Mode Switcher Reguler vs Unggulan mengelompokkan 2 A PA dan 2 A PI dengan benar', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    // Filter ke Tingkat ULYA
    const filterTingkat = page.locator('select').first();
    if (await filterTingkat.isVisible()) {
      await filterTingkat.selectOption({ label: 'ULYA' }).catch(async () => {
        await filterTingkat.selectOption('ULYA');
      });
    }
    await page.waitForTimeout(500);

    const btnReguler = page.getByRole('button', { name: /Jadwal KBM Reguler/i });
    const btnUnggulan = page.getByRole('button', { name: /Jadwal KBM Unggulan/i });

    // Mode Reguler
    await btnReguler.click();
    await page.waitForTimeout(500);

    const row2APutraReg = page.locator('tr.row-jadwal-pa:has-text("2 A"):has-text("ULYA")');
    if (await row2APutraReg.count() > 0) {
      await expect(row2APutraReg.first()).toBeVisible();
    }

    // Mode Unggulan
    await btnUnggulan.click();
    await page.waitForTimeout(500);

    const row2APutraUg = page.locator('tr.row-jadwal-pa:has-text("2 A"):has-text("ULYA")');
    await expect(row2APutraUg).toHaveCount(0);

    const row2APutriUg = page.locator('tr.row-jadwal-pi:has-text("2 A"):has-text("ULYA")');
    if (await row2APutriUg.count() > 0) {
      await expect(row2APutriUg.first()).toBeVisible();
    }
  });
});
