-- ============================================================================
-- MIGRASI HIERARKI BLOK KBM: BLOK DINIYYAH & BLOK TAKROR
-- Aplikasi: Madina Blokagung (madinblokagung-next)
-- ============================================================================

-- 1. Tambahkan kolom blok_diniyyah dan blok_takror pada tabel formasi_kelas
ALTER TABLE public.formasi_kelas
ADD COLUMN IF NOT EXISTS blok_diniyyah TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS blok_takror TEXT DEFAULT '';

-- 2. Backfill / migrasi nilai blok eksisting ke blok_diniyyah (jika ada nilai yang pernah diatur)
UPDATE public.formasi_kelas
SET blok_diniyyah = blok
WHERE (blok_diniyyah IS NULL OR blok_diniyyah = '')
  AND (blok IS NOT NULL AND blok != '' AND blok != '-');

-- 3. Beri komentar dokumentasi kolom
COMMENT ON COLUMN public.formasi_kelas.blok_diniyyah IS 'Induk Blok Zona KBM Diniyyah (Hierarki: Blok Diniyyah > Lokasi Diniyyah)';
COMMENT ON COLUMN public.formasi_kelas.blok_takror IS 'Induk Blok Zona Belajar Takror (Hierarki: Blok Takror > Lokasi Takror)';
