import { test, expect } from '@playwright/test';

test.describe('Modul 03: Kurikulum & Akademik', () => {
  test('Formasi Kelas PA page and generator modal', async ({ page }) => {
    await page.goto('/formasi/pa');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i })).toBeVisible();

    // Verify generator button
    const genBtn = page.getByRole('button', { name: /Generator Rombel/i });
    await expect(genBtn).toBeVisible();
    await genBtn.click();

    // Modal should show
    await expect(page.getByRole('heading', { name: /Generator Formasi Rombel Massal/i })).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/Santri Putra/i)).toBeVisible();

    // Close generator
    const closeBtn = page.getByRole('button', { name: /Batal/i });
    await closeBtn.click();
    await expect(page.getByRole('heading', { name: /Generator Formasi Rombel Massal/i })).toBeHidden();
  });

  test('Formasi Kelas PI page and gender isolation', async ({ page }) => {
    await page.goto('/formasi/pi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putri/i })).toBeVisible();

    const genBtn = page.getByRole('button', { name: /Generator Rombel/i });
    await expect(genBtn).toBeVisible();
    await genBtn.click();

    await expect(page.getByRole('heading', { name: /Generator Formasi Rombel Massal/i })).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/Santri Putri/i)).toBeVisible();

    const closeBtn = page.getByRole('button', { name: /Batal/i });
    await closeBtn.click();
  });

  test('Fan Pelajaran page and modals', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    await expect(page.getByRole('heading', { name: /Daftar Fan Pelajaran/i })).toBeVisible();

    // Tambah Fan button
    const addFanBtn = page.getByRole('button', { name: /Tambah Fan/i });
    await expect(addFanBtn).toBeVisible();
    await addFanBtn.click();

    await expect(page.getByText(/Tambah Fan Pelajaran Baru/i)).toBeVisible();
    const cancelBtn = page.getByRole('button', { name: /Batal/i });
    await cancelBtn.click();
    await expect(page.getByText(/Tambah Fan Pelajaran Baru/i)).toBeHidden();
  });

  test('Pengajar Fan page and search', async ({ page }) => {
    await page.goto('/fan/pengajar');

    await expect(page.getByRole('heading', { name: /Pengajar Fan Pelajaran/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Cari fan pelajaran/i)).toBeVisible();
  });

  test('Jadwal KBM matrix page and day tabs', async ({ page }) => {
    await page.goto('/jadwal-kbm');

    await expect(page.getByRole('heading', { name: /Jadwal KBM Per Kelas/i })).toBeVisible();

    // Check day tabs (Hari Sabtu to Hari Kamis)
    for (const day of ['Hari Sabtu', 'Hari Ahad', 'Hari Senin', 'Hari Selasa', 'Hari Rabu', 'Hari Kamis']) {
      const tab = page.getByRole('button', { name: day, exact: true });
      await expect(tab).toBeVisible();
    }
  });

  test('Hari KBM daily view', async ({ page }) => {
    await page.goto('/hari-kbm');

    await expect(page.getByRole('heading', { name: /Hari KBM/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sabtu/i }).first()).toBeVisible();
  });

  test('Daftar Pendidik dossier page', async ({ page }) => {
    await page.goto('/daftar-pendidik');

    await expect(page.getByRole('heading', { name: /Daftar Tenaga Pendidik/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Cari nama pendidik/i)).toBeVisible();
  });
});
