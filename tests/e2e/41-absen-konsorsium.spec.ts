import { test, expect } from '@playwright/test';

test.describe('Modul: Absen Konsorsium', () => {
  test('Navigasi, buat kelas dengan jenis konsor, verifikasi kolom 1..5, switcher bulan, detail matriks tahunan, & input presensi', async ({
    page,
  }) => {
    // 1. Kunjungi halaman /absen-konsorsium
    await page.goto('/absen-konsorsium');

    // 2. Verifikasi Header dan KPI Cards
    await expect(page.getByRole('heading', { name: /Absen Konsorsium/i })).toBeVisible();
    await expect(page.getByText(/Total Kelas Konsorsium/i)).toBeVisible();
    await expect(page.getByText(/Asatidz Terdaftar Aktif/i)).toBeVisible();
    await expect(page.getByText(/Sesi Pertemuan Tercatat/i)).toBeVisible();

    // Verifikasi Tab Pengelompokan Jenis Konsor
    await expect(page.getByRole('button', { name: /Semua Konsorsium/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Konsorsium Mustahiq\/qoh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Konsorsium Munawib\/bah/i })).toBeVisible();

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
    await dialogBuat.getByRole('button', { name: 'ULA', exact: true }).click();

    // Verifikasi & Pilih Jenis Konsor
    await expect(dialogBuat.getByText(/Mustahiq\/qoh/i)).toBeVisible();
    await expect(dialogBuat.getByText(/Munawib\/bah/i)).toBeVisible();
    await dialogBuat.getByRole('button', { name: /Mustahiq\/qoh/i }).click();

    // Pilih Fan dari suggestion chip Cepat
    await dialogBuat.getByRole('button', { name: 'Fiqih', exact: true }).click();

    // Isi Pembimbing
    const inputPembimbing = dialogBuat.locator('input[placeholder*="Cari nama atau NIA"]');
    await expect(inputPembimbing).toBeVisible();
    await inputPembimbing.fill('Ust. Ahmad E2E');

    // Isi Keterangan (focus textarea closes pembimbing dropdown)
    const textareaKet = dialogBuat.locator('textarea');
    await textareaKet.focus();
    await textareaKet.fill('Jadwal Pertemuan Setiap Kamis');

    // Submit Buat Kelas
    const btnSubmit = dialogBuat.getByRole('button', { name: /Buat Kelas Konsorsium/i });
    await btnSubmit.click();
    await expect(dialogBuat).not.toBeVisible();

    // 5. Verifikasi Kartu Kelas Muncul di Halaman
    const kartu = page.locator('div.group\\/card').first();
    await expect(kartu).toBeVisible();
    await expect(kartu.getByText('Fiqih', { exact: true })).toBeVisible();
    await expect(kartu.getByText(/Ust\. Ahmad E2E/i)).toBeVisible();
    await expect(kartu.getByText('Mustahiq/qoh', { exact: true })).toBeVisible();

    // Verifikasi Kolom Pertemuan 1..4 (Hari Kamis) di kartu
    const headers = kartu.getByRole('columnheader');
    await expect(headers.filter({ hasText: /^1/ })).toBeVisible();
    await expect(headers.filter({ hasText: /^2/ })).toBeVisible();
    await expect(headers.filter({ hasText: /^3/ })).toBeVisible();
    await expect(headers.filter({ hasText: /^4/ })).toBeVisible();

    // 6. Uji Tombol + Daftarkan Asatidz pada Kartu
    const btnDaftar = kartu.getByRole('button', { name: /\+ Daftarkan Asatidz/i });
    await expect(btnDaftar).toBeVisible();
    await btnDaftar.click();

    const dialogDaftar = page.getByRole('dialog');
    await expect(dialogDaftar).toBeVisible();
    await expect(dialogDaftar.getByRole('heading', { name: /Daftarkan Asatidz ke Kelas/i })).toBeVisible();

    // Tutup Modal Daftar
    const btnBatalDaftar = dialogDaftar.getByRole('button', { name: 'Batal', exact: true });
    await btnBatalDaftar.click();
    await expect(dialogDaftar).not.toBeVisible();

    // 7. Klik Kartu -> Buka Detail Matriks Tahunan (Juli s/d Juni)
    const btnMatriks = kartu.getByTitle('Klik untuk membuka Detail Matriks Tahunan');
    await btnMatriks.click();

    const dialogMatriks = page.getByRole('dialog');
    await expect(dialogMatriks).toBeVisible();
    await expect(dialogMatriks.getByRole('heading', { name: /Detail Matriks Absensi/i })).toBeVisible();
    await expect(dialogMatriks.getByText(/Tahun Ajaran/i).first()).toBeVisible();
    await expect(dialogMatriks.getByRole('button', { name: /Export Matriks Excel/i })).toBeVisible();

    // Tutup Modal Matriks
    const btnTutupMatriks = dialogMatriks.getByRole('button', { name: 'Tutup', exact: true });
    await btnTutupMatriks.click();
    await expect(dialogMatriks).not.toBeVisible();
  });
});
