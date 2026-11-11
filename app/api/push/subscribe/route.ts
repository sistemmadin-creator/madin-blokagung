import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebPushServerService } from '@/lib/services/webPushServer';
import {
  pushSubscribeSchema,
  pushDeleteSchema,
} from '@/lib/validations/pushNotificationSchema';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  RATE_LIMIT_PROFILES,
} from '@/lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  // 1. Proteksi Rate Limiting (Maksimal 20 pendaftaran per menit per IP)
  const rl = checkRateLimit(getClientIdentifier(req, 'push_sub'), RATE_LIMIT_PROFILES.PUSH_SUBSCRIBE);
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid atau corrupt' },
        { status: 400 }
      );
    }

    // 2. Validasi Skema Zod
    const parseResult = pushSubscribeSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || 'Format data subscription tidak valid';
      return NextResponse.json(
        { error: `Validasi gagal: ${firstError}`, details: errors },
        { status: 400 }
      );
    }

    const { subscription, role, target_identifier } = parseResult.data;

    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    const result = await WebPushServerService.saveSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      role: role || 'wali',
      target_identifier: target_identifier || undefined,
      user_agent: userAgent,
      device_type: isMobile ? 'mobile' : 'desktop',
      dbClient: supabase,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error di /api/push/subscribe (POST):', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menyimpan langganan notifikasi' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // 1. Proteksi Rate Limiting
  const rl = checkRateLimit(getClientIdentifier(req, 'push_sub_del'), RATE_LIMIT_PROFILES.PUSH_SUBSCRIBE);
  if (!rl.success) {
    return createRateLimitResponse(rl);
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Silakan login terlebih dahulu.' },
        { status: 401 }
      );
    }

    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid atau corrupt' },
        { status: 400 }
      );
    }

    // 2. Validasi Skema Zod
    const parseResult = pushDeleteSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(errors)[0]?.[0] || 'Endpoint diperlukan';
      return NextResponse.json(
        { error: `Validasi gagal: ${firstError}`, details: errors },
        { status: 400 }
      );
    }

    const { endpoint } = parseResult.data;

    // 3. Proteksi BOLA / IDOR: Cegah pengguna menghapus langganan akun lain
    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const userRole = String(appMeta.role || '').toLowerCase();
    const isMaster =
      userRole === 'master_admin' ||
      String(appMeta.username || '').toLowerCase() === 'admin' ||
      Boolean(user.email && user.email.startsWith('admin@'));

    if (!isMaster) {
      const { data: sub } = await supabase
        .from('push_subscriptions')
        .select('target_identifier')
        .eq('endpoint', endpoint)
        .maybeSingle();

      if (
        sub &&
        sub.target_identifier &&
        sub.target_identifier !== user.id &&
        sub.target_identifier !== user.email
      ) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda tidak memiliki wewenang untuk menghapus langganan akun lain.' },
          { status: 403 }
        );
      }
    }

    await WebPushServerService.removeSubscription(endpoint, supabase);
    return NextResponse.json({ success: true, message: 'Langganan notifikasi berhasil dihapus' });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error di /api/push/subscribe (DELETE):', err);
    return NextResponse.json(
      { error: err.message || 'Gagal menghapus langganan notifikasi' },
      { status: 500 }
    );
  }
}
