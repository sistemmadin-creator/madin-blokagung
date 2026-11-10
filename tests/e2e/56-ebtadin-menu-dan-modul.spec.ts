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

test.describe('E2E: Pengujian Komprehensif Grup Menu EBTADIN dan Seluruh Sub-Modulnya', () => {
  test.setTimeout(120000);

  test('1. Sidebar menampilkan Hierarki Menu EBTADIN: Pusat Kendali, Tentang Ujian, Tentang Lulus, & Tentang Ijazah', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin');

    // Pastikan sidebar memuat grup menu EBTADIN
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('EBTADIN', { exact: true })).toBeVisible({ timeout: 25000 });

    // Menu tingkat pertama: Pusat Kendali dan 3 Akordion
    const linkPusatKendali = sidebar.getByRole('link', { name: 'Pusat Kendali EBTADIN', exact: true });
    await expect(linkPusatKendali).toBeVisible();

    // 3 Akordion Menu
    await expect(sidebar.getByRole('button', { name: /Tentang Ujian/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Tentang Lulus/i })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: /Tentang Ijazah/i })).toBeVisible();

    // Verifikasi sub-menu Ujian
    const linkRekapUjian = sidebar.getByRole('link', { name: 'Rekap Ujian', exact: true });
    const linkArsipUjian = sidebar.getByRole('link', { name: 'Rekap & Arsip Ujian Angkatan', exact: true });
    await expect(linkRekapUjian).toBeVisible();
    await expect(linkArsipUjian).toBeVisible();

    // Verifikasi sub-menu Lulus
    const linkRekapLulus = sidebar.getByRole('link', { name: 'Rekap Lulus', exact: true });
    const linkArsipLulus = sidebar.getByRole('link', { name: 'Rekap & Arsip Lulus Angkatan', exact: true });
    await expect(linkRekapLulus).toBeVisible();
    await expect(linkArsipLulus).toBeVisible();

    // Verifikasi sub-menu Ijazah
    const linkSerahIjazah = sidebar.getByRole('link', { name: 'Serah Ijazah', exact: true });
    const linkArsipIjazah = sidebar.getByRole('link', { name: 'Rekap & Arsip Ijazah Angkatan', exact: true });
    await expect(linkSerahIjazah).toBeVisible();
    await expect(linkArsipIjazah).toBeVisible();

    // Navigasi ke Rekap Ujian via sidebar
    await linkRekapUjian.click();
    await page.waitForURL('**/ebtadin/ujian**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Rekap Keikutsertaan Ujian/i })).toBeVisible();

    // Navigasi ke Rekap Lulus via sidebar
    await linkRekapLulus.click();
    await page.waitForURL('**/ebtadin/kelulusan**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Rekap Kelulusan Santri/i })).toBeVisible();

    // Navigasi ke Serah Ijazah via sidebar
    await linkSerahIjazah.click();
    await page.waitForURL('**/ebtadin/serah-ijazah**', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Serah Ijazah Santri/i })).toBeVisible();

    // Kembali ke Pusat Kendali via sidebar
    await linkPusatKendali.click();
    await page.waitForURL('**/ebtadin', { timeout: 30000 });
    await expect(page.getByRole('heading', { name: /Pusat Kendali Data EBTADIN/i })).toBeVisible();
  });

  test('2. Pusat Kendali EBTADIN (/ebtadin): Ringkasan Metrik, Dropdown Angkatan, Tombol Aksi, & Modal Kunci', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin');

    // 1. Verifikasi Judul & Status Badge
    await expect(
      page.getByRole('heading', { name: /Pusat Kendali Data EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });
    await expect(
      page.getByText(/SINKRON AKTIF|DATA DITETAPKAN/i).first()
    ).toBeVisible();

    // 2. Verifikasi 4 Kartu Metrik
    await expect(page.getByText(/Total Rombel Ebtadin/i)).toBeVisible();
    await expect(page.getByText(/Santri Peserta/i)).toBeVisible();
    await expect(page.getByText(/Mustahiq & Penguji/i)).toBeVisible();
    await expect(page.getByText(/Status Ijazah/i)).toBeVisible();

    // 3. Verifikasi Tombol Aksi Utama (Daftar Kelas, Sinkronkan, Tetapkan Data)
    const btnDaftarKelas = page.getByRole('button', { name: /Daftar Kelas/i });
    const btnSinkronkan = page.getByRole('button', { name: /Sinkronkan Ulang/i });
    const btnTetapkan = page.getByRole('button', { name: /Tetapkan Data/i });

    await expect(btnDaftarKelas).toBeVisible();
    await expect(btnSinkronkan).toBeVisible();
    await expect(btnTetapkan).toBeVisible();

    // 4. Buka Modal Konfirmasi Tetapkan Data
    await btnTetapkan.click();
    const modalDialog = page.locator('div.fixed.inset-0', { hasText: /Tetapkan Data EBTADIN Permanen\?/i });
    await expect(modalDialog).toBeVisible({ timeout: 10000 });

    // Verifikasi input kata kunci TETAPKAN
    const inputKeyword = modalDialog.getByPlaceholder('TETAPKAN');
    await expect(inputKeyword).toBeVisible();

    // Tombol Kunci harus disable jika belum ketik TETAPKAN
    const btnConfirmLock = modalDialog.getByRole('button', { name: /Kunci & Tetapkan/i });
    await expect(btnConfirmLock).toBeDisabled();

    // Ketik TETAPKAN lalu cek tombol aktif
    await inputKeyword.fill('TETAPKAN');
    await expect(btnConfirmLock).toBeEnabled();

    // Tutup modal dengan tombol Batal spesifik di modal
    await modalDialog.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modalDialog).not.toBeVisible();

    // 5. Verifikasi Kartu Modul EBTADIN di Halaman Hub
    await expect(page.getByText(/Data Santri Ebtadin/i)).toBeVisible();
    await expect(page.getByText(/Data Asatidz & Penguji/i)).toBeVisible();
    await expect(page.getByText(/Formasi Kelas Putra/i)).toBeVisible();
    await expect(page.getByText(/Formasi Kelas Putri/i)).toBeVisible();
    await expect(page.getByText(/Serah Ijazah Santri/i)).toBeVisible();
  });

  test('3. Modul Serah Ijazah (/ebtadin/serah-ijazah): Multi-Angkatan, Mustahiq Header Kartu, & Modal Penyerahan', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/serah-ijazah');

    // Heading dan Badge Tahun
    await expect(
      page.getByRole('heading', { name: /Serah Ijazah Santri/i })
    ).toBeVisible({ timeout: 25000 });

    // Dropdown Multi-Angkatan di header
    const selectAngkatan = page.locator('select').first();
    await expect(selectAngkatan).toBeVisible();

    // Tombol toolbar atas
    await expect(page.getByRole('button', { name: /Segarkan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ekspor Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cetak Rekap/i })).toBeVisible();

    // 3 Kartu Metrik
    await expect(page.getByText(/MENERIMA/i).first()).toBeVisible();
    await expect(page.getByText(/BELUM MENERIMA/i).first()).toBeVisible();
    await expect(page.getByText(/TOTAL PESERTA EBTADIN/i)).toBeVisible();

    // Filter controls
    const searchInput = page.getByPlaceholder(/Cari nama santri/i);
    await expect(searchInput).toBeVisible();

    // Verifikasi kartu rombel memuat nama Mustahiq / Mustahiqoh di header
    const mustahiqHeader = page.locator('span', { hasText: /Mustahiq:|Mustahiqoh:/i }).first();
    await expect(mustahiqHeader).toBeVisible({ timeout: 20000 });

    // Verifikasi fitur pemilihan tanggal serentak per rombel (Modal Batch Date)
    const btnPilihTgl = page.getByRole('button', { name: /Pilih Tgl/i }).first();
    await expect(btnPilihTgl).toBeVisible();
    await btnPilihTgl.click();

    // Verifikasi Modal Batch Tanggal terbuka
    const modalBatch = page.locator('div.fixed.inset-0', { hasText: /Serah Ijazah Massal/i });
    await expect(modalBatch).toBeVisible();
    await expect(modalBatch.locator('input[type="date"]')).toBeVisible();

    // Tutup modal batch dengan tombol Batal
    await modalBatch.getByRole('button', { name: 'Batal', exact: true }).click();
    await expect(modalBatch).not.toBeVisible();
  });

  test('4. Modul Data Santri EBTADIN (/ebtadin/santri): Tabel Calon Penerima Ijazah, Pencarian, & Filter', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/santri');

    await expect(
      page.getByRole('heading', { name: /Data Santri EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });

    const btnPusatKendali = page.locator('main, div.space-y-5').getByRole('link', { name: 'Pusat Kendali', exact: true }).first();
    await expect(btnPusatKendali).toBeVisible();

    await expect(page.getByText(/Total Peserta/i)).toBeVisible();
    await expect(page.getByText(/Santri Putra/i)).toBeVisible();
    await expect(page.getByText(/Santri Putri/i)).toBeVisible();

    const searchInput = page.getByPlaceholder(/Cari nama santri/i);
    await expect(searchInput).toBeVisible();

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });

    const selectGender = page.locator('select', { hasText: /Semua Gender|Putra/i });
    await selectGender.selectOption('PA');
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('5. Modul Data Asatidz & Penguji (/ebtadin/asatidz): Tabel Asatidz, Peran EBTADIN, & Filter', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/asatidz');

    await expect(
      page.getByRole('heading', { name: /Data Asatidz & Penguji EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });

    const btnPusatKendali = page.locator('main, div.space-y-5').getByRole('link', { name: 'Pusat Kendali', exact: true }).first();
    await expect(btnPusatKendali).toBeVisible();
    await expect(page.getByRole('button', { name: /Ekspor Excel/i })).toBeVisible();

    await expect(page.getByText(/Total Asatidz Terdaftar/i)).toBeVisible();

    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible({ timeout: 20000 });
  });

  test('6. Modul Formasi Kelas Putra & Putri (/ebtadin/formasi/pa & /ebtadin/formasi/pi)', async ({
    page,
  }) => {
    // 1. Formasi Putra (PA)
    await gotoWithAuth(page, '/ebtadin/formasi/pa');
    await expect(
      page.getByRole('heading', { name: /Formasi Kelas Putra EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/Putra \(PA\)/i).first()).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20000 });

    // 2. Formasi Putri (PI)
    await gotoWithAuth(page, '/ebtadin/formasi/pi');
    await expect(
      page.getByRole('heading', { name: /Formasi Kelas Putri EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/Putri \(PI\)/i).first()).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 20000 });
  });

  test('7. Modul Rekap & Arsip Ijazah Angkatan (/ebtadin/rekap-angkatan): Matriks Angkatan, Audit Mengendap, & Notifikasi WhatsApp', async ({
    page,
  }) => {
    await gotoWithAuth(page, '/ebtadin/rekap-angkatan');

    await expect(
      page.getByRole('heading', { name: /Rekap & Arsip Angkatan EBTADIN/i })
    ).toBeVisible({ timeout: 25000 });

    await expect(page.getByText('Total Angkatan', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Peserta Terdaftar', { exact: true })).toBeVisible();
    await expect(page.getByText('Ijazah Diserahkan', { exact: true })).toBeVisible();
    await expect(page.getByText('Ijazah Mengendap', { exact: true })).toBeVisible();

    const tabMatriks = page.getByRole('button', { name: /Matriks Lintas Angkatan/i });
    const tabAudit = page.getByRole('button', { name: /Audit Ijazah Mengendap/i });
    const tabCari = page.getByRole('button', { name: /Pencarian Global Alumni/i });

    await expect(tabMatriks).toBeVisible();
    await expect(tabAudit).toBeVisible();
    await expect(tabCari).toBeVisible();

    await expect(page.getByText(/Matriks Progres Serah Ijazah Per Angkatan/i)).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20000 });

    await tabAudit.click();
    await expect(page.getByText(/Daftar Ijazah Belum Diambil/i)).toBeVisible();

    const btnKirimWa = page.locator('tbody tr').first().getByRole('button', { name: /Kirim WA/i });
    if (await btnKirimWa.isVisible()) {
      await btnKirimWa.click();
      const modalWa = page.locator('div.fixed.inset-0', { hasText: /Kirim Pengingat Pengambilan Ijazah/i });
      await expect(modalWa).toBeVisible();
      await expect(modalWa.getByPlaceholder(/08123456789/i)).toBeVisible();
      await modalWa.getByRole('button', { name: 'Batal', exact: true }).click();
      await expect(modalWa).not.toBeVisible();
    }

    await tabCari.click();
    await expect(page.getByText(/Pencarian Arsip Ijazah & Alumni Lintas Angkatan/i)).toBeVisible();
    const inputGlobalSearch = page.getByPlaceholder(/Jordi Onsu/i);
    await expect(inputGlobalSearch).toBeVisible();
    await inputGlobalSearch.fill('Jordi');
    await expect(page.locator('span', { hasText: /Ditemukan .* riwayat alumni/i })).toBeVisible({ timeout: 10000 });
  });

  test('8. Modul Rekap Ujian (/ebtadin/ujian) & Rekap Angkatan Ujian (/ebtadin/ujian/rekap-angkatan)', async ({
    page,
  }) => {
    // 1. Masuk ke Rekap Ujian
    await gotoWithAuth(page, '/ebtadin/ujian');

    await expect(
      page.getByRole('heading', { name: /Rekap Keikutsertaan Ujian/i })
    ).toBeVisible({ timeout: 25000 });

    // 4 Kartu Metrik Ujian
    await expect(page.locator('span', { hasText: 'Total Peserta Ujian' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Hadir Mengikuti Ujian' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Alasan Terbanyak' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Alasan Tersedikit' })).toBeVisible();

    // Verifikasi Kartu Rombel memuat Mustahiq Header
    const cardMustahiq = page.locator('span', { hasText: /Mustahiq:|Mustahiqoh:/i }).first();
    await expect(cardMustahiq).toBeVisible({ timeout: 20000 });

    // Verifikasi Tombol Pengaturan Alasan Ujian & Buka Modal
    const btnSettings = page.getByRole('button', { name: /Pengaturan Alasan/i });
    await expect(btnSettings).toBeVisible();
    await btnSettings.click();

    const modalSettings = page.locator('div.fixed.inset-0', { hasText: /Pengaturan Pilihan Alasan Ujian/i });
    await expect(modalSettings).toBeVisible();
    // Tutup modal pengaturan
    await modalSettings.getByRole('button', { name: /Selesai/i }).click();
    await expect(modalSettings).not.toBeVisible();

    // 2. Navigasi ke Rekap & Arsip Ujian Angkatan
    const linkArsipUjian = page.getByRole('link', { name: 'Arsip Ujian Angkatan', exact: true });
    await expect(linkArsipUjian).toBeVisible();
    await linkArsipUjian.click();

    await page.waitForURL('**/ebtadin/ujian/rekap-angkatan**', { timeout: 30000 });
    await expect(
      page.getByRole('heading', { name: /Rekap & Arsip Ujian Angkatan/i })
    ).toBeVisible();

    // Verifikasi 4 Tab di Arsip Ujian
    const tabMatriks = page.getByRole('button', { name: /Matriks Lintas Angkatan/i });
    const tabAudit = page.getByRole('button', { name: /Audit Tidak Ikut Ujian/i });
    const tabAnalisis = page.getByRole('button', { name: /Peringkat Alasan/i });
    const tabCari = page.getByRole('button', { name: /Pencarian Santri/i });

    await expect(tabMatriks).toBeVisible();
    await expect(tabAudit).toBeVisible();
    await expect(tabAnalisis).toBeVisible();
    await expect(tabCari).toBeVisible();

    // Tab Analisis Peringkat Alasan
    await tabAnalisis.click();
    await expect(page.getByText(/Penyebab Paling Sering/i)).toBeVisible();
    await expect(page.getByText(/Penyebab Paling Jarang/i)).toBeVisible();
  });

  test('9. Modul Rekap Lulus (/ebtadin/kelulusan) & Rekap Angkatan Lulus (/ebtadin/kelulusan/rekap-angkatan)', async ({
    page,
  }) => {
    // 1. Masuk ke Rekap Lulus
    await gotoWithAuth(page, '/ebtadin/kelulusan');

    await expect(
      page.getByRole('heading', { name: /Rekap Kelulusan Santri/i })
    ).toBeVisible({ timeout: 25000 });

    // 4 Kartu Metrik Kelulusan
    await expect(page.locator('span', { hasText: 'Total Peserta Yudisium' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Dinyatakan Lulus' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Faktor Tidak Lulus Terbanyak' })).toBeVisible();
    await expect(page.locator('span', { hasText: 'Faktor Terkecil' })).toBeVisible();

    // Verifikasi Kartu Rombel memuat Mustahiq Header
    const cardMustahiq = page.locator('span', { hasText: /Mustahiq:|Mustahiqoh:/i }).first();
    await expect(cardMustahiq).toBeVisible({ timeout: 20000 });

    // Verifikasi Tombol Pengaturan Alasan Lulus & Buka Modal
    const btnSettings = page.getByRole('button', { name: /Pengaturan Alasan/i });
    await expect(btnSettings).toBeVisible();
    await btnSettings.click();

    const modalSettings = page.locator('div.fixed.inset-0', { hasText: /Pengaturan Pilihan Alasan Kelulusan/i });
    await expect(modalSettings).toBeVisible();
    // Tutup modal pengaturan
    await modalSettings.getByRole('button', { name: /Selesai/i }).click();
    await expect(modalSettings).not.toBeVisible();

    // 2. Navigasi ke Rekap & Arsip Lulus Angkatan
    const linkArsipLulus = page.getByRole('link', { name: 'Arsip Lulus Angkatan', exact: true });
    await expect(linkArsipLulus).toBeVisible();
    await linkArsipLulus.click();

    await page.waitForURL('**/ebtadin/kelulusan/rekap-angkatan**', { timeout: 30000 });
    await expect(
      page.getByRole('heading', { name: /Rekap & Arsip Lulus Angkatan/i })
    ).toBeVisible();

    // Verifikasi 4 Tab di Arsip Kelulusan
    const tabMatriks = page.getByRole('button', { name: /Matriks Lintas Angkatan/i });
    const tabAudit = page.getByRole('button', { name: /Audit Ditunda \/ Belum Lulus/i });
    const tabAnalisis = page.getByRole('button', { name: /Peringkat Alasan/i });
    const tabCari = page.getByRole('button', { name: /Pencarian Santri/i });

    await expect(tabMatriks).toBeVisible();
    await expect(tabAudit).toBeVisible();
    await expect(tabAnalisis).toBeVisible();
    await expect(tabCari).toBeVisible();

    // Tab Analisis Peringkat Alasan
    await tabAnalisis.click();
    await expect(page.getByText(/Penyebab Paling Sering/i)).toBeVisible();
    await expect(page.getByText(/Penyebab Paling Jarang/i)).toBeVisible();
  });
});
