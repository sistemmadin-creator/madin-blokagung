-- Migrasi Skema Tabel Warta Berita MADINA Blokagung
-- Mendukung 4 Topik Utama dan Tipe Tampilan Editorial Ala Lirboyo.net

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_topic_enum') THEN
        CREATE TYPE post_topic_enum AS ENUM (
            'kelas_unggulan',
            'tingkat_ula',
            'tingkat_wustho',
            'tingkat_ulya'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_display_type_enum') THEN
        CREATE TYPE post_display_type_enum AS ENUM (
            'hero_lead',
            'highlight_grid',
            'regular'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_status_enum') THEN
        CREATE TYPE post_status_enum AS ENUM (
            'draft',
            'published',
            'archived'
        );
    END IF;
END $$;

-- 2. Buat tabel warta_berita jika belum ada
CREATE TABLE IF NOT EXISTS public.warta_berita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(280) NOT NULL UNIQUE,
    topic post_topic_enum NOT NULL DEFAULT 'tingkat_ula',
    display_type post_display_type_enum NOT NULL DEFAULT 'regular',
    excerpt VARCHAR(400) NOT NULL,
    content TEXT NOT NULL,
    cover_image_url TEXT NOT NULL,
    author_name VARCHAR(150) NOT NULL DEFAULT 'Redaksi Madin Blokagung',
    status post_status_enum NOT NULL DEFAULT 'draft',
    views_count INTEGER NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    published_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indeks Performa Query
CREATE INDEX IF NOT EXISTS idx_warta_status_published ON public.warta_berita (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_warta_topic ON public.warta_berita (topic);
CREATE INDEX IF NOT EXISTS idx_warta_display_type ON public.warta_berita (display_type);

-- 4. Row Level Security (RLS)
ALTER TABLE public.warta_berita ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Publik dapat membaca berita published" ON public.warta_berita;
    CREATE POLICY "Publik dapat membaca berita published"
        ON public.warta_berita
        FOR SELECT
        USING (status = 'published');

    DROP POLICY IF EXISTS "Admin dapat mengelola seluruh berita" ON public.warta_berita;
    CREATE POLICY "Admin dapat mengelola seluruh berita"
        ON public.warta_berita
        FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
END $$;
