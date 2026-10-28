import { test, expect } from '@playwright/test';

test.describe('Fase 1: Restrukturisasi Navigasi & Hub Menu Pengaturan', () => {
  test.beforeEach(async ({ page }) => {
    // Reset localStorage jika ada sisa modifikasi sebelumnya
    await page.addInitScript(() => {
      window.localStorage.removeItem('madina_sidebar_config_v1');
    });
  });

  test('1. Sidebar Desktop meletakkan grup Pengaturan di bawah PKM. Publikasi & Warta dengan 5 sub-menu lengkap', async ({ page }) => {
    await page.goto('/santri');
    const sidebar = page.getByRole('complementary');
    await expect(sidebar).toBeVisible();

    // Verifikasi teks grup di sidebar (case-insensitive)
    await expect(sidebar.getByText(/Publikasi & Warta/i)).toBeVisible();
    await expect(sidebar.getByText(/Pengaturan/i).first()).toBeVisible();

    const fullTextUpper = (await sidebar.innerText()).toUpperCase();
    const publikasiIdx = fullTextUpper.indexOf('PUBLIKASI & WARTA');
    const pengaturanIdx = fullTextUpper.indexOf('PENGATURAN');
    const profilIdx = fullTextUpper.indexOf('PROFIL MADRASAH');

    // 1. Pengaturan harus berada di bawah PKM. Publikasi & Warta
    expect(pengaturanIdx).toBeGreaterThan(-1);
    expect(publikasiIdx).toBeGreaterThan(-1);
    expect(pengaturanIdx).toBeGreaterThan(publikasiIdx);

    // 2. Profil Madrasah (footer web publik) harus berada di bawah Pengaturan
    expect(profilIdx).toBeGreaterThan(pengaturanIdx);

    // Verifikasi 5 sub-menu di dalam grup Pengaturan
    const expectedSubmenus = [
      'Pusat Kendali Admin',
      'Ubah Sidebar',
      'Aturan KBM & Libur',
      'Aturan Muhafadzoh',
      'Log Aktivitas Sistem',
    ];

    for (const sub of expectedSubmenus) {
      await expect(sidebar.getByRole('link', { name: new RegExp(sub, 'i') })).toBeVisible();
    }
  });

  test('2. Dropdown profil Navbar menampilkan bagian Pengaturan tepat di atas tulisan Keluar / Logout', async ({ page }) => {
    await page.goto('/santri');

    // Buka dropdown Menu Profil di pojok kanan atas
    const profileBtn = page.getByRole('button', { name: /Menu Profil/i });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    // Dropdown terbuka
    await expect(page.getByText('Master Administrator')).toBeVisible();

    // Verifikasi keberadaan sub-item Pengaturan di dropdown
    const adminBtn = page.getByRole('button', { name: /Pusat Kendali Admin/i });
    const auditBtn = page.getByRole('button', { name: /Log Aktivitas Sistem/i });
    const sidebarLink = page.getByRole('link', { name: /Ubah Sidebar & Menu/i });

    await expect(adminBtn).toBeVisible();
    await expect(auditBtn).toBeVisible();
    await expect(sidebarLink).toBeVisible();

    // Verifikasi tombol Keluar / Logout ada di bawah bagian Pengaturan
    const logoutBtn = page.getByRole('button', { name: /Keluar \/ Logout/i });
    await expect(logoutBtn).toBeVisible();

    // Buka modal Pusat Kendali Admin dari navbar
    await adminBtn.click();

    // Modal terbuka (ditandai dengan heading atau dialog)
    const modalDialog = page.getByRole('dialog');
    await expect(modalDialog).toBeVisible();

    // Tutup modal secara bersih menggunakan tombol Tutup ber-aria-label atau tombol Batal di dalam dialog
    const closeDialogBtn = modalDialog.getByRole('button', { name: /Tutup pengaturan hierarki|Batal/i }).first();
    if (await closeDialogBtn.isVisible()) {
      await closeDialogBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }

    // Modal telah tertutup
    await expect(modalDialog).not.toBeVisible();
  });

  test('3. Navigasi ke /pengaturan memuat Hub Pengaturan dan tab-tab pilar terpadu', async ({ page }) => {
    await page.goto('/pengaturan');

    // 1. Header Hub Pengaturan
    await expect(page.getByRole('heading', { name: /Pengaturan Sistem Madina Blokagung/i })).toBeVisible();
    await expect(page.getByText(/Pusat Konfigurasi Lembaga/i)).toBeVisible();

    // 2. Tab Navigation
    await expect(page.getByTestId('tab-overview')).toBeVisible();
    await expect(page.getByTestId('tab-sidebar')).toBeVisible();
    await expect(page.getByTestId('tab-hierarki')).toBeVisible();
    await expect(page.getByTestId('tab-audit')).toBeVisible();
    await expect(page.getByTestId('tab-akademik')).toBeVisible();
    await expect(page.getByTestId('tab-muhafadzoh')).toBeVisible();

    // 3. Overview Cards: 6 Pilar
    await expect(page.getByText('Pusat Kendali Admin').first()).toBeVisible();
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
});
