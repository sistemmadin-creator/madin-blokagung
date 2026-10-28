import { test, expect } from '@playwright/test';

test.describe('Fase 1: Executive Dashboard & Navigation Placement', () => {
  test('sidebar renders Dashboard menu above UTAMA group with Live badge', async ({ page }) => {
    await page.goto('/santri');
    await expect(page.getByRole('complementary')).toBeVisible();

    const sidebar = page.getByRole('complementary');

    // Verifikasi grup 'BERANDA' dan menu 'Dashboard'
    const dashboardLink = sidebar.getByRole('link', { name: /Dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await expect(sidebar.getByText(/Live/i)).toBeVisible();

    // Verifikasi posisi Dashboard berada sebelum / di atas grup 'Utama'
    const fullText = await sidebar.innerText();
    const dashboardIndex = fullText.indexOf('Dashboard');
    const utamaIndex = fullText.indexOf('Data Santri');
    expect(dashboardIndex).toBeGreaterThan(-1);
    expect(utamaIndex).toBeGreaterThan(-1);
    expect(dashboardIndex).toBeLessThan(utamaIndex);

    // Navigasi ke Dashboard via klik menu di sidebar
    await dashboardLink.click();
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('dashboard page renders executive header, live KBM banner, and operational cards', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Header & Identitas
    await expect(page.getByRole('heading', { name: /Dashboard MADINA Blokagung/i })).toBeVisible();
    await expect(page.getByText(/Pusat Kendali Eksekutif/i)).toBeVisible();

    // 2. Filter Waktu (Time-Slice Tabs)
    const timeTabs = ['Hari Ini', '7 Hari', '30 Hari', '1 Tahun'];
    for (const tab of timeTabs) {
      await expect(page.getByRole('button', { name: new RegExp(tab, 'i') })).toBeVisible();
    }

    // 3. Live KBM Status Banner
    await expect(page.getByText(/Live KBM Hari Ini/i)).toBeVisible();
    await expect(page.getByText(/Rombel Terisi Asatidz/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Presensi Cepat/i }).first()).toBeVisible();

    // 4. Empat KPI Hero Cards
    await expect(page.getByText(/Total Santri Aktif/i)).toBeVisible();
    await expect(page.getByText(/Kehadiran Asatidz/i)).toBeVisible();
    await expect(page.getByText(/Aktivitas Muhafadzoh/i)).toBeVisible();
    await expect(page.getByText(/Formasi Rombel & KBM/i)).toBeVisible();

    // 5. Visualisasi Charts & Widgets
    await expect(page.getByRole('heading', { name: /Tren Kehadiran & Kedisiplinan Asatidz/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Ketuntasan Muhafadzoh Nadzom/i })).toBeVisible();

    // Verifikasi jenjang hafalan
    await expect(page.getByText(/Tingkat Ula/i).first()).toBeVisible();
    await expect(page.getByText(/Tingkat Wustho/i).first()).toBeVisible();
    await expect(page.getByText(/Tingkat Ulya/i).first()).toBeVisible();

    // 6. Pusat Aksi Cepat
    await expect(page.getByRole('heading', { name: /Pusat Aksi Cepat Operasional/i })).toBeVisible();

    // 7. Denyut Aktivitas Lapangan
    await expect(page.getByRole('heading', { name: /Denyut Aktivitas Lapangan/i })).toBeVisible();
  });

  test('time-slice switcher toggles between 7 Hari, 30 Hari, and 1 Tahun cleanly', async ({ page }) => {
    await page.goto('/dashboard');

    // Klik tab 7 Hari
    const tab7Hari = page.getByRole('button', { name: /7 Hari/i });
    await tab7Hari.click();
    await expect(page.getByText(/rentang seminggu/i)).toBeVisible();

    // Klik tab 30 Hari
    const tab30Hari = page.getByRole('button', { name: /30 Hari/i });
    await tab30Hari.click();
    await expect(page.getByText(/rentang sebulan/i)).toBeVisible();

    // Klik tab 1 Tahun
    const tab1Tahun = page.getByRole('button', { name: /1 Tahun/i });
    await tab1Tahun.click();
    await expect(page.getByText(/rentang setahun/i)).toBeVisible();

    // Kembali ke tab Hari Ini
    const tabHariIni = page.getByRole('button', { name: /Hari Ini/i });
    await tabHariIni.click();
    await expect(page.getByText(/rentang hari ini/i)).toBeVisible();
  });

  test('quick action buttons have valid links', async ({ page }) => {
    await page.goto('/dashboard');

    const absenLink = page.getByRole('link', { name: /Presensi Cepat/i }).first();
    await expect(absenLink).toHaveAttribute('href', '/absen-cepat');

    const setoranLink = page.getByRole('link', { name: /Setoran Muhafadzoh/i });
    await expect(setoranLink).toHaveAttribute('href', '/setoran');

    const jadwalLink = page.getByRole('link', { name: /Jadwal & Solver KBM/i });
    await expect(jadwalLink).toHaveAttribute('href', '/jadwal-kbm');

    const wartaLink = page.getByRole('link', { name: /Publikasi Warta/i });
    await expect(wartaLink).toHaveAttribute('href', '/kelola-berita');
  });
});
