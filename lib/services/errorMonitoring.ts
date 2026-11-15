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
  'api_key',
  'x-api-key',
  'auth',
  'authorization',
  'cookie',
  'set-cookie',
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
 * Regex untuk mendeteksi query parameter sensitif pada URL/query string
 */
const QUERY_SECRET_REGEX =
  /([?&](?:token|access_token|refresh_token|password|apikey|api_key|secret|phone|telepon|no_hp)=)([^&#\s]+)/gi;

/**
 * Fungsi sanitasi rekursif untuk membersihkan data sensitif
 */
export function sanitizeErrorData<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    let sanitized: string = input;
    sanitized = sanitized.replace(PHONE_REGEX, '[PHONE_REDACTED]');
    sanitized = sanitized.replace(JWT_REGEX, '[JWT_REDACTED]');
    sanitized = sanitized.replace(QUERY_SECRET_REGEX, '$1[REDACTED]');
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
 * Sanitasi menyeluruh pada objek Sentry Event sebelum dikirim ke cloud (beforeSend hook).
 */
export function sanitizeSentryEvent<T extends Sentry.Event>(event: T): T {
  if (!event) return event;

  if (typeof event.message === 'string') {
    event.message = sanitizeErrorData(event.message);
  }

  if (event.exception?.values && Array.isArray(event.exception.values)) {
    event.exception.values = event.exception.values.map((ex) => ({
      ...ex,
      value: typeof ex.value === 'string' ? sanitizeErrorData(ex.value) : ex.value,
    }));
  }

  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
      ...crumb,
      message: typeof crumb.message === 'string' ? sanitizeErrorData(crumb.message) : crumb.message,
      data: crumb.data ? sanitizeErrorData(crumb.data) : crumb.data,
    }));
  }

  if (event.request) {
    if (event.request.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['Authorization'];
      delete event.request.headers['cookie'];
      delete event.request.headers['Cookie'];
      delete event.request.headers['x-api-key'];
      delete event.request.headers['X-Api-Key'];
      event.request.headers = sanitizeErrorData(event.request.headers);
    }
    if (event.request.cookies) {
      delete event.request.cookies;
    }
    if (event.request.query_string) {
      event.request.query_string = sanitizeErrorData(event.request.query_string);
    }
    if (event.request.url) {
      event.request.url = sanitizeErrorData(event.request.url);
    }
    if (event.request.data) {
      event.request.data = sanitizeErrorData(event.request.data);
    }
  }

  if (event.extra) {
    event.extra = sanitizeErrorData(event.extra);
  }

  if (event.contexts) {
    event.contexts = sanitizeErrorData(event.contexts);
  }

  return event;
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

  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorMonitoring] Error captured:', error, sanitizedContext);
  }

  try {
    const normalizedError =
      error instanceof Error
        ? Object.assign(new Error(sanitizeErrorData(error.message)), {
            name: error.name,
            stack: error.stack ? sanitizeErrorData(error.stack) : undefined,
          })
        : sanitizeErrorData(error);

    const eventId = Sentry.captureException(normalizedError, {
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
