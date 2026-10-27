import { test, expect } from '@playwright/test';

test.describe('E2E Absensi Asatidz & Absen Cepat (Waktu Pesantren & Alur Kerja)', () => {
  test('1.0 Absensi Asatidz: Header, KPI, dan Label Waktu Pesantren Jam 1..3 vs Jam 4', async ({ page }) => {
    await page.goto('/absensi');

    // Judul halaman & Subtitle
    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible();
    await expect(
      page.getByText('Pencatatan kehadiran mengajar harian (Jam Ke-1 s/d Jam Ke-4) terintegrasi Jadwal KBM')
    ).toBeVisible();

    // Toolbar aksi
    await expect(page.getByRole('button', { name: /Chat WA/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Libur \/ Event/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Segarkan/i })).toBeVisible();

    // 5 Kartu KPI
    await expect(page.getByText('Total Sesi Hari Ini')).toBeVisible();
    await expect(page.getByText('Hadir', { exact: true })).toBeVisible();
    await expect(page.getByText('Izin / Sakit')).toBeVisible();
    await expect(page.getByText('Alfa / Kosong')).toBeVisible();
    await expect(page.getByText('Terlambat / Ganti')).toBeVisible();

    // Tab switcher
    await expect(page.getByRole('button', { name: /Form Absensi Harian/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Riwayat & Rekap Data/i })).toBeVisible();

    // Verifikasi label waktu KBM Pesantren pada tiap Jam
    // Jam 1 s/d 3 harus berlabel "(Malam Sebelumnya)" dan Jam 4 berlabel "(Siang Hari)"
    const jam1Heading = page.locator('h2', { hasText: 'Daftar Pengajar Jam Ke-1' });
    const isJumatOrLibur = await page.getByText(/Libur Reguler|Diliburkan/i).isVisible();

    if (!isJumatOrLibur && (await jam1Heading.isVisible())) {
      const jam1Badge = page.locator('h2', { hasText: 'Daftar Pengajar Jam Ke-1' }).locator('..').getByText('(Malam Sebelumnya)');
      const jam2Badge = page.locator('h2', { hasText: 'Daftar Pengajar Jam Ke-2' }).locator('..').getByText('(Malam Sebelumnya)');
      const jam3Badge = page.locator('h2', { hasText: 'Daftar Pengajar Jam Ke-3' }).locator('..').getByText('(Malam Sebelumnya)');
      const jam4Badge = page.locator('h2', { hasText: 'Daftar Pengajar Jam Ke-4' }).locator('..').getByText('(Siang Hari)');

      await expect(jam1Badge).toBeVisible();
      await expect(jam2Badge).toBeVisible();
      await expect(jam3Badge).toBeVisible();
      await expect(jam4Badge).toBeVisible();
    }
  });

  test('2.0 Absensi Asatidz: Modal Libur / Event dan Modal Chat WA', async ({ page }) => {
    await page.goto('/absensi');

    // Buka Modal Libur / Event
    const btnLibur = page.getByRole('button', { name: /Libur \/ Event/i });
    await btnLibur.click();
    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur \/ Event/i })).toBeVisible();

    // Tutup Modal Libur
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur \/ Event/i })).not.toBeVisible();

    // Buka Modal Chat WA
    const btnWA = page.getByRole('button', { name: /Chat WA/i });
    await btnWA.click();
    await expect(page.getByRole('heading', { name: /Generator Laporan WhatsApp/i })).toBeVisible();

    // Tutup Modal Chat WA
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Generator Laporan WhatsApp/i })).not.toBeVisible();
  });

  test('3.0 Absen Cepat: Mode Ringkas Berbasis Blok & Sinkronisasi Waktu Pesantren', async ({ page }) => {
    await page.goto('/absen-cepat');

    // Header & Subtitle
    await expect(page.getByRole('heading', { name: 'Absen Cepat', exact: true })).toBeVisible();
    await expect(page.getByText('Mode presensi ringkas dikelompokkan per Blok Kelas')).toBeVisible();

    // Toolbar Notif & Tab Jam
    await expect(page.getByRole('button', { name: /Notif/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tandai Semua Hadir/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simpan Jam Ini/i })).toBeVisible();

    // Tab Jam 1 aktif secara default dan berlabel "(Malam Sebelumnya)"
    const isJumatOrLibur = await page.getByText(/Libur Reguler|Diliburkan/i).isVisible();
    if (!isJumatOrLibur) {
      await expect(page.getByText('(Malam Sebelumnya)')).toBeVisible();

      // Beralih ke Jam Ke-4
      const btnJam4 = page.locator('button', { hasText: '4' }).first();
      await btnJam4.click();

      // Verifikasi Jam Ke-4 berganti label ke "(Siang Hari)"
      await expect(page.getByText('(Siang Hari)')).toBeVisible();

      // Beralih kembali ke Jam Ke-1
      const btnJam1 = page.locator('button', { hasText: '1' }).first();
      await btnJam1.click();
      await expect(page.getByText('(Malam Sebelumnya)')).toBeVisible();
    }

    // Buka Modal Notifikasi Blok
    const btnNotif = page.getByRole('button', { name: /Notif/i });
    await btnNotif.click();
    await expect(page.getByRole('heading', { name: /Monitoring & Notifikasi Absensi Per Blok/i })).toBeVisible();

    // Tutup Modal Notifikasi
    const btnTutupNotif = page.getByRole('button', { name: /Tutup modal/i }).first();
    if (await btnTutupNotif.isVisible()) {
      await btnTutupNotif.click();
    }
  });

  test('4.0 Absensi Asatidz: Tab Riwayat & Rekap Data', async ({ page }) => {
    await page.goto('/absensi');

    // Beralih ke Tab Riwayat & Rekap Data
    const tabRiwayat = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await tabRiwayat.click();

    // Kontrol Filter Riwayat
    await expect(page.getByPlaceholder(/Cari Nama Asatidz/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak/i })).toBeVisible();
  });
});
