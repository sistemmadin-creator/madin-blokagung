import { supabase } from '@/lib/supabase/client';
import { sanitizeHttpUrl } from '@/lib/security/urlSanitizer';

export const BUCKET_NAME = 'madin-media';
export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

function normalizeImageMime(mime?: string): string {
  const clean = String(mime || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (clean === 'image/jpg') return 'image/jpeg';
  return clean;
}

/**
 * Mengonversi Base64 Data URL menjadi Blob biner agar hemat bandwidth dan memory saat upload.
 */
export function base64ToBlob(base64Data: string): Blob {
  const parts = base64Data.split(';base64,');
  const contentType = normalizeImageMime(parts[0]?.replace('data:', '')) || 'image/jpeg';
  const raw = atob(parts[1] || '');
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

export type StorageCategory = 'santri' | 'asatidz' | 'formasi' | 'kepengurusan' | 'mutakhorijin';

/**
 * Service terpadu untuk upload foto ke Supabase Storage.
 * Memiliki fitur SMART FALLBACK: Jika bucket Supabase Storage belum dibuat di dashboard,
 * fungsi akan otomatis mengembalikan string Base64 yang telah tervalidasi MIME & ukurannya
 * sehingga sistem tidak crash dan foto tetap tersimpan dengan aman di database.
 */
export const StorageService = {
  /**
   * Mengunggah foto ke Supabase Storage bucket 'madin-media'
   */
  async uploadPhoto(
    imageInput: string | File | Blob,
    category: StorageCategory,
    identifier: string,
    customSuffix?: string
  ): Promise<string> {
    if (!imageInput) return '';

    if (typeof imageInput === 'string' && /^https?:\/\//i.test(imageInput)) {
      return sanitizeHttpUrl(imageInput) || '';
    }

    try {
      let fileBlob: Blob;
      let contentType = 'image/jpeg';

      if (typeof imageInput === 'string') {
        if (!imageInput.startsWith('data:image/')) {
          return '';
        }
        const matchType = imageInput.match(/^data:([^;,]+);base64,/i);
        if (!matchType) {
          console.warn('[StorageService] Format data URL foto tidak valid.');
          return '';
        }
        const normalizedMime = normalizeImageMime(matchType[1]);
        if (!ALLOWED_IMAGE_MIME.has(normalizedMime)) {
          console.warn(
            `[StorageService] Tipe MIME '${normalizedMime}' ditolak. Hanya JPEG, PNG, dan WEBP yang diizinkan.`
          );
          return '';
        }
        contentType = normalizedMime;
        fileBlob = base64ToBlob(imageInput);
      } else {
        const normalizedMime = normalizeImageMime(imageInput.type);
        if (!ALLOWED_IMAGE_MIME.has(normalizedMime)) {
          console.warn(
            `[StorageService] Tipe file '${normalizedMime || 'unknown'}' ditolak. Hanya JPEG, PNG, dan WEBP yang diizinkan.`
          );
          return '';
        }
        contentType = normalizedMime;
        fileBlob = imageInput;
      }

      if (fileBlob.size <= 0 || fileBlob.size > MAX_UPLOAD_SIZE_BYTES) {
        console.warn(
          `[StorageService] Ukuran file (${fileBlob.size} byte) tidak valid atau melebihi batas maksimal 2 MB.`
        );
        return '';
      }

      const cleanId = String(identifier || 'temp').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanSuffix = customSuffix ? `_${String(customSuffix).replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
      const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${category}/${cleanId}${cleanSuffix}.${ext}`;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType,
        });

      if (error) {
        console.warn(
          `[StorageService] Bucket '${BUCKET_NAME}' belum aktif atau upload gagal (${error.message}). Menggunakan fallback Base64 tervalidasi.`
        );
        return typeof imageInput === 'string' ? imageInput : '';
      }

      const { data: publicData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      if (publicData?.publicUrl) {
        return publicData.publicUrl;
      }

      return typeof imageInput === 'string' ? imageInput : '';
    } catch (err: any) {
      console.warn('[StorageService] Gagal memproses upload foto, menggunakan fallback:', err?.message);
      return '';
    }
  },

  /**
   * Menghapus foto dari Supabase Storage jika tersimpan sebagai URL storage
   */
  async deletePhoto(photoUrl: string): Promise<boolean> {
    if (!photoUrl || !photoUrl.includes(BUCKET_NAME)) return false;

    try {
      const parts = photoUrl.split(`/${BUCKET_NAME}/`);
      if (parts.length < 2) return false;

      const relativePath = decodeURIComponent(parts[1].split('?')[0]);
      if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/')) {
        return false;
      }

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
