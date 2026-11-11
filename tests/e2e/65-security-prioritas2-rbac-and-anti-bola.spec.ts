import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

function getSupabaseEnv() {
  try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    return {
      url: urlMatch ? urlMatch[1].trim().replace(/^['"]|['"]$/g, '') : '',
      anonKey: keyMatch ? keyMatch[1].trim().replace(/^['"]|['"]$/g, '') : '',
    };
  } catch {
    return { url: '', anonKey: '' };
  }
}

test.describe('Prioritas 2: Otorisasi Backend RBAC & Proteksi Data Anti-BOLA/IDOR', () => {
  test.describe('1. Proteksi Endpoint API /api/push/send (Role Authorization)', () => {
    test('1.1. Menolak akses unauthenticated dengan status 401 Unauthorized', async ({ request }) => {
      const res = await request.post('/api/push/send', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Pengumuman Penting',
          body: 'Seluruh santri harap hadir di aula.',
        },
      });

      expect(res.status()).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Akses ditolak');
    });

    test('1.2. Menolak akses unauthenticated ke DELETE /api/push/subscribe', async ({ request }) => {
      const res = await request.delete('/api/push/subscribe', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/target-sub-123',
        },
      });

      expect(res.status()).toBe(401);
      const data = await res.json();
      expect(data.error).toContain('Akses ditolak');
    });
  });

  test.describe('2. Verifikasi Hak Akses & Pengiriman Push oleh Admin Terotentikasi', () => {
    test('2.1. Admin terotentikasi dapat mengakses API /api/push/send dan tervalidasi perannya', async ({ page }) => {
      // 1. Login sebagai master admin
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      // 2. Kirim notifikasi menggunakan sesi cookie admin
      const res = await page.request.post('/api/push/send', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Tes Keamanan Otorisasi',
          body: 'Memverifikasi bahwa admin berwenang dapat mengirim notifikasi.',
          role: 'asatidz',
        },
      });

      // Status bukan 401 dan bukan 403 (karena peran admin sah)
      expect(res.status()).not.toBe(401);
      expect(res.status()).not.toBe(403);

      const json = await res.json();
      expect(json).toBeDefined();
      if (res.status() === 200) {
        expect(json.success).toBe(true);
      }
    });

    test('2.2. Validasi input kosong pada /api/push/send ditolak dengan 400 Bad Request', async ({ page }) => {
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
          title: '', // Judul kosong
          body: '',
        },
      });

      expect(res.status()).toBe(400);
      const json = await res.json();
      expect(json.error).toMatch(/harus diisi|Validasi gagal/i);
    });
  });

  test.describe('3. Proteksi Row Level Security (RLS) Anti-BOLA pada Supabase', () => {
    test('3.1. Pengguna anonim/publik tidak dapat membaca data tabel ebtadin_santri', async ({ request }) => {
      const { url, anonKey } = getSupabaseEnv();
      test.skip(!url || !anonKey, 'Supabase URL/AnonKey tidak tersedia');

      // Uji query langsung ke REST endpoint Supabase dengan anonKey tanpa token user
      const res = await request.get(`${url}/rest/v1/ebtadin_santri?select=id&limit=1`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      // Policy baru mencabut ALL publik dan membatasi ke authenticated
      // Respon: 200 dengan array kosong [] (karena RLS filter), atau 401/403
      if (res.ok()) {
        const rows = await res.json();
        expect(rows).toHaveLength(0);
      } else {
        expect([401, 403]).toContain(res.status());
      }
    });

    test('3.2. Akses ke menu pengaturan dan rute terproteksi berjalan mulus untuk Admin', async ({ page }) => {
      await page.goto('/login');
      if (page.url().includes('/login')) {
        await page.getByLabel('Username Pengurus').fill('admin');
        await page.getByLabel('Kata Sandi', { exact: true }).fill('Madina@1951');
        await page.getByRole('button', { name: 'Masuk ke Ruang Kerja' }).click();
        await page.waitForURL('**/dashboard**', { timeout: 30000 });
      }

      // Kunjungi halaman pengaturan
      await page.goto('/pengaturan');
      await page.waitForLoadState('domcontentloaded');

      // Verifikasi halaman pengaturan berhasil dimuat
      await expect(page.getByRole('heading', { name: /Pengaturan/i }).first()).toBeVisible({ timeout: 20000 });
    });
  });
});
