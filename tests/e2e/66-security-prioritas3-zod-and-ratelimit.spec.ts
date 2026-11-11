import { test, expect } from '@playwright/test';

test.describe('Prioritas 3: Validasi Skema Zod & Proteksi DoS Rate Limiting', () => {
  test.describe('1. Validasi Skema Input Zod (/api/push/send)', () => {
    test('1.1. Menolak judul notifikasi yang terlalu pendek (< 3 karakter) dengan 400 Bad Request', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      const res = await page.request.post('/api/push/send', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          title: 'AB', // < 3 karakter
          body: 'Pesan pengumuman penting',
        },
      });

      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Judul minimal 3 karakter');
    });

    test('1.2. Menolak isi pesan (body) yang terlalu pendek (< 3 karakter) dengan 400 Bad Request', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      const res = await page.request.post('/api/push/send', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Pengumuman Penting',
          body: 'X', // < 3 karakter
        },
      });

      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Isi pesan minimal 3 karakter');
    });

    test('1.3. Menolak peran target (role) yang tidak terdaftar di enum skema Zod', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      const res = await page.request.post('/api/push/send', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Pengumuman Resmi',
          body: 'Isi pengumuman lengkap untuk seluruh madin.',
          role: 'hacker_role_invalid',
        },
      });

      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Validasi gagal');
    });
  });

  test.describe('2. Validasi Skema Input Zod (/api/push/subscribe)', () => {
    test('2.1. Menolak subscription dengan format endpoint yang bukan URL', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      const res = await page.request.post('/api/push/subscribe', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          subscription: {
            endpoint: 'bukan-url-valid-hanya-string',
            keys: {
              p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9ic0WAEaeCG6SJAZPXILmznDit8abCybjBoPFhk2Q2IT8g',
              auth: 'tBHItJI5svbpez7KI4CCXg',
            },
          },
        },
      });

      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Endpoint harus berupa URL');
    });

    test('2.2. Menolak DELETE /api/push/subscribe jika endpoint bukan URL yang sah', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      const res = await page.request.delete('/api/push/subscribe', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          endpoint: 'string-sembarangan-tanpa-url',
        },
      });

      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('URL');
    });
  });

  test.describe('3. Proteksi Rate Limiting & Pengendalian Lonjakan Request (Anti-Runaway Loop)', () => {
    test('3.1. Memblokir request berulang berlebihan (Spam / Loop) dengan HTTP 429 Too Many Requests', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      // PROFILE PUSH_SEND memiliki batas kuota 10 request per menit per IP
      // Lakukan 12 request berturut-turut untuk memicu pembatasan kuota
      const uniqueIp = '10.99.88.77';
      const results: number[] = [];
      let rateLimitedResponse: any = null;

      for (let i = 1; i <= 12; i++) {
        const res = await page.request.post('/api/push/send', {
          headers: {
            'x-forwarded-host': 'sistem.localhost:3000',
            'x-forwarded-for': uniqueIp,
            'Content-Type': 'application/json',
          },
          data: {
            title: `Tes Spam Loop ${i}`,
            body: `Isi pesan uji coba rate limit ke-${i}`,
            role: 'santri',
          },
        });

        results.push(res.status());
        if (res.status() === 429) {
          rateLimitedResponse = {
            status: res.status(),
            headers: res.headers(),
            body: await res.json(),
          };
          break;
        }
      }

      // Minimal satu request harus terkena blokir 429 Too Many Requests
      expect(results).toContain(429);
      expect(rateLimitedResponse).not.toBeNull();
      expect(rateLimitedResponse.status).toBe(429);
      expect(rateLimitedResponse.body.status).toBe('TOO_MANY_REQUESTS');
      expect(rateLimitedResponse.body.error).toContain('Rate limit terlampaui');
      expect(rateLimitedResponse.body.retryAfter).toBeGreaterThan(0);
      expect(rateLimitedResponse.headers['retry-after']).toBeDefined();
    });

    test('3.2. Rate limiter pada WAHA proxy menyertakan header pembatas kuota RFC standar', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      // Tembak WAHA proxy hingga rate limit terpancing
      const uniqueWahaIp = '10.99.77.66';
      let hit429 = false;

      for (let i = 1; i <= 32; i++) {
        const res = await page.request.get('/api/waha/sessions/default', {
          headers: {
            'x-forwarded-host': 'sistem.localhost:3000',
            'x-forwarded-for': uniqueWahaIp,
          },
        });

        if (res.status() === 429) {
          hit429 = true;
          const body = await res.json();
          expect(body.status).toBe('TOO_MANY_REQUESTS');
          expect(res.headers()['retry-after']).toBeDefined();
          break;
        }
      }

      expect(hit429).toBe(true);
    });
  });
});
