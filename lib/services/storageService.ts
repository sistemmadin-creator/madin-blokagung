import { supabase } from '@/lib/supabase/client';

export const BUCKET_NAME = 'madin-media';

/**
 * Mengonversi Base64 Data URL menjadi Blob biner agar hemat bandwidth dan memory saat upload.
 */
export function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(';base64,');
  const contentType = parts[0]?.replace('data:', '') || 'image/jpeg';
  const raw = atob(parts[1] || '');
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

export type StorageCategory = 'santri' | 'asatidz' | 'formasi';

/**
 * Service terpadu untuk upload foto ke Supabase Storage.
 * Memiliki fitur SMART FALLBACK: Jika bucket Supabase Storage belum dibuat di dashboard,
 * fungsi akan otomatis mengembalikan string Base64 aslinya sehingga sistem tidak crash
 * dan foto tetap tersimpan dengan aman di database.
 */
export const StorageService = {
  /**
   * Mengunggah foto ke Supabase Storage bucket 'madin-media'
   * @param imageInput String Base64 atau File/Blob
   * @param category Kategori folder: 'santri' | 'asatidz' | 'formasi'
   * @param identifier ID entitas (misal no_induk, nia, atau id_kelas)
   * @param customSuffix Suffix opsional (misal 'takror' atau 'diniyyah')
   * @returns URL publik foto (jika bucket aktif) atau string Base64 (jika bucket belum aktif/error)
   */
  async uploadPhoto(
    imageInput: string | File | Blob,
    category: StorageCategory,
    identifier: string,
    customSuffix?: string
  ): Promise<string> {
    if (!imageInput) return '';

    // Jika input sudah berupa URL (http/https), tidak perlu upload ulang
    if (typeof imageInput === 'string' && /^https?:\/\//i.test(imageInput)) {
      return imageInput;
    }

    try {
      let fileBlob: Blob;
      let contentType = 'image/jpeg';

      if (typeof imageInput === 'string') {
        if (!imageInput.startsWith('data:image')) {
          // Bukan data URL dan bukan HTTP URL, kembalikan apa adanya
          return imageInput;
        }
        fileBlob = base64ToBlob(imageInput);
        const matchType = imageInput.match(/^data:([^;]+);/);
        if (matchType) contentType = matchType[1];
      } else {
        fileBlob = imageInput;
        contentType = imageInput.type || 'image/jpeg';
      }

      // Bersihkan nama file dari karakter terlarang
      const cleanId = String(identifier || 'temp').replace(/[^a-zA-Z0-9_-]/g, '_');
      const suffixPart = customSuffix ? `_${customSuffix}` : '';
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const filePath = `${category}/${cleanId}${suffixPart}.${ext}`;

      // Coba upload ke Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType,
        });

      if (error) {
        // Jika error (misal bucket belum dibuat: "Bucket not found" / statusCode 404 / 400)
        console.warn(`[StorageService] Bucket '${BUCKET_NAME}' belum aktif atau upload gagal (${error.message}). Menggunakan fallback Base64.`);
        return typeof imageInput === 'string' ? imageInput : '';
      }

      // Ambil Public URL jika upload berhasil
      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }

      return typeof imageInput === 'string' ? imageInput : '';
    } catch (err: any) {
      console.warn('[StorageService] Gagal memproses upload foto, menggunakan fallback:', err?.message);
      return typeof imageInput === 'string' ? imageInput : '';
    }
  },

  /**
   * Menghapus foto dari Supabase Storage jika tersimpan sebagai URL storage
   */
  async deletePhoto(photoUrl: string): Promise<boolean> {
    if (!photoUrl || !photoUrl.includes(BUCKET_NAME)) return false;

    try {
      // Ekstrak path setelah nama bucket
      const parts = photoUrl.split(`/${BUCKET_NAME}/`);
      if (parts.length < 2) return false;

      const relativePath = decodeURIComponent(parts[1].split('?')[0]);
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([relativePath]);

      if (error) {
        console.warn('[StorageService] Gagal menghapus file dari storage:', error.message);
        return false;
      }
      return true;
    } catch (err: any) {
      console.warn('[StorageService] Delete photo error:', err?.message);
      return false;
    }
  },
};
