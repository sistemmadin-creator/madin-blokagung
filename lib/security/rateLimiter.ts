import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  windowMs: number; // Durasi jendela waktu (dalam milidetik)
  max: number; // Maksimal request yang diizinkan dalam jendela waktu
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number; // Timestamp Unix kapan kuota direset penuh
  retryAfter: number; // Detik yang harus ditunggu pengguna jika limit habis
}

// Penyimpanan in-memory per-identifier: Map<key, timestamp[]>
const requestLog = new Map<string, number[]>();

// Jadwal pembersihan memori otomatis (garbage collection) setiap 5 menit
let lastCleanup = Date.now();
function cleanupExpired(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // Maksimal cleanup sekali per menit
  lastCleanup = now;

  requestLog.forEach((timestamps: number[], key: string) => {
    const validTimestamps = timestamps.filter((t: number) => now - t < windowMs * 2);
    if (validTimestamps.length === 0) {
      requestLog.delete(key);
    } else {
      requestLog.set(key, validTimestamps);
    }
  });
}

/**
 * Mendapatkan identifier client yang aman dari request headers (IP atau User ID)
 */
export function getClientIdentifier(req: NextRequest, prefix: string = 'global'): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  let ip = '127.0.0.1';
  if (forwardedFor) {
    ip = forwardedFor.split(',')[0].trim();
  } else {
    ip = req.headers.get('x-real-ip') || '127.0.0.1';
  }

  return `${prefix}:${ip}`;
}

/**
 * Memeriksa apakah request memenuhi kuota Sliding Window Rate Limiter
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = { windowMs: 60_000, max: 60 }
): RateLimitResult {
  const now = Date.now();
  cleanupExpired(config.windowMs);

  const timestamps = requestLog.get(identifier) || [];
  const windowStart = now - config.windowMs;

  // Saring hanya request yang masih berada dalam jendela waktu sliding
  const currentWindowTimestamps = timestamps.filter((t: number) => t > windowStart);

  if (currentWindowTimestamps.length >= config.max) {
    const oldestTimestamp = currentWindowTimestamps[0] || windowStart;
    const retryAfterMs = oldestTimestamp + config.windowMs - now;
    const retryAfter = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      success: false,
      limit: config.max,
      remaining: 0,
      resetTime: oldestTimestamp + config.windowMs,
      retryAfter,
    };
  }

  // Tambahkan request saat ini
  currentWindowTimestamps.push(now);
  requestLog.set(identifier, currentWindowTimestamps);

  const remaining = Math.max(0, config.max - currentWindowTimestamps.length);
  return {
    success: true,
    limit: config.max,
    remaining,
    resetTime: now + config.windowMs,
    retryAfter: 0,
  };
}

/**
 * Menghasilkan response HTTP 429 Too Many Requests standar dengan header RFC-6585
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      online: false,
      status: 'TOO_MANY_REQUESTS',
      error: `Terlalu banyak permintaan (Rate limit terlampaui). Silakan coba lagi dalam ${result.retryAfter} detik.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
      },
    }
  );
}

// Konfigurasi Standar Aplikasi MADINA
export const RATE_LIMIT_PROFILES = {
  // Pengiriman Broadcast Push Notifikasi: Maksimal 10 request per menit per akun/IP
  PUSH_SEND: { windowMs: 60_000, max: 10 },
  // Pendaftaran Subscription Push: Maksimal 20 request per menit per IP
  PUSH_SUBSCRIBE: { windowMs: 60_000, max: 20 },
  // WAHA WhatsApp Gateway Proxy: Maksimal 30 request per menit per IP
  WAHA_PROXY: { windowMs: 60_000, max: 30 },
};
