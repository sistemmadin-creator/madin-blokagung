import type { User } from '@supabase/supabase-js';

export const INTERNAL_AUTH_DOMAIN = 'madinblokagung.local';

export interface ActiveUserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  roleLabel: string;
}

// Map plain usernames (e.g. "admin", "kurikulum") to the canonical internal email used by Supabase Auth.
export function resolveLoginEmail(usernameOrEmail: string): string {
  const cleaned = usernameOrEmail.trim().toLowerCase();
  if (!cleaned) return '';
  if (cleaned.includes('@')) {
    return cleaned;
  }
  return `${cleaned}@${INTERNAL_AUTH_DOMAIN}`;
}

// Read role claims from app_metadata first because user_metadata is user-editable in Supabase.
export function extractUserProfile(user: User | null): ActiveUserProfile | null {
  if (!user) return null;

  const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata || {}) as Record<string, unknown>;
  const fallbackUsername = user.email ? user.email.split('@')[0] : 'pengurus';

  const username =
    (typeof appMeta.username === 'string' && appMeta.username) ||
    (typeof userMeta.username === 'string' && userMeta.username) ||
    fallbackUsername;

  const fullName =
    (typeof appMeta.full_name === 'string' && appMeta.full_name) ||
    (typeof userMeta.full_name === 'string' && userMeta.full_name) ||
    username;

  const role =
    (typeof appMeta.role === 'string' && appMeta.role) || 'pengurus';

  const roleLabel =
    (typeof appMeta.role_label === 'string' && appMeta.role_label) ||
    (typeof userMeta.role_label === 'string' && userMeta.role_label) ||
    (role === 'master_admin' ? 'Master Admin' : 'PKM. Kurikulum');

  return {
    id: user.id,
    username,
    email: user.email || '',
    fullName,
    role,
    roleLabel,
  };
}

// Restrict post-login redirects to internal paths to prevent open-redirect attacks.
export function sanitizeNextPath(nextParam: string | null | undefined): string {
  if (!nextParam) return '/beranda';
  const trimmed = nextParam.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.startsWith('/login')
  ) {
    return '/beranda';
  }
  return trimmed;
}
