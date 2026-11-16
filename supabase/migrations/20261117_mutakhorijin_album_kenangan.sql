-- Migrasi: Modul Album Kenangan Mutakhorijin (Gaya Editorial Showcase)
-- 1. Tabel public.mutakhorijin_albums (daftar angkatan, mis. Tsuroya - Angkatan 2026)
-- 2. Tabel public.mutakhorijin_sections (blok dossier & kartu pos galeri per angkatan)
-- 3. RLS Publik Read-Only untuk album aktif + CRUD Admin via RBAC 'kelola-mutakhorijin'

BEGIN;

CREATE TABLE IF NOT EXISTS public.mutakhorijin_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_angkatan VARCHAR(120) NOT NULL,
    caption_angkatan VARCHAR(120) NOT NULL DEFAULT '',
    tahun_angkatan INTEGER NOT NULL DEFAULT 2026,
    slug VARCHAR(100) NOT NULL,
    hero_title VARCHAR(160) NOT NULL DEFAULT '',
    hero_subtitle VARCHAR(220) NOT NULL DEFAULT '',
    hero_quote TEXT NOT NULL DEFAULT '',
    hero_image_url TEXT NOT NULL DEFAULT '',
    footer_note TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_current BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mutakhorijin_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    album_id UUID NOT NULL REFERENCES public.mutakhorijin_albums(id) ON DELETE CASCADE,
    section_type VARCHAR(20) NOT NULL DEFAULT 'dossier' CHECK (
        section_type IN ('dossier', 'postcard')
    ),
    judul VARCHAR(160) NOT NULL,
    subjudul_label VARCHAR(120) NOT NULL DEFAULT '',
    quote TEXT NOT NULL DEFAULT '',
    narasi TEXT NOT NULL DEFAULT '',
    foto_utama_url TEXT NOT NULL DEFAULT '',
    foto_utama_caption TEXT NOT NULL DEFAULT '',
    galeri_foto JSONB NOT NULL DEFAULT '[]'::jsonb,
    layout_align VARCHAR(12) NOT NULL DEFAULT 'auto' CHECK (
        layout_align IN ('auto', 'left', 'right')
    ),
    sort_order INTEGER NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mutakhorijin_albums_slug
    ON public.mutakhorijin_albums (slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mutakhorijin_albums_single_current
    ON public.mutakhorijin_albums (is_current)
    WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_mutakhorijin_albums_sort
    ON public.mutakhorijin_albums (is_current DESC, tahun_angkatan DESC, sort_order ASC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mutakhorijin_sections_album_order
    ON public.mutakhorijin_sections (album_id, sort_order ASC, created_at ASC);

-- Grants & Row Level Security
GRANT SELECT ON public.mutakhorijin_albums TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mutakhorijin_albums TO authenticated;

GRANT SELECT ON public.mutakhorijin_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mutakhorijin_sections TO authenticated;

ALTER TABLE public.mutakhorijin_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutakhorijin_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mutakhorijin_albums_public_select" ON public.mutakhorijin_albums;
CREATE POLICY "mutakhorijin_albums_public_select"
    ON public.mutakhorijin_albums
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "mutakhorijin_albums_pengurus_select" ON public.mutakhorijin_albums;
CREATE POLICY "mutakhorijin_albums_pengurus_select"
    ON public.mutakhorijin_albums
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "mutakhorijin_albums_insert_scoped" ON public.mutakhorijin_albums;
CREATE POLICY "mutakhorijin_albums_insert_scoped"
    ON public.mutakhorijin_albums
    FOR INSERT
    TO authenticated
    WITH CHECK (private.can_page_mode('kelola-mutakhorijin', 'edit'));

DROP POLICY IF EXISTS "mutakhorijin_albums_update_scoped" ON public.mutakhorijin_albums;
CREATE POLICY "mutakhorijin_albums_update_scoped"
    ON public.mutakhorijin_albums
    FOR UPDATE
    TO authenticated
    USING (private.can_page_mode('kelola-mutakhorijin', 'update'))
    WITH CHECK (private.can_page_mode('kelola-mutakhorijin', 'update'));

DROP POLICY IF EXISTS "mutakhorijin_albums_delete_scoped" ON public.mutakhorijin_albums;
CREATE POLICY "mutakhorijin_albums_delete_scoped"
    ON public.mutakhorijin_albums
    FOR DELETE
    TO authenticated
    USING (private.can_page_mode('kelola-mutakhorijin', 'delete'));

DROP POLICY IF EXISTS "mutakhorijin_sections_public_select" ON public.mutakhorijin_sections;
CREATE POLICY "mutakhorijin_sections_public_select"
    ON public.mutakhorijin_sections
    FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.mutakhorijin_albums a
            WHERE a.id = album_id AND a.is_active = true
        )
    );

DROP POLICY IF EXISTS "mutakhorijin_sections_pengurus_select" ON public.mutakhorijin_sections;
CREATE POLICY "mutakhorijin_sections_pengurus_select"
    ON public.mutakhorijin_sections
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "mutakhorijin_sections_insert_scoped" ON public.mutakhorijin_sections;
CREATE POLICY "mutakhorijin_sections_insert_scoped"
    ON public.mutakhorijin_sections
    FOR INSERT
    TO authenticated
    WITH CHECK (private.can_page_mode('kelola-mutakhorijin', 'edit'));

DROP POLICY IF EXISTS "mutakhorijin_sections_update_scoped" ON public.mutakhorijin_sections;
CREATE POLICY "mutakhorijin_sections_update_scoped"
    ON public.mutakhorijin_sections
    FOR UPDATE
    TO authenticated
    USING (private.can_page_mode('kelola-mutakhorijin', 'update'))
    WITH CHECK (private.can_page_mode('kelola-mutakhorijin', 'update'));

DROP POLICY IF EXISTS "mutakhorijin_sections_delete_scoped" ON public.mutakhorijin_sections;
CREATE POLICY "mutakhorijin_sections_delete_scoped"
    ON public.mutakhorijin_sections
    FOR DELETE
    TO authenticated
    USING (private.can_page_mode('kelola-mutakhorijin', 'delete'));

-- Seed Awal: Angkatan Tsuroya (Angkatan 2026) tanpa foto palsu (admin mengunggah foto asli di Kelola Mutakhorijin)
DO $$
DECLARE
    v_album_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.mutakhorijin_albums) THEN
        INSERT INTO public.mutakhorijin_albums (
            nama_angkatan,
            caption_angkatan,
            tahun_angkatan,
            slug,
            hero_title,
            hero_subtitle,
            hero_quote,
            footer_note,
            sort_order,
            is_current,
            is_active
        )
        VALUES (
            'Tsuroya',
            'Angkatan 2026',
            2026,
            'tsuroya-2026',
            'TSUROYA',
            'Album Kenangan Mutakhorijin Angkatan 2026 • Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung',
            'Menjaga sanad keilmuan salafiyah, merawat persaudaraan santri, dan melangkah dengan khidmah.',
            'Mutakhorijin Tsuroya Angkatan 2026 • Semoga ilmu yang diraih membawa keberkahan sepanjang hayat.',
            10,
            true,
            true
        )
        RETURNING id INTO v_album_id;

        INSERT INTO public.mutakhorijin_sections (
            album_id,
            section_type,
            judul,
            subjudul_label,
            quote,
            narasi,
            layout_align,
            sort_order,
            is_active
        )
        VALUES
        (
            v_album_id,
            'dossier',
            'Jejak Takror & Syawir',
            'BAB 01 • PERJUANGAN',
            'Di antara lembaran kitab kuning dan lantunan nadzom, persaudaraan ini ditempa setiap siang dan malam.',
            'Catatan perjalanan belajar santri Mutakhorijin Tsuroya dari kelas awal hingga purna Ulya. Unggah foto utama dan 3 hingga 4 dokumentasi terbaik melalui menu Kelola Mutakhorijin.',
            'left',
            10,
            true
        ),
        (
            v_album_id,
            'postcard',
            'Serambi Diniyyah & Haflah',
            'KARTU POS • ANGKATAN 2026',
            'Satu tempat yang selalu memanggil ingatan tentang kebersamaan angkatan.',
            'Galeri momen puncak angkatan: kebersamaan kelas akhir, khidmah majelis, dan detik-detik tasyakuran kelulusan.',
            'auto',
            20,
            true
        ),
        (
            v_album_id,
            'dossier',
            'Khidmah & Pengabdian',
            'BAB 02 • HARAPAN',
            'Purna belajar di bangku madrasah bukan akhir perjalanan, melainkan awal khidmah di tengah masyarakat.',
            'Potret pengabdian, musyawarah, serta pesan keteladanan bersama para masyayikh dan dewan asatidz sebelum melepas masa belajar klasikal.',
            'right',
            30,
            true
        );
    END IF;
END $$;

COMMIT;
