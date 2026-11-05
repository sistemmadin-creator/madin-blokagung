-- ============================================================================
-- MIGRASI: SISTEM ABSEN KONSORSIUM (Madrasah Diniyyah Blokagung)
-- ============================================================================

-- 1. TABEL: kelas_konsorsium
CREATE TABLE IF NOT EXISTS public.kelas_konsorsium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tingkat VARCHAR(30) NOT NULL,
  nama_kelas VARCHAR(150) NOT NULL,
  kitab_rujukan VARCHAR(200),
  pembimbing_nama VARCHAR(150) NOT NULL,
  pembimbing_nia VARCHAR(50),
  keterangan TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kelas_konsorsium_tingkat ON public.kelas_konsorsium(tingkat);
CREATE INDEX IF NOT EXISTS idx_kelas_konsorsium_nama ON public.kelas_konsorsium(nama_kelas);

-- 2. TABEL: anggota_konsorsium (Pendaftaran Asatidz ke Kelas Konsorsium)
CREATE TABLE IF NOT EXISTS public.anggota_konsorsium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id UUID NOT NULL REFERENCES public.kelas_konsorsium(id) ON DELETE CASCADE,
  asatidz_id UUID,
  nia VARCHAR(50) NOT NULL,
  nama_asatidz VARCHAR(150) NOT NULL,
  gender VARCHAR(10) DEFAULT '',
  peran VARCHAR(50) DEFAULT 'Anggota',
  tanggal_bergabung DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_kelas_anggota_nia UNIQUE (kelas_id, nia)
);

CREATE INDEX IF NOT EXISTS idx_anggota_konsorsium_kelas ON public.anggota_konsorsium(kelas_id);
CREATE INDEX IF NOT EXISTS idx_anggota_konsorsium_nia ON public.anggota_konsorsium(nia);

-- 3. TABEL: sesi_presensi_konsorsium (Pertemuan Konsorsium)
CREATE TABLE IF NOT EXISTS public.sesi_presensi_konsorsium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kelas_id UUID NOT NULL REFERENCES public.kelas_konsorsium(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  hari VARCHAR(30),
  topik_bahasan TEXT,
  notulen TEXT,
  diinput_oleh VARCHAR(100) DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sesi_konsorsium_kelas_tgl ON public.sesi_presensi_konsorsium(kelas_id, tanggal);

-- 4. TABEL: detail_presensi_konsorsium (Status Presensi Anggota)
CREATE TABLE IF NOT EXISTS public.detail_presensi_konsorsium (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sesi_id UUID NOT NULL REFERENCES public.sesi_presensi_konsorsium(id) ON DELETE CASCADE,
  anggota_id UUID NOT NULL REFERENCES public.anggota_konsorsium(id) ON DELETE CASCADE,
  nia VARCHAR(50) NOT NULL,
  nama_asatidz VARCHAR(150) NOT NULL,
  status VARCHAR(25) NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alfa', 'Terlambat')),
  keterangan TEXT DEFAULT '',
  waktu_input TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detail_presensi_sesi ON public.detail_presensi_konsorsium(sesi_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.kelas_konsorsium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anggota_konsorsium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesi_presensi_konsorsium ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_presensi_konsorsium ENABLE ROW LEVEL SECURITY;

-- POLICIES (Allow read/write for all clients / application roles)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_kelas_konsorsium') THEN
    CREATE POLICY allow_all_kelas_konsorsium ON public.kelas_konsorsium FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_anggota_konsorsium') THEN
    CREATE POLICY allow_all_anggota_konsorsium ON public.anggota_konsorsium FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_sesi_konsorsium') THEN
    CREATE POLICY allow_all_sesi_konsorsium ON public.sesi_presensi_konsorsium FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_detail_presensi') THEN
    CREATE POLICY allow_all_detail_presensi ON public.detail_presensi_konsorsium FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
