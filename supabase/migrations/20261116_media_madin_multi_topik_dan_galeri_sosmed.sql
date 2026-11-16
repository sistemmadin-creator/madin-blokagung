-- Migrasi Skema Media Madin: Multi-Topik Warta Berita (Termasuk Kategori Umum) & Tabel Galeri Sosmed
-- Mendukung pemilihan lebih dari satu kategori topik berita serta portofolio konten kreator YouTube, Instagram, dan TikTok

-- 1. Tambahkan nilai 'umum' pada enum post_topic_enum
ALTER TYPE post_topic_enum ADD VALUE IF NOT EXISTS 'umum';

-- 2. Tambahkan kolom array topics pada tabel warta_berita untuk mendukung multi-kategori
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'warta_berita'
          AND column_name = 'topics'
    ) THEN
        ALTER TABLE public.warta_berita
            ADD COLUMN topics TEXT[] NOT NULL DEFAULT ARRAY['umum']::TEXT[];

        UPDATE public.warta_berita
        SET topics = ARRAY[topic::text]
        WHERE topics IS NULL OR cardinality(topics) = 0;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warta_topics_gin
    ON public.warta_berita USING GIN (topics);

-- 3. Buat tabel galeri_sosmed untuk fitur Kelola Galeri Sosmed (Portofolio Kreator Media Madin)
CREATE TABLE IF NOT EXISTS public.galeri_sosmed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    caption TEXT NOT NULL,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
    content_format VARCHAR(30) NOT NULL DEFAULT 'vertical' CHECK (content_format IN ('vertical', 'landscape', 'post')),
    source_url TEXT NOT NULL,
    embed_id VARCHAR(120) NOT NULL,
    thumbnail_url TEXT NOT NULL,
    topics TEXT[] NOT NULL DEFAULT ARRAY['umum']::TEXT[],
    creator_name VARCHAR(150) NOT NULL DEFAULT 'Tim Media Madin Blokagung',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    status post_status_enum NOT NULL DEFAULT 'published',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indeks performa query galeri_sosmed
CREATE INDEX IF NOT EXISTS idx_galeri_sosmed_status_pinned_published
    ON public.galeri_sosmed (status, is_pinned DESC, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_galeri_sosmed_platform
    ON public.galeri_sosmed (platform);

CREATE INDEX IF NOT EXISTS idx_galeri_sosmed_topics_gin
    ON public.galeri_sosmed USING GIN (topics);

-- 5. Grant Data API & Row Level Security (RLS) Terikat RBAC untuk galeri_sosmed
GRANT SELECT ON public.galeri_sosmed TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.galeri_sosmed TO authenticated;

ALTER TABLE public.galeri_sosmed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publik dapat membaca galeri sosmed published" ON public.galeri_sosmed;
CREATE POLICY "Publik dapat membaca galeri sosmed published"
    ON public.galeri_sosmed
    FOR SELECT
    TO anon, authenticated
    USING (status = 'published'::post_status_enum);

DROP POLICY IF EXISTS "Admin dapat mengelola seluruh galeri sosmed" ON public.galeri_sosmed;
DROP POLICY IF EXISTS "galeri_sosmed_select_pengurus" ON public.galeri_sosmed;
DROP POLICY IF EXISTS "galeri_sosmed_write_scoped" ON public.galeri_sosmed;

CREATE POLICY "galeri_sosmed_select_pengurus"
    ON public.galeri_sosmed
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

CREATE POLICY "galeri_sosmed_write_scoped"
    ON public.galeri_sosmed
    FOR ALL
    TO authenticated
    USING (private.can_page_mode('kelola-galeri-sosmed', 'edit'))
    WITH CHECK (private.can_page_mode('kelola-galeri-sosmed', 'edit'));
