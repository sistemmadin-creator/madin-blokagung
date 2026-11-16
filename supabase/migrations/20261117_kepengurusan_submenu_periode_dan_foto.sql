-- Migrasi: Sub-menu Periode Kepengurusan (2026-2027 & Arsip) serta Dukungan Foto Pengurus
-- 1. Menambah kolom slug, menu_label, dan sort_order pada public.kepengurusan_periode
-- 2. Menjaga hanya satu periode is_current = true melalui partial unique index
-- 3. Menyiapkan periode berjalan 1447-1448 H / 2026-2027 M dan memindahkan 2025-2026 ke periode sebelumnya

BEGIN;

ALTER TABLE public.kepengurusan_periode
    ADD COLUMN IF NOT EXISTS slug VARCHAR(80),
    ADD COLUMN IF NOT EXISTS menu_label VARCHAR(120),
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Lengkapi metadata periode 2025-2026 yang sudah ada
UPDATE public.kepengurusan_periode
SET
    slug = COALESCE(NULLIF(btrim(slug), ''), '2025-2026'),
    menu_label = COALESCE(NULLIF(btrim(menu_label), ''), 'Kepengurusan 2025-2026'),
    sort_order = CASE WHEN sort_order = 0 THEN 20 ELSE sort_order END,
    updated_at = NOW()
WHERE nama_periode ILIKE '%2025-2026%';

-- Backfill aman untuk periode lain yang mungkin dibuat manual sebelum migrasi ini
UPDATE public.kepengurusan_periode
SET
    slug = COALESCE(
        NULLIF(btrim(slug), ''),
        NULLIF(
            regexp_replace(
                regexp_replace(lower(nama_periode), '[^a-z0-9]+', '-', 'g'),
                '(^-|-$)',
                '',
                'g'
            ),
            ''
        ) || '-' || substr(id::text, 1, 6)
    ),
    menu_label = COALESCE(
        NULLIF(btrim(menu_label), ''),
        'Kepengurusan ' || nama_periode
    ),
    updated_at = NOW()
WHERE slug IS NULL OR btrim(slug) = '' OR menu_label IS NULL OR btrim(menu_label) = '';

-- Pastikan periode berjalan 2026-2027 tersedia dan menjadi is_current = true
DO $$
DECLARE
    v_2026_id UUID;
    v_2025_id UUID;
    v_catatan_default TEXT := 'Personalia Kepengurusan Putra dan Putri Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung Banyuwangi';
BEGIN
    SELECT id INTO v_2026_id
    FROM public.kepengurusan_periode
    WHERE slug = '2026-2027' OR nama_periode ILIKE '%2026-2027%'
    LIMIT 1;

    SELECT id INTO v_2025_id
    FROM public.kepengurusan_periode
    WHERE slug = '2025-2026' OR nama_periode ILIKE '%2025-2026%'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_2026_id IS NULL THEN
        -- Turunkan status is_current periode sebelumnya sebelum mengaktifkan 2026-2027
        UPDATE public.kepengurusan_periode
        SET is_current = false, updated_at = NOW()
        WHERE is_current = true;

        INSERT INTO public.kepengurusan_periode (
            nama_periode,
            menu_label,
            slug,
            catatan,
            sort_order,
            is_current,
            is_active
        )
        VALUES (
            '1447-1448 H / 2026-2027 M',
            'Kepengurusan 2026-2027',
            '2026-2027',
            v_catatan_default,
            10,
            true,
            true
        )
        RETURNING id INTO v_2026_id;

        -- Salin struktur jabatan awal dari periode 2025-2026 bila tersedia agar siap diedit admin
        IF v_2025_id IS NOT NULL THEN
            INSERT INTO public.kepengurusan_jabatan (
                periode_id,
                kelompok,
                kategori_bagian,
                nama_jabatan,
                sort_order,
                anggota,
                is_active
            )
            SELECT
                v_2026_id,
                kelompok,
                kategori_bagian,
                nama_jabatan,
                sort_order,
                anggota,
                is_active
            FROM public.kepengurusan_jabatan
            WHERE periode_id = v_2025_id
            ORDER BY sort_order ASC, created_at ASC;
        END IF;
    ELSE
        -- Jika periode 2026-2027 sudah ada, rapikan metadata & jadikan satu-satunya periode current
        UPDATE public.kepengurusan_periode
        SET is_current = false, updated_at = NOW()
        WHERE is_current = true AND id <> v_2026_id;

        UPDATE public.kepengurusan_periode
        SET
            slug = COALESCE(NULLIF(btrim(slug), ''), '2026-2027'),
            menu_label = COALESCE(NULLIF(btrim(menu_label), ''), 'Kepengurusan 2026-2027'),
            sort_order = CASE WHEN sort_order = 0 THEN 10 ELSE sort_order END,
            is_current = true,
            is_active = true,
            updated_at = NOW()
        WHERE id = v_2026_id;
    END IF;
END $$;

-- Jaga integritas: pastikan paling banyak hanya 1 baris is_current = true
WITH ranked_current AS (
    SELECT
        id,
        ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at DESC) AS rn
    FROM public.kepengurusan_periode
    WHERE is_current = true
)
UPDATE public.kepengurusan_periode p
SET is_current = false, updated_at = NOW()
FROM ranked_current rc
WHERE p.id = rc.id AND rc.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_kepengurusan_periode_slug
    ON public.kepengurusan_periode (slug)
    WHERE slug IS NOT NULL AND slug <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_kepengurusan_periode_single_current
    ON public.kepengurusan_periode (is_current)
    WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_kepengurusan_periode_sort
    ON public.kepengurusan_periode (is_current DESC, sort_order ASC, created_at DESC);

COMMIT;
