import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  isSistemSubdomain,
  isPublicPathname,
  getPublicPortalOrigin,
  getSistemPortalOrigin,
} from '@/lib/utils/subdomainHelper';

describe('Subdomain & Route Helper (MADINA Blokagung)', () => {
  describe('isSistemSubdomain', () => {
    it('detects production subdomain sistem.madinblokagung.com correctly', () => {
      const req = new NextRequest('https://sistem.madinblokagung.com/dashboard', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      expect(isSistemSubdomain(req)).toBe(true);
    });

    it('detects local development sistem.localhost:3000 correctly', () => {
      const req = new NextRequest('http://sistem.localhost:3000/dashboard', {
        headers: { host: 'sistem.localhost:3000' },
      });
      expect(isSistemSubdomain(req)).toBe(true);
    });

    it('detects Vercel preview subdomain sistem-*.vercel.app correctly', () => {
      const req = new NextRequest('https://sistem-preview.vercel.app/login', {
        headers: { host: 'sistem-preview.vercel.app' },
      });
      expect(isSistemSubdomain(req)).toBe(true);
    });

    it('rejects main public domain madinblokagung.com', () => {
      const req = new NextRequest('https://madinblokagung.com/', {
        headers: { host: 'madinblokagung.com' },
      });
      expect(isSistemSubdomain(req)).toBe(false);
    });

    it('rejects www.madinblokagung.com', () => {
      const req = new NextRequest('https://www.madinblokagung.com/', {
        headers: { host: 'www.madinblokagung.com' },
      });
      expect(isSistemSubdomain(req)).toBe(false);
    });

    it('rejects localhost:3000 without sistem prefix', () => {
      const req = new NextRequest('http://localhost:3000/', {
        headers: { host: 'localhost:3000' },
      });
      expect(isSistemSubdomain(req)).toBe(false);
    });
  });

  describe('isPublicPathname', () => {
    it('identifies public landing page "/" as public', () => {
      expect(isPublicPathname('/')).toBe(true);
    });

    it('identifies public news routes as public', () => {
      expect(isPublicPathname('/berita')).toBe(true);
      expect(isPublicPathname('/berita/kegiatan-kbm-salaf')).toBe(true);
    });

    it('identifies public static assets as public', () => {
      expect(isPublicPathname('/manifest.webmanifest')).toBe(true);
      expect(isPublicPathname('/sw.js')).toBe(true);
      expect(isPublicPathname('/favicon.ico')).toBe(true);
      expect(isPublicPathname('/logo-madin.png')).toBe(true);
      expect(isPublicPathname('/api/og/rapor-hafalan')).toBe(true);
    });

    it('rejects internal admin paths as non-public', () => {
      expect(isPublicPathname('/login')).toBe(false);
      expect(isPublicPathname('/dashboard')).toBe(false);
      expect(isPublicPathname('/santri')).toBe(false);
      expect(isPublicPathname('/absensi')).toBe(false);
      expect(isPublicPathname('/pengaturan')).toBe(false);
      expect(isPublicPathname('/absen-cepat')).toBe(false);
    });
  });

  describe('Origin Resolvers', () => {
    it('resolves public and sistem origins in localhost', () => {
      const req = new NextRequest('http://sistem.localhost:3000/', {
        headers: { host: 'sistem.localhost:3000' },
      });
      expect(getPublicPortalOrigin(req)).toBe('http://localhost:3000');
      expect(getSistemPortalOrigin(req)).toBe('http://sistem.localhost:3000');
    });

    it('resolves public and sistem origins in production', () => {
      const req = new NextRequest('https://sistem.madinblokagung.com/', {
        headers: { host: 'sistem.madinblokagung.com' },
      });
      expect(getPublicPortalOrigin(req)).toBe('https://www.madinblokagung.com');
      expect(getSistemPortalOrigin(req)).toBe('https://sistem.madinblokagung.com');
    });
  });
});
