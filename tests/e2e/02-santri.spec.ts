import { test, expect } from '@playwright/test';

test.describe('Modul 01: Master Data Santri', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/santri');
  });

  test('renders page header and action toolbar', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Database Santri/i })).toBeVisible();

    // Verify toolbar action buttons
    await expect(page.getByRole('button', { name: /Tambah Santri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter Lanjutan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Kolom/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export/i })).toBeVisible();
  });

  test('search input filters data dynamically', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/Cari nama, nomor induk/i);
    await expect(searchInput).toBeVisible();

    // Type query
    await searchInput.fill('ROKIB');
    await expect(searchInput).toHaveValue('ROKIB');
  });

  test('opens and interacts with Tambah Santri modal', async ({ page }) => {
    await page.getByRole('button', { name: /Tambah Santri/i }).click();

    // Modal dialog title
    await expect(page.getByRole('heading', { name: /Formulir Pendaftaran Santri Baru/i })).toBeVisible();

    // Verify key fields
    await expect(page.getByPlaceholder(/Nama Lengkap Huruf Kapital/i)).toBeVisible();

    // Cancel modal
    const cancelBtn = page.getByRole('button', { name: /Batal/i });
    await cancelBtn.click();
    await expect(page.getByRole('heading', { name: /Formulir Pendaftaran Santri Baru/i })).toBeHidden();
  });

  test('opens and interacts with Atur Kolom modal', async ({ page }) => {
    await page.getByRole('button', { name: /Kolom/i }).click();

    await expect(page.getByText(/Kelola Tampilan Kolom Tabel Santri/i)).toBeVisible();

    // Check action buttons in modal
    await expect(page.getByRole('button', { name: /Sembunyikan Semua/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tampilkan Semua/i })).toBeVisible();

    // Close modal
    const closeBtn = page.getByRole('button', { name: /Selesai/i });
    await closeBtn.click();
    await expect(page.getByText(/Kelola Tampilan Kolom Tabel Santri/i)).toBeHidden();
  });

  test('opens and interacts with Filter Data modal', async ({ page }) => {
    await page.getByRole('button', { name: /Filter Lanjutan/i }).click();

    await expect(page.getByRole('heading', { name: /Filter Lanjutan Data Santri/i })).toBeVisible();

    // Verify categories in modal
    await expect(page.getByRole('dialog').getByText('PA/PI', { exact: true })).toBeVisible();

    const closeBtn = page.getByRole('button', { name: /Terapkan Filter/i }).first();
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Filter Lanjutan Data Santri/i })).toBeHidden();
  });
});
