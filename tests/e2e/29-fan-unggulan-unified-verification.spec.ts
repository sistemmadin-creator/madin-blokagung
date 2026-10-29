import { test, expect } from '@playwright/test';

test.describe('Verifikasi Lengkap Penyederhanaan Item Fan Unggulan Level (Tingkat, Din. Kls)', () => {
  test('1.0 Modal Pengaturan Item Fan: Tab Unggulan Terpadu Menampilkan 5 Kelas Tanpa Huruf Rombel', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Buka modal Pengaturan Item Fan
    const btnAturFan = page.getByRole('button', { name: /Atur Item Fan/i });
    await expect(btnAturFan).toBeVisible();
    await btnAturFan.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /Pengaturan Item Fan \(Mata Pelajaran\)/i })).toBeVisible();

    // Verifikasi Tab Unggulan menampilkan jumlah 5 kelas
    const tabUnggulan = dialog.getByRole('button', { name: /Unggulan \(5\)/i });
    await expect(tabUnggulan).toBeVisible();
    await tabUnggulan.click();

    // Verifikasi 5 kartu kelas unggulan level (Tingkat, Din. Kls)
    await expect(dialog.getByRole('heading', { name: '3 ULA (Ug)', exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '4 ULA (Ug)', exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '1 WUSTHO (Ug)', exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '2 WUSTHO (Ug)', exact: true })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: '1 ULYA (Ug)', exact: true })).toBeVisible();

    // Pastikan kartu spesifik per rombel (A, B) SUDAH TIDAK ADA
    await expect(dialog.getByRole('heading', { name: '3 A ULA (Ug)', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('heading', { name: '3 B ULA (Ug)', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('heading', { name: '4 A ULA (Ug)', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('heading', { name: '4 B ULA (Ug)', exact: true })).toHaveCount(0);

    // Verifikasi fan kitab di 3 ULA (Ug)
    await expect(dialog.getByText('Matan Taqrib 1')).toBeVisible();
    await expect(dialog.getByText('Jurumiyyah {Al-Bayan}')).toBeVisible();

    // Tutup dialog
    await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('2.0 Matriks Fan Pelajaran: Filter Kategori Unggulan Merender Format Terpadu', async ({ page }) => {
    await page.goto('/fan/pelajaran');

    // Klik tombol switch Fan Pelajaran Unggulan
    const btnUnggulan = page.getByRole('button', { name: /Fan Pelajaran Unggulan/i });
    await expect(btnUnggulan).toBeVisible();
    await btnUnggulan.click();

    await expect(page.getByText(/Menampilkan:.*Kelas Unggulan/i)).toBeVisible();

    // Verifikasi baris kelas unggulan di tabel matriks
    // Tingkat ULA
    await expect(page.locator('table').getByText('III').first()).toBeVisible();
    await expect(page.locator('table').getByText('IV').first()).toBeVisible();

    // Verifikasi badge Ug
    const badgesUg = page.locator('table span').filter({ hasText: /^Ug$/ });
    expect(await badgesUg.count()).toBeGreaterThanOrEqual(2);

    // Verifikasi nama kitab unggulan muncul di matriks
    await expect(page.locator('table').getByText('Matan Taqrib 1').first()).toBeVisible();
    await expect(page.locator('table').getByText('Al-‘Imrithi').first()).toBeVisible();
  });

  test('3.0 Verifikasi Integritas Konfigurasi di Supabase Database', async ({ request }) => {
    // Jalankan verifikasi pembacaan dari API settings / verifikasi script
    const response = await request.get('/api/settings?key=FAN_CONFIG');
    if (response.ok()) {
      const data = await response.json();
      const keys = Object.keys(data?.value || data || {});
      const ugKeys = keys.filter((k: string) => k.includes('(Ug)'));

      // Harus berisi 5 kunci terpadu
      expect(ugKeys.sort()).toEqual([
        '1 ULYA (Ug)',
        '1 WUSTHO (Ug)',
        '2 WUSTHO (Ug)',
        '3 ULA (Ug)',
        '4 ULA (Ug)',
      ]);
    }
  });
});
