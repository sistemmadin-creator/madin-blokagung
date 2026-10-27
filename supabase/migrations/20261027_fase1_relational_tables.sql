-- ============================================================================
-- MIGRASI FASE 1: HARDENING INTEGRITAS & NORMALISASI DATABASE RELASIONAL
-- Aplikasi: Madina Blokagung (madinblokagung-next)
-- ============================================================================

-- 1. TABEL: jadwal_kbm_slots
-- Menyimpan setiap slot jam mengajar asatidz per hari secara relasional terindeks
CREATE TABLE IF NOT EXISTS public.jadwal_kbm_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_asatidz TEXT NOT NULL,
    nia TEXT,
    hari TEXT NOT NULL CHECK (hari IN ('Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis')),
    jam INT NOT NULL CHECK (jam BETWEEN 1 AND 4),
    tingkat TEXT,
    din_kls TEXT,
    din_bag TEXT,
    pa_pi TEXT CHECK (pa_pi IN ('PA', 'PI', '')),
    kelas_lengkap TEXT NOT NULL,
    fan TEXT NOT NULL,
    lokasi TEXT DEFAULT '',
    raw_slot TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_guru_hari_jam_kelas UNIQUE (nama_asatidz, hari, jam, kelas_lengkap)
);

CREATE INDEX IF NOT EXISTS idx_jadwal_slots_nama_asatidz ON public.jadwal_kbm_slots (nama_asatidz);
CREATE INDEX IF NOT EXISTS idx_jadwal_slots_hari_jam ON public.jadwal_kbm_slots (hari, jam);
CREATE INDEX IF NOT EXISTS idx_jadwal_slots_kelas_lengkap ON public.jadwal_kbm_slots (kelas_lengkap);

-- 2. TABEL: absensi_records
-- Menyimpan riwayat presensi harian asatidz per sesi KBM
CREATE TABLE IF NOT EXISTS public.absensi_records (
    id TEXT PRIMARY KEY,
    tanggal TEXT NOT NULL,
    hari TEXT NOT NULL,
    jam_ke TEXT NOT NULL,
    jam_num INT NOT NULL CHECK (jam_num BETWEEN 1 AND 4),
    nama_asatidz TEXT NOT NULL,
    nia TEXT DEFAULT '',
    gender TEXT DEFAULT '',
    tingkat TEXT DEFAULT '',
    din_kls TEXT DEFAULT '',
    din_bag TEXT DEFAULT '',
    blok TEXT DEFAULT '',
    kelas_mengajar TEXT NOT NULL,
    fan TEXT NOT NULL,
    lokasi TEXT DEFAULT '',
    status TEXT NOT NULL,
    keterangan TEXT DEFAULT '',
    menit_terlambat TEXT DEFAULT '',
    nama_pengganti TEXT DEFAULT '',
    diinput_oleh TEXT DEFAULT 'Admin',
    waktu_update TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_absensi_records_tanggal ON public.absensi_records (tanggal);
CREATE INDEX IF NOT EXISTS idx_absensi_records_nama_asatidz ON public.absensi_records (nama_asatidz);
CREATE INDEX IF NOT EXISTS idx_absensi_records_tgl_jam ON public.absensi_records (tanggal, jam_ke);

-- 3. TABEL: setoran_hafalan_records
-- Menyimpan rekaman riwayat setoran hafalan santri (Muhafadzoh)
CREATE TABLE IF NOT EXISTS public.setoran_hafalan_records (
    id TEXT PRIMARY KEY,
    no_induk TEXT NOT NULL,
    tanggal TEXT NOT NULL,
    nama TEXT NOT NULL,
    tgl_lahir TEXT DEFAULT '',
    bln_lahir TEXT DEFAULT '',
    thn_lahir TEXT DEFAULT '',
    tempat_lahir TEXT DEFAULT '',
    penjaga TEXT NOT NULL,
    mustahiq TEXT DEFAULT '',
    tingkat TEXT DEFAULT '',
    din_bag TEXT DEFAULT '',
    din_kls TEXT DEFAULT '',
    kecamatan TEXT DEFAULT '',
    kabupaten TEXT DEFAULT '',
    provinsi TEXT DEFAULT '',
    bin TEXT DEFAULT '',
    item_hafalan TEXT NOT NULL,
    kategori TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_setoran_no_induk ON public.setoran_hafalan_records (no_induk);
CREATE INDEX IF NOT EXISTS idx_setoran_tanggal ON public.setoran_hafalan_records (tanggal);
CREATE INDEX IF NOT EXISTS idx_setoran_kategori ON public.setoran_hafalan_records (kategori);

-- ============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- Mengaktifkan RLS dengan izin penuh untuk peranan anon/authenticated
-- ============================================================================
ALTER TABLE public.jadwal_kbm_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setoran_hafalan_records ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'jadwal_kbm_slots' AND policyname = 'Enable all access for anon'
    ) THEN
        CREATE POLICY "Enable all access for anon" ON public.jadwal_kbm_slots FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'absensi_records' AND policyname = 'Enable all access for anon'
    ) THEN
        CREATE POLICY "Enable all access for anon" ON public.absensi_records FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'setoran_hafalan_records' AND policyname = 'Enable all access for anon'
    ) THEN
        CREATE POLICY "Enable all access for anon" ON public.setoran_hafalan_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
