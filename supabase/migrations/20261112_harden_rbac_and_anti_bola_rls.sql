-- =============================================================================
-- MIGRASI: 20261112_harden_rbac_and_anti_bola_rls.sql
-- TUJUAN : Penguatan Otorisasi Database Supabase & Penutupan Celah BOLA / IDOR
--          1. Helper function is_admin_or_master() dan is_active_pengurus()
--          2. Penguncian tabel app_settings (Hanya admin yang boleh INSERT/UPDATE/DELETE)
--          3. Penguncian tabel activity_logs (Immutable audit log)
--          4. Pengetatan tabel ebtadin_* dan serah_piagam (Cabut akses publik anonim)
--          5. Pengetatan push_subscriptions (Proteksi IDOR data langganan notifikasi)
-- =============================================================================

BEGIN;

-- 1. Helper function untuk mendeteksi apakah pemanggil adalah Admin atau Master Admin
CREATE OR REPLACE FUNCTION public.is_admin_or_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Pengecekan 1: JWT App Metadata (paling efisien)
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('master_admin', 'admin', 'pkm_kurikulum', 'ketua_madin')
    -- Pengecekan 2: Lookup tabel user_accounts
    OR EXISTS (
      SELECT 1 FROM public.user_accounts
      WHERE id = (select auth.uid())
        AND is_active = true
        AND (role IN ('master_admin', 'admin', 'pkm_kurikulum', 'ketua_madin') OR username = 'admin')
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_master() TO authenticated;

-- 2. Helper function untuk mendeteksi pengguna terotentikasi yang aktif
CREATE OR REPLACE FUNCTION public.is_active_pengurus()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (select auth.uid()) IS NOT NULL
    AND (
      -- Jika belum ada di user_accounts tetapi terotentikasi (admin awal)
      NOT EXISTS (SELECT 1 FROM public.user_accounts WHERE id = (select auth.uid()))
      -- Atau ada di user_accounts dan status is_active = true
      OR EXISTS (
        SELECT 1 FROM public.user_accounts
        WHERE id = (select auth.uid())
          AND is_active = true
      )
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active_pengurus() TO authenticated;

-- =============================================================================
-- 3. HARDENING TABEL app_settings
--    Semua pengguna terotentikasi boleh membaca, tapi HANYA ADMIN yang boleh mengubah!
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated full access on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_all" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_modify_admin_only" ON public.app_settings;

CREATE POLICY "app_settings_select_all"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

CREATE POLICY "app_settings_modify_admin_only"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_master() OR NOT public.is_app_security_enabled())
  WITH CHECK (public.is_admin_or_master() OR NOT public.is_app_security_enabled());

-- =============================================================================
-- 4. HARDENING TABEL activity_logs (AUDIT TRAIL IMMUTABLE)
--    Mencegah penghapusan / pemalsuan log aktivitas oleh pengguna non-master.
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated full access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_modify_master_only" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete_master_only" ON public.activity_logs;

CREATE POLICY "activity_logs_select_policy"
  ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_master()
    OR username = COALESCE((select auth.jwt()) -> 'app_metadata' ->> 'username', (select auth.jwt()) ->> 'email')
    OR NOT public.is_app_security_enabled()
  );

CREATE POLICY "activity_logs_insert_policy"
  ON public.activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "activity_logs_modify_master_only"
  ON public.activity_logs
  FOR UPDATE
  TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

CREATE POLICY "activity_logs_delete_master_only"
  ON public.activity_logs
  FOR DELETE
  TO authenticated
  USING (public.is_master_admin());

-- =============================================================================
-- 5. HARDENING TABEL EBTADIN & SERAH PIAGAM (Cabut Akses Anonim/Public)
-- =============================================================================
DROP POLICY IF EXISTS "Allow all access on ebtadin_asatidz" ON public.ebtadin_asatidz;
DROP POLICY IF EXISTS "Allow all access on ebtadin_formasi_kelas" ON public.ebtadin_formasi_kelas;
DROP POLICY IF EXISTS "Allow all access on ebtadin_santri" ON public.ebtadin_santri;
DROP POLICY IF EXISTS "Allow all access on ebtadin_serah_ijazah" ON public.ebtadin_serah_ijazah;
DROP POLICY IF EXISTS "Allow all access on ebtadin_tahun_ajaran" ON public.ebtadin_tahun_ajaran;
DROP POLICY IF EXISTS "ebtadin_alasan_options_policy" ON public.ebtadin_alasan_options;
DROP POLICY IF EXISTS "ebtadin_kelulusan_policy" ON public.ebtadin_kelulusan;
DROP POLICY IF EXISTS "ebtadin_peserta_ujian_policy" ON public.ebtadin_peserta_ujian;
DROP POLICY IF EXISTS "Allow public all access on serah_piagam" ON public.serah_piagam;

DROP POLICY IF EXISTS "ebtadin_asatidz_access" ON public.ebtadin_asatidz;
DROP POLICY IF EXISTS "ebtadin_formasi_kelas_access" ON public.ebtadin_formasi_kelas;
DROP POLICY IF EXISTS "ebtadin_santri_access" ON public.ebtadin_santri;
DROP POLICY IF EXISTS "ebtadin_serah_ijazah_access" ON public.ebtadin_serah_ijazah;
DROP POLICY IF EXISTS "ebtadin_tahun_ajaran_access" ON public.ebtadin_tahun_ajaran;
DROP POLICY IF EXISTS "ebtadin_alasan_options_access" ON public.ebtadin_alasan_options;
DROP POLICY IF EXISTS "ebtadin_kelulusan_access" ON public.ebtadin_kelulusan;
DROP POLICY IF EXISTS "ebtadin_peserta_ujian_access" ON public.ebtadin_peserta_ujian;
DROP POLICY IF EXISTS "serah_piagam_access" ON public.serah_piagam;

CREATE POLICY "ebtadin_asatidz_access" ON public.ebtadin_asatidz FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_formasi_kelas_access" ON public.ebtadin_formasi_kelas FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_santri_access" ON public.ebtadin_santri FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_serah_ijazah_access" ON public.ebtadin_serah_ijazah FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_tahun_ajaran_access" ON public.ebtadin_tahun_ajaran FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_alasan_options_access" ON public.ebtadin_alasan_options FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_kelulusan_access" ON public.ebtadin_kelulusan FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "ebtadin_peserta_ujian_access" ON public.ebtadin_peserta_ujian FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

CREATE POLICY "serah_piagam_access" ON public.serah_piagam FOR ALL TO authenticated
  USING (public.is_active_pengurus()) WITH CHECK (public.is_active_pengurus());

-- =============================================================================
-- 6. HARDENING TABEL push_subscriptions
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated full access on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_select_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_modify_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_policy" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select_policy"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (
    public.is_admin_or_master()
    OR target_identifier = (select auth.uid())::text
    OR NOT public.is_app_security_enabled()
  );

CREATE POLICY "push_subscriptions_insert_policy"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "push_subscriptions_modify_policy"
  ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (
    public.is_admin_or_master()
    OR target_identifier = (select auth.uid())::text
    OR NOT public.is_app_security_enabled()
  )
  WITH CHECK (
    public.is_admin_or_master()
    OR target_identifier = (select auth.uid())::text
    OR NOT public.is_app_security_enabled()
  );

CREATE POLICY "push_subscriptions_delete_policy"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (
    public.is_admin_or_master()
    OR target_identifier = (select auth.uid())::text
    OR NOT public.is_app_security_enabled()
  );

COMMIT;
