import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebPushServerService } from '@/lib/services/webPushServer';
import { pushSendSchema } from '@/lib/validations/pushNotificationSchema';
import {
  checkRateLimit,
  getClientIdentifier,
  createRateLimitResponse,
  RATE_LIMIT_PROFILES,
} from '@/lib/security/rateLimiter';

export async function POST(req: NextRequest) {
  // 1. Proteksi Beban & Rate Limiting (Maksimal 10 broadcast per menit per IP/akun)
  const identifier = getClientIdentifier(req, 'push_send');
  const rateLimitResult = checkRateLimit(identifier, RATE_LIMIT_PROFILES.PUSH_SEND);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Akses ditolak. Anda harus login sebagai pengurus untuk mengirim notifikasi.' },
        { status: 401 }
      );
    }

    // 2. Verifikasi Otoritas Peran Pengguna (Role-Based Authorization & Anti-BOLA)
    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    let userRole = String(appMeta.role || '').toLowerCase();
    const username = String(appMeta.username || '').toLowerCase();
    const isMaster =
      userRole === 'master_admin' ||
      username === 'admin' ||
      (user.email && user.email.startsWith('admin@'));

    // Jika role belum tertera di JWT app_metadata, verifikasi ke tabel user_accounts
    if (!isMaster && !userRole) {
      const { data: userAcc } = await supabase
        .from('user_accounts')
        .select('role, is_active')
        .eq('id', user.id)
        .maybeSingle();

      if (userAcc) {
        if (userAcc.is_active === false) {
          return NextResponse.json(
            { error: 'Akses ditolak: Akun pengurus Anda sedang dinonaktifkan.' },
            { status: 403 }
          );
        }
        userRole = String(userAcc.role || '').toLowerCase();
      }
    }

    const ALLOWED_BROADCAST_ROLES = new Set([
      'master_admin',
      'admin',
      'pkm_kurikulum',
      'ketua_madin',
      'pengurus',
      'custom_user',
    ]);
    const FORBIDDEN_ROLES = new Set(['wali', 'santri', 'tamu', 'guest']);

    if (FORBIDDEN_ROLES.has(userRole) || (!isMaster && userRole && !ALLOWED_BROADCAST_ROLES.has(userRole))) {
      return NextResponse.json(
        { error: 'Akses ditolak: Peran akun Anda tidak memiliki hak akses untuk menyiarkan notifikasi push.' },
        { status: 403 }
      );
    }

    // 3. Validasi Skema Input Ketat menggunakan Zod
    let bodyRaw: unknown;
    try {
      bodyRaw = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Format JSON payload tidak valid atau corrupt' },
        { status: 400 }
      );
    }

    const parseResult = pushSendSchema.safeParse(bodyRaw);
    if (!parseResult.success) {
      const errors = parseResult.error.flatten().fieldErrors;
      const firstError =
        Object.values(errors)[0]?.[0] || 'Validasi skema input tidak terpenuhi.';
      return NextResponse.json(
        {
          error: `Validasi gagal: ${firstError}`,
          details: errors,
        },
        { status: 400 }
      );
    }

    const {
      title,
      body: content,
      url,
      icon,
      badge,
      role,
      target_identifier,
      endpoint,
    } = parseResult.data;

    const payload = {
      title,
      body: content,
      url: url || '/',
      icon: icon || '/logo-madin.png',
      badge: badge || '/logo-madin.png',
      tag: 'madin-' + Date.now(),
    };

    const result = await WebPushServerService.dispatchPushNotification({
      payload,
      endpoint,
      role,
      targetIdentifier: target_identifier || undefined,
      dbClient: supabase,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error di /api/push/send (POST):', err);
    return NextResponse.json(
      { error: err.message || 'Gagal mengirim notifikasi push' },
      { status: 500 }
    );
  }
}
