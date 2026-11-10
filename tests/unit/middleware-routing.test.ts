import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Mock Supabase Server Client
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
      }),
    },
    rpc: vi.fn().mockResolvedValue({
      data: true, // is_app_security_enabled = true
    }),
  })),
}));

describe('Middleware Subdomain & Routing Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-key';
  });

  describe('Domain Utama (Publik: madinblokagung.com / www.madinblokagung.com)', () => {
    it('mengizinkan akses ke landing page root "/"', async () => {
      const req = new NextRequest('https://www.madinblokagung.com/', {
        headers: { host: 'www.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(200);
      expect(res.headers.get('x-middleware-status')).toBeNull();
    });

    it('mengizinkan akses ke portal berita "/berita"', async () => {
      const req = new NextRequest('https://www.madinblokagung.com/berita', {
        headers: { host: 'www.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it('mengizinkan akses ke detail berita "/berita/kegiatan-santri"', async () => {
      const req = new NextRequest('https://www.madinblokagung.com/berita/kegiatan-santri', {
        headers: { host: 'www.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it('merespon 404 Not Found (Stealth) saat membuka "/login" di domain publik', async () => {
      const req = new NextRequest('https://www.madinblokagung.com/login', {
        headers: { host: 'www.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(404);
      expect(res.headers.get('x-middleware-status')).toBe('404');
    });

    it('merespon 404 Not Found (Stealth) saat membuka "/dashboard" di domain publik', async () => {
      const req = new NextRequest('https://www.madinblokagung.com/dashboard', {
        headers: { host: 'www.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(404);
      expect(res.headers.get('x-middleware-status')).toBe('404');
    });

    it('merespon 404 Not Found (Stealth) saat membuka menu internal "/santri" di domain publik', async () => {
      const req = new NextRequest('https://www.madinblokagung.com/santri', {
        headers: { host: 'www.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(404);
      expect(res.headers.get('x-middleware-status')).toBe('404');
    });
  });

  describe('Subdomain Sistem (sistem.madinblokagung.com)', () => {
    it('mengalihkan root "/" ke "/login" jika pengguna belum login', async () => {
      const req = new NextRequest('https://sistem.madinblokagung.com/', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('https://sistem.madinblokagung.com/login');
    });

    it('mengizinkan akses ke form "/login" di subdomain sistem', async () => {
      const req = new NextRequest('https://sistem.madinblokagung.com/login', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(200);
    });

    it('mengalihkan akses "/berita" ke portal publik utama', async () => {
      const req = new NextRequest('https://sistem.madinblokagung.com/berita', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(308);
      expect(res.headers.get('location')).toBe('https://www.madinblokagung.com/berita');
    });

    it('mengalihkan akses ke rute internal "/dashboard" menuju "/login" jika belum terautentikasi', async () => {
      const req = new NextRequest('https://sistem.madinblokagung.com/dashboard', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toContain('/login?next=');
    });

    it('mengalihkan root "/" ke "/dashboard" jika pengguna sudah login', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      vi.mocked(createServerClient).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'mock-user-123',
                email: 'admin@madinblokagung.local',
                app_metadata: {},
              },
            },
          }),
        },
        rpc: vi.fn().mockResolvedValue({ data: true }),
      } as any);

      const req = new NextRequest('https://sistem.madinblokagung.com/', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('https://sistem.madinblokagung.com/dashboard');
    });

    it('mengalihkan root "/" ke "/absen-cepat" jika pengguna memiliki cookie sesi perangkat tetap', async () => {
      const { createServerClient } = await import('@supabase/ssr');
      vi.mocked(createServerClient).mockReturnValueOnce({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'mock-user-456',
                email: 'piket@madinblokagung.local',
                app_metadata: {
                  special_authorities: { persistent_absen_cepat: true },
                },
              },
            },
          }),
        },
        rpc: vi.fn().mockResolvedValue({ data: true }),
      } as any);

      const req = new NextRequest('https://sistem.madinblokagung.com/', {
        headers: {
          host: 'sistem.madinblokagung.com',
          cookie: 'madin_persistent_absen_cepat=1',
        },
      });
      const res = await updateSession(req);
      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('https://sistem.madinblokagung.com/absen-cepat');
    });
  });
});
