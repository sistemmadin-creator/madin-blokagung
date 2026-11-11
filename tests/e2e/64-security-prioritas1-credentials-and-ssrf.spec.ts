import { test, expect } from '@playwright/test';

test.describe('Prioritas 1: Keamanan Kredensial, SSRF Protection & WAHA Proxy Guard', () => {
  test.describe('1. Proteksi Endpoint API /api/waha (Unauthenticated)', () => {
    test('1.1. Menolak akses unauthenticated dengan status 401 Unauthorized', async ({ request }) => {
      const response = await request.get('/api/waha/sessions/default', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('Akses ditolak');
    });

    test('1.2. Menolak akses POST unauthenticated', async ({ request }) => {
      const response = await request.post('/api/waha/sendText', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          chatId: '628123456789@c.us',
          text: 'Halo Test',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toContain('Akses ditolak');
    });
  });

  test.describe('2. Pencegahan SSRF (Server-Side Request Forgery) & Path Traversal', () => {
    test('2.1. Memblokir serangan SSRF ke AWS/GCP Cloud Metadata IP (169.254.169.254)', async ({ request }) => {
      // Mengirimkan target metadata via query param
      const resQuery = await request.get('/api/waha/sessions?targetUrl=http://169.254.169.254/latest/meta-data', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
        },
      });

      // Harus ditolak (401 jika unauth, atau 403 jika lolos ke SSRF validator)
      expect([401, 403]).toContain(resQuery.status());
      const bodyQuery = await resQuery.json();
      if (resQuery.status() === 403) {
        expect(bodyQuery.error).toContain('SSRF Protection');
      }

      // Mengirimkan target metadata via header x-waha-target
      const resHeader = await request.get('/api/waha/sessions', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'x-waha-target': 'http://169.254.169.254',
        },
      });

      expect([401, 403]).toContain(resHeader.status());
    });

    test('2.2. Memblokir akses ke port internal sensitif (Database / Redis / SSH)', async ({ request }) => {
      const res = await request.get('/api/waha/status?targetUrl=http://localhost:5432', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
        },
      });

      expect([401, 403]).toContain(res.status());
    });

    test('2.3. Memblokir serangan Path Traversal (../)', async ({ request }) => {
      const res = await request.get('/api/waha/..%2F..%2Fetc/passwd', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
        },
      });

      // Ditangkal baik oleh 400 Bad Request (Path Traversal Protection) atau 401/404
      expect([400, 401, 404]).toContain(res.status());
    });
  });

  test.describe('3. Verifikasi Alur Terotentikasi & Proxy Bersih', () => {
    test('3.1. Pengguna login admin dapat mengakses portal dan menggunakan proxy secara sah', async ({ page }) => {
      // 1. Kunjungi halaman login sistem
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      // 2. Login sebagai admin
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      // 3. Verifikasi bahwa session cookie sudah aktif
      const cookies = await page.context().cookies();
      const hasAuthCookie = cookies.some((c) => c.name.includes('auth-token') || c.name.includes('sb-'));
      expect(hasAuthCookie).toBeTruthy();

      // 4. Lakukan request ke /api/waha/sessions/default menggunakan session cookie admin
      const proxyRes = await page.request.get('/api/waha/sessions/default', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
        },
      });

      // Server proxy tidak lagi mengembalikan 401 Unauthorized karena user sudah login
      expect(proxyRes.status()).not.toBe(401);

      // Respons yang sah adalah 200 (jika WAHA lokal aktif) atau 502/OFFLINE (jika gateway offline)
      const data = await proxyRes.json();
      expect(data).toBeDefined();
      if (proxyRes.status() === 502) {
        expect(data.online).toBe(false);
        expect(data.error).toContain('Gagal menghubungi server gateway WhatsApp');
      }

      // 5. Verifikasi bahwa respons TIDAK membocorkan secret API key atau raw internal URL
      const textResponse = await proxyRes.text();
      expect(textResponse).not.toContain('2OAMhpiZP5');
      expect(textResponse).not.toContain('DEFAULT_PRIVATE_KEY');
    });

    test('3.2. Akses ke halaman Kirim WA Hafalan tidak mengekspos private key di DOM', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      // Buka halaman kirim WA
      await page.goto('/kirim-wa');
      await page.waitForLoadState('domcontentloaded');

      const content = await page.content();
      // Pastikan tidak ada kebocoran private key di HTML/JS
      expect(content).not.toContain('2OAMhpiZP5');
      expect(content).not.toContain('DEFAULT_PRIVATE_KEY');
    });
  });
});
