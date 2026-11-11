import { NextRequest, NextResponse } from 'next/server';
import {
  captureAppError,
  captureAppMessage,
  sanitizeErrorData,
  isSentryConfigured,
} from '@/lib/services/errorMonitoring';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
} from '@/lib/security/rateLimiter';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'Madin Blokagung Error Monitoring',
    sentryConfigured: isSentryConfigured(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  // Proteksi Rate Limiting
  const id = getClientIdentifier(req, 'monitoring_test');
  const rl = checkRateLimit(id, { max: 15, windowMs: 60 * 1000 });
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid' },
        { status: 400 }
      );
    }

    const { action, message, payload } = body;

    // Uji sanitasi data sensitif
    const sanitizedPayload = sanitizeErrorData(payload || {});

    if (action === 'capture_message') {
      const eventId = captureAppMessage(
        message || 'Uji coba pesan error monitoring',
        'info',
        sanitizedPayload
      );
      return NextResponse.json({
        success: true,
        type: 'message',
        eventId,
        sanitizedPayload,
      });
    }

    if (action === 'capture_error') {
      const dummyError = new Error(message || 'Uji coba exception monitoring');
      const eventId = captureAppError(dummyError, sanitizedPayload);
      return NextResponse.json({
        success: true,
        type: 'error',
        eventId,
        sanitizedPayload,
      });
    }

    // Default: kembalikan hasil uji sanitasi
    return NextResponse.json({
      success: true,
      sanitized: sanitizedPayload,
      sentryConfigured: isSentryConfigured(),
    });
  } catch (err: unknown) {
    const errMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}
