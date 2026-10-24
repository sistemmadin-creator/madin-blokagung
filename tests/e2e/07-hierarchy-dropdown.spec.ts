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

    // Ensure data is fully loaded before adding rule
    await expect(dialog.getByText(/63 aturan/i)).toBeVisible();

    const addRuleBtn = dialog.getByRole('button', { name: 'Tambah Aturan Baru', exact: true });
    await addRuleBtn.click();

    // Newly added rule opens edit view
    await expect(dialog.getByText(/Rute Induk/i)).toBeVisible();

    // Type selection
    const typeSelect = dialog.locator('select').filter({ hasText: /Rentang Angka/i });
    await expect(typeSelect).toBeVisible();

    // Switch to manual text
    await typeSelect.selectOption('manual');
    await expect(dialog.getByPlaceholder(/Contoh: A1, A2, A3, Mandi/i)).toBeVisible();
  });

  test('TC-06: tab switching between Tree 1 and Tree 2 with Visual & JSON modes', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Switch to Tree 2 inside modal
    const tabTree2 = dialog.getByRole('button', { name: /Hierarki Kelas Formal/i });
    await tabTree2.click();

    // Visual builder header and unit groups visible
    await expect(dialog.getByText(/2. Unit > Jurusan > Semester > Kelas > Bagian/i)).toBeVisible();
    await expect(dialog.getByText('SMP Plus Darussalam').first()).toBeVisible();

    // Test mode switcher to JSON / Cepat
    const jsonModeBtn = dialog.getByRole('button', { name: /JSON \/ Cepat/i });
    await expect(jsonModeBtn).toBeVisible();
    await jsonModeBtn.click();
    await expect(dialog.getByPlaceholder(/\[ { ... } \]/i)).toBeVisible();

    // Switch back to Visual mode
    const visualModeBtn = dialog.getByRole('button', { name: 'Visual', exact: true });
    await visualModeBtn.click();
    await expect(dialog.getByText('SMP Plus Darussalam').first()).toBeVisible();

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

  test('TC-09: Tree 2 Buka Semua, Tutup Semua, and Unit accordion expansion', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Switch to Tree 2
    await dialog.getByRole('button', { name: /Hierarki Kelas Formal/i }).click();

    const bukaSemuaBtn = dialog.getByRole('button', { name: /Buka Semua/i });
    const tutupSemuaBtn = dialog.getByRole('button', { name: /Tutup Semua/i });

    // Open all unit accordions
    await bukaSemuaBtn.click();
    await expect(dialog.getByText(/Jurusan: Tahfidz/i)).toBeVisible();
    await expect(dialog.getByText(/Jurusan: Unggulan MIPA\/Sains/i)).toBeVisible();

    // Close all unit accordions
    await tutupSemuaBtn.click();
    await expect(dialog.getByText(/Jurusan: Tahfidz/i)).toBeHidden();

    // Expand only SMP Plus Darussalam
    const smpGroup = dialog.getByRole('button', { name: /SMP Plus Darussalam \d+ Jurusan/i });
    await smpGroup.click();
    await expect(dialog.getByText(/Jurusan: Tahfidz/i)).toBeVisible();
  });

  test('TC-10: Tree 2 search and filter by Unit', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Switch to Tree 2
    await dialog.getByRole('button', { name: /Hierarki Kelas Formal/i }).click();

    // Search for Unggulan
    const searchInput = dialog.getByPlaceholder(/Cari unit, jurusan, kelas.../i);
    await searchInput.fill('Unggulan');
    await expect(dialog.getByText(/Jurusan: Unggulan MIPA\/Sains/i)).toBeVisible();
    await expect(dialog.getByText(/Jurusan: Tahfidz/i)).toBeHidden();

    // Clear search
    await searchInput.clear();

    // Filter by Unit
    const filterBtn = dialog.getByRole('button', { name: 'Filter', exact: true });
    await filterBtn.click();

    const unitSelect = dialog.locator('select').first();
    await unitSelect.selectOption('SMP Plus Darussalam');
    await expect(dialog.getByRole('button', { name: /SMP Plus Darussalam \d+ Jurusan/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /MTs Al Amiriyyah \d+ Jurusan/i })).toBeHidden();

    // Reset filter
    await dialog.getByRole('button', { name: /Reset Filter/i }).click();
    await expect(dialog.getByRole('button', { name: /MTs Al Amiriyyah \d+ Jurusan/i })).toBeVisible();
  });

  test('TC-11: Tree 2 Presets and Live Preview calculation', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Switch to Tree 2 and wait for data load
    await dialog.getByRole('button', { name: /Hierarki Kelas Formal/i }).click();
    await expect(dialog.getByText(/\d+ aturan/i)).toBeVisible();
    await dialog.getByRole('button', { name: /Buka Semua/i }).click();

    // Click card Tahfidz to open editor
    const tahfidzCard = dialog.getByText(/Jurusan: Tahfidz/i);
    await tahfidzCard.click();

    // Verify live preview is visible
    await expect(dialog.getByText(/Pratinjau Rombel yang Terbentuk/i)).toBeVisible();
    await expect(dialog.getByText(/Total: \d+ Rombel/i)).toBeVisible();

    // Click preset SMA (X-XII)
    const smaPresetBtn = dialog.getByRole('button', { name: /SMA \(X-XII\)/i });
    await smaPresetBtn.click();
    await expect(dialog.getByText(/Total: \d+ Rombel/i)).toBeVisible();

    // Click preset SD/MI (1-6)
    const miPresetBtn = dialog.getByRole('button', { name: /SD\/MI \(1-6\)/i });
    await miPresetBtn.click();
    await expect(dialog.getByText(/Total: \d+ Rombel/i)).toBeVisible();
  });

  test('TC-12: Tree 2 Duplicate rule and Tambah Jurusan inside Unit', async ({ page }) => {
    await page.getByRole('button', { name: /Hierarki Kamar/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Switch to Tree 2 and wait for data load
    await dialog.getByRole('button', { name: /Hierarki Kelas Formal/i }).click();
    await expect(dialog.getByText(/\d+ aturan/i)).toBeVisible();

    // Click + Jurusan on SMP Plus Darussalam
    const addJurusanBtn = dialog.getByRole('button', { name: /Tambah Jurusan Baru di SMP Plus Darussalam/i });
    await addJurusanBtn.click();

    // Verify draft Jurusan Baru was added
    await expect(dialog.getByText(/Jurusan: Jurusan Baru/i)).toBeVisible();

    // Duplicate that rule
    const duplicateBtn = dialog.getByRole('button', { name: /Duplikat Aturan/i }).first();
    await duplicateBtn.click();

    // Verify duplicate with (Salinan) exists
    await expect(dialog.getByText(/\(Salinan\)/i)).toBeVisible();
  });
});
