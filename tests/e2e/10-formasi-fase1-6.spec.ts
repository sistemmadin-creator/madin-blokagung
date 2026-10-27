import { test, expect } from '@playwright/test';

test.describe('Formasi Kelas Phase 1-6 Full Verification', () => {
  test('1.0 Master Page: Navigasi dan Elemen Utama Formasi Kelas', async ({ page }) => {
    await page.goto('/formasi');

    // Judul halaman master
    await expect(page.getByRole('heading', { name: /Formasi Kelas Madin/i })).toBeVisible();

    // Tombol toolbar atas
    await expect(page.locator('main').getByRole('link', { name: /Kelas Putra/i })).toBeVisible();
    await expect(page.locator('main').getByRole('link', { name: /Kelas Putri/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generator/i })).toBeVisible();

    // Controls DataTables
    await expect(page.getByRole('button', { name: 'Hapus', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sembunyikan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter/i })).toBeVisible();
    await expect(page.getByPlaceholder(/Ketik pencarian/i)).toBeVisible();
  });

  test('2.0 Master Page: Modal Hide Columns & Filter Tokens', async ({ page }) => {
    await page.goto('/formasi');

    // Test Modal Sembunyikan
    const hideBtn = page.getByRole('button', { name: /Sembunyikan/i });
    await hideBtn.click();
    await expect(page.getByRole('heading', { name: /Sembunyikan Kolom Formasi/i })).toBeVisible();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();

    // Test Modal Filter
    const filterBtn = page.getByRole('button', { name: /Filter/i });
    await filterBtn.click();
    await expect(page.getByRole('heading', { name: /Filter Data Formasi Kelas/i })).toBeVisible();
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
  });

  test('3.0 Formasi PA: Tampilan Dokumen Resmi & 2-Level Header', async ({ page }) => {
    await page.goto('/formasi/pa');

    // Header kartu dan dokumen
    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i })).toBeVisible();
    await expect(page.getByText('FORMASI RUANG DINIYYAH DAN TAKROR PUTRA')).toBeVisible();
    await expect(page.getByText('MADRASAH DINIYYAH AL AMIRIYYAH')).toBeVisible();
    await expect(page.getByText('TAHUN AJARAN 2026-2027 M / 1447-1448 H')).toBeVisible();

    // Header berjenjang
    await expect(page.locator('th', { hasText: 'NO.' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'KELAS' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'DOMISILI' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'MUSTAHIQ' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'LOKAL' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'TAKROR' })).toBeVisible();
    await expect(page.locator('th', { hasText: 'DINIYYAH' })).toBeVisible();

    // Tombol toolbar: Export Excel & Cetak
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();
  });

  test('4.0 Formasi PI: Tampilan Dokumen Putri', async ({ page }) => {
    await page.goto('/formasi/pi');

    await expect(page.getByRole('heading', { name: /Formasi Kelas Putri/i })).toBeVisible();
    await expect(page.getByText('FORMASI RUANG DINIYYAH DAN TAKROR PUTRI')).toBeVisible();
    await expect(page.getByText('TAHUN AJARAN 2026-2027 M / 1447-1448 H')).toBeVisible();

    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak \/ Print/i })).toBeVisible();
  });

  test('5.0 Modal Input Formasi: Field Lengkap, Isti\'dad & Dual Foto', async ({ page }) => {
    await page.goto('/formasi');

    // Buka modal input tambah
    const addBtn = page.getByTitle('Tambah Formasi Kelas Baru');
    await addBtn.click();

    await expect(page.getByRole('heading', { name: /Formasi Kelas Baru/i })).toBeVisible();

    // Verifikasi opsi ISTI'DAD
    const selectTingkat = page.locator('select[name="tingkat"]');
    await expect(selectTingkat).toBeVisible();
    await expect(selectTingkat.locator('option[value="ISTI\'DAD"]')).toBeAttached();

    // Verifikasi zona foto
    await expect(page.getByText('Foto Lokal Takror')).toBeVisible();
    await expect(page.getByText('Foto Lokasi Diniyyah')).toBeVisible();

    // Tutup modal
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
  });

  test('6.0 Modal Detail Formasi: Membuka Daftar Santri Aktif', async ({ page }) => {
    await page.goto('/formasi/pa');

    // Tunggu baris data riil muncul di tabel
    const targetRow = page.locator('tbody tr', { hasText: '1 A ULA' });
    await expect(targetRow).toBeVisible({ timeout: 15_000 });

    // Klik baris formasi
    await targetRow.click();

    // Modal detail muncul
    await expect(page.getByRole('heading', { name: /Detail Formasi Kelas/i })).toBeVisible();
    await expect(page.getByText(/Informasi Kelas & Wali Kelas/i)).toBeVisible();
    await expect(page.getByText(/Daftar Santri Terdaftar/i)).toBeVisible();
    await expect(page.getByPlaceholder(/Cari nama \/ NIS \/ kamar/i)).toBeVisible();

    // Tutup modal
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
  });

  test('7.0 Ubah & Nonaktifkan Status Kelas Unggulan via Modal Edit Tanpa Galat Skema', async ({ page }) => {
    let capturedPayload: any = null;
    let alertMessage: string | null = null;

    // Pantau dialog alert (agar kita yakin tidak muncul popup 'Could not find diniyyah_sync')
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.dismiss();
    });

    // Intercept mutasi Supabase agar aman dan bisa assert payload bersih
    await page.route('**/rest/v1/formasi_kelas*', async (route) => {
      const method = route.request().method();
      if (['PATCH', 'PUT', 'POST'].includes(method)) {
        capturedPayload = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ success: true }]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/activity_logs*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ success: true }]),
      });
    });

    await page.goto('/formasi/pa');
    await expect(page.getByRole('heading', { name: /Formasi Kelas Putra/i })).toBeVisible();

    // Buka detail baris pertama yang ada dengan mengklik sel nama kelas (agar tidak kena tombol aksi di sel foto/blok)
    const targetRow = page.locator('tbody tr').first();
    await expect(targetRow).toBeVisible({ timeout: 15_000 });
    await targetRow.locator('td').nth(1).click();

    // Pastikan Modal detail terbuka
    await expect(page.getByRole('heading', { name: /Detail Formasi Kelas/i })).toBeVisible({ timeout: 10_000 });

    // Di modal detail, klik tombol 'Edit Formasi'
    const btnEdit = page.getByRole('button', { name: /Edit Formasi/i });
    await expect(btnEdit).toBeVisible();
    await btnEdit.click();

    // Modal Edit Formasi Kelas terbuka
    await expect(page.getByRole('heading', { name: 'Edit Formasi Kelas' })).toBeVisible();

    // Checkbox kelas unggulan
    const checkboxUnggulan = page.locator('input[name="is_unggulan"]');
    await expect(checkboxUnggulan).toBeVisible();

    // Toggle status unggulan (klik checkbox)
    await checkboxUnggulan.click();

    // Klik tombol 'Simpan Perubahan'
    const btnSimpan = page.getByRole('button', { name: /Simpan Perubahan/i });
    await btnSimpan.click();

    // Tunggu modal edit tertutup
    await expect(page.getByRole('heading', { name: 'Edit Formasi Kelas' })).not.toBeVisible({ timeout: 10_000 });

    // Pastikan TIDAK ADA dialog alert 'Could not find diniyyah_sync' yang muncul
    expect(alertMessage).toBeNull();

    // Pastikan payload yang dikirim ke Supabase benar-benar bersih dari diniyyah_sync dan properti virtual lainnya
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload).not.toHaveProperty('diniyyah_sync');
    expect(capturedPayload).not.toHaveProperty('takror_sync');
    expect(capturedPayload).not.toHaveProperty('domisili_sync');
    expect(capturedPayload).not.toHaveProperty('wali_kelas_text');
    expect(capturedPayload).not.toHaveProperty('jumlah_santri');
    expect(capturedPayload).toHaveProperty('is_unggulan');
    expect(typeof capturedPayload.is_unggulan).toBe('boolean');
  });

  test('8.0 Quick Toggle Status Unggulan langsung di Modal Detail Kelas', async ({ page }) => {
    let capturedPayload: any = null;

    await page.route('**/rest/v1/formasi_kelas*', async (route) => {
      const method = route.request().method();
      if (['PATCH', 'PUT', 'POST'].includes(method)) {
        capturedPayload = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ success: true }]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/activity_logs*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ success: true }]),
      });
    });

    await page.goto('/formasi/pa');
    const targetRow = page.locator('tbody tr').first();
    await expect(targetRow).toBeVisible({ timeout: 15_000 });
    await targetRow.locator('td').nth(1).click();

    // Modal detail muncul
    await expect(page.getByRole('heading', { name: /Detail Formasi Kelas/i })).toBeVisible({ timeout: 10_000 });

    // Tombol Quick Toggle status unggulan (Unggulan / Reguler)
    const btnQuickToggle = page.getByRole('button', { name: /(Unggulan|Reguler)/i });
    await expect(btnQuickToggle).toBeVisible();
    await btnQuickToggle.click();

    // Pastikan mutasi update terpanggil dengan payload { is_unggulan: boolean }
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload).toHaveProperty('is_unggulan');
    expect(typeof capturedPayload.is_unggulan).toBe('boolean');
  });
});
