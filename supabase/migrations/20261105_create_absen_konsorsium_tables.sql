-- ============================================================================
-- MIGRASI: SISTEM ABSEN KONSORSIUM (Madrasah Diniyyah Blokagung)
-- ============================================================================

-- 1. TABEL: kelas_konsorsium
CREATE TABLE IF NOT EXISTS public.kelas_konsorsium (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tingkat VARCHAR(30) NOT NULL,
  jenis_konsor VARCHAR(30) NOT NULL DEFAULT 'Mustahiq/qoh',
  nama_kelas VARCHAR(150) NOT NULL,
  kitab_rujukan VARCHAR(200) DEFAULT '',
  pembimbing_nama VARCHAR(150) NOT NULL,
  pembimbing_nia VARCHAR(50) DEFAULT '',
  keterangan TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kelas_konsorsium_tingkat ON public.kelas_konsorsium(tingkat);
CREATE INDEX IF NOT EXISTS idx_kelas_konsorsium_jenis ON public.kelas_konsorsium(jenis_konsor);
CREATE INDEX IF NOT EXISTS idx_kelas_konsorsium_nama ON public.kelas_konsorsium(nama_kelas);

-- 2. TABEL: anggota_konsorsium (Pendaftaran Asatidz ke Kelas Konsorsium)
CREATE TABLE IF NOT EXISTS public.anggota_konsorsium (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kelas_id TEXT NOT NULL REFERENCES public.kelas_konsorsium(id) ON DELETE CASCADE,
  asatidz_id TEXT,
  nia VARCHAR(50) NOT NULL,
  nama_asatidz VARCHAR(150) NOT NULL,
  gender VARCHAR(10) DEFAULT '',
  peran VARCHAR(50) DEFAULT 'Anggota',
  tanggal_bergabung TEXT DEFAULT CURRENT_DATE::text,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_kelas_anggota_nia UNIQUE (kelas_id, nia)
);

CREATE INDEX IF NOT EXISTS idx_anggota_konsorsium_kelas ON public.anggota_konsorsium(kelas_id);
CREATE INDEX IF NOT EXISTS idx_anggota_konsorsium_nia ON public.anggota_konsorsium(nia);

-- 3. TABEL: sesi_presensi_konsorsium (Pertemuan Konsorsium)
CREATE TABLE IF NOT EXISTS public.sesi_presensi_konsorsium (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  kelas_id TEXT NOT NULL REFERENCES public.kelas_konsorsium(id) ON DELETE CASCADE,
  tanggal TEXT NOT NULL,
  hari VARCHAR(30) DEFAULT '',
  tahun INTEGER,
  bulan INTEGER,
  pertemuan_ke INTEGER,
  topik_bahasan TEXT DEFAULT '',
  notulen TEXT DEFAULT '',
  diinput_oleh VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_sesi_konsorsium_kelas_tanggal UNIQUE (kelas_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_sesi_konsorsium_kelas_tgl ON public.sesi_presensi_konsorsium(kelas_id, tanggal);

-- 4. TABEL: detail_presensi_konsorsium (Status Presensi Anggota)
CREATE TABLE IF NOT EXISTS public.detail_presensi_konsorsium (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sesi_id TEXT NOT NULL REFERENCES public.sesi_presensi_konsorsium(id) ON DELETE CASCADE,
  anggota_id TEXT NOT NULL,
  nia VARCHAR(50) NOT NULL,
  nama_asatidz VARCHAR(150) NOT NULL,
  status VARCHAR(25) NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alfa', 'Terlambat')),
  keterangan TEXT DEFAULT '',
  waktu_input TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_detail_presensi_sesi_nia UNIQUE (sesi_id, nia)
);

CREATE INDEX IF NOT EXISTS idx_detail_presensi_sesi ON public.detail_presensi_konsorsium(sesi_id);
CREATE INDEX IF NOT EXISTS idx_detail_presensi_anggota ON public.detail_presensi_konsorsium(anggota_id);

-- GRANT ACCESS TO DATA API ROLES
GRANT ALL ON TABLE public.kelas_konsorsium TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.anggota_konsorsium TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sesi_presensi_konsorsium TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.detail_presensi_konsorsium TO anon, authenticated, service_role;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.kelas_konsorsium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota_konsorsium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesi_presensi_konsorsium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_presensi_konsorsium ENABLE ROW LEVEL SECURITY;

-- POLICIES (Mengikuti standar keamanan app_security_switch: aktif untuk authenticated atau saat security switch nonaktif)
DROP POLICY IF EXISTS allow_all_kelas_konsorsium ON public.kelas_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on kelas_konsorsium" ON public.kelas_konsorsium;
CREATE POLICY "Authenticated full access on kelas_konsorsium"
  ON public.kelas_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS allow_all_anggota_konsorsium ON public.anggota_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on anggota_konsorsium" ON public.anggota_konsorsium;
CREATE POLICY "Authenticated full access on anggota_konsorsium"
  ON public.anggota_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS allow_all_sesi_konsorsium ON public.sesi_presensi_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on sesi_presensi_konsorsium" ON public.sesi_presensi_konsorsium;
CREATE POLICY "Authenticated full access on sesi_presensi_konsorsium"
  ON public.sesi_presensi_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS allow_all_detail_presensi ON public.detail_presensi_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on detail_presensi_konsorsium" ON public.detail_presensi_konsorsium;
CREATE POLICY "Authenticated full access on detail_presensi_konsorsium"
  ON public.detail_presensi_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
