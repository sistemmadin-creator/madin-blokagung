-- ============================================================================
-- MIGRASI: HARDENING TABEL ASATIDZ, REALTIME IDENTITY & TRIGGER ATURAN JAH KBM
-- Tanggal: 2026-11-02
-- Aplikasi: Madina Blokagung (madinblokagung-next)
-- ============================================================================

-- 1. FUNGSI TRIGGER: Sanitasi otomatis penugasan KBM berbasis Jah
-- Hanya Jah: Mustahiq, Mustahiqoh, dan MS & Koor yang diizinkan memiliki data KBM
CREATE OR REPLACE FUNCTION public.fn_sanitize_asatidz_kbm_assignment()
RETURNS TRIGGER AS $$
DECLARE
    clean_jah TEXT;
BEGIN
    clean_jah := lower(trim(coalesce(NEW.jah_asatidz, '')));

    -- Jika Jah bukan Mustahiq, Mustahiqoh, atau MS & Koor, sterilkan kolom penugasan KBM
    IF clean_jah NOT IN ('mustahiq', 'mustahiqoh', 'ms & koor') THEN
        NEW.tingkat_asatidz := '';
        NEW.din_kls_asatidz := '';
        NEW.din_bag_asatidz := '';
        NEW.lokasi_diniyyah := '';
        NEW.lokasi_takror   := '';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. PASANG TRIGGER PADA TABEL asatidz
DROP TRIGGER IF EXISTS trg_sanitize_asatidz_kbm ON public.asatidz;
CREATE TRIGGER trg_sanitize_asatidz_kbm
BEFORE INSERT OR UPDATE ON public.asatidz
FOR EACH ROW
EXECUTE FUNCTION public.fn_sanitize_asatidz_kbm_assignment();

-- 3. HARDENING REALTIME REPLICA IDENTITY
-- Mengaktifkan pengiriman payload lengkap pada event DELETE Supabase Realtime
ALTER TABLE public.asatidz REPLICA IDENTITY FULL;

-- 4. INDEKS PENCARIAN & INTEGRITAS NIA
-- Mempercepat query rollback, undo/redo, serta filter data asatidz
CREATE INDEX IF NOT EXISTS idx_asatidz_nia ON public.asatidz (nia);
CREATE INDEX IF NOT EXISTS idx_asatidz_jah ON public.asatidz (jah_asatidz);
