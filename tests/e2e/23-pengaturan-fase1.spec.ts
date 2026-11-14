import { test, expect } from '@playwright/test';

test.describe('Fase 1: Restrukturisasi Navigasi & Hub Menu Pengaturan', () => {
  test.beforeEach(async ({ page }) => {
    // Reset localStorage jika ada sisa modifikasi sebelumnya
    await page.addInitScript(() => {
      window.localStorage.removeItem('madina_sidebar_config_v1');
    });
  });

  test('1. Sidebar Desktop menghapus grup Pengaturan dan menyisakan tombol footer Pengaturan', async ({ page }) => {
    await page.goto('/santri');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/santri**', { timeout: 60000 });
    }
    const sidebar = page.getByRole('complementary');
    await expect(sidebar).toBeVisible();

    // Verifikasi teks PUSAT SISTEM dan grup Publikasi & Warta
    await expect(sidebar.getByText('PUSAT SISTEM')).toBeVisible();
    await expect(sidebar.getByText(/Publikasi & Warta/i)).toBeVisible();

    const fullTextUpper = (await sidebar.innerText()).toUpperCase();
    // Grup Pengaturan (dengan sub-menu Tahun Ajaran Aktif dll.) sudah dihapus dari sidebar
    expect(fullTextUpper.indexOf('PROFIL MADRASAH')).toBe(-1);
    expect(sidebar.getByRole('link', { name: /Tahun Ajaran Aktif/i })).toHaveCount(0);

    // Tombol footer Pengaturan tetap ada di bagian bawah sidebar
    const footerSettings = sidebar.locator('a[href="/pengaturan"]').last();
    await expect(footerSettings).toBeVisible();
    await expect(footerSettings).toContainText(/Pengaturan/i);
  });

  test('2. Dropdown profil Navbar ringkas tanpa blok sub-item Pengaturan', async ({ page }) => {
    await page.goto('/santri');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/santri**', { timeout: 60000 });
    }

    // Buka dropdown Menu Profil di pojok kanan atas
    const profileBtn = page.getByRole('button', { name: /Master Administrator/i });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Dropdown terbuka
    const menu = page.getByRole('menu');
    await expect(menu.getByText('Master Administrator')).toBeVisible();

    // Sub-item Pengaturan di dropdown sudah dihapus
    await expect(menu.getByRole('button', { name: /Pusat Kendali Admin/i })).toHaveCount(0);
    await expect(menu.getByRole('button', { name: /Log Aktivitas Sistem/i })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: /Ubah Sidebar & Menu/i })).toHaveCount(0);

    // Tombol Keluar / Logout tetap ada
    await expect(menu.getByRole('button', { name: /Keluar \/ Logout/i })).toBeVisible();
  });

  test('3. Navigasi ke /pengaturan memuat Hub Pengaturan dengan label Atur Hierarki', async ({ page }) => {
    await page.goto('/pengaturan');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/pengaturan**', { timeout: 60000 });
    }

    // 1. Header Hub Pengaturan & tombol Atur Hierarki (dulu Pusat Kendali Modal)
    await expect(page.getByRole('heading', { name: /Pengaturan Sistem Madina Blokagung/i })).toBeVisible();
    await expect(page.getByTestId('btn-open-hierarchy-modal')).toContainText('Atur Hierarki');

    // 2. Tab Navigation (tab-hierarki sekarang bernama Atur Hierarki)
    await expect(page.getByTestId('tab-overview')).toBeVisible();
    await expect(page.getByTestId('tab-sidebar')).toBeVisible();
    await expect(page.getByTestId('tab-hierarki')).toContainText('Atur Hierarki');
    await expect(page.getByTestId('tab-audit')).toBeVisible();
    await expect(page.getByTestId('tab-akademik')).toBeVisible();
    await expect(page.getByTestId('tab-muhafadzoh')).toBeVisible();

    // 3. Overview Cards
    await expect(page.getByRole('heading', { name: 'Atur Hierarki' })).toBeVisible();
    await expect(page.getByText('Ubah Sidebar & Menu').first()).toBeVisible();
    await expect(page.getByText('Log Aktivitas Sistem').first()).toBeVisible();
    await expect(page.getByText('Aturan KBM & Hari Libur').first()).toBeVisible();
    await expect(page.getByText('Aturan Target Muhafadzoh').first()).toBeVisible();
    await expect(page.getByText('Format & Template Piagam').first()).toBeVisible();

    // Buka Tab Ubah Sidebar
    await page.getByTestId('tab-sidebar').click();
    await page.waitForURL('**/pengaturan?tab=sidebar');
    await expect(page).toHaveURL(/tab=sidebar/);
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();
  });

  test('4. Sub-menu Ubah Sidebar dapat mengubah nama grup dan tercermin langsung pada sidebar', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText(/Utama/i)).toBeVisible();

    // Klik edit pada grup 'Utama'
    const editBtnUtama = page.getByTestId('btn-edit-group-grp-utama');
    await editBtnUtama.click();

    // Isi nama baru dan simpan
    const inputGroup = page.getByTestId('input-group-grp-utama');
    await expect(inputGroup).toBeVisible();
    await inputGroup.fill('DATA POKOK MADIN');

    const saveBtn = page.getByTestId('btn-save-group-grp-utama');
    await saveBtn.click();

    // Verifikasi pesan konfirmasi
    await expect(page.getByText(/Nama grup diperbarui menjadi "DATA POKOK MADIN"/i)).toBeVisible();

    // Verifikasi teks langsung berubah pada Sidebar Desktop
    await expect(sidebar.getByText(/DATA POKOK MADIN/i)).toBeVisible();

    // Test Fail-safe: Reset ke Standar
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('btn-reset-sidebar').click();

    // Sidebar kembali menampilkan nama standar 'Utama'
    await expect(sidebar.getByText(/Utama/i)).toBeVisible();
  });

  test('5. Sub-menu Ubah Sidebar dapat memindahkan urutan grup (Reorder Naik/Turun)', async ({ page }) => {
    await page.goto('/pengaturan?tab=sidebar');
    await expect(page.getByTestId('sidebar-editor-container')).toBeVisible();

    const sidebar = page.getByRole('complementary');

    // Awalnya Beranda berada sebelum Utama
    let textBeforeUpper = (await sidebar.innerText()).toUpperCase();
    let idxBeranda = textBeforeUpper.indexOf('BERANDA');
    let idxUtama = textBeforeUpper.indexOf('UTAMA');
    expect(idxBeranda).toBeGreaterThan(-1);
    expect(idxUtama).toBeGreaterThan(-1);
    expect(idxBeranda).toBeLessThan(idxUtama);

    // Geser grup Utama ke atas (up)
    const moveUpUtama = page.getByTestId('btn-move-group-up-grp-utama');
    await moveUpUtama.click();

    // Setelah dipindah, Utama harus berada di atas Beranda di sidebar
    await expect(async () => {
      const textAfterUpper = (await sidebar.innerText()).toUpperCase();
      const newIdxBeranda = textAfterUpper.indexOf('BERANDA');
      const newIdxUtama = textAfterUpper.indexOf('UTAMA');
      expect(newIdxUtama).toBeLessThan(newIdxBeranda);
    }).toPass({ timeout: 5000 });

    // Reset kembali ke konfigurasi standar
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('btn-reset-sidebar').click();

    // Pastikan susunan kembali normal (Beranda sebelum Utama)
    await expect(async () => {
      const resetTextUpper = (await sidebar.innerText()).toUpperCase();
      expect(resetTextUpper.indexOf('BERANDA')).toBeLessThan(resetTextUpper.indexOf('UTAMA'));
    }).toPass({ timeout: 5000 });
  });

  test('6. Master Admin dapat membuka Modal User Aktif dari header Pengaturan', async ({ page }) => {
    await page.goto('/pengaturan');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await page.waitForURL('**/pengaturan**', { timeout: 60000 });
    }

    const activeUsersBtn = page.getByTestId('btn-open-active-users-modal');
    await expect(activeUsersBtn).toBeVisible();
    await activeUsersBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Monitoring User Aktif & Perangkat')).toBeVisible();
    await expect(dialog.getByText('User Online')).toBeVisible();
    await expect(dialog.getByText('Total Perangkat')).toBeVisible();
    await expect(dialog.getByText('Perangkat Ini').first()).toBeVisible({ timeout: 10000 });

    await dialog.getByRole('button', { name: /Tutup/i }).first().click();
    await expect(dialog).toBeHidden();
  });

  test('7. Master Admin dapat mengeluarkan perangkat lain secara remote dari Modal User Aktif', async ({ browser }) => {
    const adminContext = await browser.newContext();
    const secondContext = await browser.newContext();

    try {
      const adminPage = await adminContext.newPage();
      const secondPage = await secondContext.newPage();

      // Login di perangkat 1 (Master Admin)
      await adminPage.goto('/pengaturan');
      if (adminPage.url().includes('/login')) {
        await adminPage.getByLabel('Username Pengurus').fill('admin');
        await adminPage.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await adminPage.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await adminPage.waitForURL('**/pengaturan**', { timeout: 60000 });
      }

      // Login di perangkat 2 (sesi terpisah)
      await secondPage.goto('/santri');
      if (secondPage.url().includes('/login')) {
        await secondPage.getByLabel('Username Pengurus').fill('admin');
        await secondPage.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await secondPage.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await secondPage.waitForURL('**/santri**', { timeout: 60000 });
      }

      // Tunggu ActivePresenceTracker menulis deviceId perangkat 2 ke localStorage
      await expect
        .poll(
          () => secondPage.evaluate(() => window.localStorage.getItem('madina_presence_device_id')),
          { timeout: 15000 }
        )
        .toBeTruthy();
      const secondDeviceId = await secondPage.evaluate(() =>
        window.localStorage.getItem('madina_presence_device_id')
      );
      expect(secondDeviceId).toBeTruthy();

      // Buka Modal User Aktif di perangkat 1
      await adminPage.getByTestId('btn-open-active-users-modal').click();
      const dialog = adminPage.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Tunggu sampai perangkat 2 terdeteksi dan tombol Keluarkan perangkat 2 muncul
      const kickBtn = dialog.getByTestId(`btn-kick-device-${secondDeviceId!.slice(0, 8)}`);
      await expect(kickBtn).toBeVisible({ timeout: 15000 });

      adminPage.once('dialog', (d) => d.accept());
      await kickBtn.click();

      // Perangkat 2 harus otomatis keluar ke /login?reason=kicked
      await secondPage.waitForURL(/\/login\?reason=kicked/, { timeout: 15000 });
      await expect(
        secondPage.getByText('Sesi Anda pada perangkat ini telah diakhiri oleh Master Administrator.')
      ).toBeVisible();
    } finally {
      await adminContext.close();
      await secondContext.close();
    }
  });
});
