import { supabase } from '@/lib/supabase/client';

export async function logActivity(aktivitas: string, detail: string = '-') {
  try {
    await supabase.from('activity_logs').insert([
      {
        username: 'admin',
        nama: 'Master Administrator',
        aktivitas,
        detail,
      },
    ]);
  } catch (err) {
    console.error('Gagal mencatat audit log:', err);
  }
}
