import { test, expect } from '@playwright/test';

test.describe('Modul 07: Pengaturan Hierarki Dropdown Blok > Asrama > Kode > Kamar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/santri');
  });

  test('TC-01: renders Hierarki Kamar button and opens modal with dark header and badge', async ({ page }) => {
    const hierarkiBtn = page.getByRole('button', { name: /Hierarki Kamar/i });
    await expect(hierarkiBtn).toBeVisible();
    await hierarkiBtn.click();

    // Dialog modal visible
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Header modal title & subtitle matching Gambar 1
    await expect(dialog.getByRole('heading', { name: /Pengaturan Hierarki Dropdown/i })).toBeVisible();
    await expect(dialog.getByText(/Atur relasi Blok > Asrama > Kode > Kamar untuk form santri/i)).toBeVisible();

    // Toolbar badge displaying blok count
    await expect(dialog.getByText(/15 blok · 63 aturan/i)).toBeVisible();

    // Verify info banner matching Gambar 1
    await expect(dialog.getByText(/Pilihan kosong - otomatis tersedia di dropdown Kode dan Kamar/i)).toBeVisible();
  });

  test('TC-02: Buka Semua, Tutup Semua, and individual accordion expansion', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const bukaSemuaBtn = dialog.getByRole('button', { name: /Buka Semua/i });
    const tutupSemuaBtn = dialog.getByRole('button', { name: /Tutup Semua/i });

    await expect(bukaSemuaBtn).toBeVisible();
    await expect(tutupSemuaBtn).toBeVisible();

    // Expand all groups
    await bukaSemuaBtn.click();
    await expect(dialog.getByText('Maqomin Amin > AB')).toBeVisible();
    await expect(dialog.getByText('Munzalan Mubaroka > W')).toBeVisible();

    // Collapse all groups
    await tutupSemuaBtn.click();
    await expect(dialog.getByText('Maqomin Amin > AB')).toBeHidden();

    // Expand single group (Blok 12)
    const blok12Group = dialog.getByRole('button', { name: /Blok 12/i });
    await blok12Group.click();
    await expect(dialog.getByText('Maqomin Amin > AB')).toBeVisible();
  });

  test('TC-03: search filter filters rules dynamically', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const searchInput = dialog.getByPlaceholder(/Cari aturan.../i);
    await expect(searchInput).toBeVisible();

    // Search for Maqomin Amin
    await searchInput.fill('Maqomin');
    await expect(dialog.getByText('Maqomin Amin > AB')).toBeVisible();
    // Other bloks should not be visible
    await expect(dialog.getByText('Bir Aly > X')).toBeHidden();

    // Clear search
    await searchInput.clear();
    await expect(dialog.getByRole('button', { name: /Blok 11/i })).toBeVisible();
  });

  test('TC-04: filter dropdown filters by Blok and allows reset', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Open filter popover inside modal
    const filterBtn = dialog.getByRole('button', { name: 'Filter', exact: true });
    await filterBtn.click();

    const blokSelect = dialog.locator('select').first();
    await expect(blokSelect).toBeVisible();

    // Filter by Blok 12
    await blokSelect.selectOption('Blok 12');
    await expect(dialog.getByRole('button', { name: /Blok 12/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Blok Induk Putra/i })).toBeHidden();

    // Reset filter
    const resetFilterBtn = dialog.getByRole('button', { name: /Reset Filter/i });
    await resetFilterBtn.click();
    await expect(dialog.getByRole('button', { name: /Blok Induk Putra/i })).toBeVisible();
  });

  test('TC-05: add new rule adds draft and allows type selection', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const addRuleBtn = dialog.getByRole('button', { name: /Tambah Aturan Baru/i });
    await addRuleBtn.click();

    // Newly added rule opens edit view
    await expect(dialog.getByText(/Rute Induk \(Blok > Asrama > Kode\)/i)).toBeVisible();

    // Type selection
    const typeSelect = dialog.locator('select').filter({ hasText: /Rentang Angka/i });
    await expect(typeSelect).toBeVisible();

    // Switch to manual text
    await typeSelect.selectOption('manual');
    await expect(dialog.getByPlaceholder(/Contoh: A1, A2, A3, Mandi/i)).toBeVisible();
  });

  test('TC-06: tab switching between Tree 1 and Tree 2', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Switch to Tree 2 inside modal
    const tabTree2 = dialog.getByRole('button', { name: /Hierarki Kelas Formal/i });
    await tabTree2.click();

    // Formal class configuration textarea visible
    await expect(dialog.getByText(/Hierarki Pendidikan Formal/i)).toBeVisible();
    await expect(dialog.getByPlaceholder(/Contoh: SMP > MIPA > 1 > VII > A/i)).toBeVisible();

    // Switch back to Tree 1 inside modal
    const tabTree1 = dialog.getByRole('button', { name: /Hierarki Kamar/i });
    await tabTree1.click();
    await expect(dialog.getByText('1. Blok > Asrama > Kode > Kamar', { exact: true })).toBeVisible();
  });

  test('TC-07: closes dialog cleanly via Batal button and X button', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Close via Batal
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(dialog).toBeHidden();

    // Reopen and close via X button
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Tutup pengaturan hierarki/i }).click();
    await expect(dialog).toBeHidden();
  });

  test('TC-08: cascading datalist options integrated into Tambah Santri form', async ({ page }) => {
    // Open Tambah Santri modal
    await page.getByRole('button', { name: /Tambah Santri/i }).click();
    await expect(page.getByRole('heading', { name: /Formulir Pendaftaran Santri Baru/i })).toBeVisible();

    // Blok input has datalist connected
    const blokInput = page.locator('input[name="blok"]');
    await expect(blokInput).toBeVisible();
    await expect(blokInput).toHaveAttribute('list', 'santri_blok_options');

    // Datalist should contain Blok options from the 63 hierarchy rules
    const blokDatalist = page.locator('#santri_blok_options option');
    await expect(blokDatalist.first()).toBeAttached();
    const count = await blokDatalist.count();
    expect(count).toBeGreaterThanOrEqual(15);

    // Cancel modal
    await page.getByRole('button', { name: /^Batal$/i }).first().click();
    await expect(page.getByRole('heading', { name: /Formulir Pendaftaran Santri Baru/i })).toBeHidden();
  });
});
