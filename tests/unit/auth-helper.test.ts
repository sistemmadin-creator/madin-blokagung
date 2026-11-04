import { describe, it, expect } from 'vitest';
import {
  resolveLoginEmail,
  extractUserProfile,
  sanitizeNextPath,
  INTERNAL_AUTH_DOMAIN,
} from '@/lib/utils/authHelper';

describe('authHelper utilities', () => {
  describe('resolveLoginEmail', () => {
    it('maps plain username to internal domain in lowercase', () => {
      expect(resolveLoginEmail('admin')).toBe(`admin@${INTERNAL_AUTH_DOMAIN}`);
      expect(resolveLoginEmail('  Kurikulum  ')).toBe(`kurikulum@${INTERNAL_AUTH_DOMAIN}`);
    });

    it('preserves full email if @ is provided', () => {
      expect(resolveLoginEmail('admin@madinblokagung.local')).toBe('admin@madinblokagung.local');
      expect(resolveLoginEmail('Ustadz@Example.com')).toBe('ustadz@example.com');
    });

    it('returns empty string for empty input', () => {
      expect(resolveLoginEmail('   ')).toBe('');
    });
  });

  describe('extractUserProfile', () => {
    it('returns null when user is null', () => {
      const profile = extractUserProfile(null);
      expect(profile).toBeNull();
    });

    it('prioritizes app_metadata over user_metadata for role and identity', () => {
      const profile = extractUserProfile({
        id: '11111111-1111-4111-8111-111111111101',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'admin@madinblokagung.local',
        app_metadata: {
          username: 'admin',
          full_name: 'Master Administrator',
          role: 'master_admin',
          role_label: 'Master Admin',
        },
        user_metadata: {
          role: 'pkm_kurikulum',
          full_name: 'Spoofed Name',
        },
      });

      expect(profile).not.toBeNull();
      expect(profile?.username).toBe('admin');
      expect(profile?.fullName).toBe('Master Administrator');
      expect(profile?.role).toBe('master_admin');
      expect(profile?.roleLabel).toBe('Master Admin');
    });

    it('extracts pkm_kurikulum role and label accurately', () => {
      const profile = extractUserProfile({
        id: '11111111-1111-4111-8111-111111111102',
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: 'kurikulum@madinblokagung.local',
        app_metadata: {
          username: 'kurikulum',
          full_name: 'PKM. Kurikulum',
          role: 'pkm_kurikulum',
          role_label: 'PKM. Kurikulum',
        },
        user_metadata: {},
      });

      expect(profile).not.toBeNull();
      expect(profile?.username).toBe('kurikulum');
      expect(profile?.fullName).toBe('PKM. Kurikulum');
      expect(profile?.role).toBe('pkm_kurikulum');
      expect(profile?.roleLabel).toBe('PKM. Kurikulum');
    });
  });

  describe('sanitizeNextPath', () => {
    it('allows internal relative paths and blocks open redirects or /login loops', () => {
      expect(sanitizeNextPath('/santri')).toBe('/santri');
      expect(sanitizeNextPath('/jadwal-kbm?tab=pa')).toBe('/jadwal-kbm?tab=pa');
      expect(sanitizeNextPath('//evil.com')).toBe('/dashboard');
      expect(sanitizeNextPath('https://evil.com')).toBe('/dashboard');
      expect(sanitizeNextPath('/login')).toBe('/dashboard');
      expect(sanitizeNextPath(null)).toBe('/dashboard');
    });
  });
});
