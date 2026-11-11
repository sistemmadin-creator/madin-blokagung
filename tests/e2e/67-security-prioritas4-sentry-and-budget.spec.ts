import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Prioritas 4: Error Monitoring (Sentry), PII Sanitization & Cloud Budget Guard', () => {
  test.describe('1. Sanitasi Data Privasi Santri & Kredensial (Anti-PII Leak to Sentry)', () => {
    test('1.1. Memfilter dan menyamarkan password, NIS, nomor HP, dan token dari error log', async ({ request }) => {
      const res = await request.post('/api/monitoring/test-error', {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-host': 'sistem.localhost:3000',
        },
        data: {
          payload: {
            nama_santri: 'Ahmad Abdullah',
            keterangan: 'Presensi KBM Jam ke-2 untuk kontak wali 081234567890',
            password: 'SuperSecretPassword123!',
            nis: '19510001',
            no_hp: '081234567890',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN7s2DRm4_F-4jV-4T7yXp3QG9bE2yN2kX7zX9o',
            sesi_jwt: 'Token pengguna: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN7s2DRm4_F-4jV-4T7yXp3QG9bE2yN2kX7zX9o',
            private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC...',
            service_role_key: 'sbp_dummy_secret_key_123',
          },
        },
      });

      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      const sanitized = json.sanitized;
      // Data non-sensitif tetap utuh, namun nomor HP di dalam string disamarkan
      expect(sanitized.nama_santri).toBe('Ahmad Abdullah');
      expect(sanitized.keterangan).toContain('[PHONE_REDACTED]');
      expect(sanitized.keterangan).not.toContain('081234567890');

      // Token JWT di dalam teks bebas disamarkan dengan regex
      expect(sanitized.sesi_jwt).toContain('[JWT_REDACTED]');
      expect(sanitized.sesi_jwt).not.toContain('dozjgN7s2DRm4_F-4jV-4T7yXp3QG9bE2yN2kX7zX9o');

      // Data sensitif berbasis key WAJIB tersanitasi
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.nis).toBe('[REDACTED]');
      expect(sanitized.no_hp).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.private_key).toBe('[REDACTED]');
      expect(sanitized.service_role_key).toBe('[REDACTED]');
    });

    test('1.2. Mampu mencatat event error dan pesan kustom tanpa kegagalan (crash-safe)', async ({ request }) => {
      const res = await request.post('/api/monitoring/test-error', {
        headers: {
          'Content-Type': 'application/json',
          'x-forwarded-host': 'sistem.localhost:3000',
        },
        data: {
          action: 'capture_error',
          message: 'Simulasi kegagalan query database untuk testing',
          payload: {
            telepon_wali: '085712345678',
            catatan: 'Hubungi pengurus di 085712345678 untuk konfirmasi',
          },
        },
      });

      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.type).toBe('error');
      expect(json.eventId).toBeTruthy();
      expect(json.sanitizedPayload.telepon_wali).toBe('[REDACTED]');
      expect(json.sanitizedPayload.catatan).toContain('[PHONE_REDACTED]');
    });

    test('1.3. Memproteksi endpoint monitoring dengan rate limiter saat menerima spam request', async ({ request }) => {
      const spamPayload = {
        action: 'capture_message',
        message: 'Spam log loop attack simulation',
      };

      let hitRateLimit = false;
      for (let i = 0; i < 18; i++) {
        const res = await request.post('/api/monitoring/test-error', {
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-host': 'sistem.localhost:3000',
            'x-forwarded-for': '192.168.1.99',
          },
          data: spamPayload,
        });

        if (res.status() === 429) {
          hitRateLimit = true;
          const retryAfter = res.headers()['retry-after'];
          expect(retryAfter).toBeDefined();
          break;
        }
      }

      expect(hitRateLimit).toBe(true);
    });
  });

  test.describe('2. Error Boundary & Graceful Degradation (Client Crash Handling)', () => {
    test('2.1. Endpoint status monitoring merespons dengan status sehat', async ({ request }) => {
      const res = await request.get('/api/monitoring/test-error', {
        headers: {
          'x-forwarded-host': 'sistem.localhost:3000',
        },
      });

      expect(res.status()).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
      expect(json.service).toContain('Madin Blokagung Error Monitoring');
      expect(json).toHaveProperty('sentryConfigured');
      expect(json).toHaveProperty('timestamp');
    });

    test('2.2. Error boundary menangani unhandled client exception secara anggun', async ({ page }) => {
      // Buka halaman uji coba crash
      await page.goto('/test-crash');
      await page.waitForLoadState('domcontentloaded');

      const triggerBtn = page.locator('[data-testid="trigger-crash-btn"]');
      await expect(triggerBtn).toBeVisible({ timeout: 15000 });

      // Klik tombol picu crash untuk memicu exception di pohon komponen React
      await triggerBtn.click();

      // Error boundary container harus tampil menggantikan komponen yang crash
      const errorContainer = page.locator('[data-testid="error-boundary-container"]');
      await expect(errorContainer).toBeVisible({ timeout: 15000 });

      // Pesan ramah pengguna
      await expect(page.getByText('Terjadi Kendala Sistem')).toBeVisible();

      // Kode referensi unik untuk pelaporan ke pengembang
      const refCode = page.locator('[data-testid="error-reference-code"]');
      await expect(refCode).toBeVisible();
      const codeText = await refCode.textContent();
      expect(codeText?.length).toBeGreaterThan(3);

      // Tombol aksi pemulihan
      await expect(page.locator('[data-testid="error-retry-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-home-button"]')).toBeVisible();

      // Memastikan stack trace sensitif dan kredensial database TIDAK bocor ke tampilan user
      const bodyText = await page.innerText('body');
      expect(bodyText).not.toContain('PostgresError');
      expect(bodyText).not.toContain('DATABASE_URL');
      expect(bodyText).not.toContain('VAPID_PRIVATE_KEY');
    });
  });

  test.describe('3. Verifikasi SOP & Guard Pengendalian Biaya Cloud (Cloud Spend Guard)', () => {
    test('3.1. SOP Pengendalian Biaya Cloud (SECURITY_SPEND_CAP_SOP.md) tersedia dan lengkap', async () => {
      const sopPath = path.join(process.cwd(), 'docs', 'SECURITY_SPEND_CAP_SOP.md');
      expect(fs.existsSync(sopPath)).toBe(true);

      const content = fs.readFileSync(sopPath, 'utf8');
      // Memeriksa poin-poin krusial dari Video 2
      expect(content).toContain('Supabase');
      expect(content).toContain('Spend Cap');
      expect(content).toContain('Vercel');
      expect(content).toContain('Spend Management');
      expect(content).toContain('Runaway Loops');
      expect(content).toContain('Rate Limiting');
    });

    test('3.2. Template lingkungan (.env.example) mencantumkan variabel Sentry secara aman', async () => {
      const envExamplePath = path.join(process.cwd(), '.env.example');
      expect(fs.existsSync(envExamplePath)).toBe(true);

      const content = fs.readFileSync(envExamplePath, 'utf8');
      expect(content).toContain('NEXT_PUBLIC_SENTRY_DSN');
      expect(content).toContain('SENTRY_DSN');
      expect(content).toContain('SENTRY_ORG');
      expect(content).toContain('SENTRY_PROJECT');
      expect(content).toContain('SENTRY_AUTH_TOKEN');
      // Memastikan tidak ada DSN atau token live yang terisi di .env.example
      expect(content).not.toContain('https://o');
      expect(content).not.toContain('sntrys_');
    });
  });
});
