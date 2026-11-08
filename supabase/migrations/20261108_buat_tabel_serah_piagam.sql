-- Migrasi Pembuatan Tabel Serah Piagam Santri
-- Modul PKM. Muhafadzoh: Serah Piagam
CREATE TABLE IF NOT EXISTS public.serah_piagam (
    id VARCHAR(64) PRIMARY KEY,
    no_induk VARCHAR(32) NOT NULL,
    nama_santri TEXT NOT NULL,
    kelas_id VARCHAR(64),
    tingkat VARCHAR(32),
    tahun INT DEFAULT 2026,
    is_menerima BOOLEAN DEFAULT FALSE,
    tanggal_serah TIMESTAMPTZ,
    diserahkan_oleh TEXT,
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_serah_piagam_santri_tahun UNIQUE (no_induk, tahun)
);

CREATE INDEX IF NOT EXISTS idx_serah_piagam_lookup ON public.serah_piagam(no_induk, tahun);
CREATE INDEX IF NOT EXISTS idx_serah_piagam_menerima ON public.serah_piagam(is_menerima, tahun);

ALTER TABLE public.serah_piagam ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'serah_piagam' AND policyname = 'Allow public all access on serah_piagam'
    ) THEN
        CREATE POLICY "Allow public all access on serah_piagam" ON public.serah_piagam
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
