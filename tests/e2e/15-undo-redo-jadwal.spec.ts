import { test, expect } from '@playwright/test';

test.describe('Fitur Undo & Redo (Maksimal 5 Langkah) - Modul Jadwal KBM', () => {
  test.beforeEach(async ({ page }) => {
    // Proteksi: Intercept mutasi Supabase agar data riil database tidak tertimpa oleh pengujian otomatis
    await page.route('**/rest/v1/app_settings*', async (route) => {
      const method = route.request().method();
      if (method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE') {
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

    await page.goto('/jadwal-kbm');
    // Pastikan halaman dan tabel jadwal sudah dimuat
    await expect(page.getByRole('heading', { name: 'Jadwal KBM Per Kelas', exact: true })).toBeVisible();
    await expect(page.locator('#tableJadwalKBM')).toBeVisible();

    // Reset riwayat undo/redo sebelum tiap test case
    await page.evaluate(() => {
      const win = window as any;
      if (win.useUndoRedoStore) {
        win.useUndoRedoStore.getState().clearHistory();
      }
    });
  });

  test('1.0 Navbar Controls: Tombol Undo & Redo terlihat dan nonaktif saat awal', async ({ page }) => {
    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });
    const btnRedo = page.getByRole('button', { name: /Ulangi perubahan \(Redo\)/i });

    await expect(btnUndo).toBeVisible();
    await expect(btnRedo).toBeVisible();

    // Saat awal, belum ada riwayat sehingga disabled
    await expect(btnUndo).toBeDisabled();
    await expect(btnRedo).toBeDisabled();
  });

  test('2.0 Mutasi Jadwal KBM merekam aksi, memunculkan Toast & mengaktifkan tombol Undo (Badge 1)', async ({ page }) => {
    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });
    const btnRedo = page.getByRole('button', { name: /Ulangi perubahan \(Redo\)/i });

    // Simulasi aksi mutasi jadwal via store di browser context
    await page.evaluate(async () => {
      // Panggil store jadwal untuk memperbarui satu guru
      const win = window as any;
      if (win.useJadwalStore) {
        await win.useJadwalStore.getState().simpanBatchJadwalAsatidz(
          {
            'GURU TEST UNDO': {
              nama_asatidz: 'GURU TEST UNDO',
              sabtu: 'Jam 1|1A|Nahwu Wajib',
              total_jam: 1,
            },
          },
          'Uji Coba Pindah Jadwal GURU TEST'
        );
      }
    });

    // Floating toast harus muncul
    const toast = page.getByRole('status');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('Perubahan tersimpan: Uji Coba Pindah Jadwal GURU TEST');

    // Tombol Undo di Navbar sekarang harus aktif dengan badge '1'
    await expect(btnUndo).toBeEnabled();
    await expect(btnUndo).toContainText('1');

    // Redo masih disabled karena belum ada aksi yang dibatalkan
    await expect(btnRedo).toBeDisabled();

    // Klik tombol Undo di Navbar
    await btnUndo.click();

    // Toast status undo harus muncul
    await expect(toast).toContainText('Undo berhasil: Uji Coba Pindah Jadwal GURU TEST');

    // Sekarang tombol Undo kembali disabled dan tombol Redo aktif dengan badge '1'
    await expect(btnUndo).toBeDisabled();
    await expect(btnRedo).toBeEnabled();
    await expect(btnRedo).toContainText('1');

    // Klik tombol Redo di Navbar
    await btnRedo.click();

    // Toast status redo harus muncul
    await expect(toast).toContainText('Redo berhasil: Uji Coba Pindah Jadwal GURU TEST', { timeout: 10_000 });
    await expect(btnUndo).toBeEnabled();
    await expect(btnUndo).toContainText('1');
    await expect(btnRedo).toBeDisabled();
  });

  test('3.0 Keyboard Shortcut Ctrl+Z dan Ctrl+Y untuk Undo dan Redo', async ({ page }) => {
    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });
    const btnRedo = page.getByRole('button', { name: /Ulangi perubahan \(Redo\)/i });

    // Rekam satu mutasi jadwal
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useJadwalStore) {
        await win.useJadwalStore.getState().simpanBatchJadwalAsatidz(
          {
            'GURU SHORTCUT': {
              nama_asatidz: 'GURU SHORTCUT',
              ahad: 'Jam 2|2B|Shorof',
              total_jam: 1,
            },
          },
          'Aksi Shortcut Keyboard'
        );
      }
    });

    await expect(btnUndo).toBeEnabled();
    await expect(btnUndo).toContainText('1');

    // Tekan Control+z untuk Undo
    await page.keyboard.press('Control+z');

    // Tunggu hingga Undo selesai dan notifikasi muncul
    const toast = page.getByRole('status');
    await expect(toast).toContainText('Undo berhasil: Aksi Shortcut Keyboard', { timeout: 10_000 });
    await expect(btnUndo).toBeDisabled();
    await expect(btnRedo).toBeEnabled();
    await expect(btnRedo).toContainText('1');

    // Tekan Control+y untuk Redo
    await page.keyboard.press('Control+y');

    // Verifikasi aksi berhasil diulangi melalui shortcut
    await expect(toast).toContainText('Redo berhasil: Aksi Shortcut Keyboard', { timeout: 10_000 });
    await expect(btnUndo).toBeEnabled();
    await expect(btnUndo).toContainText('1');
    await expect(btnRedo).toBeDisabled();
  });

  test('4.0 Batas maksimal Undo adalah tepat 5 langkah (Ring Buffer 5 Steps Limit)', async ({ page }) => {
    const btnUndo = page.getByRole('button', { name: /Batalkan perubahan \(Undo\)/i });

    // Jalankan 7 mutasi berturut-turut
    await page.evaluate(async () => {
      const win = window as any;
      if (win.useJadwalStore) {
        for (let i = 1; i <= 7; i++) {
          await win.useJadwalStore.getState().simpanBatchJadwalAsatidz(
            {
              'GURU LIMIT': {
                nama_asatidz: 'GURU LIMIT',
                senin: `Jam 1|1A|Mapel${i}`,
                total_jam: 1,
              },
            },
            `Langkah Ke-${i}`
          );
        }
      }
    });

    // Badge tombol Undo harus dibatasi maksimal 5 langkah
    await expect(btnUndo).toBeEnabled();
    await expect(btnUndo).toContainText('5');

    // Tooltip / title harus menunjukkan langkah terakhir (Langkah Ke-7)
    await expect(btnUndo).toHaveAttribute('title', /Langkah Ke-7/);

    // Lakukan 5 kali Undo berturut-turut
    for (let i = 5; i >= 1; i--) {
      await expect(btnUndo).toContainText(String(i));
      await btnUndo.click();
    }

    // Setelah 5 kali undo, tombol Undo harus kembali disabled (karena batas kapasitasnya hanya 5)
    await expect(btnUndo).toBeDisabled();
  });
});
