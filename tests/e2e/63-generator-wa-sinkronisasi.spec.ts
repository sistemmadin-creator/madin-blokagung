import { test, expect, Page } from '@playwright/test';

let cachedStorageState: {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
} | null = null;

async function gotoWithAuth(page: Page, targetPath: string) {
  if (cachedStorageState) {
    await page.context().addCookies(cachedStorageState.cookies);
  }

  await page.goto(targetPath);
  await page.waitForLoadState('domcontentloaded');

  if (cachedStorageState?.origins?.[0]?.localStorage && page.url().includes('/login')) {
    await page.evaluate((items) => {
      for (const it of items) {
        localStorage.setItem(it.name, it.value);
      }
    }, cachedStorageState.origins[0].localStorage);
    await page.goto(targetPath);
    await page.waitForLoadState('domcontentloaded');
  }

  if (page.url().includes('/login')) {
    await page.getByLabel('Username Pengurus').fill('admin');
    await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
    await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
    await page.waitForURL(`**${targetPath}**`, { timeout: 60000 });

    try {
      cachedStorageState = await page.context().storageState();
    } catch {
      // ignore
    }
  }
}

test.describe('E2E Sinkronisasi Generator WhatsApp & Database Asatidz/Formasi', () => {
  test('1. Buka Modal Generator WA di Absen Cepat: Pastikan TIDAK ADA "BLOK BELUM DIATUR"', async ({ page }) => {
    // Clear localStorage to force fresh fetch from database
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('MADIN_JADWAL_MENGAJAR_ASATIDZ');
      localStorage.removeItem('JADWAL_MENGAJAR_ASATIDZ');
    });

    await gotoWithAuth(page, '/absen-cepat');
    await expect(page.getByRole('heading', { name: 'Absen Cepat', exact: true })).toBeVisible({ timeout: 20000 });

    // Tunggu data sesi termuat
    await expect(page.getByText(/dari [1-9]\d* Sesi/i).first()).toBeVisible({ timeout: 25000 });

    // Buka modal Generator WA (tombol 'Chat WA')
    const btnWA = page.getByRole('button', { name: /Chat WA/i });
    await expect(btnWA).toBeVisible();
    await btnWA.click();

    // Verifikasi modal terbuka
    const modal = page.getByRole('dialog');
    await expect(modal.getByRole('heading', { name: 'Generator Laporan Absensi WhatsApp' })).toBeVisible();

    // Tunggu textarea terisi teks laporan
    const textarea = modal.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).not.toHaveValue('', { timeout: 15000 });

    const contentDiniyyah = await textarea.inputValue();

    // 1. Verifikasi TIDAK ADA kategori BLOK BELUM DIATUR
    expect(contentDiniyyah).not.toContain('BLOK BELUM DIATUR');
    expect(contentDiniyyah).not.toContain('⚠️');

    // 2. Verifikasi tidak ada nama kelas fiktif hasil slot duplikat
    expect(contentDiniyyah).not.toContain('1 I ULYA');
    expect(contentDiniyyah).not.toContain('1 J ULYA');
    expect(contentDiniyyah).not.toContain('1 K ULYA');
    expect(contentDiniyyah).not.toContain('1 L ULYA');
    expect(contentDiniyyah).not.toContain('3 Q ULA');

    // 3. Verifikasi Ust. Achmad Hafirudin dkk berada di blok semestinya
    expect(contentDiniyyah).toContain('BLOK INDUK PUTRA');

    // 4. Cek sesi Takror (Jam 4) dan Bandongan (Jam 3)
    const cbDiniyyah = modal.getByLabel('Diniyyah (Jam 1 & 2)');
    const cbBandongan = modal.getByLabel('Bandongan & Syawir (Jam 3)');
    const cbTakror = modal.getByLabel('Takror (Jam 4)');

    await cbDiniyyah.uncheck();
    await cbBandongan.check();
    await cbTakror.check();

    await page.waitForTimeout(500);
    const contentTakror = await textarea.inputValue();

    // Pastikan di Jam 3 & 4 juga TIDAK ADA BLOK BELUM DIATUR
    expect(contentTakror).not.toContain('BLOK BELUM DIATUR');
    expect(contentTakror).not.toContain('1 I ULYA');
    expect(contentTakror).not.toContain('1 J ULYA');
    expect(contentTakror).not.toContain('1 K ULYA');
    expect(contentTakror).not.toContain('1 L ULYA');
    expect(contentTakror).not.toContain('3 Q ULA');

    // Tutup modal
    const btnTutup = modal.getByRole('button', { name: 'Tutup', exact: true });
    await btnTutup.click();
    await expect(modal).not.toBeVisible();
  });
});
