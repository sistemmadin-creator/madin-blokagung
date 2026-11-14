-- ============================================================================
-- MIGRASI: PENAMBAHAN NIS, KODE GURU (KG), STATUS & RESET NIA ASATIDZ
-- Tanggal: 2026-11-14
-- Aplikasi: Madina Blokagung (madinblokagung-next)
-- ============================================================================

-- 1. Tambah kolom nis, kode_guru, dan status pada public.asatidz
ALTER TABLE public.asatidz
  ADD COLUMN IF NOT EXISTS nis TEXT,
  ADD COLUMN IF NOT EXISTS kode_guru TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'aktif';

-- 2. Constraint enum untuk kolom status
ALTER TABLE public.asatidz
  DROP CONSTRAINT IF EXISTS chk_asatidz_status;
ALTER TABLE public.asatidz
  ADD CONSTRAINT chk_asatidz_status
  CHECK (status IN ('aktif', 'tidak aktif', 'dikeluarkan'));

-- 3. Migrasi data lama: pindahkan nilai nia lama (B54, dst.) ke kode_guru, lalu kosongkan nia
UPDATE public.asatidz
SET
  kode_guru = nia,
  nia = NULL
WHERE kode_guru IS NULL AND nia IS NOT NULL;

-- 4. Indeks pencarian & performa
CREATE INDEX IF NOT EXISTS idx_asatidz_nis ON public.asatidz (nis);
CREATE INDEX IF NOT EXISTS idx_asatidz_kode_guru ON public.asatidz (kode_guru);
CREATE INDEX IF NOT EXISTS idx_asatidz_status ON public.asatidz (status);
