import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebPushServerService } from '@/lib/services/webPushServer';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { subscription, role, target_identifier } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Format data subscription tidak valid' },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get('user-agent') || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

    const result = await WebPushServerService.saveSubscription({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      role: role || 'wali',
      target_identifier: target_identifier || null,
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

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint diperlukan' }, { status: 400 });
    }

    // Proteksi BOLA / IDOR: Cegah pengguna menghapus langganan akun lain
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
