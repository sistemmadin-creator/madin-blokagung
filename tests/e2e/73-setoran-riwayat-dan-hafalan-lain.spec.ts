import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/auth';

test.describe('E2E: Halaman Riwayat Setoran & Fitur Hafalan Lain (Tampilan 1)', () => {
  test.setTimeout(120_000);

  test('1. Tabel Riwayat Hafalan dihapus dari /setoran dan diakses lewat tombol Riwayat di kiri Tampilan 1', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setoran');
    await expect(
      page.getByRole('heading', { name: /Muhafadzoh Madin/i })
    ).toBeVisible({ timeout: 25_000 });

    // Pastikan tombol Riwayat tampil tepat di sebelah kiri Tampilan 1
    const btnRiwayat = page.getByTestId('btn-riwayat-setoran');
    const btnTampilan1 = page.getByTestId('switch-tampilan1');
    const btnTampilan2 = page.getByTestId('switch-tampilan2');
    await expect(btnRiwayat).toBeVisible();
    await expect(btnTampilan1).toBeVisible();

    const boxRiwayat = await btnRiwayat.boundingBox();
    const boxT1 = await btnTampilan1.boundingBox();
    expect(boxRiwayat).not.toBeNull();
    expect(boxT1).not.toBeNull();
    expect(boxRiwayat!.x).toBeLessThan(boxT1!.x);

    // Pastikan Tabel Riwayat Hafalan tidak ada di Tampilan 1 maupun Tampilan 2
    await expect(page.locator('table.tabel-kbm-resmi')).toHaveCount(0);
    await btnTampilan2.click();
    await expect(page.getByRole('heading', { name: /Form Input Hafalan/i })).toBeVisible();
    await expect(page.locator('table.tabel-kbm-resmi')).toHaveCount(0);

    // Kembali ke Tampilan 1 lalu klik tombol Riwayat -> masuk ke /setoran/riwayat
    await btnTampilan1.click();
    await btnRiwayat.click();
    await page.waitForURL(/\/setoran\/riwayat/, { timeout: 15_000 });

    await expect(
      page.getByRole('heading', { name: /Tabel Riwayat Hafalan/i }).first()
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('table.tabel-kbm-resmi')).toBeVisible();

    // Kembali ke /setoran via tombol Kembali ke Setoran
    await page.getByTestId('btn-kembali-setoran').click();
    await page.waitForURL(/\/setoran$/, { timeout: 15_000 });
    await expect(page.getByTestId('setoran-tampilan-1')).toBeVisible();
  });

  test('2. Fitur Hafalan Lain di Tampilan 1: filter Tingkat & Kelas, ketik-pilih multi item, dan setor tanpa syarat Wajib selesai', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setoran');
    await expect(page.getByTestId('setoran-tampilan-1')).toBeVisible({
      timeout: 25_000,
    });

    // Tunggu daftar santri termuat dari Supabase lalu pilih JORDI ONSU (4 A ULA)
    const cariSantriInput = page.locator('#t1-cari-santri');
    await cariSantriInput.click();
    await expect(
      page.locator('[data-testid="setoran-tampilan-1"] button').filter({ hasText: ' - ' }).first()
    ).toBeVisible({ timeout: 25_000 });
    await cariSantriInput.fill('JORDI ONSU');

    const jordiOption = page
      .locator('[data-testid="setoran-tampilan-1"] button')
      .filter({ hasText: /JORDI ONSU/i })
      .first();
    if (await jordiOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await jordiOption.click();
    } else {
      await cariSantriInput.fill('');
      await page
        .locator('[data-testid="setoran-tampilan-1"] button')
        .filter({ hasText: ' - ' })
        .first()
        .click();
    }
    const chosenSantriInputVal = await cariSantriInput.inputValue();

    // Buka panel Hafalan Lain di bawah tabel Daftar Hafalan
    const btnHafalanLain = page.getByTestId('btn-toggle-hafalan-lain');
    await expect(btnHafalanLain).toBeVisible();
    await btnHafalanLain.click();

    const panel = page.getByTestId('panel-hafalan-lain');
    await expect(panel).toBeVisible();

    // Verifikasi filter Tingkat, filter Kelas, dan kolom Ketik-Pilih ada
    const selectTingkat = panel.locator('#t1-extra-tingkat');
    const selectKelas = panel.locator('#t1-extra-kelas');
    const inputCari = panel.locator('#t1-cari-hafalan-lain');
    await expect(selectTingkat).toBeVisible();
    await expect(selectKelas).toBeVisible();
    await expect(inputCari).toBeVisible();

    // Filter ke WUSTHO lalu pilih materi pertama ke tabel Hafalan Lain
    await selectTingkat.selectOption('WUSTHO');
    await inputCari.click();
    const wusthoItemBtn = panel
      .locator('div.divide-y > button')
      .first();
    await expect(wusthoItemBtn).toBeVisible();
    const firstItemName = (await wusthoItemBtn.locator('div.font-bold').textContent())?.trim() || '';
    await wusthoItemBtn.click();

    // Pindah filter ke ULYA dan tambah item ke-2 (multi-hafalan)
    await selectTingkat.selectOption('ULYA');
    await inputCari.click();
    const ulyaItemBtn = panel
      .locator('div.divide-y > button')
      .first();
    await expect(ulyaItemBtn).toBeVisible();
    const secondItemName = (await ulyaItemBtn.locator('div.font-bold').textContent())?.trim() || '';
    await ulyaItemBtn.click();

    const tabelLain = panel.getByTestId('tabel-hafalan-lain');
    await expect(tabelLain).toBeVisible();
    if (firstItemName) {
      await expect(tabelLain).toContainText(firstItemName);
    }
    if (secondItemName) {
      await expect(tabelLain).toContainText(secondItemName);
    }

    // Centang item pertama (tanpa syarat Wajib kelas selesai) -> simpan ke riwayat -> batalkan centang agar bersih
    const targetRow = tabelLain.locator('tbody tr', { hasText: firstItemName }).first();
    const firstCheckbox = targetRow.getByRole('checkbox');
    if ((await firstCheckbox.getAttribute('aria-checked')) === 'true') {
      await firstCheckbox.click();
      await expect(firstCheckbox).toHaveAttribute('aria-checked', 'false', { timeout: 15_000 });
      await expect(page.getByText(/dibatalkan untuk/i)).toBeVisible({ timeout: 20_000 });
    }

    await firstCheckbox.click();
    await expect(firstCheckbox).toHaveAttribute('aria-checked', 'true', {
      timeout: 15_000,
    });
    // Tunggu penyimpanan Supabase selesai (toast sukses tampil)
    await expect(page.getByText(/dicatat atas nama/i)).toBeVisible({ timeout: 20_000 });

    // Buka Riwayat untuk verifikasi data masuk ke Tabel Riwayat Hafalan
    await page.getByTestId('btn-riwayat-setoran').click();
    await page.waitForURL(/\/setoran\/riwayat/, { timeout: 15_000 });
    if (firstItemName) {
      await expect(page.locator('table.tabel-kbm-resmi')).toContainText(firstItemName);
    }

    // Kembali & uncheck supaya database tetap bersih pasca uji
    await page.getByTestId('btn-kembali-setoran').click();
    await page.waitForURL(/\/setoran$/, { timeout: 15_000 });
    await page.locator('#t1-cari-santri').click();
    await expect(
      page.locator('[data-testid="setoran-tampilan-1"] button').filter({ hasText: ' - ' }).first()
    ).toBeVisible({ timeout: 20_000 });
    await page.locator('#t1-cari-santri').fill(chosenSantriInputVal.split(' - ')[0] || 'JORDI ONSU');
    await page
      .locator('[data-testid="setoran-tampilan-1"] button')
      .filter({ hasText: ' - ' })
      .first()
      .click();
    await page.getByTestId('btn-toggle-hafalan-lain').click();
    const cbCleanup = page
      .getByTestId('tabel-hafalan-lain')
      .locator('tbody tr', { hasText: firstItemName })
      .first()
      .getByRole('checkbox');
    await expect(cbCleanup).toHaveAttribute('aria-checked', 'true', { timeout: 15_000 });
    await cbCleanup.click();
    await expect(cbCleanup).toHaveAttribute('aria-checked', 'false', {
      timeout: 15_000,
    });
    await expect(page.getByText(/dibatalkan untuk/i)).toBeVisible({ timeout: 20_000 });
  });
});
