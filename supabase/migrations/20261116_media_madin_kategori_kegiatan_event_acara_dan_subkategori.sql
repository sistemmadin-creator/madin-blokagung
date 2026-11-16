-- Migrasi Skema Media Madin: Kategori Kegiatan, Event, Acara & Pengaturan Sub-Kategori Dinamis
-- Mendukung sub-kategori multi-pilih pada Kelola Berita & Kelola Galeri Sosmed serta CRUD sub-kategori

-- 1. Perluas enum post_topic_enum dengan 3 kategori baru
ALTER TYPE post_topic_enum ADD VALUE IF NOT EXISTS 'kegiatan';
ALTER TYPE post_topic_enum ADD VALUE IF NOT EXISTS 'event';
ALTER TYPE post_topic_enum ADD VALUE IF NOT EXISTS 'acara';

-- 2. Tambahkan kolom sub_topics TEXT[] pada warta_berita dan galeri_sosmed
ALTER TABLE public.warta_berita
    ADD COLUMN IF NOT EXISTS sub_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.galeri_sosmed
    ADD COLUMN IF NOT EXISTS sub_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_warta_sub_topics_gin
    ON public.warta_berita USING GIN (sub_topics);

CREATE INDEX IF NOT EXISTS idx_galeri_sosmed_sub_topics_gin
    ON public.galeri_sosmed USING GIN (sub_topics);

-- 3. Tabel master sub-kategori dinamis (dipakai bersama oleh Kelola Berita & Kelola Galeri Sosmed)
CREATE TABLE IF NOT EXISTS public.media_subkategori (
    id VARCHAR(80) PRIMARY KEY,
    parent_topic VARCHAR(40) NOT NULL CHECK (parent_topic IN ('kegiatan', 'event', 'acara')),
    nama VARCHAR(120) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_subkategori_parent_order
    ON public.media_subkategori (parent_topic, sort_order ASC, created_at ASC);

-- 4. Grants & Row Level Security
GRANT SELECT ON public.media_subkategori TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.media_subkategori TO authenticated;

ALTER TABLE public.media_subkategori ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_subkategori_public_select" ON public.media_subkategori;
CREATE POLICY "media_subkategori_public_select"
    ON public.media_subkategori
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "media_subkategori_pengurus_select" ON public.media_subkategori;
CREATE POLICY "media_subkategori_pengurus_select"
    ON public.media_subkategori
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "media_subkategori_insert_scoped" ON public.media_subkategori;
CREATE POLICY "media_subkategori_insert_scoped"
    ON public.media_subkategori
    FOR INSERT
    TO authenticated
    WITH CHECK (
        private.can_page_mode('kelola-berita', 'edit')
        OR private.can_page_mode('kelola-galeri-sosmed', 'edit')
    );

DROP POLICY IF EXISTS "media_subkategori_update_scoped" ON public.media_subkategori;
CREATE POLICY "media_subkategori_update_scoped"
    ON public.media_subkategori
    FOR UPDATE
    TO authenticated
    USING (
        private.can_page_mode('kelola-berita', 'update')
        OR private.can_page_mode('kelola-galeri-sosmed', 'update')
    )
    WITH CHECK (
        private.can_page_mode('kelola-berita', 'update')
        OR private.can_page_mode('kelola-galeri-sosmed', 'update')
    );

DROP POLICY IF EXISTS "media_subkategori_delete_scoped" ON public.media_subkategori;
CREATE POLICY "media_subkategori_delete_scoped"
    ON public.media_subkategori
    FOR DELETE
    TO authenticated
    USING (
        private.can_page_mode('kelola-berita', 'delete')
        OR private.can_page_mode('kelola-galeri-sosmed', 'delete')
    );

-- 5. Seed awal 10 sub-kategori (hanya insert jika belum ada)
INSERT INTO public.media_subkategori (id, parent_topic, nama, sort_order, is_active)
VALUES
    ('sub-keg-uub', 'kegiatan', 'UUB', 10, true),
    ('sub-keg-daur-awwal', 'kegiatan', 'Daur Awwal', 20, true),
    ('sub-keg-daur-tsani', 'kegiatan', 'Daur Tsani', 30, true),
    ('sub-keg-ebtadin', 'kegiatan', 'EBTADIN', 40, true),
    ('sub-keg-lomba-itmam', 'kegiatan', 'Lomba ITMAM', 50, true),
    ('sub-evt-lalaran-kubro', 'event', 'Lalaran Kubro', 10, true),
    ('sub-evt-seminar', 'event', 'Seminar', 20, true),
    ('sub-evt-diklat', 'event', 'Diklat', 30, true),
    ('sub-acr-apel-daur-tsani', 'acara', 'APEL Daur Tsani', 10, true),
    ('sub-acr-imtihan', 'acara', 'Imtihan', 20, true)
ON CONFLICT (id) DO NOTHING;
