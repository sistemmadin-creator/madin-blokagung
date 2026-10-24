import { test, expect } from '@playwright/test';

test.describe('Modul 02: Master Data Dewan Asatidz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/asatidz');
  });

  test('renders header and toolbar buttons for asatidz', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /(Database|Data Dewan) Asatidz/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /Tambah Asatidz/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('search input for asatidz works', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Pencarian: Nama, NIA, NIS/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Ahmad');
    await expect(searchInput).toHaveValue('Ahmad');
  });

  test('opens Tambah Asatidz modal and displays proper form inputs', async ({ page }) => {
    await page.getByRole('button', { name: /Tambah Asatidz/i }).click();

    await expect(page.getByRole('heading', { name: /Form Pendaftaran Data Asatidz/i })).toBeVisible();

    // Verify fields
    await expect(page.getByPlaceholder(/Nama lengkap asatidz/i)).toBeVisible();

    // Close modal
    const cancelBtn = page.getByRole('button', { name: /Batal/i });
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
});
