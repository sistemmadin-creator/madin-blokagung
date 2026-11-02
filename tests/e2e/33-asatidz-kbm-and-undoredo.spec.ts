import { test, expect } from '@playwright/test';

test.describe('Uji Fitur Baru: Hak Input KBM Berdasarkan Jah & Hardening Undo/Redo Asatidz', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Supabase REST calls to prevent dirtying database during automated tests
    await page.route('**/rest/v1/asatidz*', async (route) => {
      const method = route.request().method();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ success: true }]),
        });
      }
      return route.continue();
    });

    await page.route('**/rest/v1/activity_logs*', async (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ success: true }]),
      });
    });

    await page.goto('/asatidz');
    await expect(page.getByRole('heading', { name: /Database Asatidz/i })).toBeVisible();
  });

  test.describe('1. Form Pendaftaran Asatidz: Pembatasan Grup Kolom 2 (Gambar 2)', () => {
    test('1.1 Jah Mustahiq / Mustahiqoh / MS & Koor mengaktifkan Grup Kolom 2', async ({ page }) => {
      await page.getByRole('button', { name: /Tambah Asatidz/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: /Form Pendaftaran Data Asatidz/i })).toBeVisible();

      // Secara default Jah adalah Mustahiq (PA)
      const selectJah = modal.locator('select[name="jah_asatidz"]');
      await expect(selectJah).toHaveValue('Mustahiq');

      // Verifikasi input Grup Kolom 2 aktif dan bisa diedit
      const selectTingkat = modal.locator('select[name="tingkat_asatidz"]');
      const inputKls = modal.locator('input[name="din_kls_asatidz"]');
      const inputBag = modal.locator('input[name="din_bag_asatidz"]');
      const inputLokasiDin = modal.locator('input[name="lokasi_diniyyah"]');
      const inputLokasiTak = modal.locator('input[name="lokasi_takror"]');

      await expect(selectTingkat).toBeEnabled();
      await expect(inputKls).toBeEnabled();
      await expect(inputBag).toBeEnabled();
      await expect(inputLokasiDin).toBeEnabled();
      await expect(inputLokasiTak).toBeEnabled();

      // Isi penugasan KBM
      await selectTingkat.selectOption('Wustho');
      await inputKls.fill('2');
      await inputBag.fill('B');
      await inputLokasiDin.fill('Masjid Lt. 2 Barat');
      await inputLokasiTak.fill('Aula Utama');

      await expect(selectTingkat).toHaveValue('Wustho');
      await expect(inputKls).toHaveValue('2');
      await expect(inputBag).toHaveValue('B');
      await expect(inputLokasiDin).toHaveValue('Masjid Lt. 2 Barat');
      await expect(inputLokasiTak).toHaveValue('Aula Utama');
    });

    test('1.2 Memilih Jah non-mengajar (TU, Munawib, TOP, dll) menonaktifkan dan membersihkan Grup Kolom 2', async ({ page }) => {
      await page.getByRole('button', { name: /Tambah Asatidz/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();

      const selectJah = modal.locator('select[name="jah_asatidz"]');
      const selectTingkat = modal.locator('select[name="tingkat_asatidz"]');
      const inputKls = modal.locator('input[name="din_kls_asatidz"]');
      const inputBag = modal.locator('input[name="din_bag_asatidz"]');
      const inputLokasiDin = modal.locator('input[name="lokasi_diniyyah"]');
      const inputLokasiTak = modal.locator('input[name="lokasi_takror"]');

      // Ubah Jah ke 'TU'
      await selectJah.selectOption('TU');
      await expect(selectJah).toHaveValue('TU');

      // Badge peringatan harus muncul
      await expect(modal.getByText(/Khusus Jah: Mustahiq, Mustahiqoh, & MS & Koor/i)).toBeVisible();

      // Seluruh input Grup 2 harus disabled dan nilainya kosong
      await expect(selectTingkat).toBeDisabled();
      await expect(inputKls).toBeDisabled();
      await expect(inputBag).toBeDisabled();
      await expect(inputLokasiDin).toBeDisabled();
      await expect(inputLokasiTak).toBeDisabled();

      await expect(selectTingkat).toHaveValue('');
      await expect(inputKls).toHaveValue('');
      await expect(inputBag).toHaveValue('');
      await expect(inputLokasiDin).toHaveValue('');
      await expect(inputLokasiTak).toHaveValue('');

      // Coba ubah ke Jah 'Munawib' (tetap disabled)
      await selectJah.selectOption('Munawib');
      await expect(selectTingkat).toBeDisabled();
      await expect(inputKls).toBeDisabled();

      // Kembalikan ke 'MS & Koor' (harus aktif kembali)
      await selectJah.selectOption('MS & Koor');
      await expect(selectTingkat).toBeEnabled();
      await expect(inputKls).toBeEnabled();
      await expect(inputBag).toBeEnabled();
      await expect(modal.getByText(/Khusus Jah: Mustahiq, Mustahiqoh, & MS & Koor/i)).toBeHidden();
    });
  });

  test.describe('2. Modal Import Massal Excel (Gambar 3)', () => {
    test('2.1 Teks panduan kolom menampilkan pembedaan wajib identitas vs khusus KBM', async ({ page }) => {
      await page.getByRole('button', { name: /Import Excel/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible();
      await expect(modal.getByRole('heading', { name: /Import Massal Database Asatidz/i })).toBeVisible();

      // Verifikasi panduan kolom
      await expect(modal.getByText(/Format Kolom Wajib Baris Pertama:/i)).toBeVisible();
      await expect(modal.getByText(/Kolom Identitas Wajib \(Semua Jah\):/i)).toBeVisible();
      await expect(modal.getByText(/Catatan Tugas Mengajar:/i)).toBeVisible();
      await expect(modal.getByText(/hanya wajib\/berlaku untuk Jah Mustahiq, Mustahiqoh, dan MS & Koor/i)).toBeVisible();

      // Verifikasi tombol unduh template
      const btnDownload = modal.getByRole('button', { name: /Unduh Template Excel/i });
      await expect(btnDownload).toBeVisible();
      await expect(btnDownload).toBeEnabled();
    });
  });

  test.describe('3. Fitur Undo & Redo Data Asatidz (Gambar 1)', () => {
    test('3.1 Tooltip Navbar menampilkan identitas modul [ASATIDZ]', async ({ page }) => {
      // Clear history terlebih dahulu
      await page.evaluate(() => {
        const win = window as any;
        if (win.useUndoRedoStore) win.useUndoRedoStore.getState().clearHistory();
      });

      const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });
      const btnRedo = page.getByRole('button', { name: /Ulangi perubahan \(Redo\)/i });

      await expect(btnUndo).toBeDisabled();
      await expect(btnRedo).toBeDisabled();

      // Catat aksi simulasi Asatidz via store
      await page.evaluate(() => {
        const win = window as any;
        if (win.useUndoRedoStore) {
          win.useUndoRedoStore.getState().recordAction({
            module: 'asatidz',
            title: 'Edit Asatidz: ABDUL JALIL',
            undo: async () => true,
            redo: async () => true,
          });
        }
      });

      // Tombol Undo aktif dengan badge '1'
      await expect(btnUndo).toBeEnabled();
      await expect(btnUndo).toContainText('1');

      // Verifikasi title/tooltip memuat modul [ASATIDZ]
      await expect(btnUndo).toHaveAttribute('title', /\[ASATIDZ\] Edit Asatidz: ABDUL JALIL/i);

      // Klik Undo
      await btnUndo.click();

      // Redo sekarang aktif dengan tooltip [ASATIDZ]
      await expect(btnRedo).toBeEnabled();
      await expect(btnRedo).toContainText('1');
      await expect(btnRedo).toHaveAttribute('title', /\[ASATIDZ\] Edit Asatidz: ABDUL JALIL/i);
    });

    test('3.2 Normalisasi OCC: Undo Edit tidak memicu modal konflik palsu (null vs empty string)', async ({ page }) => {
      // Simulasi Undo dengan field kosong
      const conflictTriggered = await page.evaluate(async () => {
        const win = window as any;
        let requestedConflict = false;

        if (win.useUndoRedoStore) {
          // Monkey-patch requestConflictResolution untuk deteksi apakah terpanggil
          const originalReq = win.useUndoRedoStore.getState().requestConflictResolution;
          win.useUndoRedoStore.setState({
            requestConflictResolution: async (prompt: any) => {
              requestedConflict = true;
              return originalReq(prompt);
            },
          });

          // Jalankan saveAsatidz Edit
          await win.useAsatidzStore.getState().saveAsatidz(
            {
              nia: 'B55',
              nama_asatidz: 'ABDUL JALIL',
              pa_pi: 'PA',
              jah_asatidz: 'Mustahiq',
              lokasi_diniyyah: 'Masjid Lt. 1',
            },
            true,
            'B55'
          );

          // Lakukan Undo
          await win.useUndoRedoStore.getState().undo();
        }

        return requestedConflict;
      });

      // Harus FALSE: tidak boleh memunculkan dialog konflik palsu
      expect(conflictTriggered).toBe(false);
      await expect(page.getByRole('dialog', { name: /Peringatan Konflik/i })).toBeHidden();
    });
  });
});
