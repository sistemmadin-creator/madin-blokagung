-- Migrasi Keamanan Berlapis: Penguncian RLS Tabel Internal ke Role Authenticated
-- dan Provisioning 2 Akun Pengurus Awal (Master Admin & PKM. Kurikulum)

ALTER TABLE public.santri ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asatidz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formasi_kelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_kbm_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absensi_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setoran_hafalan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_solver_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warta_berita ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama yang mengizinkan role public/anon pada tabel internal
DROP POLICY IF EXISTS "Allow full access to santri" ON public.santri;
DROP POLICY IF EXISTS "asatidz_allow_all" ON public.asatidz;
DROP POLICY IF EXISTS "Allow full access to formasi_kelas" ON public.formasi_kelas;
DROP POLICY IF EXISTS "Enable all access for anon" ON public.jadwal_kbm_slots;
DROP POLICY IF EXISTS "Enable all access for anon" ON public.absensi_records;
DROP POLICY IF EXISTS "Enable all access for anon" ON public.setoran_hafalan_records;
DROP POLICY IF EXISTS "Allow full access to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow full access to activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Enable all for anon on notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Enable all for anon on offline_sync_logs" ON public.offline_sync_logs;
DROP POLICY IF EXISTS "Enable all for anon on schedule_solver_proposals" ON public.schedule_solver_proposals;
DROP POLICY IF EXISTS "Allow public insert push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public select push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public update push subscription" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Allow public delete push subscription" ON public.push_subscriptions;

-- Hapus policy baru jika pernah dibuat sebelumnya agar skrip idempoten
DROP POLICY IF EXISTS "Authenticated full access on santri" ON public.santri;
DROP POLICY IF EXISTS "Authenticated full access on asatidz" ON public.asatidz;
DROP POLICY IF EXISTS "Authenticated full access on formasi_kelas" ON public.formasi_kelas;
DROP POLICY IF EXISTS "Authenticated full access on jadwal_kbm_slots" ON public.jadwal_kbm_slots;
DROP POLICY IF EXISTS "Authenticated full access on absensi_records" ON public.absensi_records;
DROP POLICY IF EXISTS "Authenticated full access on setoran_hafalan_records" ON public.setoran_hafalan_records;
DROP POLICY IF EXISTS "Authenticated full access on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated full access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated full access on notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Authenticated full access on offline_sync_logs" ON public.offline_sync_logs;
DROP POLICY IF EXISTS "Authenticated full access on schedule_solver_proposals" ON public.schedule_solver_proposals;
DROP POLICY IF EXISTS "Authenticated full access on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Publik dapat membaca berita published" ON public.warta_berita;
DROP POLICY IF EXISTS "Admin dapat mengelola seluruh berita" ON public.warta_berita;

-- Terapkan policy khusus pengguna terautentikasi dengan evaluasi (select auth.uid()) ter-cache
CREATE POLICY "Authenticated full access on santri"
  ON public.santri FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on asatidz"
  ON public.asatidz FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on formasi_kelas"
  ON public.formasi_kelas FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on jadwal_kbm_slots"
  ON public.jadwal_kbm_slots FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on absensi_records"
  ON public.absensi_records FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on setoran_hafalan_records"
  ON public.setoran_hafalan_records FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on app_settings"
  ON public.app_settings FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on activity_logs"
  ON public.activity_logs FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on notification_logs"
  ON public.notification_logs FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on offline_sync_logs"
  ON public.offline_sync_logs FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on schedule_solver_proposals"
  ON public.schedule_solver_proposals FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated full access on push_subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Tabel warta_berita: publik hanya membaca berita published, pengurus login mengelola penuh
CREATE POLICY "Publik dapat membaca berita published"
  ON public.warta_berita FOR SELECT TO anon, authenticated
  USING (status = 'published'::post_status_enum);

CREATE POLICY "Admin dapat mengelola seluruh berita"
  ON public.warta_berita FOR ALL TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);
