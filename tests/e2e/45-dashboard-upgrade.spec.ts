import { test, expect } from '@playwright/test';

test.describe('Pengembangan & Pembaharuan Dashboard MADINA Blokagung (/dashboard)', () => {
  test('Menghapus ikon bintang pada judul, menampilkan lencana Masehi/Pasaran/Hijriyah, serta menampilkan widget Kalender Kegiatan, PKM Sapras, Catatan To-Do Interaktif, dan 8 Aksi Cepat', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // 1. Buka halaman Dashboard MADINA Blokagung
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    const mainHeading = page.getByTestId('dashboard-main-heading');
    await expect(mainHeading).toBeVisible({ timeout: 35000 });
    await expect(mainHeading).toHaveText('Dashboard MADINA Blokagung');

    // 2. Pastikan ikon bintang (Sparkles svg) di dalam judul h1 sudah dihapus bersih
    const svgCountInHeading = await mainHeading.locator('svg').count();
    expect(svgCountInHeading).toBe(0);

    // 3. Pastikan Lencana Penanggalan Terpadu (Masehi + Pasaran Jawa + Hijriyah) tampil di header (Opsi A)
    const dateBadge = page.getByTestId('dashboard-header-date-badge');
    await expect(dateBadge).toBeVisible();
    await expect(dateBadge).toContainText('H');

    // 4. Pastikan Widget 1: Kalender Kegiatan & Agenda tampil dan mendukung switch Masehi / Hijriyah
    const widgetKalender = page.getByTestId('dashboard-widget-kalender');
    await expect(widgetKalender).toBeVisible();
    await expect(widgetKalender).toContainText('Kalender Kegiatan & Agenda');

    const btnHijriyah = page.getByTestId('dashboard-kalender-switch-hijriyah');
    const btnMasehi = page.getByTestId('dashboard-kalender-switch-masehi');
    await btnHijriyah.click();
    await expect(widgetKalender).toContainText('Bertepatan:');
    await btnMasehi.click();

    // 5. Pastikan Widget 2: Kesehatan Sarana Kelas (PKM. Sapras) tampil lengkap
    const widgetSapras = page.getByTestId('dashboard-widget-sapras');
    await expect(widgetSapras).toBeVisible();
    await expect(widgetSapras).toContainText(
      'Kesehatan Sarana Kelas (PKM. Sapras)'
    );
    await expect(widgetSapras).toContainText('Papan Tulis');
    await expect(widgetSapras).toContainText('Meja Guru');
    await expect(widgetSapras).toContainText(
      'Antrean Tiket Perbaikan Sarana'
    );
    await expect(widgetSapras).toContainText(
      'Stok Logistik & ATK Papan Tulis'
    );

    // 6. Pastikan Widget 3: Catatan & To-Do List Aktif mendukung tambah tugas cepat & centang langsung di Dashboard (Opsi A)
    const widgetCatatan = page.getByTestId('dashboard-widget-catatan');
    await expect(widgetCatatan).toBeVisible();
    await expect(widgetCatatan).toContainText('Catatan & To-Do List Aktif');

    const quickTodoInput = page.getByTestId('dashboard-quick-todo-input');
    const quickTodoSubmit = page.getByTestId('dashboard-quick-todo-submit');
    await quickTodoInput.fill('Verifikasi Sapras & Kalender dari Dashboard');
    await quickTodoSubmit.click();
    await expect(widgetCatatan).toContainText(
      'Verifikasi Sapras & Kalender dari Dashboard'
    );

    // Uji tab Catatan Disematkan (Pinned)
    await page.getByTestId('dashboard-catatan-tab-pinned').click();
    await expect(widgetCatatan).toContainText(
      'Panduan Keamanan Sesi & Pembaruan Protokol WhatsApp Gateway'
    );
    await page.getByTestId('dashboard-catatan-tab-todo').click();

    // 7. Pastikan Pintasan Setor Mustahiq & Kirim WA Rapor tampil di Muhafadzoh Widget & 8 Aksi Cepat tampil di QuickActionHub
    await expect(
      page.getByTestId('dashboard-muhafadzoh-setor-mustahiq')
    ).toBeVisible();
    await expect(
      page.getByTestId('dashboard-muhafadzoh-kirim-wa')
    ).toBeVisible();

    const quickActionHub = page.getByTestId('dashboard-quick-action-hub');
    await expect(quickActionHub).toBeVisible();
    await expect(quickActionHub).toContainText('Presensi Cepat');
    await expect(quickActionHub).toContainText('Kalender Kegiatan');
    await expect(quickActionHub).toContainText('Setor Mustahiq & Barcode');
    await expect(quickActionHub).toContainText('Kirim WA Rapor Hafalan');
    await expect(quickActionHub).toContainText('Inventaris & Sapras');
    await expect(quickActionHub).toContainText('Catatan & To-Do List');
    await expect(quickActionHub).toContainText('Absen Konsorsium');
    await expect(quickActionHub).toContainText('Jadwal & Solver KBM');
  });
});
