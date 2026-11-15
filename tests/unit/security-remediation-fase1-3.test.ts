import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { verifySameOriginRequest } from '@/lib/security/csrfGuard';
import {
  sanitizeHttpUrl,
  isSafeRelativeOrHttpUrl,
  sanitizeRelativeOrHttpUrl,
} from '@/lib/security/urlSanitizer';
import {
  sanitizeErrorData,
  sanitizeSentryEvent,
} from '@/lib/services/errorMonitoring';
import { StorageService } from '@/lib/services/storageService';
import { canViewPage, canCreateOnPage, canEditOnPage, canDeleteOnPage } from '@/lib/utils/rbacHelper';

// Shared mocks for Supabase Server Client & WebPushServerService
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test/img.jpg' }, error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.supabase.co/test/img.jpg' } })),
      })),
    },
  },
}));

vi.mock('@/lib/services/webPushServer', () => ({
  WebPushServerService: {
    dispatchPushNotification: vi.fn().mockResolvedValue({ sentCount: 1, failedCount: 0 }),
    saveSubscription: vi.fn().mockResolvedValue({ id: 'sub-1', inserted: true }),
    removeSubscription: vi.fn().mockResolvedValue({ success: true }),
  },
}));

import { POST as pushSendPost } from '@/app/api/push/send/route';
import { POST as pushSubPost, DELETE as pushSubDelete } from '@/app/api/push/subscribe/route';
import { GET as wahaGet, POST as wahaPost } from '@/app/api/waha/[...path]/route';

describe('Fase 1–3 Security Remediation Regression Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. CSRF Guard (verifySameOriginRequest)', () => {
    it('menolak request mutasi POST dengan Sec-Fetch-Site: cross-site', () => {
      const req = new Request('https://sistem.madinblokagung.com/api/push/send', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'sec-fetch-site': 'cross-site',
          'content-type': 'application/json',
        },
      });
      const res = verifySameOriginRequest(req);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(403);
    });

    it('menolak request mutasi POST dengan Origin asing (evil.com)', () => {
      const req = new Request('https://sistem.madinblokagung.com/api/push/send', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://evil-attacker.com',
          'content-type': 'application/json',
        },
      });
      const res = verifySameOriginRequest(req);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(403);
    });

    it('menolak request POST tanpa Content-Type application/json bila requireJsonContentType aktif', () => {
      const req = new Request('https://sistem.madinblokagung.com/api/push/send', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'content-type': 'text/plain',
        },
      });
      const res = verifySameOriginRequest(req);
      expect(res.allowed).toBe(false);
      expect(res.status).toBe(415);
    });

    it('mengizinkan request POST same-origin yang valid', () => {
      const req = new Request('https://sistem.madinblokagung.com/api/push/send', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'sec-fetch-site': 'same-origin',
          'content-type': 'application/json',
        },
      });
      const res = verifySameOriginRequest(req);
      expect(res.allowed).toBe(true);
    });
  });

  describe('2. URL Sanitizer & Open Redirect Guard', () => {
    it('memblokir skema berbahaya javascript:, data:, vbscript: pada sanitizeHttpUrl', () => {
      expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeHttpUrl('JAVASCRIPT:alert(document.cookie)')).toBeNull();
      expect(sanitizeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeHttpUrl('vbscript:msgbox(1)')).toBeNull();
      expect(sanitizeHttpUrl('https://madinblokagung.com/berita')).toBe(
        'https://madinblokagung.com/berita'
      );
    });

    it('memblokir protocol-relative URL (//evil.com) dan backslash (/\\evil.com) pada sanitizeRelativeOrHttpUrl', () => {
      expect(sanitizeRelativeOrHttpUrl('//evil.com/phish', '/dashboard')).toBe('/dashboard');
      expect(sanitizeRelativeOrHttpUrl('/\\evil.com', '/dashboard')).toBe('/dashboard');
      expect(sanitizeRelativeOrHttpUrl('javascript:alert(1)', '/dashboard')).toBe('/dashboard');
      expect(sanitizeRelativeOrHttpUrl('/santri?tab=aktif', '/dashboard')).toBe('/santri?tab=aktif');
    });

    it('memvalidasi path relatif atau URL HTTP/HTTPS pada isSafeRelativeOrHttpUrl', () => {
      expect(isSafeRelativeOrHttpUrl('/absen-cepat')).toBe(true);
      expect(isSafeRelativeOrHttpUrl('https://sistem.madinblokagung.com/beranda')).toBe(true);
      expect(isSafeRelativeOrHttpUrl('//evil.com')).toBe(false);
      expect(isSafeRelativeOrHttpUrl('javascript:void(0)')).toBe(false);
    });
  });

  describe('3. Upload Storage Service (MIME, Ekstensi & Batas Ukuran 2MB)', () => {
    it('menolak file dengan ekstensi atau MIME berbahaya (.svg / .html)', async () => {
      const badFile = new File(['<svg onload=alert(1)>'], 'payload.svg', {
        type: 'image/svg+xml',
      });
      const result = await StorageService.uploadPhoto(badFile, 'santri', 'S001');
      expect(result).toBe('');
    });

    it('menolak file gambar yang melebihi batas 2 MB', async () => {
      const oversizedBuffer = new Uint8Array(2 * 1024 * 1024 + 1024);
      const bigFile = new File([oversizedBuffer], 'large.jpg', {
        type: 'image/jpeg',
      });
      const result = await StorageService.uploadPhoto(bigFile, 'santri', 'S001');
      expect(result).toBe('');
    });
  });

  describe('4. Error Monitoring & Sentry Scrubbing', () => {
    it('menyensor field sensitif (password, tokenB64, accessToken, apiKey, cookie)', () => {
      const dirty = {
        username: 'admin',
        password: 'SuperSecretPassword',
        tokenB64: 'bWFkaW4=',
        accessToken: 'eyJhbGciOi...',
        refreshToken: 'refresh-secret',
        apiKey: 'waha-secret-key',
        nested: {
          authorization: 'Bearer xyz',
          cookie: 'sb-access-token=123',
        },
      };
      const cleaned = sanitizeErrorData(dirty) as Record<string, any>;
      expect(cleaned.username).toBe('admin');
      expect(cleaned.password).toBe('[REDACTED]');
      expect(cleaned.tokenB64).toBe('[REDACTED]');
      expect(cleaned.accessToken).toBe('[REDACTED]');
      expect(cleaned.refreshToken).toBe('[REDACTED]');
      expect(cleaned.apiKey).toBe('[REDACTED]');
      expect(cleaned.nested.authorization).toBe('[REDACTED]');
      expect(cleaned.nested.cookie).toBe('[REDACTED]');

      const scrubbedEvent = sanitizeSentryEvent({
        request: {
          headers: {
            cookie: 'session=abc',
            'x-api-key': 'secret',
            'user-agent': 'Vitest',
          },
        },
        extra: dirty,
      } as any);
      expect(scrubbedEvent?.request?.headers?.cookie).toBeUndefined();
      expect(scrubbedEvent?.request?.headers?.['x-api-key']).toBeUndefined();
      expect((scrubbedEvent?.extra as any)?.password).toBe('[REDACTED]');
    });
  });

  describe('5. RBAC Fail-Closed Guard', () => {
    it('menolak aksi mutasi (Create/Edit/Delete) ketika account bernilai null', () => {
      expect(canCreateOnPage(null, 'santri')).toBe(false);
      expect(canEditOnPage(null, 'santri')).toBe(false);
      expect(canDeleteOnPage(null, 'santri')).toBe(false);
    });

    it('menolak seluruh akses ketika akun berstatus is_active = false', () => {
      const inactiveAcc: any = {
        id: 'u-inactive',
        username: 'operator1',
        role: 'custom_user',
        is_active: false,
        page_permissions: { santri: 'edit' },
        special_authorities: {
          blok_scope: 'SEMUA',
          gender_scope: 'semua',
          pengaturan_status: 'aktif',
          hide_edit_pages: [],
          hide_delete_pages: [],
        },
      };
      expect(canViewPage(inactiveAcc, 'santri')).toBe(false);
      expect(canCreateOnPage(inactiveAcc, 'santri')).toBe(false);
    });
  });

  describe('6. API /api/push/send & /api/push/subscribe Hardening', () => {
    it('POST /api/push/send menolak user dengan role kosong/tidak dikenal secara fail-closed (403)', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'u-unknown', email: 'tamu@madin.local', app_metadata: {} } },
        error: null,
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role: '', username: 'tamu', is_active: true },
        }),
      });

      const req = new NextRequest('https://sistem.madinblokagung.com/api/push/send', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ title: 'Judul Uji', body: 'Isi pesan uji coba' }),
      });

      const res = await pushSendPost(req);
      expect(res.status).toBe(403);
    });

    it('POST /api/push/subscribe menolak request tanpa sesi autentikasi (401)', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const req = new NextRequest('https://sistem.madinblokagung.com/api/push/subscribe', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
            keys: { p256dh: 'key1', auth: 'key2' },
          },
        }),
      });

      const res = await pushSubPost(req);
      expect(res.status).toBe(401);
    });

    it('DELETE /api/push/subscribe menolak penghapusan langganan milik user lain atau target_identifier null (Anti-BOLA 403)', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: 'u-regular', email: 'ustadz@madin.local', app_metadata: { role: 'pengurus' } } },
        error: null,
      });

      mockFrom.mockImplementation((table: string) => {
        if (table === 'user_accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: { role: 'pengurus', username: 'ustadz' },
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'sub-99', user_id: null, target_identifier: null },
          }),
        };
      });

      const req = new NextRequest('https://sistem.madinblokagung.com/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc123' }),
      });

      const res = await pushSubDelete(req);
      expect(res.status).toBe(403);
    });
  });

  describe('7. API /api/waha/[...path] BFF Proxy Hardening', () => {
    it('menolak request tanpa sesi login (401) tanpa bypass saklar keamanan', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const req = new NextRequest('https://sistem.madinblokagung.com/api/waha/sessions/default', {
        method: 'GET',
        headers: { host: 'sistem.madinblokagung.com' },
      });

      const res = await wahaGet(req, { params: Promise.resolve({ path: ['sessions', 'default'] }) });
      expect(res.status).toBe(401);
    });

    it('menolak subPath berbahaya di luar allowlist (misal server/stop atau ../admin)', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: 'u-admin', email: 'admin@madinblokagung.local', app_metadata: { role: 'master_admin' } },
        },
        error: null,
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { role: 'master_admin', username: 'admin', is_active: true, page_permissions: {} },
        }),
      });

      const req = new NextRequest('https://sistem.madinblokagung.com/api/waha/server/stop', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const res = await wahaPost(req, { params: Promise.resolve({ path: ['server', 'stop'] }) });
      expect(res.status).toBe(403);
    });

    it('menolak user non-admin yang hanya memiliki akses lihat pada halaman kirim-wa saat mencoba POST sendText (403)', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: { id: 'u-viewer', email: 'viewer@madinblokagung.local', app_metadata: { role: 'custom_user' } },
        },
        error: null,
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            role: 'custom_user',
            username: 'viewer',
            is_active: true,
            page_permissions: { 'kirim-wa': 'lihat' },
          },
        }),
      });

      const req = new NextRequest('https://sistem.madinblokagung.com/api/waha/sendText', {
        method: 'POST',
        headers: {
          host: 'sistem.madinblokagung.com',
          origin: 'https://sistem.madinblokagung.com',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ chatId: '628123456789@c.us', text: 'Halo', session: 'default' }),
      });

      const res = await wahaPost(req, { params: Promise.resolve({ path: ['sendText'] }) });
      expect(res.status).toBe(403);
    });
  });
});
