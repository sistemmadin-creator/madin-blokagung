-- Migrasi Skema CMS Konten Landing Page: Skala & Metrik Lembaga, Model Pembelajaran, & Khazanah Turats Salafiyah
-- Dapat dibaca publik (anon, authenticated) dan dikelola pengurus sesuai RBAC per modul

CREATE TABLE IF NOT EXISTS public.profil_section_meta (
    section_key VARCHAR(60) PRIMARY KEY CHECK (
        section_key IN ('metrik_lembaga', 'model_pembelajaran', 'khazanah_turats')
    ),
    badge_label VARCHAR(120) NOT NULL,
    judul TEXT NOT NULL,
    deskripsi TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profil_metrik_lembaga (
    id VARCHAR(80) PRIMARY KEY,
    value VARCHAR(60) NOT NULL,
    label VARCHAR(120) NOT NULL,
    sublabel TEXT NOT NULL DEFAULT '',
    badge VARCHAR(60) NOT NULL DEFAULT '',
    icon_name VARCHAR(40) NOT NULL DEFAULT 'Calendar',
    accent VARCHAR(80) NOT NULL DEFAULT 'from-amber-500 to-amber-700',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profil_model_pembelajaran (
    id VARCHAR(80) PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    badge VARCHAR(80) NOT NULL DEFAULT '',
    deskripsi TEXT NOT NULL DEFAULT '',
    icon_name VARCHAR(40) NOT NULL DEFAULT 'BookCheck',
    color_theme VARCHAR(40) NOT NULL DEFAULT 'emerald',
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profil_khazanah_jenjang (
    id VARCHAR(80) PRIMARY KEY,
    kode_tab VARCHAR(60) NOT NULL,
    nama VARCHAR(160) NOT NULL,
    durasi VARCHAR(100) NOT NULL DEFAULT '',
    fokus TEXT NOT NULL DEFAULT '',
    target_hafalan TEXT NOT NULL DEFAULT '',
    ujian_akhir TEXT NOT NULL DEFAULT '',
    kitab_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profil_waktu_kbm (
    id VARCHAR(80) PRIMARY KEY,
    judul VARCHAR(160) NOT NULL,
    rentang_waktu VARCHAR(120) NOT NULL DEFAULT '',
    tema VARCHAR(20) NOT NULL DEFAULT 'siang' CHECK (tema IN ('siang', 'malam')),
    icon_name VARCHAR(40) NOT NULL DEFAULT 'Sun',
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Grants & RLS
GRANT SELECT ON public.profil_section_meta, public.profil_metrik_lembaga, public.profil_model_pembelajaran, public.profil_khazanah_jenjang, public.profil_waktu_kbm TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profil_section_meta, public.profil_metrik_lembaga, public.profil_model_pembelajaran, public.profil_khazanah_jenjang, public.profil_waktu_kbm TO authenticated;

ALTER TABLE public.profil_section_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_metrik_lembaga ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_model_pembelajaran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_khazanah_jenjang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profil_waktu_kbm ENABLE ROW LEVEL SECURITY;

-- Policy profil_section_meta
DROP POLICY IF EXISTS "profil_section_meta_public_select" ON public.profil_section_meta;
CREATE POLICY "profil_section_meta_public_select" ON public.profil_section_meta
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profil_section_meta_write_scoped" ON public.profil_section_meta;
CREATE POLICY "profil_section_meta_write_scoped" ON public.profil_section_meta
    FOR ALL TO authenticated
    USING (
        (section_key = 'metrik_lembaga' AND private.can_page_mode('kelola-metrik-lembaga', 'edit'))
        OR (section_key = 'model_pembelajaran' AND private.can_page_mode('kelola-model-pembelajaran', 'edit'))
        OR (section_key = 'khazanah_turats' AND private.can_page_mode('kelola-khazanah-turats', 'edit'))
    )
    WITH CHECK (
        (section_key = 'metrik_lembaga' AND private.can_page_mode('kelola-metrik-lembaga', 'edit'))
        OR (section_key = 'model_pembelajaran' AND private.can_page_mode('kelola-model-pembelajaran', 'edit'))
        OR (section_key = 'khazanah_turats' AND private.can_page_mode('kelola-khazanah-turats', 'edit'))
    );

-- Policy profil_metrik_lembaga
DROP POLICY IF EXISTS "profil_metrik_public_select" ON public.profil_metrik_lembaga;
CREATE POLICY "profil_metrik_public_select" ON public.profil_metrik_lembaga
    FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "profil_metrik_pengurus_select" ON public.profil_metrik_lembaga;
CREATE POLICY "profil_metrik_pengurus_select" ON public.profil_metrik_lembaga
    FOR SELECT TO authenticated USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "profil_metrik_insert_scoped" ON public.profil_metrik_lembaga;
CREATE POLICY "profil_metrik_insert_scoped" ON public.profil_metrik_lembaga
    FOR INSERT TO authenticated WITH CHECK (private.can_page_mode('kelola-metrik-lembaga', 'edit'));

DROP POLICY IF EXISTS "profil_metrik_update_scoped" ON public.profil_metrik_lembaga;
CREATE POLICY "profil_metrik_update_scoped" ON public.profil_metrik_lembaga
    FOR UPDATE TO authenticated
    USING (private.can_page_mode('kelola-metrik-lembaga', 'update'))
    WITH CHECK (private.can_page_mode('kelola-metrik-lembaga', 'update'));

DROP POLICY IF EXISTS "profil_metrik_delete_scoped" ON public.profil_metrik_lembaga;
CREATE POLICY "profil_metrik_delete_scoped" ON public.profil_metrik_lembaga
    FOR DELETE TO authenticated USING (private.can_page_mode('kelola-metrik-lembaga', 'delete'));

-- Policy profil_model_pembelajaran
DROP POLICY IF EXISTS "profil_model_public_select" ON public.profil_model_pembelajaran;
CREATE POLICY "profil_model_public_select" ON public.profil_model_pembelajaran
    FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "profil_model_pengurus_select" ON public.profil_model_pembelajaran;
CREATE POLICY "profil_model_pengurus_select" ON public.profil_model_pembelajaran
    FOR SELECT TO authenticated USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "profil_model_insert_scoped" ON public.profil_model_pembelajaran;
CREATE POLICY "profil_model_insert_scoped" ON public.profil_model_pembelajaran
    FOR INSERT TO authenticated WITH CHECK (private.can_page_mode('kelola-model-pembelajaran', 'edit'));

DROP POLICY IF EXISTS "profil_model_update_scoped" ON public.profil_model_pembelajaran;
CREATE POLICY "profil_model_update_scoped" ON public.profil_model_pembelajaran
    FOR UPDATE TO authenticated
    USING (private.can_page_mode('kelola-model-pembelajaran', 'update'))
    WITH CHECK (private.can_page_mode('kelola-model-pembelajaran', 'update'));

DROP POLICY IF EXISTS "profil_model_delete_scoped" ON public.profil_model_pembelajaran;
CREATE POLICY "profil_model_delete_scoped" ON public.profil_model_pembelajaran
    FOR DELETE TO authenticated USING (private.can_page_mode('kelola-model-pembelajaran', 'delete'));

-- Policy profil_khazanah_jenjang
DROP POLICY IF EXISTS "profil_jenjang_public_select" ON public.profil_khazanah_jenjang;
CREATE POLICY "profil_jenjang_public_select" ON public.profil_khazanah_jenjang
    FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "profil_jenjang_pengurus_select" ON public.profil_khazanah_jenjang;
CREATE POLICY "profil_jenjang_pengurus_select" ON public.profil_khazanah_jenjang
    FOR SELECT TO authenticated USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "profil_jenjang_insert_scoped" ON public.profil_khazanah_jenjang;
CREATE POLICY "profil_jenjang_insert_scoped" ON public.profil_khazanah_jenjang
    FOR INSERT TO authenticated WITH CHECK (private.can_page_mode('kelola-khazanah-turats', 'edit'));

DROP POLICY IF EXISTS "profil_jenjang_update_scoped" ON public.profil_khazanah_jenjang;
CREATE POLICY "profil_jenjang_update_scoped" ON public.profil_khazanah_jenjang
    FOR UPDATE TO authenticated
    USING (private.can_page_mode('kelola-khazanah-turats', 'update'))
    WITH CHECK (private.can_page_mode('kelola-khazanah-turats', 'update'));

DROP POLICY IF EXISTS "profil_jenjang_delete_scoped" ON public.profil_khazanah_jenjang;
CREATE POLICY "profil_jenjang_delete_scoped" ON public.profil_khazanah_jenjang
    FOR DELETE TO authenticated USING (private.can_page_mode('kelola-khazanah-turats', 'delete'));

-- Policy profil_waktu_kbm
DROP POLICY IF EXISTS "profil_waktu_public_select" ON public.profil_waktu_kbm;
CREATE POLICY "profil_waktu_public_select" ON public.profil_waktu_kbm
    FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "profil_waktu_pengurus_select" ON public.profil_waktu_kbm;
CREATE POLICY "profil_waktu_pengurus_select" ON public.profil_waktu_kbm
    FOR SELECT TO authenticated USING (private.is_active_pengurus());

DROP POLICY IF EXISTS "profil_waktu_insert_scoped" ON public.profil_waktu_kbm;
CREATE POLICY "profil_waktu_insert_scoped" ON public.profil_waktu_kbm
    FOR INSERT TO authenticated WITH CHECK (private.can_page_mode('kelola-khazanah-turats', 'edit'));

DROP POLICY IF EXISTS "profil_waktu_update_scoped" ON public.profil_waktu_kbm;
CREATE POLICY "profil_waktu_update_scoped" ON public.profil_waktu_kbm
    FOR UPDATE TO authenticated
    USING (private.can_page_mode('kelola-khazanah-turats', 'update'))
    WITH CHECK (private.can_page_mode('kelola-khazanah-turats', 'update'));

DROP POLICY IF EXISTS "profil_waktu_delete_scoped" ON public.profil_waktu_kbm;
CREATE POLICY "profil_waktu_delete_scoped" ON public.profil_waktu_kbm
    FOR DELETE TO authenticated USING (private.can_page_mode('kelola-khazanah-turats', 'delete'));

-- Seed Meta Seksi
INSERT INTO public.profil_section_meta (section_key, badge_label, judul, deskripsi)
VALUES
    ('metrik_lembaga', 'Skala & Metrik Lembaga', 'Tradisi Salaf Skala Besar yang Terkelola Terstruktur', 'Menggabungkan keotentikan sistem sorogan-bandongan pesantren salaf dengan tata kelola administrasi modern untuk membina ribuan kader ulama.'),
    ('model_pembelajaran', 'Model Pembelajaran', 'Tiga Pilar Program Pendidikan MADINA', 'Memberikan ruang berkembang yang proporsional bagi setiap santri sesuai tingkat kemampuan dan target keilmuan.'),
    ('khazanah_turats', 'Khazanah Turats Salafiyah', 'Kurikulum Kitab Kuning & Jenjang Pendidikan', 'Disusun secara berjenjang mulai dari pengenalan Pegon hingga kitab turats tingkat tinggi untuk mencetak kader ulama yang mutafaqqih fiddin.')
ON CONFLICT (section_key) DO NOTHING;

-- Seed Skala & Metrik Lembaga
INSERT INTO public.profil_metrik_lembaga (id, value, label, sublabel, badge, icon_name, accent, sort_order)
VALUES
    ('tahun', '1951 M', 'Tahun Berdiri', '75+ Tahun Mengabdi & Bertransformasi', 'Est. 1951', 'Calendar', 'from-amber-500 to-amber-700', 10),
    ('santri', '± 5.400', 'Santri Aktif', 'Talamidz Putra & Putri (Ula, Wustho, Ulya)', 'Putra & Putri', 'Users', 'from-emerald-600 to-teal-800', 20),
    ('kelas', '161+', 'Rombongan Belajar', 'Formasi Kelas Reguler, Unggulan & Blok Luar', '161 Rombel', 'School', 'from-blue-600 to-indigo-800', 30),
    ('pendidik', '367+', 'Tenaga Pendidik', 'Mustahiq, Munawib, Pengurus & Ndalem', 'SDM Berdedikasi', 'Award', 'from-amber-600 to-emerald-800', 40)
ON CONFLICT (id) DO NOTHING;

-- Seed Model Pembelajaran
INSERT INTO public.profil_model_pembelajaran (id, title, badge, deskripsi, icon_name, color_theme, features, sort_order)
VALUES
    ('pilar-reguler', 'Kelas Reguler', 'Fondasi Salafiyah', 'Pendidikan diniyyah berjenjang 3 tingkatan (Ula 4 th, Wustho 2 th, Ulya 2 th) dengan target penguasaan materi ushul fiqih, gramatika (Nahwu-Shorof), aqidah, dan muhafadzoh nadzom wajib.', 'BookCheck', 'emerald', '["KBM Malam Jam I, II, dan III","Takror Siang & Setoran 6 Kelompok","Batas Presensi Alfa Maksimal 10%"]'::jsonb, 10),
    ('pilar-unggulan', 'Kelas Unggulan', 'Est. 2018 M', 'Dirancang untuk santri berprestasi (3 Ula s/d 2 Ulya) dengan pembiasaan kemandirian baca kitab (larangan mbalah bagi mustahiq di Daur Tsani), Syawir Kubro mingguan, dan evaluasi Ma''had Aly.', 'Sparkles', 'amber', '["Metode Belajar Mandiri & Diskusi Aktif","Syawir Kubro & Kajian Mendalam","Evaluasi Triwulanan Bersama Ma''had Aly"]'::jsonb, 20),
    ('pilar-akselerasi', 'Program Akselerasi & IHFAD', 'Est. 2019 M', 'Percepatan jenjang bagi santri berpotensi luar biasa (1 Ula – 4 Ula) yang dibarengi kewajiban bimbingan intensif IHFAD (Jilid I, II, dan III) untuk penuntasan hafalan nadzom tingkat tinggi.', 'TrendingUp', 'teal', '["Seleksi Ketat Hafalan & Pemahaman","Bimbingan Khusus IHFAD Berjenjang","Akselerasi Jenjang 1–4 Ula"]'::jsonb, 30)
ON CONFLICT (id) DO NOTHING;

-- Seed Khazanah Jenjang & Kitab Kuning
INSERT INTO public.profil_khazanah_jenjang (id, kode_tab, nama, durasi, fokus, target_hafalan, ujian_akhir, kitab_list, sort_order)
VALUES
    ('jen-istidad', 'Isti''dad', 'Tingkat Isti''dad (Persiapan)', '1 Tahun Ajaran', 'Pengenalan Huruf Arab Pegon, Imla'', Dasar Aqidah, serta Praktik Wudlu & Sholat Fardlu', 'Surat-surat Pendek Juz ''Amma, Doa Sehari-hari, dan Nadzom Aqidatul Awwam Awal', 'Tes Lisan Praktik Ibadah & Imtihan Persiapan', '[
        {"id":"k-ist-1","fan":"Fiqih","kitab":"Mabadi''ul Fiqhiyyah Juz 1","kitabArab":"مبادئ الفقهية","kelas":"Isti''dad","target":"Thoharoh & Rukun Sholat"},
        {"id":"k-ist-2","fan":"Aqidah","kitab":"Aqidatul Mubtadi''in","kitabArab":"عقيدة المبتدئين","kelas":"Isti''dad","target":"Sifat Wajib 20 Bagi Allah"},
        {"id":"k-ist-3","fan":"Akhlaq","kitab":"Tanbihul Muta''allim","kitabArab":"تنبيه المتعلم","kelas":"Isti''dad","target":"Adab Kepada Guru & Teman"},
        {"id":"k-ist-4","fan":"Pegon & Imla''","kitab":"Al-Itqon Pegon","kitabArab":"الإتقان في خط البيغون","kelas":"Isti''dad","target":"Membaca & Menulis Gandeng"},
        {"id":"k-ist-5","fan":"Tajwid","kitab":"Hidayatus Shibyan","kitabArab":"هداية الصبيان","kelas":"Isti''dad","target":"Hukum Nun Mati & Tanwin"}
    ]'::jsonb, 10),
    ('jen-ula', 'Ula', 'Tingkat Ula (Dasar Salaf)', '4 Tahun (Kelas 1 s/d 4 Ula)', 'Penguasaan Gramatika Bahasa Arab (Jurumiyyah & Imrithi), Ushul Fiqih Dasar (Safinah & Taqrib Awal), serta Tasrifan', 'Nadzom Jurumiyyah, Al-Maqsud, Al-''Imrithi, Juz ''Amma lengkap & Khulashoh Nurul Yaqin', 'Ulangan Umum Bersama (UUB), Daur Awwal/Tsani, dan Evaluasi Tingkat 4 Ula', '[
        {"id":"k-ula-1","fan":"Nahwu","kitab":"Jurumiyyah Al-Bayan & Matan Jurumiyyah","kitabArab":"الآجرومية والبيان","kelas":"1 - 2 Ula","target":"I''rab, Isim-Isim Marfu'' & Manshub"},
        {"id":"k-ula-2","fan":"Nahwu Lanjutan","kitab":"Nadzom Al-''Imrithi","kitabArab":"نظم الدرة البهية (العمريطي)","kelas":"3 - 4 Ula","target":"254 Bait Nadzom I''rab Lengkap"},
        {"id":"k-ula-3","fan":"Shorof","kitab":"Tashrif Istilahi & Lughowi (Kaelani)","kitabArab":"تصريف اصطلاحي ولغوي","kelas":"1 - 3 Ula","target":"Bina'' Shohih s/d Mu''tal 6 Bab"},
        {"id":"k-ula-4","fan":"Fiqih","kitab":"Safinatun Najah & Sullamut Taufiq","kitabArab":"سفينة النجاة وسلم التوفيق","kelas":"1 - 3 Ula","target":"Fiqih Ibadah, Muamalah, Jenazah"},
        {"id":"k-ula-5","fan":"Fiqih Lanjutan","kitab":"Matan Taqrib (Fathul Qorib Awal)","kitabArab":"متن الغاية والتقريب","kelas":"4 Ula","target":"Bab Thoharoh, Sholat, Zakat"},
        {"id":"k-ula-6","fan":"Aqidah","kitab":"Aqidatul Awwam & Tuhfatul Murid","kitabArab":"عقيدة العوام","kelas":"1 - 2 Ula","target":"50 Aqaid Seket & Kisah 25 Rasul"},
        {"id":"k-ula-7","fan":"Akhlaq","kitab":"Taisirul Kholaq & Washoya Al-Abaa''","kitabArab":"تيسير الخلاق والوصايا","kelas":"1 - 3 Ula","target":"Etika Penuntut Ilmu"},
        {"id":"k-ula-8","fan":"Tarikh Nabi","kitab":"Khulashoh Nurul Yaqin Juz 1 & 2","kitabArab":"خلاصة نور اليقين","kelas":"2 - 4 Ula","target":"Sirah Nabawiyyah Makkiyah-Madaniyyah"}
    ]'::jsonb, 20),
    ('jen-wustho', 'Wustho', 'Tingkat Wustho (Menengah Salaf)', '2 Tahun (Kelas 1 s/d 2 Wustho)', 'Pendalaman Kitab Fathul Qorib, Penguasaan Alfiyyah Ibnu Malik, Qowa''idul I''rab, Faroidl (Mawaris), dan Risalatul Mahidl', 'Alfiyyah Ibnu Malik (Bait 1 s/d 500 di Kelas 1, 501 s/d 1002 di Kelas 2) & Nadzom Faroidl', 'Tes Kitab Fathul Qorib (Al-Qur''an & Taqrib), Daur Tsani, dan Syawir Kubro Wustho', '[
        {"id":"k-wus-1","fan":"Nahwu Akbar","kitab":"Alfiyyah Ibnu Malik (Jilid 1 & 2)","kitabArab":"ألفية ابن مالك في النحو","kelas":"1 - 2 Wustho","target":"Khatam 1.002 Bait Alfiyyah"},
        {"id":"k-wus-2","fan":"Fiqih Syafi''i","kitab":"Syarah Fathul Qorib Al-Mujib","kitabArab":"فتح القريب المجيب شرح تقريب","kelas":"1 - 2 Wustho","target":"Muamalah, Munakahat, Jinayat"},
        {"id":"k-wus-3","fan":"Qowa''id I''rab","kitab":"Qowa''idul I''rab Ibnu Hisyam","kitabArab":"قواعد الإعراب لابن هشام","kelas":"1 Wustho","target":"Tathbiq I''rab Kalimat Kompleks"},
        {"id":"k-wus-4","fan":"I''lal & Shorof","kitab":"Qowa''idul I''lal & Nadzmul Maqsud","kitabArab":"قواعد الإعلال ونظم المقصود","kelas":"1 - 2 Wustho","target":"Kaidah 19 I''lal Huruf ''Illat"},
        {"id":"k-wus-5","fan":"Tauhid Lanjutan","kitab":"Khoridatul Bahiyyah & Kifayatul Awwam","kitabArab":"الخريدة البهية","kelas":"1 - 2 Wustho","target":"Dalil Aqli & Naqli Sifat 20"},
        {"id":"k-wus-6","fan":"Mawaris","kitab":"Diklat Ilmu Faroidl","kitabArab":"علم الفرائض والمواريث","kelas":"2 Wustho","target":"Hitungan Ashabul Furudh & ''Ashobah"},
        {"id":"k-wus-7","fan":"Dima'' Jibliyyah","kitab":"Risalatul Mahidl","kitabArab":"رسالة المحيض","kelas":"1 Wustho Pi/Pa","target":"Haidh, Nifas, Istihadlah & Salat"}
    ]'::jsonb, 30),
    ('jen-ulya', 'Ulya', 'Tingkat Ulya (Tinggi & Kader Ulama)', '2 Tahun (Kelas 1 s/d 2 Ulya)', 'Tafaqquh Fiddin Tingkat Tinggi (Fathul Mu''in), Ibnu ''Aqil, Sastra Balaghah, Ushul Fiqh, Falakiyah, serta Praktik Pengalaman Lapangan (PPL)', 'Jauharotut Tauhid, Jauharul Maknun (Balaghah), dan Sullamul Munauroq (Mantiq)', 'Ebtadin Ulya, Sidang Munaqosyah PPL, dan Ujian Bahtsul Masa''il Kubro', '[
        {"id":"k-uly-1","fan":"Fiqih Tingkat Tinggi","kitab":"Fathul Mu''in bi Syarhi Qurratil ''Ain","kitabArab":"فتح المعين بشرح قرة العين","kelas":"1 - 2 Ulya","target":"Tathbiq Ibadah & Muamalah Turats"},
        {"id":"k-uly-2","fan":"Syarah Nahwu","kitab":"Syarah Ibnu ''Aqil ''Ala Alfiyyah","kitabArab":"شرح ابن عقيل على الألفية","kelas":"1 - 2 Ulya","target":"Analisis Khilafiyah Bashrah & Kufah"},
        {"id":"k-uly-3","fan":"Sastra Balaghah","kitab":"Al-Jauharul Maknun (Ma''ani, Bayan, Badi'')","kitabArab":"الجوهر المكنون في البلاغة","kelas":"1 - 2 Ulya","target":"Keindahan Retorika Al-Qur''an"},
        {"id":"k-uly-4","fan":"Logika Mantiq","kitab":"Sullamul Munauroq & Idhohul Mubham","kitabArab":"السلم المنورق في علم المنطق","kelas":"1 Ulya","target":"Tashowwur & Tashdiq Argumentasi"},
        {"id":"k-uly-5","fan":"Mushtholah Hadits","kitab":"Manzhumah Baiquniyyah & Tashilut Thuruqot","kitabArab":"المنظومة البيقونية","kelas":"1 - 2 Ulya","target":"Klasifikasi Hadits Shohih s/d Dlo''if"},
        {"id":"k-uly-6","fan":"Astronomi Islam","kitab":"Ilmu Falakiyah Darussalam","kitabArab":"علم الفلك والمواقيت","kelas":"2 Ulya","target":"Hisab Awal Bulan & Arah Kiblat"}
    ]'::jsonb, 40)
ON CONFLICT (id) DO NOTHING;

-- Seed Waktu KBM Pesantren
INSERT INTO public.profil_waktu_kbm (id, judul, rentang_waktu, tema, icon_name, slots, sort_order)
VALUES
    ('wkbm-siang', 'Takror Siang (Mudzakarah & Setoran Hafalan)', 'Pukul 13.30 – 15.00 WIB', 'siang', 'Sun', '[
        {"id":"sl-s-1","waktu":"13.30 – 13.55 WIB","keterangan":"Persiapan, oprak-oprak kamar, dan penertiban lokal kelas."},
        {"id":"sl-s-2","waktu":"13.55 – 14.00 WIB","keterangan":"Pencegatan lokal & lalaran bait nadzom (Qobla al-Dirosah)."},
        {"id":"sl-s-3","waktu":"14.00 – 15.00 WIB","keterangan":"Pelaksanaan 3 sesi takror 6 kelompok & setoran muhafadzoh."}
    ]'::jsonb, 10),
    ('wkbm-malam', 'Diniyyah Malam (KBM Pokok & Sorogan)', 'Pukul 19.55 – 22.30 WIB', 'malam', 'Moon', '[
        {"id":"sl-m-1","waktu":"19.55 WIB","keterangan":"Bel tanda masuk & pencegatan Tim Oprak-Oprak (TOP)."},
        {"id":"sl-m-2","waktu":"20.00 – 20.45 WIB","keterangan":"Jam Pelajaran I (Mata pelajaran pokok fanniyah)."},
        {"id":"sl-m-3","waktu":"20.45 – 21.30 WIB","keterangan":"Jam Pelajaran II (Gramatika & pendalaman nahwu-shorof)."},
        {"id":"sl-m-4","waktu":"21.30 – 22.30 WIB","keterangan":"Jam III / IV: Bandongan Ula & Sorogan Kitab Wustho/Ulya."}
    ]'::jsonb, 20)
ON CONFLICT (id) DO NOTHING;
