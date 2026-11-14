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

test.describe('Modul 02: Master Data Dewan Asatidz', () => {
  test.beforeEach(async ({ page }) => {
    await gotoWithAuth(page, '/asatidz');
  });

  test('renders header, toolbar buttons, and NIS | NIA | KG | STATUS table columns', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /(Database|Data Dewan) Asatidz/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /Tambah Asatidz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();

    const headers = await page.locator('thead th').allInnerTexts();
    const normalized = headers.map((h) => h.trim().toUpperCase());
    const nisIdx = normalized.indexOf('NIS');
    const niaIdx = normalized.indexOf('NIA');
    const kgIdx = normalized.indexOf('KG');
    const jahIdx = normalized.indexOf('JAH');
    const statusIdx = normalized.indexOf('STATUS');

    expect(nisIdx).toBeGreaterThan(-1);
    expect(niaIdx).toBe(nisIdx + 1);
    expect(kgIdx).toBe(niaIdx + 1);
    expect(statusIdx).toBe(jahIdx + 1);
  });

  test('search input for asatidz works', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Pencarian: Nama, NIS, NIA, KG/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Ahmad');
    await expect(searchInput).toHaveValue('Ahmad');
  });

  test('opens Tambah Asatidz modal and displays NIS, NIA, Kode Guru (KG), and Status inputs', async ({ page }) => {
    await page.getByRole('button', { name: /Tambah Asatidz/i }).click();

    await expect(page.getByRole('heading', { name: /Form Pendaftaran Data Asatidz/i })).toBeVisible();

    // Verify new identity & status fields
    await expect(page.getByPlaceholder('Masukkan NIS')).toBeVisible();
    await expect(page.getByPlaceholder('Masukkan NIA')).toBeVisible();
    await expect(page.getByPlaceholder('Contoh: B54')).toBeVisible();
    const kgPrefixSelect = page.getByTitle('Pilih Prefix Huruf Kode Guru');
    await expect(kgPrefixSelect.locator('option')).toHaveText(['-', 'A', 'B', 'C', 'D']);
    await expect(page.getByTitle('Generate Otomatis Kode Guru (KG)')).toBeVisible();
    await expect(page.locator('select[name="status"]')).toHaveValue('aktif');
    await expect(page.getByPlaceholder(/Nama lengkap asatidz/i)).toBeVisible();

    // Close modal
    const cancelBtn = page.getByRole('button', { name: 'Batal', exact: true });
    await cancelBtn.click();
    await expect(page.getByRole('heading', { name: /Form Pendaftaran Data Asatidz/i })).toBeHidden();
  });

  test('opens and interacts with Filter Asatidz modal', async ({ page }) => {
    await page.getByRole('button', { name: /Filter/i }).click();

    await expect(page.getByRole('heading', { name: /Filter Data Dewan Asatidz/i })).toBeVisible();

    const applyBtn = page.getByRole('button', { name: /Terapkan Filter/i }).first();
    await applyBtn.click();
    await expect(page.getByRole('heading', { name: /Filter Data Dewan Asatidz/i })).toBeHidden();
  });

  test('opens Detail Asatidz modal and renders Rincian Jadwal Mengajar', async ({ page }) => {
    const firstRow = page.locator('tbody tr[title]').first();
    await expect(firstRow).toBeVisible({ timeout: 15000 });
    await firstRow.click();

    await expect(page.getByRole('heading', { name: /Detail Profil Asatidz & Santri Binaan/i })).toBeVisible();
    await expect(page.getByText(/Rincian Jadwal Mengajar \(Sabtu s\/d Kamis\)/i)).toBeVisible();
  });

  test('beranda defaults to all group menus collapsed', async ({ page }) => {
    await gotoWithAuth(page, '/beranda');
    await expect(page.getByRole('button', { name: /Buka Semua/i })).toBeVisible();
    // Sub-item inside group card (e.g. "Buka Modul" under Data Santri) should be hidden when collapsed
    await expect(page.getByText('Buka Modul').first()).toBeHidden();
  });
});
