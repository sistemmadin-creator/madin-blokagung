import { supabase } from '@/lib/supabase/client';
import { extractUserProfile } from '@/lib/utils/authHelper';

export async function logActivity(aktivitas: string, detail: string = '-') {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const profile = extractUserProfile(user);

    await supabase.from('activity_logs').insert([
      {
        username: profile?.username || 'admin',
        nama: profile?.fullName || 'Master Administrator',
        aktivitas,
        detail,
      },
    ]);
  } catch (err) {
    console.error('Gagal mencatat audit log:', err);
  }
}
