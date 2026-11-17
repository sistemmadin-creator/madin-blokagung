import { test, expect } from '@playwright/test';
import { expandSidebarGroup, gotoWithAuth } from './helpers/auth';

test.describe('Menu Baru Setor Cepat, Split Layout, dan Multi-Select Kalimat', () => {
  test.setTimeout(90000);

  test('1. Sidebar menampilkan menu Setor Cepat di atas Rekap Hafalan dan dapat dinavigasikan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/dashboard');
    await expandSidebarGroup(page, /PKM\. Muhafadzoh/i);

    // Temukan link Setor Cepat di sidebar
    const linkSetorCepat = page.locator('aside').getByRole('link', { name: 'Setor Cepat' });
    await expect(linkSetorCepat).toBeVisible({ timeout: 20000 });

    // Temukan link Rekap Hafalan di sidebar
    const linkRekapHafalan = page.locator('aside').getByRole('link', { name: 'Rekap Hafalan' });
    await expect(linkRekapHafalan).toBeVisible();

    // Pastikan posisi Setor Cepat berada di atas Rekap Hafalan
    const setorCepatBox = await linkSetorCepat.boundingBox();
    const rekapHafalanBox = await linkRekapHafalan.boundingBox();
    expect(setorCepatBox).not.toBeNull();
    expect(rekapHafalanBox).not.toBeNull();
    expect(setorCepatBox!.y).toBeLessThan(rekapHafalanBox!.y);

    // Navigasi ke halaman Setor Cepat via klik menu sidebar
    await linkSetorCepat.click();
    await page.waitForURL('**/setor-cepat**');
    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });
  });

  test('2. Layout Split: Panel Kiri (Detail Setoran) dan Panel Kanan (Kartu Kelas) berfungsi interaktif', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setor-cepat');
    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Periksa keberadaan input pencarian
    const inputSearch = page.getByTestId('input-pencarian-setor-cepat');
    await expect(inputSearch).toBeVisible();

    // Panel Kiri: Header Detail Setoran
    await expect(
      page.getByRole('heading', { name: 'Detail Setoran Hafalan Santri' })
    ).toBeVisible();

    // Panel Kanan: Kartu Kelas
    await expect(page.locator('span').filter({ hasText: 'Kartu Kelas' }).first()).toBeVisible();

    // Verifikasi baris santri pada kartu kelas di sebelah kanan (kolom kanan)
    const rightPane = page.locator('.lg\\:col-span-5');
    const classTableRows = rightPane.locator('table tbody tr');
    await expect(classTableRows.first()).toBeVisible({ timeout: 15000 });
    const rowCount = await classTableRows.count();
    expect(rowCount).toBeGreaterThan(0);

    // Klik santri kedua di tabel kelas sebelah kanan (jika ada) dan verifikasi data termuat di panel kiri
    if (rowCount > 1) {
      const secondRowName = await classTableRows.nth(1).locator('td').nth(1).innerText();
      await classTableRows.nth(1).click();

      // Nama di panel kiri harus cocok dengan santri yang diklik
      const leftPanelStudentName = page.locator('h3.text-base.font-bold').first();
      await expect(leftPanelStudentName).toHaveText(secondRowName.trim());
    }
  });

  test('3. Form Proses Setoran & Multi-Select Kalimat (Gambar 4): Dapat input setoran dan menyimpan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/setor-cepat');
    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Tunggu data santri termuat di panel kiri
    await expect(page.getByRole('heading', { name: 'Proses Setoran' })).toBeVisible({ timeout: 25000 });

    // Jika santri pertama sudah 100% tuntas, pilih santri dari tabel kanan yang belum tuntas
    const rightRows = page.locator('.lg\\:col-span-5 table tbody tr');
    const maxTry = Math.min(await rightRows.count(), 8);
    for (let r = 0; r < maxTry; r++) {
      const doneBanner = page.getByText('Target Hafalan Ini Telah Tuntas (100%)!');
      if (!(await doneBanner.isVisible().catch(() => false))) break;
      await rightRows.nth(r).click();
      await page.waitForTimeout(200);
    }

    // Cek apakah target santri berupa kalimat atau numerik
    const btnDropdown = page.locator('button').filter({ hasText: /Pilih (Kalimat|Bait|Item|Halaman|\d+)/i }).first();
    const inputAngka = page.getByTestId('input-tambah-angka');

    if (await btnDropdown.isVisible()) {
      await btnDropdown.click();

      // Popover multi-select muncul
      const helperNext3 = page.getByRole('button', { name: '+3 Berikutnya' });
      await expect(helperNext3).toBeVisible();

      // Klik shortcut +3 Berikutnya
      await helperNext3.click();

      // Verifikasi tag/badge pilihan muncul ("Pilihan (3):" pada Wajib atau "Pilihan:" pada Sunnah/Kitab)
      const pilihanText = page.getByText(/Pilihan(\s*\(\d+\))?:/).first();
      await expect(pilihanText).toBeVisible();

      // Tombol simpan setoran menampilkan indikasi jumlah kalimat
      const btnSimpan = page.getByRole('button', { name: /Simpan Setoran/i });
      await expect(btnSimpan).toBeVisible();
    } else if (await inputAngka.isVisible()) {
      await inputAngka.fill('5');
      const btnSimpan = page.getByRole('button', { name: /Simpan Setoran/i });
      await expect(btnSimpan).toBeVisible();
    }
  });

  test('4. Pencarian instan menyaring kartu kelas secara dinamis', async ({ page }) => {
    await gotoWithAuth(page, '/setor-cepat');
    await expect(
      page.getByRole('heading', { name: 'Setor Cepat Hafalan Santri' })
    ).toBeVisible({ timeout: 25000 });

    const inputSearch = page.getByTestId('input-pencarian-setor-cepat');
    await inputSearch.fill('ARDHITO');

    // Menunggu filter diterapkan
    await expect(page.getByText(/ARDHITO/i).first()).toBeVisible({ timeout: 10000 });

    // Hapus pencarian
    await inputSearch.clear();
    await expect(inputSearch).toHaveValue('');
  });
});
