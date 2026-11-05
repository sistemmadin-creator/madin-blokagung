import { test, expect } from '@playwright/test';

test.describe('Modul: Absen Konsorsium', () => {
  test('Navigasi ke Absen Konsorsium, buat kelas konsorsium, uji modal daftar asatidz & input presensi', async ({ page }) => {
    // 1. Kunjungi halaman /absen-konsorsium
    await page.goto('/absen-konsorsium');

    // 2. Verifikasi Header dan KPI Cards
    await expect(page.getByRole('heading', { name: /Absen Konsorsium/i })).toBeVisible();
    await expect(page.getByText(/Total Kelas Konsorsium/i)).toBeVisible();
    await expect(page.getByText(/Asatidz Terdaftar Aktif/i)).toBeVisible();
    await expect(page.getByText(/Sesi Pertemuan Tercatat/i)).toBeVisible();

    // 3. Verifikasi Tombol + Buat Kelas Konsorsium
    const btnBuatKelas = page.getByRole('button', { name: /\+ Buat Kelas Konsorsium/i });
    await expect(btnBuatKelas).toBeVisible();
    await btnBuatKelas.click();

    // 4. Verifikasi Modal Buat Kelas Konsorsium
    const dialogBuat = page.getByRole('dialog');
    await expect(dialogBuat).toBeVisible();
    await expect(dialogBuat.getByRole('heading', { name: /Buat Kelas Konsorsium Baru/i })).toBeVisible();

    // Verifikasi Tingkat Buttons
    await expect(dialogBuat.getByRole('button', { name: 'ULA', exact: true })).toBeVisible();
    await expect(dialogBuat.getByRole('button', { name: 'WUSTHO', exact: true })).toBeVisible();

    // Isi Form Buat Kelas
    await dialogBuat.getByRole('button', { name: 'ULA', exact: true }).click();

    // 4. Pilih Fan dari suggestion chip Cepat
    await dialogBuat.getByRole('button', { name: 'Fiqih', exact: true }).click();

    // Isi Pembimbing
    const inputPembimbing = dialogBuat.locator('input[placeholder*="Cari nama atau NIA"]');
    await expect(inputPembimbing).toBeVisible();
    await inputPembimbing.fill('Ust. Ahmad E2E');

    // Isi Keterangan (focus textarea closes pembimbing dropdown)
    const textareaKet = dialogBuat.locator('textarea');
    await textareaKet.focus();
    await textareaKet.fill('Jadwal Pertemuan Malam Rabu');

    // Submit Buat Kelas
    const btnSubmit = dialogBuat.getByRole('button', { name: /Buat Kelas Konsorsium/i });
    await btnSubmit.click();
    await expect(dialogBuat).not.toBeVisible();

    // 5. Verifikasi Kartu Kelas Muncul di Halaman
    await expect(page.getByText('Fiqih', { exact: true })).toBeVisible();
    await expect(page.getByText(/Ust\. Ahmad E2E/i)).toBeVisible();

    // 6. Uji Tombol + Daftarkan Asatidz pada Kartu
    const btnDaftar = page.getByRole('button', { name: /\+ Daftarkan Asatidz/i }).first();
    await expect(btnDaftar).toBeVisible();
    await btnDaftar.click();

    const dialogDaftar = page.getByRole('dialog');
    await expect(dialogDaftar).toBeVisible();
    await expect(dialogDaftar.getByRole('heading', { name: /Daftarkan Asatidz ke Kelas/i })).toBeVisible();

    // Tutup Modal Daftar
    const btnBatalDaftar = dialogDaftar.getByRole('button', { name: 'Batal', exact: true });
    await btnBatalDaftar.click();
    await expect(dialogDaftar).not.toBeVisible();

    // 7. Uji Tombol Riwayat pada Kartu
    const btnRiwayat = page.getByRole('button', { name: /Riwayat/i }).first();
    await expect(btnRiwayat).toBeVisible();
    await btnRiwayat.click();

    const dialogRiwayat = page.getByRole('dialog');
    await expect(dialogRiwayat).toBeVisible();
    await expect(dialogRiwayat.getByRole('heading', { name: /Riwayat Pertemuan/i })).toBeVisible();

    const btnTutupRiwayat = dialogRiwayat.getByRole('button', { name: 'Tutup', exact: true });
    await btnTutupRiwayat.click();
    await expect(dialogRiwayat).not.toBeVisible();
  });
});
