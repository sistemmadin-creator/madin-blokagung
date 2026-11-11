import * as Sentry from '@sentry/nextjs';

/**
 * Daftar kata kunci sensitif yang WAJIB disamarkan (redacted)
 * agar data privasi santri dan kredensial server tidak bocor ke log Sentry pihak ketiga.
 */
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'private_key',
  'apikey',
  'auth',
  'authorization',
  'cookie',
  'nis',
  'nik',
  'no_hp',
  'phone',
  'telepon',
  'whatsapp',
  'service_role',
];

/**
 * Regex untuk mendeteksi nomor telepon seluler Indonesia (08xxx / 628xxx / +628xxx)
 */
const PHONE_REGEX = /(\+?62|0)8[1-9][0-9]{7,11}/g;

/**
 * Regex untuk mendeteksi nomor token/JWT panjang
 */
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;

/**
 * Fungsi sanitasi rekursif untuk membersihkan data sensitif
 */
export function sanitizeErrorData<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized: string = input;
    // Samarkan nomor telepon
    sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
    // Samarkan token JWT
    sanitized = sanitized.replace(JWT_REGEX, '[JWT_REDACTED]');
    return sanitized as unknown as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeErrorData(item)) as unknown as T;
  }

  if (typeof input === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = SENSITIVE_KEYS.some((sensitive) => lowerKey.includes(sensitive));

      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = sanitizeErrorData(value);
      }
    }
    return result as unknown as T;
  }

  return input;
}

/**
 * Cek apakah Sentry DSN telah dikonfigurasi aktif
 */
export function isSentryConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN);
}

/**
 * Tangkap error aplikasi dengan sanitasi otomatis data sensitif
 */
export function captureAppError(
  error: unknown,
  context?: Record<string, unknown>
): string {
  const sanitizedContext = context ? sanitizeErrorData(context) : {};

  // Log lokal di terminal/console untuk debugging development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorMonitoring] Error captured:', error, sanitizedContext);
  }

  try {
    const eventId = Sentry.captureException(error, {
      extra: sanitizedContext,
    });
    return eventId || `local-${Date.now()}`;
  } catch (err) {
    console.warn('[ErrorMonitoring] Gagal mengirim error ke Sentry:', err);
    return `fallback-${Date.now()}`;
  }
}

/**
 * Kirim pesan/alert custom ke Sentry dengan sanitasi otomatis
 */
export function captureAppMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): string {
  const sanitizedMsg = sanitizeErrorData(message);
  const sanitizedContext = context ? sanitizeErrorData(context) : {};

  try {
    const eventId = Sentry.captureMessage(sanitizedMsg, {
      level,
      extra: sanitizedContext,
    });
    return eventId || `local-${Date.now()}`;
  } catch {
    return `fallback-${Date.now()}`;
  }
}
