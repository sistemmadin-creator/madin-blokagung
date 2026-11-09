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

test.describe('E2E: Fitur Atur Silabus Target Hafalan & Pewarnaan Stabilo Linimasa Santri', () => {
  test.setTimeout(90000);

  test('1. Tombol Atur Silabus, Bulan Acuan, Filter Stabilo, dan Legenda Banner termuat di Linimasa Setor', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    // Pastikan halaman Linimasa Setor Santri termuat
    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25000 });

    // 1. Verifikasi Tombol "Atur Silabus" ada di toolbar atas
    const btnAturSilabus = page.getByRole('button', { name: /Atur Silabus/i });
    await expect(btnAturSilabus).toBeVisible();

    // 2. Verifikasi Pemilih "Bulan Acuan" ada di toolbar atas
    const selectBulanAcuan = page.locator('select', { hasText: /Otomatis|Bulan/i }).first();
    await expect(selectBulanAcuan).toBeVisible();

    // 3. Verifikasi Filter "Stabilo" ada di jajaran kontrol
    const selectFilterStabilo = page.locator('select', { hasText: /Semua Stabilo|Melewati Target/i });
    await expect(selectFilterStabilo).toBeVisible();

    // 4. Verifikasi Legenda Stabilo di Banner Atas Tabel
    await expect(page.getByText(/Stabilo Merah: Melewati Target/i)).toBeVisible();
    await expect(page.getByText(/Stabilo Kuning: Bulan Capaian/i)).toBeVisible();
    await expect(page.getByText(/Stabilo Putih: Aman \/ Selesai/i)).toBeVisible();
  });

  test('2. Pop-up Modal Atur Silabus: Tab Jenjang, Daftar Materi Wajib/Sunnah, Kolom Dari-Sampai Bulan, dan Simpan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    // Buka Modal Atur Silabus
    const btnAturSilabus = page.getByRole('button', { name: /Atur Silabus/i });
    await expect(btnAturSilabus).toBeVisible({ timeout: 25000 });
    await btnAturSilabus.click();

    // Pastikan Dialog terbuka dengan heading yang tepat
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible({ timeout: 10000 });
    await expect(
      modalDialog.getByText('Atur Silabus Target Hafalan Santri')
    ).toBeVisible();

    // Verifikasi Petunjuk Silabus
    await expect(
      modalDialog.getByText(/Petunjuk Silabus Target/i)
    ).toBeVisible();

    // Verifikasi Tab Filter Jenjang (Gambar 2 style)
    const tabSemua = modalDialog.getByRole('button', { name: /Semua Kelas/i });
    const tabUla = modalDialog.getByRole('button', { name: /Tingkat ULA/i });
    const tabWustho = modalDialog.getByRole('button', { name: /Tingkat WUSTHO/i });
    const tabUlya = modalDialog.getByRole('button', { name: /Tingkat ULYA/i });

    await expect(tabSemua).toBeVisible();
    await expect(tabUla).toBeVisible();
    await expect(tabWustho).toBeVisible();
    await expect(tabUlya).toBeVisible();

    // Klik tab Tingkat ULA
    await tabUla.click();

    // Verifikasi materi hafalan memiliki badge Wajib atau Sunnah
    const badgeWajib = modalDialog.getByText(/^WAJIB$/i).first();
    await expect(badgeWajib).toBeVisible();

    // Verifikasi dropdown Dari Bulan & Sampai Bulan
    const selectDariList = modalDialog.locator('select', { hasText: /Juli|Agustus/i });
    expect(await selectDariList.count()).toBeGreaterThan(0);

    // Verifikasi dropdown "Salin silabus dari kelas..."
    const selectSalin = modalDialog.locator('select', { hasText: /Salin silabus dari kelas/i }).first();
    await expect(selectSalin).toBeVisible();

    // Test mengubah bulan pada materi pertama
    const firstDariSelect = selectDariList.first();
    await firstDariSelect.selectOption({ index: 0 }); // Juli

    // Klik tombol Simpan Silabus
    const btnSimpan = modalDialog.getByRole('button', { name: /Simpan Silabus|Menyimpan/i });
    await expect(btnSimpan).toBeVisible();
    await btnSimpan.click();

    // Tunggu dialog tertutup setelah berhasil disimpan
    await expect(modalDialog).not.toBeVisible({ timeout: 15000 });
  });

  test('3. Evaluasi Stabilo Baris Linimasa Santri & Filter Cepat Stabilo', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/linimasa-setor');

    await expect(
      page.getByRole('heading', { name: 'Linimasa Setor Santri' })
    ).toBeVisible({ timeout: 25000 });

    // Verifikasi tabel memiliki baris-baris santri
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible({ timeout: 20000 });

    // Verifikasi filter status stabilo interaktif
    const selectFilterStabilo = page.locator('select', { hasText: /Semua Stabilo|Melewati Target/i });
    await expect(selectFilterStabilo).toBeVisible();

    // Filter ke "🔴 Melewati Target (Merah)"
    await selectFilterStabilo.selectOption('MERAH');

    // Kembalikan ke "Semua Santri"
    await selectFilterStabilo.selectOption('SEMUA');

    // Verifikasi penggantian Bulan Acuan
    const selectBulanAcuan = page.locator('select', { hasText: /Otomatis|Bulan/i }).first();
    await expect(selectBulanAcuan).toBeVisible();
    await selectBulanAcuan.selectOption({ index: 1 }); // Pilih bulan Juli
  });
});
