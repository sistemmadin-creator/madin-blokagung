import { test, expect, Page } from '@playwright/test';

async function performLogin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByLabel('Username Pengurus').fill('admin');
  await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
  await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
}

test.describe('E2E: Pengujian Komprehensif Halaman BERANDA & Alur Navigasi Terpadu', () => {
  test.setTimeout(90000);

  test('1. Pengalihan Otomatis Pasca Login Langsung ke Halaman BERANDA (/beranda)', async ({
    page,
  }) => {
    // 1. Lakukan login standar dari /login tanpa query ?next
    await performLogin(page);

    // 2. Verifikasi sistem otomatis mengarahkan ke /beranda (bukan lagi /dashboard)
    await page.waitForURL('**/beranda**', { timeout: 30000 });
    expect(page.url()).toContain('/beranda');

    // 3. Verifikasi elemen sambutan utama di Beranda
    await expect(
      page.getByRole('heading', { name: /Ahlan Wa Sahlan/i })
    ).toBeVisible({ timeout: 20000 });

    await expect(page.getByText(/Portal Terpadu Pengurus MADINA/i)).toBeVisible();
    await expect(page.getByText(/Tahun Ajaran:/i)).toBeVisible();
  });

  test('2. Verifikasi Header, Akses Cepat Harian, & Kartu Seluruh Grup Menu', async ({
    page,
  }) => {
    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    // 1. Verifikasi 6 Baris Pintasan Akses Cepat
    await expect(page.getByText('Akses Cepat Harian', { exact: true })).toBeVisible();
    await expect(page.getByText('Absen Cepat', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Setoran Santri', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Pusat Kendali EBTADIN', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Jadwal KBM', { exact: true }).first()).toBeVisible();

    // 2. Verifikasi Keberadaan Seluruh Grup Menu Utama (Level 1)
    await expect(page.getByRole('heading', { name: 'Beranda', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Utama', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PKM. Kurikulum', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PKM. Muhafadzoh', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PKM. Kesiswaan', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PKM. Sapras', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PKM. Publikasi & Warta', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'EBTADIN', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pengaturan', exact: true })).toBeVisible();
  });

  test('3. Interaktivitas Hierarki 3 Level: Grup Menu -> Menu Utama -> Sub-Menu', async ({
    page,
  }) => {
    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    // 1. Uji Kontrol Tutup Semua & Buka Semua
    const btnTutupSemua = page.getByRole('button', { name: 'Tutup Semua', exact: true });
    const btnBukaSemua = page.getByRole('button', { name: 'Buka Semua', exact: true });

    await btnTutupSemua.click();
    // Setelah tutup semua, tombol Tutup/Buka pada kartu grup berubah status
    await expect(page.getByText('Buka', { exact: true }).first()).toBeVisible();

    await btnBukaSemua.click();
    await expect(page.getByText('Tutup', { exact: true }).first()).toBeVisible();

    // 2. Uji Interaksi Level 1: Klik Header Grup EBTADIN untuk Collapse/Expand
    const headerEbtadin = page.locator('div', { has: page.getByRole('heading', { name: 'EBTADIN', exact: true }) }).first();
    await headerEbtadin.click();
    // Klik lagi untuk membukanya
    await headerEbtadin.click();

    // 3. Uji Interaksi Level 2 & 3: Menu Beranak "Tentang Ujian" di dalam Grup EBTADIN
    // Menu "Tentang Ujian" memiliki sub-menu (Rekap Ujian, Rekap & Arsip Ujian Angkatan)
    const btnTentangUjian = page.locator('button', { hasText: 'Tentang Ujian' }).first();
    await expect(btnTentangUjian).toBeVisible();
    await btnTentangUjian.click();

    // Verifikasi Sub-Menu Level 3 muncul
    const linkRekapUjian = page.locator('a', { hasText: 'Rekap Ujian' }).first();
    const linkArsipUjian = page.locator('a', { hasText: 'Rekap & Arsip Ujian Angkatan' }).first();
    await expect(linkRekapUjian).toBeVisible();
    await expect(linkArsipUjian).toBeVisible();

    // 4. Uji Klik Sub-Menu menuju modul terkait
    await linkRekapUjian.click();
    await page.waitForURL('**/ebtadin/ujian**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Rekap Keikutsertaan Ujian/i })).toBeVisible();

    // 5. Uji Navigasi Balik ke Beranda melalui Logo Navbar "Madin Blokagung"
    const brandLogo = page.locator('header, nav').getByRole('link', { name: /Madin Blokagung/i }).first();
    await brandLogo.click();
    await page.waitForURL('**/beranda**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Ahlan Wa Sahlan/i })).toBeVisible();
  });

  test('4. Fitur Pencarian Real-Time & Filter Kategori Grup Menu', async ({
    page,
  }) => {
    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    const searchInput = page.getByPlaceholder(/Cari modul, grup, atau sub-menu/i);
    await expect(searchInput).toBeVisible();

    // 1. Ketik "Ujian" di kotak pencarian
    await searchInput.fill('Ujian');

    // Grup EBTADIN harus tampil dan otomatis terbuka
    await expect(page.getByRole('heading', { name: 'EBTADIN', exact: true })).toBeVisible();
    await expect(page.getByText('Tentang Ujian', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Modul & Sub-Menu Ditemukan/i)).toBeVisible();

    // Grup yang tidak ada kata "Ujian" seperti "PKM. Sapras" harus tersembunyi
    await expect(page.getByRole('heading', { name: 'PKM. Sapras', exact: true })).not.toBeVisible();

    // 2. Bersihkan pencarian dengan tombol X
    const btnClearSearch = page.getByTitle('Hapus pencarian');
    await btnClearSearch.click();
    await expect(searchInput).toHaveValue('');
    // Seluruh grup kembali muncul
    await expect(page.getByRole('heading', { name: 'PKM. Sapras', exact: true })).toBeVisible();

    // 3. Uji Filter Kategori Pills: Klik "PKM. Muhafadzoh"
    const pillMuhafadzoh = page.getByRole('button', { name: 'PKM. Muhafadzoh', exact: true });
    await pillMuhafadzoh.click();

    // Hanya grup Muhafadzoh yang muncul
    await expect(page.getByRole('heading', { name: 'PKM. Muhafadzoh', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PKM. Kurikulum', exact: true })).not.toBeVisible();

    // Klik "Semua Grup" untuk mereset
    const pillSemua = page.getByRole('button', { name: 'Semua Grup', exact: true });
    await pillSemua.click();
    await expect(page.getByRole('heading', { name: 'PKM. Kurikulum', exact: true })).toBeVisible();
  });

  test('5. Sidebar Navigasi Memuat Menu "Beranda" di Posisi Paling Atas', async ({
    page,
  }) => {
    await performLogin(page);
    await page.waitForURL('**/beranda**', { timeout: 30000 });

    const sidebar = page.getByRole('complementary');
    const linkSidebarBeranda = sidebar.getByRole('link', { name: 'Beranda', exact: true });
    await expect(linkSidebarBeranda).toBeVisible();

    // Menu Dashboard Statistik juga tetap ada di bawahnya
    const linkSidebarDashboard = sidebar.getByRole('link', { name: /Dashboard/i });
    await expect(linkSidebarDashboard).toBeVisible();
  });
});
