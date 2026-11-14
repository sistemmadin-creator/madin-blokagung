-- ============================================================================
-- MIGRASI: Hapus kolom tidak terpakai pada tabel public.santri
-- Kolom yang dihapus: no_biro, nisn, orda, nik, no_kk, nik_ayah, nama_ibu, nik_ibu
-- Kolom yang dipertahankan: nama_ayah, telepon, no_induk (label UI: NIS)
-- ============================================================================

ALTER TABLE public.santri
  DROP COLUMN IF EXISTS no_biro,
  DROP COLUMN IF EXISTS nisn,
  DROP COLUMN IF EXISTS orda,
  DROP COLUMN IF EXISTS nik,
  DROP COLUMN IF EXISTS no_kk,
  DROP COLUMN IF EXISTS nik_ayah,
  DROP COLUMN IF EXISTS nama_ibu,
  DROP COLUMN IF EXISTS nik_ibu;
