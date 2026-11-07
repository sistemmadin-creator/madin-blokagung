import { test, expect, Page } from '@playwright/test';

async function gotoWithAuth(page: Page, targetPath: string) {
  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');
  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });
  }
}

test.describe('E2E Absensi Asatidz & Absen Cepat (Waktu Pesantren & Alur Kerja)', () => {
  test.setTimeout(90000);

  test('1.0 Absensi Asatidz: Header, KPI, dan Label Waktu Pesantren Jam 1..3 vs Jam 4', async ({ page }) => {
    await gotoWithAuth(page, '/absensi');

    // Judul halaman & Subtitle
    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible({ timeout: 25000 });
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
    const isJumatOrLibur = await page.getByText(/Libur Reguler|Diliburkan/i).first().isVisible();

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
    await gotoWithAuth(page, '/absensi');

    // Buka Modal Libur / Event
    const btnLibur = page.getByRole('button', { name: /Libur \/ Event/i });
    await expect(btnLibur).toBeVisible({ timeout: 25000 });
    await btnLibur.click();
    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur \/ Event/i })).toBeVisible();

    // Tutup Modal Libur
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Pengaturan Hari Libur \/ Event/i })).not.toBeVisible();

    // Buka Modal Chat WA
    const btnWA = page.getByRole('button', { name: /Chat WA/i });
    await btnWA.click();
    await expect(page.getByRole('heading', { name: /Generator Laporan (Absensi )?WhatsApp/i })).toBeVisible();

    // Tutup Modal Chat WA
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Generator Laporan (Absensi )?WhatsApp/i })).not.toBeVisible();
  });

  test('3.0 Absen Cepat: Mode Ringkas Berbasis Blok & Sinkronisasi Waktu Pesantren', async ({ page }) => {
    await gotoWithAuth(page, '/absen-cepat');

    // Header & Subtitle
    await expect(page.getByRole('heading', { name: 'Absen Cepat', exact: true })).toBeVisible({ timeout: 25000 });
    await expect(page.getByText('Mode presensi ringkas dikelompokkan per Blok Kelas')).toBeVisible();

    // Toolbar Notif & Tab Jam
    await expect(page.getByRole('button', { name: 'Notif', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tandai Semua Hadir/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Simpan Jam Ini/i })).toBeVisible();

    // Tab Jam 1 aktif secara default dan berlabel "(Malam Sebelumnya)"
    const isJumatOrLibur = await page.getByText(/Libur Reguler|Diliburkan/i).first().isVisible();
    if (!isJumatOrLibur) {
      await expect(page.getByText('(Malam Sebelumnya)')).toBeVisible();

      // Beralih ke Jam Ke-4
      const btnJam4 = page.getByRole('button', { name: 'Jam Ke-4' });
      await btnJam4.click();

      // Verifikasi Jam Ke-4 berganti label ke "(Siang Hari)"
      await expect(page.getByText('(Siang Hari)')).toBeVisible();

      // Beralih kembali ke Jam Ke-1
      const btnJam1 = page.getByRole('button', { name: 'Jam Ke-1' });
      await btnJam1.click();
      await expect(page.getByText('(Malam Sebelumnya)')).toBeVisible();
    }

    // Buka Modal Notifikasi Blok
    const btnNotif = page.getByRole('button', { name: 'Notif', exact: true });
    await btnNotif.click();
    await expect(page.getByRole('heading', { name: /Monitoring & Notifikasi Absensi Per Blok/i })).toBeVisible();

    // Tutup Modal Notifikasi
    const btnTutupNotif = page.getByRole('button', { name: /Tutup modal/i }).first();
    if (await btnTutupNotif.isVisible()) {
      await btnTutupNotif.click();
    }
  });

  test('4.0 Absensi Asatidz: Tab Riwayat & Rekap Data', async ({ page }) => {
    await gotoWithAuth(page, '/absensi');

    // Beralih ke Tab Riwayat & Rekap Data
    const tabRiwayat = page.getByRole('button', { name: /Riwayat & Rekap Data/i });
    await expect(tabRiwayat).toBeVisible({ timeout: 25000 });
    await tabRiwayat.click();

    // Kontrol Filter Riwayat
    await expect(page.getByPlaceholder(/Cari Nama Asatidz/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak/i })).toBeVisible();
  });

  test('5.0 Absen Cepat: Modal Penetapan Presensi Massal (Inspirasi LPTQ)', async ({ page }) => {
    await gotoWithAuth(page, '/absen-cepat');

    await expect(page.getByRole('heading', { name: 'Absen Cepat', exact: true })).toBeVisible({ timeout: 25000 });

    // Tunggu hingga data sesi KBM termuat
    await expect(page.getByText(/dari [1-9]\d* Sesi/i).first()).toBeVisible({ timeout: 20000 });

    // 1. Verifikasi Tombol Presensi Massal di Toolbar Jam Aktif
    const btnBulk = page.getByRole('button', { name: /Presensi Massal/i });
    await expect(btnBulk).toBeVisible();
    await btnBulk.click();

    // 2. Verifikasi Dialog Modal Penetapan Presensi Massal
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Penetapan Presensi Massal' })).toBeVisible();
    await expect(
      modal.getByText('Pilih asatidz untuk menetapkan atau mengubah status presensi sekaligus')
    ).toBeVisible();

    // 3. Verifikasi Tombol Target Status (H = Hadir, I = Izin, S = Sakit, A = Alfa, L = Tugas)
    await expect(modal.getByRole('button', { name: /H = Hadir/i }).first()).toBeVisible();
    const btnTargetIzin = modal.getByRole('button', { name: /I = Izin/i }).first();
    await expect(btnTargetIzin).toBeVisible();
    await expect(modal.getByRole('button', { name: /S = Sakit/i }).first()).toBeVisible();
    await expect(modal.getByRole('button', { name: /A = Alfa/i }).first()).toBeVisible();
    await expect(modal.getByRole('button', { name: /L = Tugas/i }).first()).toBeVisible();

    // Beralih ke Target Izin
    await btnTargetIzin.click();

    // 4. Verifikasi Pencarian Asatidz di dalam Modal
    const searchInput = modal.getByPlaceholder(/Cari asatidz \/ kelas \/ fan/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Fikrul');
    const matchCount = await modal.getByText(/Fikrul/i).count();
    if (matchCount > 0) {
      await expect(modal.getByText(/Fikrul/i).first()).toBeVisible();
    }
    await searchInput.fill('');

    // 5. Verifikasi Tombol Pilih Semua
    const btnSelectAll = modal.getByRole('button', { name: /Pilih Semua/i });
    await expect(btnSelectAll).toBeVisible();
    await expect(modal.getByRole('button', { name: /Pilih Semua \([1-9]\d*\)/i })).toBeVisible({ timeout: 15000 });
    await btnSelectAll.click();

    // Tombol eksekusi harus aktif dengan teks IZIN (N)
    const btnApply = modal.getByTestId('btn-apply-presensi-massal');
    await expect(btnApply).toBeVisible();
    await expect(btnApply).toBeEnabled();
    await expect(btnApply).toContainText(/Terapkan IZIN/i);

    // Batalkan pilihan semua
    await btnSelectAll.click();
    await expect(modal.getByText(/Terpilih: 0 dari/i)).toBeVisible();
    await expect(btnApply).toBeDisabled();

    // 6. Uji Pilih 1 Baris Tabel
    const firstRow = modal.locator('tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await expect(modal.getByText(/Terpilih: 1 dari/i)).toBeVisible();
      await expect(btnApply).toBeEnabled();
    }

    // 7. Tutup Dialog (Batal)
    await modal.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modal).not.toBeVisible();
  });

  test('6.0 Absen Cepat: Urutan Grup Blok Resmi & Kontrol Pagination', async ({ page }) => {
    await gotoWithAuth(page, '/absen-cepat');

    // Tunggu data sesi termuat
    await expect(page.getByText(/dari [1-9]\d* Sesi/i).first()).toBeVisible({ timeout: 20000 });

    // 1. Verifikasi Urutan Blok: Blok Induk Putra harus muncul lebih awal daripada Blok 4
    const blockBanners = page.getByTestId('group-blok-header');
    await expect(blockBanners.first()).toBeVisible();

    const firstBannerText = await blockBanners.first().innerText();
    expect(firstBannerText.toUpperCase()).toContain('BLOK INDUK PUTRA');

    // 2. Verifikasi Kelas Teratas di dalam Blok Induk Putra adalah 1 A ULA (PA)
    const firstClassBadge = page.getByTestId('badge-kelas-cepat').first();
    const firstClassText = await firstClassBadge.innerText();
    expect(firstClassText).toContain('1 A ULA');

    // 3. Verifikasi Keberadaan Dropdown PageSize Pagination
    const pageSizeSelect = page.locator('select').filter({ hasText: /25 Sesi \/ Hal/i });
    await expect(pageSizeSelect).toBeVisible();

    // 4. Verifikasi Navigasi Pagination
    const btnBerikutnya = page.getByRole('button', { name: 'Berikutnya', exact: true });
    if (await btnBerikutnya.isVisible()) {
      await expect(page.getByText(/Halaman 1 dari/i)).toBeVisible();
      await btnBerikutnya.click();
      await expect(page.getByText(/Halaman 2 dari/i)).toBeVisible();

      const btnSebelumnya = page.getByRole('button', { name: 'Sebelumnya', exact: true });
      await btnSebelumnya.click();
      await expect(page.getByText(/Halaman 1 dari/i)).toBeVisible();
    }
  });

  test('7.0 Absen Cepat Mobile (Gambar 1-4): Smooth Swipe, Tombol Terapkan Di Atas Navbar HP, Tabel Kompak 6 Kolom, dan Elevasi Keyboard Pencarian', async ({
    page,
  }) => {
    // Gunakan ukuran layar ponsel (390x844) seperti pada Gambar 2, 3, dan 4
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoWithAuth(page, '/absen-cepat');

    await expect(page.getByRole('heading', { name: 'Absen Cepat', exact: true })).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/dari [1-9]\d* Sesi/i).first()).toBeVisible({ timeout: 20000 });

    // 1. Verifikasi panel memiliki animasi transisi smooth (Gambar 1)
    const jamPanel = page.getByTestId('absen-cepat-jam-panel');
    await expect(jamPanel).toBeVisible();

    // 2. Buka Modal Penetapan Presensi Massal di Mode HP (Gambar 2 & 3)
    await page.getByRole('button', { name: /Presensi Massal/i }).click();

    const modalOverlay = page.getByTestId('modal-presensi-massal-overlay');
    await expect(modalOverlay).toBeVisible();

    // Pastikan z-index modal (70) lebih tinggi daripada BottomNavMobile (40) sehingga tidak tertutup navbar HP
    const overlayZIndex = await modalOverlay.evaluate((el) => Number(window.getComputedStyle(el).zIndex));
    expect(overlayZIndex).toBeGreaterThanOrEqual(70);

    // 3. Verifikasi Tabel Kompak 6 Kolom di Mode HP (Gambar 3)
    const table = page.getByTestId('table-presensi-massal');
    await expect(table).toBeVisible();
    const headerCount = await table.locator('thead th').count();
    expect(headerCount).toBe(6);

    const firstRowBox = await table.locator('tbody tr').first().boundingBox();
    expect(firstRowBox).not.toBeNull();
    // Baris kompak di mode HP memiliki tinggi padat (<= 44px) agar muat banyak baris sekaligus seperti Gambar 3
    expect(firstRowBox!.height).toBeLessThanOrEqual(44);

    // 4. Verifikasi Penyesuaian Otomatis Popup Naik ke Atas Saat Fokus Pencarian / Keyboard Muncul (Gambar 4)
    const searchInput = page.getByTestId('input-search-presensi-massal');
    await searchInput.focus();
    await expect(modalOverlay).toHaveAttribute('data-keyboard-elevated', 'true');

    await searchInput.fill('ULA');
    const searchedFirstRow = table.locator('tbody tr').first();
    await expect(searchedFirstRow).toBeVisible();

    // 5. Pilih baris hasil pencarian, pilih target status Alfa, dan klik tombol Terapkan (Gambar 2 & 4)
    await searchedFirstRow.click();

    // Pilih Jam 2 dan Status Target Alfa di dalam modal
    await modalOverlay.getByRole('button', { name: 'Jam 2', exact: true }).click();
    await searchInput.fill('');
    await table.locator('tbody tr').first().click();

    // Pilih A = Alfa (gunakan locator yang visible di mobile)
    await modalOverlay.locator('button:visible', { hasText: 'A = Alfa' }).first().click();

    const btnApply = page.getByTestId('btn-apply-presensi-massal');
    await expect(btnApply).toBeVisible();
    await expect(btnApply).toBeEnabled();
    await expect(btnApply).toContainText('Terapkan ALFA (1)');

    // Klik langsung tombol Terapkan (memastikan tidak terhalang oleh BottomNavMobile)
    await btnApply.click();
    await expect(modalOverlay).toBeHidden();

    // 6. Halaman utama Absen Cepat otomatis tersinkron ke Jam Ke-2 dan menampilkan indikator perubahan belum disimpan
    await expect(
      page.getByRole('heading', { name: 'Daftar Pengajar Jam Ke-2' })
    ).toBeVisible();
    await expect(page.getByTestId('badge-unsaved-changes')).toContainText(
      '1 perubahan belum disimpan'
    );
  });
});
