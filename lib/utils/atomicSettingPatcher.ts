import { supabase } from '@/lib/supabase/client';

export interface PatchResult<T> {
  success: boolean;
  data?: T;
  error?: any;
}

/**
 * Utilitas untuk memodifikasi pengaturan berbasis JSON (app_settings)
 * secara aman dengan mekanisme Read-Modify-Write & Retry Concurrency Protection (Fase 4).
 *
 * @param key Kunci pengaturan di tabel app_settings (misal: 'JADWAL_MENGAJAR_ASATIDZ')
 * @param updater Fungsi transformasi untuk mengubah nilai saat ini
 * @param fallbackDefault Nilai default jika record belum pernah ada
 * @param maxRetries Jumlah maksimal percobaan ulang jika terjadi tabrakan transaksi
 */
export async function patchAppSettingsJson<T = any>(
  key: string,
  updater: (currentValue: T) => T,
  fallbackDefault: T,
  maxRetries = 3
): Promise<PatchResult<T>> {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      // 1. Ambil state terbaru dari server
      const { data: row, error: fetchError } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let current: T = fallbackDefault;
      if (row?.value) {
        if (typeof row.value === 'string') {
          try {
            current = JSON.parse(row.value);
          } catch {
            current = row.value as any;
          }
        } else {
          current = row.value as T;
        }
      }

      // 2. Jalankan fungsi patch granular
      const updated = updater(current);

      // 3. Simpan state hasil transformasi kembali ke database
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert([{ key, value: updated }], { onConflict: 'key' });

      if (upsertError) throw upsertError;

      return {
        success: true,
        data: updated,
      };
    } catch (err: any) {
      console.warn(`[AtomicPatch] Percobaan ke-${attempt} untuk key "${key}" gagal:`, err.message);
      if (attempt >= maxRetries) {
        return {
          success: false,
          error: err,
        };
      }
      // Tunggu jeda singkat sebelum mencoba kembali (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, attempt * 60));
    }
  }

  return { success: false, error: new Error('Max retries exceeded') };
}
