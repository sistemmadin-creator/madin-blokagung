-- ============================================================================
-- MIGRASI: Penambahan kolom tahun_ajaran pada setoran_hafalan_records
-- Mendukung filter & rekapitulasi hafalan per tahun ajaran (contoh: '2026/2027')
-- ============================================================================

ALTER TABLE public.setoran_hafalan_records
ADD COLUMN IF NOT EXISTS tahun_ajaran TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_setoran_tahun_ajaran
ON public.setoran_hafalan_records (tahun_ajaran);

CREATE INDEX IF NOT EXISTS idx_setoran_no_induk_ta
ON public.setoran_hafalan_records (no_induk, tahun_ajaran);
