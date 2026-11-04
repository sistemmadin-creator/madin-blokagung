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
        { error: 'Akses ditolak. Anda harus login sebagai pengurus untuk mengirim notifikasi.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { title, body: content, url, icon, badge, role, target_identifier, endpoint } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Judul (title) dan isi (body) notifikasi harus diisi' },
        { status: 400 }
      );
    }

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
      targetIdentifier: target_identifier,
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
