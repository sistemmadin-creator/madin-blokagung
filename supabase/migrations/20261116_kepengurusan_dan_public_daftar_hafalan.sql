-- Migrasi Skema Kepengurusan & RPC Publik Daftar Hafalan Muhafadzoh
-- 1. Tabel periode & struktur jabatan kepengurusan (dapat dibaca publik, dikelola admin via RBAC)
-- 2. RPC SECURITY DEFINER get_public_daftar_hafalan() untuk mengekspos hanya daftar materi wajib/sunnah/kitab & silabus (tanpa PII santri tahfidz/penjagaBebas)

CREATE TABLE IF NOT EXISTS public.kepengurusan_periode (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_periode VARCHAR(120) NOT NULL,
    catatan TEXT NOT NULL DEFAULT '',
    is_current BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.kepengurusan_jabatan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    periode_id UUID NOT NULL REFERENCES public.kepengurusan_periode(id) ON DELETE CASCADE,
    kelompok VARCHAR(40) NOT NULL CHECK (
        kelompok IN ('pimpinan', 'kepala_madrasah', 'pkm_dan_koordinator', 'panitia_dan_luar')
    ),
    kategori_bagian VARCHAR(20) NOT NULL DEFAULT 'bersama' CHECK (
        kategori_bagian IN ('bersama', 'putra', 'putri')
    ),
    nama_jabatan VARCHAR(160) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    anggota JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kepengurusan_periode_current
    ON public.kepengurusan_periode (is_current DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kepengurusan_jabatan_periode_order
    ON public.kepengurusan_jabatan (periode_id, sort_order ASC, created_at ASC);

-- Grants & Row Level Security
GRANT SELECT ON public.kepengurusan_periode TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kepengurusan_periode TO authenticated;

GRANT SELECT ON public.kepengurusan_jabatan TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kepengurusan_jabatan TO authenticated;

ALTER TABLE public.kepengurusan_periode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kepengurusan_jabatan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kepengurusan_periode_public_select" ON public.kepengurusan_periode;
CREATE POLICY "kepengurusan_periode_public_select"
    ON public.kepengurusan_periode
    FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "kepengurusan_periode_pengurus_select" ON public.kepengurusan_periode;
CREATE POLICY "kepengurusan_periode_pengurus_select"
    ON public.kepengurusan_periode
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "kepengurusan_periode_insert_scoped" ON public.kepengurusan_periode;
CREATE POLICY "kepengurusan_periode_insert_scoped"
    ON public.kepengurusan_periode
    FOR INSERT
    TO authenticated
    WITH CHECK (private.can_page_mode('kelola-kepengurusan', 'edit'));

DROP POLICY IF EXISTS "kepengurusan_periode_update_scoped" ON public.kepengurusan_periode;
CREATE POLICY "kepengurusan_periode_update_scoped"
    ON public.kepengurusan_periode
    FOR UPDATE
    TO authenticated
    USING (private.can_page_mode('kelola-kepengurusan', 'update'))
    WITH CHECK (private.can_page_mode('kelola-kepengurusan', 'update'));

DROP POLICY IF EXISTS "kepengurusan_periode_delete_scoped" ON public.kepengurusan_periode;
CREATE POLICY "kepengurusan_periode_delete_scoped"
    ON public.kepengurusan_periode
    FOR DELETE
    TO authenticated
    USING (private.can_page_mode('kelola-kepengurusan', 'delete'));

DROP POLICY IF EXISTS "kepengurusan_jabatan_public_select" ON public.kepengurusan_jabatan;
CREATE POLICY "kepengurusan_jabatan_public_select"
    ON public.kepengurusan_jabatan
    FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1
            FROM public.kepengurusan_periode p
            WHERE p.id = periode_id AND p.is_active = true
        )
    );

DROP POLICY IF EXISTS "kepengurusan_jabatan_pengurus_select" ON public.kepengurusan_jabatan;
CREATE POLICY "kepengurusan_jabatan_pengurus_select"
    ON public.kepengurusan_jabatan
    FOR SELECT
    TO authenticated
    USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "kepengurusan_jabatan_insert_scoped" ON public.kepengurusan_jabatan;
CREATE POLICY "kepengurusan_jabatan_insert_scoped"
    ON public.kepengurusan_jabatan
    FOR INSERT
    TO authenticated
    WITH CHECK (private.can_page_mode('kelola-kepengurusan', 'edit'));

DROP POLICY IF EXISTS "kepengurusan_jabatan_update_scoped" ON public.kepengurusan_jabatan;
CREATE POLICY "kepengurusan_jabatan_update_scoped"
    ON public.kepengurusan_jabatan
    FOR UPDATE
    TO authenticated
    USING (private.can_page_mode('kelola-kepengurusan', 'update'))
    WITH CHECK (private.can_page_mode('kelola-kepengurusan', 'update'));

DROP POLICY IF EXISTS "kepengurusan_jabatan_delete_scoped" ON public.kepengurusan_jabatan;
CREATE POLICY "kepengurusan_jabatan_delete_scoped"
    ON public.kepengurusan_jabatan
    FOR DELETE
    TO authenticated
    USING (private.can_page_mode('kelola-kepengurusan', 'delete'));

-- Seed Data Personalia Kepengurusan Masa Khidmah 1446-1447 H / 2025-2026 M (hanya jika tabel periode masih kosong)
DO $$
DECLARE
    v_periode_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.kepengurusan_periode) THEN
        INSERT INTO public.kepengurusan_periode (nama_periode, catatan, is_current, is_active)
        VALUES (
            '1446-1447 H / 2025-2026 M',
            'Personalia Kepengurusan Putra dan Putri Madrasah Diniyyah Al-Amiriyyah PP. Darussalam Blokagung Banyuwangi',
            true,
            true
        )
        RETURNING id INTO v_periode_id;

        INSERT INTO public.kepengurusan_jabatan (periode_id, kelompok, kategori_bagian, nama_jabatan, sort_order, anggota)
        VALUES
        -- Tier 1: Pimpinan
        (v_periode_id, 'pimpinan', 'bersama', 'PELINDUNG', 10, '[{"id":"ang-pel-1","nama":"KH. Ahmad Hisyam Syafaat"}]'::jsonb),
        (v_periode_id, 'pimpinan', 'bersama', 'PENANGGUNG JAWAB', 20, '[{"id":"ang-pj-1","nama":"Dr. KH. Abdul Kholiq Syafaat"}]'::jsonb),
        (v_periode_id, 'pimpinan', 'bersama', 'PENASEHAT', 30, '[{"id":"ang-pen-1","nama":"KH. Aly Asyiqin"}]'::jsonb),

        -- Tier 2: Kepala Madrasah
        (v_periode_id, 'kepala_madrasah', 'bersama', 'KA. MADRASAH ULA', 40, '[{"id":"ang-ka-ula","nama":"Ust. Abdul Hamid, S.Ag"}]'::jsonb),
        (v_periode_id, 'kepala_madrasah', 'bersama', 'KA. MADRASAH WUSTHO', 50, '[{"id":"ang-ka-wus","nama":"Ust. Agus A. Chadziq Kanzul F, S.Ag"}]'::jsonb),
        (v_periode_id, 'kepala_madrasah', 'bersama', 'KA. MADRASAH ULYA', 60, '[{"id":"ang-ka-uly","nama":"Ust. Agus H. Muhammadun, M.Ag"}]'::jsonb),

        -- Tier 3: PKM & Koordinator
        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'PKM. KURIKULUM', 70, '[
            {"id":"pa-kur-1","nama":"Ust. Yunuz Zamrozi, M.E"},
            {"id":"pa-kur-2","nama":"Ust. Ulul Azmi"},
            {"id":"pa-kur-3","nama":"Ust. Hilmi Alfian"},
            {"id":"pa-kur-4","nama":"Ust. Ali Makmun"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'PKM. KURIKULUM', 75, '[
            {"id":"pi-kur-1","nama":"Ust. Yunuz Zamrozi, M.E"},
            {"id":"pi-kur-2","nama":"Ustdz. Khoirotun Hisan"},
            {"id":"pi-kur-3","nama":"Ustdz. Suhita Rindu Haromain"},
            {"id":"pi-kur-4","nama":"Ustdz. Ulin Nuha"},
            {"id":"pi-kur-5","nama":"Ustdz. Layla Nirmala"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'PKM. MUHAFADZOH', 80, '[
            {"id":"pa-muh-1","nama":"Ust. Andiko Dwi Saputra"},
            {"id":"pa-muh-2","nama":"Ust. Muchlisin"},
            {"id":"pa-muh-3","nama":"Ust. M. Miftahul Ilham"},
            {"id":"pa-muh-4","nama":"Ust. Rizqi Maulana Ahmad"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'PKM. MUHAFADZOH', 85, '[
            {"id":"pi-muh-1","nama":"Ustdz. Nikmatul Khoiriah"},
            {"id":"pi-muh-2","nama":"Ustdz. Nikmatur Rohmah"},
            {"id":"pi-muh-3","nama":"Ustdz. Maulida Nur Azizah"},
            {"id":"pi-muh-4","nama":"Ustdz. Shofiya Nabilla"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'bersama', 'PKM. KEUANGAN', 90, '[
            {"id":"keu-1","nama":"Ust. Agus Ahmad Supriyadi, S.E"},
            {"id":"keu-2","nama":"Ust. M. Fajar Attamimi"},
            {"id":"keu-3","nama":"Ust. Hafiruddin"},
            {"id":"keu-4","nama":"Ust. Fahim Hilmy Ahimsa"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'PKM. KESISWAAN', 100, '[
            {"id":"pa-kes-1","nama":"Ust. Agus Indi'' Najmu Tsaqib"},
            {"id":"pa-kes-2","nama":"Ust. Zulfan Rifqi"},
            {"id":"pa-kes-3","nama":"Ust. Muhammad Nafiul Umam"},
            {"id":"pa-kes-4","nama":"Ust. Ahmad Rifai"},
            {"id":"pa-kes-5","nama":"Ust. Anggit Setiawan Yahya"},
            {"id":"pa-kes-6","nama":"Ust. Qoidus Solah"},
            {"id":"pa-kes-7","nama":"Ust. Ahmad Fakhrurroziqin"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'PKM. KESISWAAN', 105, '[
            {"id":"pi-kes-1","nama":"Ust. Agus Indi'' Najmu Tsaqib"},
            {"id":"pi-kes-2","nama":"Ustdz. Inggrit Lailatul Mukaromah"},
            {"id":"pi-kes-3","nama":"Ustdz. Dina Marisatul Azhari"},
            {"id":"pi-kes-4","nama":"Ustdz. Ummu Astri Zulaikha"},
            {"id":"pi-kes-5","nama":"Ustdz. Riyan Putri Wulandari"},
            {"id":"pi-kes-6","nama":"Ustdz. Atina Novia Khusna"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'PKM. MPK & ITMAM', 110, '[
            {"id":"pa-mpk-1","nama":"Ust. Rois Muzaki"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'PKM. MPK & ITMAM', 115, '[
            {"id":"pi-mpk-1","nama":"Ustdz. Fatma Aslihatul Amalia"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'PKM. MEDIA', 120, '[
            {"id":"pa-med-1","nama":"Ust. Cholid Asrori"},
            {"id":"pa-med-2","nama":"Ust. Moch. Miftachul Farihin"},
            {"id":"pa-med-3","nama":"Ust. Miftachul Huda"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'PKM. MEDIA', 125, '[
            {"id":"pi-med-1","nama":"Ustdz. Zida Nurul Ilma"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'PKM. TATA USAHA', 130, '[
            {"id":"pa-tu-1","nama":"Ust. Agus Hamdani"},
            {"id":"pa-tu-2","nama":"Ust. Rokib Munawwir"},
            {"id":"pa-tu-3","nama":"Ust. Hafidz Muslimin"},
            {"id":"pa-tu-4","nama":"Ust. Qoulan Sadidan"},
            {"id":"pa-tu-5","nama":"Ust. Royhan Azizi"},
            {"id":"pa-tu-6","nama":"Ust. Ibnu Haris"},
            {"id":"pa-tu-7","nama":"Ust. Adib Assyarifi"},
            {"id":"pa-tu-8","nama":"Ust. Zubriyadi"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'PKM. TATA USAHA', 135, '[
            {"id":"pi-tu-1","nama":"Ustdz. Dalilah El Bariro"},
            {"id":"pi-tu-2","nama":"Ustdz. Naulina Nuril Khusna"},
            {"id":"pi-tu-3","nama":"Ustdz. Eka Faticha Rini"},
            {"id":"pi-tu-4","nama":"Ustdz. Ratu Syifa Mustika"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'putra', 'KOOR. UNGGULAN', 140, '[
            {"id":"pa-ung-1","nama":"Ust. Muhammad Hanif"}
        ]'::jsonb),
        (v_periode_id, 'pkm_dan_koordinator', 'putri', 'KOOR. UNGGULAN', 145, '[
            {"id":"pi-ung-1","nama":"Ustdz. Fatma Aslihatul Amalia"}
        ]'::jsonb),

        (v_periode_id, 'pkm_dan_koordinator', 'bersama', 'PKM. SARANA PRASARANA', 150, '[
            {"id":"sap-1","nama":"Ust. Abdul Rochmad (PA)"},
            {"id":"sap-2","nama":"Ust. M. Naufal Zabidi (PA)"},
            {"id":"sap-3","nama":"Ust. Ahmad Fajrul Falah Shidqi (PI)"}
        ]'::jsonb),

        -- Tier 4: Panitia Evaluasi & Koor. Madin Luar
        (v_periode_id, 'panitia_dan_luar', 'putra', 'PANITIA EVALUASI', 160, '[
            {"id":"pa-ev-1","sub_label":"Ebtadin","nama":"Ust. Royhan Azizi"},
            {"id":"pa-ev-2","sub_label":"Daur","nama":"Ust. Rokib Munawir"},
            {"id":"pa-ev-3","sub_label":"Akselerasi","nama":"Ust. Hafiruddin"},
            {"id":"pa-ev-4","sub_label":"Tes Kitab","nama":"Ust. Hafidz Muslimin"},
            {"id":"pa-ev-5","sub_label":"Imtihan","nama":"Ust. Ro''is Muzakky"},
            {"id":"pa-ev-6","sub_label":"Psb","nama":"Ust. Rokib Munawir"}
        ]'::jsonb),
        (v_periode_id, 'panitia_dan_luar', 'putri', 'PANITIA EVALUASI', 165, '[
            {"id":"pi-ev-1","sub_label":"Ebtadin","nama":"Ust. Muchlisin"},
            {"id":"pi-ev-2","sub_label":"Daur","nama":"Ust. Rokib Munawir"},
            {"id":"pi-ev-3","sub_label":"Akselerasi","nama":"Ust. Hafiruddin"},
            {"id":"pi-ev-4","sub_label":"Tes Kitab","nama":"Ust. Hafidz Muslimin"},
            {"id":"pi-ev-5","sub_label":"Imtihan","nama":"Ust. Ro''is Muzakky"},
            {"id":"pi-ev-6","sub_label":"Psb","nama":"Ust. Rokib Munawir"}
        ]'::jsonb),

        (v_periode_id, 'panitia_dan_luar', 'bersama', 'KOOR. MADIN LUAR', 170, '[
            {"id":"ml-1","sub_label":"Blok 4","nama":"Ust. Anggi Pratama"},
            {"id":"ml-2","sub_label":"Blok 5","nama":"Ust. Khoirul walid sifa''ul fatih"},
            {"id":"ml-3","sub_label":"Blok 6","nama":"Ustdz. Nur Khofifah Intan Saputri"},
            {"id":"ml-4","sub_label":"Blok 10","nama":"Ust. Moh Indi Asrofi"},
            {"id":"ml-5","sub_label":"Blok 11","nama":"Ust. Fajin Amiq"},
            {"id":"ml-6","sub_label":"Blok 12","nama":"Ust. Septian Khoirul Umam"}
        ]'::jsonb);
    END IF;
END $$;

-- 2. Fungsi RPC Publik Read-Only untuk Daftar Hafalan Muhafadzoh (Aman tanpa PII santri tahfidz/penjagaBebas)
CREATE OR REPLACE FUNCTION public.get_public_daftar_hafalan()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cfg JSONB := '{}'::jsonb;
    v_silabus JSONB := '{}'::jsonb;
BEGIN
    SELECT value INTO v_cfg
    FROM public.app_settings
    WHERE key = 'MUHAFADZOH_HAFALAN_CONFIG'
    LIMIT 1;

    IF v_cfg IS NULL OR jsonb_typeof(v_cfg) <> 'object' THEN
        SELECT value INTO v_cfg
        FROM public.app_settings
        WHERE key = 'KEY_DB_HAFALAN_CONFIG'
        LIMIT 1;
    END IF;

    SELECT value INTO v_silabus
    FROM public.app_settings
    WHERE key = 'MUHAFADZOH_SILABUS_CONFIG'
    LIMIT 1;

    RETURN jsonb_build_object(
        'hafWajib', COALESCE(v_cfg -> 'hafWajib', '{}'::jsonb),
        'hafSunnah', COALESCE(v_cfg -> 'hafSunnah', '{}'::jsonb),
        'hafKitab', COALESCE(v_cfg -> 'hafKitab', '{}'::jsonb),
        'silabus', COALESCE(v_silabus, '{}'::jsonb)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_daftar_hafalan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_daftar_hafalan() TO anon, authenticated;
