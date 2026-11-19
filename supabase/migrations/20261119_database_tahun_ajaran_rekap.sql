-- Migration: Database Tahun Ajaran (Rekap Progres Tahunan Madrasah)
-- Fokus khusus kelas 1-4 ULA, 1-2 WUSTHO, 1-2 ULYA (tidak terhubung ke modul EBTADIN).

CREATE TABLE IF NOT EXISTS public.database_tahun_ajaran_rekap (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tahun_ajaran_masehi TEXT NOT NULL UNIQUE,
    tahun_ajaran_hijriyah TEXT NOT NULL DEFAULT '',
    status_arsip TEXT NOT NULL DEFAULT 'draf' CHECK (status_arsip IN ('draf', 'terkunci')),
    ringkasan_umum JSONB NOT NULL DEFAULT '{}'::jsonb,
    rekap_per_kelas JSONB NOT NULL DEFAULT '[]'::jsonb,
    catatan_evaluasi TEXT NOT NULL DEFAULT '',
    dibuat_oleh TEXT NOT NULL DEFAULT 'Sistem',
    diperbarui_oleh TEXT NOT NULL DEFAULT 'Sistem',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_database_ta_rekap_tahun
    ON public.database_tahun_ajaran_rekap (tahun_ajaran_masehi DESC);

ALTER TABLE public.database_tahun_ajaran_rekap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "database_ta_rekap_select_pengurus" ON public.database_tahun_ajaran_rekap;
CREATE POLICY "database_ta_rekap_select_pengurus"
    ON public.database_tahun_ajaran_rekap
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "database_ta_rekap_insert_scoped" ON public.database_tahun_ajaran_rekap;
CREATE POLICY "database_ta_rekap_insert_scoped"
    ON public.database_tahun_ajaran_rekap
    FOR INSERT
    TO authenticated
    WITH CHECK (
        private.can_page_mode('database-ta', 'edit')
        OR private.can_page_mode('database-ta-arsip', 'edit')
    );

DROP POLICY IF EXISTS "database_ta_rekap_update_scoped" ON public.database_tahun_ajaran_rekap;
CREATE POLICY "database_ta_rekap_update_scoped"
    ON public.database_tahun_ajaran_rekap
    FOR UPDATE
    TO authenticated
    USING (
        private.can_page_mode('database-ta', 'update')
        OR private.can_page_mode('database-ta-arsip', 'update')
    )
    WITH CHECK (
        private.can_page_mode('database-ta', 'update')
        OR private.can_page_mode('database-ta-arsip', 'update')
    );

DROP POLICY IF EXISTS "database_ta_rekap_delete_scoped" ON public.database_tahun_ajaran_rekap;
CREATE POLICY "database_ta_rekap_delete_scoped"
    ON public.database_tahun_ajaran_rekap
    FOR DELETE
    TO authenticated
    USING (
        private.can_page_mode('database-ta', 'delete')
        OR private.can_page_mode('database-ta-arsip', 'delete')
    );
