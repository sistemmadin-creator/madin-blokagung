import { test, expect } from '@playwright/test';

test.describe('Modul: Absen Konsorsium', () => {
  test('Navigasi, buat kelas dengan jenis konsor, daftarkan asatidz via checkbox, input presensi, edit dari riwayat, detail matriks tahunan, & hapus kelas', async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 1280, height: 800 });
    const uniqueClassName = `Fiqih E2E ${Date.now().toString().slice(-4)}`;

    // 1. Kunjungi halaman /absen-konsorsium (login otomatis jika security switch aktif)
    await page.goto('/absen-konsorsium');
    if (page.url().includes('/login')) {
      await page.getByLabel('Username Pengurus').fill('admin');
      await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
      await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
      await expect(page.locator('aside')).toBeVisible({ timeout: 25000 });
      await page.goto('/absen-konsorsium');
    }

    // 2. Verifikasi Header dan KPI Cards
    await expect(page.getByRole('heading', { name: /Absen Konsorsium/i })).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/Total Kelas Konsorsium/i)).toBeVisible();
    await expect(page.getByText(/Asatidz Terdaftar Aktif/i)).toBeVisible();
    await expect(page.getByText(/Sesi Pertemuan Tercatat/i)).toBeVisible();

    // Verifikasi Tab Pengelompokan Jenis Konsor
    await expect(page.getByRole('button', { name: /Semua Konsorsium/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Konsorsium Mustahiq\/qoh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Konsorsium Munawib\/bah/i })).toBeVisible();

    // 3. Verifikasi Tombol Buat Kelas Konsorsium (tanpa duplikasi tanda +)
    const btnBuatKelas = page.getByRole('button', { name: /^Buat Kelas Konsorsium$/i });
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

    // Isi Nama Kelas unik agar tidak bentrok dengan kelas asli
    const inputNamaKelas = dialogBuat.getByPlaceholder(/Contoh: Fiqih, Nahwu/i);
    await inputNamaKelas.fill(uniqueClassName);

    // Isi Pembimbing
    const inputPembimbing = dialogBuat.locator('input[placeholder*="Cari nama atau NIA"]');
    await expect(inputPembimbing).toBeVisible();
    await inputPembimbing.fill('Ust. Ahmad E2E');

    // Isi Keterangan
    const textareaKet = dialogBuat.locator('textarea');
    await textareaKet.focus();
    await textareaKet.fill('Jadwal Pertemuan Setiap Kamis');

    // Submit Buat Kelas
    const btnSubmit = dialogBuat.getByRole('button', { name: /Buat Kelas Konsorsium/i });
    await btnSubmit.click();
    await expect(dialogBuat).not.toBeVisible();

    // 5. Verifikasi Kartu Kelas Muncul di Halaman
    const kartu = page.locator('div.group\\/card').filter({ hasText: uniqueClassName }).first();
    await expect(kartu).toBeVisible();
    await expect(kartu.getByText(uniqueClassName, { exact: true })).toBeVisible();
    await expect(kartu.getByText(/Ust\. Ahmad E2E/i)).toBeVisible();
    await expect(kartu.getByText('Mustahiq/qoh', { exact: true })).toBeVisible();

    // Verifikasi Kolom Pertemuan 1..4 (Hari Kamis) di kartu
    const headers = kartu.getByRole('columnheader');
    await expect(headers.filter({ hasText: /^1/ })).toBeVisible();
    await expect(headers.filter({ hasText: /^2/ })).toBeVisible();
    await expect(headers.filter({ hasText: /^3/ })).toBeVisible();
    await expect(headers.filter({ hasText: /^4/ })).toBeVisible();

    // 6. Uji Tombol Daftarkan Asatidz pada Kartu & Klik Checkbox Langsung (BUG-02)
    const btnDaftar = kartu.getByRole('button', { name: /^Daftarkan Asatidz$/i });
    await expect(btnDaftar).toBeVisible();
    await btnDaftar.click();

    const dialogDaftar = page.getByRole('dialog');
    await expect(dialogDaftar).toBeVisible();
    await expect(dialogDaftar.getByRole('heading', { name: /Daftarkan Asatidz ke Kelas/i })).toBeVisible();

    // Jika ada asatidz tersedia di tabel, uji klik checkbox secara langsung
    const firstCheckbox = dialogDaftar.locator('tbody input[type="checkbox"]').first();
    if ((await firstCheckbox.count()) > 0) {
      await firstCheckbox.click();
      await expect(firstCheckbox).toBeChecked();
      const btnSubmitDaftar = dialogDaftar.getByRole('button', { name: /Daftarkan 1 Asatidz/i });
      await expect(btnSubmitDaftar).toBeEnabled();
      await btnSubmitDaftar.click();
      await expect(dialogDaftar).not.toBeVisible();

      // 7. Uji Input Absensi & Simpan Sesi
      const btnInputAbsensi = kartu.getByRole('button', { name: /Input Absensi/i });
      await expect(btnInputAbsensi).toBeEnabled();
      await btnInputAbsensi.click();

      const dialogPresensi = page.getByRole('dialog');
      await expect(dialogPresensi).toBeVisible();
      await expect(dialogPresensi.getByRole('heading', { name: /Input Presensi:/i })).toBeVisible();

      const inputTopik = dialogPresensi.locator('input[placeholder*="Contoh: Pembahasan Bab"]');
      await inputTopik.fill('Evaluasi Bab Thaharah E2E');

      const btnSimpanPresensi = dialogPresensi.getByRole('button', {
        name: /Simpan Presensi Pertemuan Ini/i,
      });
      await btnSimpanPresensi.click();
      await expect(dialogPresensi).not.toBeVisible();

      // 8. Uji Riwayat & Tombol Edit Sesi (BUG-01)
      const btnRiwayat = kartu.getByRole('button', { name: /^Riwayat/i });
      await btnRiwayat.click();

      const dialogRiwayat = page.getByRole('dialog');
      await expect(dialogRiwayat).toBeVisible();
      await expect(dialogRiwayat.getByText(/Evaluasi Bab Thaharah E2E/i)).toBeVisible();

      const btnUbahPresensi = dialogRiwayat.getByTitle('Ubah Presensi').first();
      await btnUbahPresensi.click();

      // Verifikasi modal Input Presensi terbuka kembali membawa topik yang diedit
      await expect(page.getByRole('heading', { name: /Input Presensi:/i })).toBeVisible();
      await expect(
        page.getByRole('dialog').locator('input[placeholder*="Contoh: Pembahasan Bab"]')
      ).toHaveValue('Evaluasi Bab Thaharah E2E');

      await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();
      await expect(page.getByRole('dialog')).not.toBeVisible();
    } else {
      const btnBatalDaftar = dialogDaftar.getByRole('button', { name: 'Batal', exact: true });
      await btnBatalDaftar.click();
      await expect(dialogDaftar).not.toBeVisible();
    }

    // 9. Klik Tombol Expand -> Buka Detail Matriks Tahunan (Juli s/d Juni)
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

    // 10. Cleanup: Hapus kelas E2E melalui menu 3 titik
    page.once('dialog', (d) => d.accept());
    const btnOpsiKelas = kartu.getByRole('button', { name: 'Opsi Kelas' });
    await btnOpsiKelas.click();
    const btnHapusKelas = kartu.getByRole('button', { name: /Hapus Kelas/i });
    await btnHapusKelas.click();
    await expect(kartu).not.toBeVisible();
  });
});
