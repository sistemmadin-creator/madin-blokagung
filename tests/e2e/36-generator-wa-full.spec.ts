import { test, expect } from '@playwright/test';

test.describe('E2E Generator Laporan Absensi WhatsApp (Migrasi Sesuai Referensi)', () => {
  test('1.0 Absen Cepat: Verifikasi Lengkap Modal Generator Laporan WA', async ({ page }) => {
    await page.goto('/absen-cepat');
    await expect(page.getByRole('heading', { name: 'Absen Cepat', exact: true })).toBeVisible();

    // Tunggu data sesi termuat
    await expect(page.getByText(/dari [1-9]\d* Sesi/i).first()).toBeVisible({ timeout: 20000 });

    // Buka modal Generator WA
    const btnWA = page.getByRole('button', { name: /Chat WA/i });
    await expect(btnWA).toBeVisible();
    await btnWA.click();

    // 1. Verifikasi Header Modal
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Generator Laporan Absensi WhatsApp' })).toBeVisible();

    // 2. Verifikasi Kontrol 1: Pilih Sesi Jam Laporan (Checkboxes)
    const cbDiniyyah = modal.getByLabel('Diniyyah (Jam 1 & 2)');
    const cbBandongan = modal.getByLabel('Bandongan & Syawir (Jam 3)');
    const cbTakror = modal.getByLabel('Takror (Jam 4)');

    await expect(cbDiniyyah).toBeVisible();
    await expect(cbBandongan).toBeVisible();
    await expect(cbTakror).toBeVisible();

    // Default: Diniyyah tercentang
    await expect(cbDiniyyah).toBeChecked();
    await expect(cbBandongan).not.toBeChecked();
    await expect(cbTakror).not.toBeChecked();

    // 3. Verifikasi Kontrol 2: Kategori Putra / Putri (Radio)
    const radioSemua = modal.getByRole('radio', { name: 'Semua' });
    const radioPA = modal.getByRole('radio', { name: 'Putra (PA)' });
    const radioPI = modal.getByRole('radio', { name: 'Putri (PI)' });

    await expect(radioSemua).toBeVisible();
    await expect(radioPA).toBeVisible();
    await expect(radioPI).toBeVisible();

    // Default: Semua terpilih
    await expect(radioSemua).toBeChecked();

    // 4. Verifikasi Textarea Preview & Badge Karakter
    const textarea = modal.locator('textarea');
    await expect(textarea).toBeVisible();
    const initialText = await textarea.inputValue();
    expect(initialText).toContain('ABSENSI DINIYYAH');
    expect(initialText).toContain('JUMLAH GURU:');
    expect(initialText).toContain('HADIR:');

    // Badge karakter
    await expect(modal.getByText(/\d+ Karakter/i)).toBeVisible();

    // Legend status
    await expect(modal.getByText(/\*Ket:.*Hadir.*Alfa\/Kosong/i)).toBeVisible();

    // 5. Interaksi: Ganti Filter Gender ke Putra (PA)
    await radioPA.check();
    await expect(radioPA).toBeChecked();
    const textPA = await textarea.inputValue();
    expect(textPA).toContain('(PUTRA / PA)');
    expect(textPA).toContain('Ust.');

    // 6. Interaksi: Ganti Filter Gender ke Putri (PI)
    await radioPI.check();
    await expect(radioPI).toBeChecked();
    const textPI = await textarea.inputValue();
    expect(textPI).toContain('(PUTRI / PI)');
    expect(textPI).toContain('Ustz.');

    // Kembalikan ke Semua
    await radioSemua.check();

    // 7. Interaksi: Centang Bandongan & Syawir (Jam 3)
    await cbBandongan.check();
    const textJam3 = await textarea.inputValue();
    expect(textJam3).toContain('BANDONGAN & SYAWIR');

    // 8. Verifikasi Tombol Aksi di Footer
    const btnSalin = modal.getByRole('button', { name: 'Salin Teks', exact: true });
    await expect(btnSalin).toBeVisible();

    const btnWhatsApp = modal.getByRole('button', { name: /Kirim ke WhatsApp/i });
    await expect(btnWhatsApp).toBeVisible();
    await expect(btnWhatsApp).toBeEnabled();

    // 9. Tutup Modal
    const btnTutup = modal.getByRole('button', { name: 'Tutup', exact: true });
    await btnTutup.click();
    await expect(modal).not.toBeVisible();
  });

  test('2.0 Absensi Asatidz: Modal Generator Laporan WA Terintegrasi', async ({ page }) => {
    await page.goto('/absensi');
    await expect(page.getByRole('heading', { name: 'Absensi Asatidz', exact: true })).toBeVisible({ timeout: 15000 });

    // Buka modal Generator WA
    const btnWA = page.getByRole('button', { name: /Chat WA/i });
    await expect(btnWA).toBeVisible();
    await btnWA.click();

    // Modal terbuka dengan benar
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Generator Laporan Absensi WhatsApp' })).toBeVisible();

    // Tutup dengan tombol close '✕' atau Tutup
    const btnCloseIcon = modal.getByRole('button', { name: 'Tutup modal' });
    await btnCloseIcon.click();
    await expect(modal).not.toBeVisible();
  });
});
