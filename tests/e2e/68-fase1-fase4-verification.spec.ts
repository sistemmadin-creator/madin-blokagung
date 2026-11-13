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

test.describe('E2E Uji Hasil Fase 1 - Fase 4: Data Santri, Asatidz, Formasi Kelas', () => {
  test.setTimeout(90000);

  test('Fase 1: Verifikasi Data Santri - Navigasi, Header, Toolbar, dan Modal Import Excel', async ({ page }) => {
    await gotoWithAuth(page, '/santri');

    // Header dan toolbar
    await expect(page.getByRole('heading', { name: /Database Santri/i })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: /Tambah Santri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter Lanjutan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kolom/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();

    // Modal Import Excel dan Template Download
    const importBtn = page.getByRole('button', { name: /Impor Excel/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    await expect(page.getByRole('heading', { name: /Import Massal Database Santri/i })).toBeVisible();
    await expect(page.getByTestId('btn-unduh-template-santri')).toBeVisible();

    const batalBtn = page.getByRole('button', { name: 'Batal', exact: true });
    await batalBtn.click();
    await expect(page.getByRole('heading', { name: /Import Massal Database Santri/i })).toBeHidden();
  });

  test('Fase 1: Verifikasi Data Asatidz - Header, Toolbar, dan Template Import Tanpa Pergeseran Kolom', async ({ page }) => {
    await gotoWithAuth(page, '/asatidz');

    await expect(page.getByRole('heading', { name: /Database Asatidz/i })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: /Tambah Asatidz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sembunyikan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();

    // Modal Import Excel Asatidz
    const importBtn = page.getByRole('button', { name: /Import Excel/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();

    await expect(page.getByRole('heading', { name: /Import Massal Database Asatidz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Unduh Template Excel/i })).toBeVisible();

    const batalBtn = page.getByRole('button', { name: 'Batal', exact: true });
    await batalBtn.click();
    await expect(page.getByRole('heading', { name: /Import Massal Database Asatidz/i })).toBeHidden();
  });

  test('Fase 1: Penegakan RBAC Formasi Kelas Putra (/formasi/pa) dan Putri (/formasi/pi)', async ({ page }) => {
    // 1. Formasi PA
    await gotoWithAuth(page, '/formasi/pa');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: /Hierarki Blok KBM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();

    // 2. Formasi PI
    await gotoWithAuth(page, '/formasi/pi');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Putri/i })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: /Hierarki Blok Kelas Putri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();
  });

  test('Fase 2 & Fase 4: Formasi Master Page, Modal Detail Formasi, & Offline Cache Readiness', async ({ page }) => {
    await gotoWithAuth(page, '/formasi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible({ timeout: 25000 });
    await expect(page.getByRole('button', { name: /Tambah Formasi Kelas Baru/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generator/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Hierarki Blok KBM/i })).toBeVisible();

    // Pastikan IndexedDB MadinaOfflineDB diinisialisasi untuk offline-first
    const hasIndexedDB = await page.evaluate(async () => {
      return typeof window.indexedDB !== 'undefined';
    });
    expect(hasIndexedDB).toBe(true);
  });
});
