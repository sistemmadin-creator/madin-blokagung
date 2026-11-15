-- =============================================================================
-- ROLLBACK SCRIPT: 20261115_rollback_to_20261112.sql
-- TUJUAN         : Mengembalikan fungsi helper, RLS policies, trigger, dan
--                  konfigurasi keamanan dari migrasi 20261115 kembali persis ke
--                  kondisi migrasi 20261112 (dan 20261105 / 20261106).
-- CARA PAKAI     : Jalankan di SQL Editor Supabase hanya jika diperlukan rollback
--                  darurat pasca-migrasi 20261115.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Hapus Trigger Anti-Spoofing pada activity_logs
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_enforce_activity_log_actor ON public.activity_logs;
DROP FUNCTION IF EXISTS private.enforce_activity_log_actor();

-- -----------------------------------------------------------------------------
-- 2. Pulihkan Fungsi Helper public.is_master_admin(), is_admin_or_master(),
--    dan is_active_pengurus() ke definisi 20261105 & 20261112
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') = 'master_admin',
    EXISTS (
      SELECT 1 FROM public.user_accounts
      WHERE id = (select auth.uid()) AND (role = 'master_admin' OR username = 'admin')
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_admin_or_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('master_admin', 'admin', 'pkm_kurikulum', 'ketua_madin')
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
      NOT EXISTS (SELECT 1 FROM public.user_accounts WHERE id = (select auth.uid()))
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

-- -----------------------------------------------------------------------------
-- 3. Pulihkan Konfigurasi & RPC app_security_config ke definisi 20261106
-- -----------------------------------------------------------------------------
GRANT SELECT (id, is_security_enabled, updated_at, updated_by) ON public.app_security_config TO anon, authenticated;

DROP POLICY IF EXISTS "app_security_config_select_authenticated" ON public.app_security_config;
DROP POLICY IF EXISTS "app_security_config_select_all" ON public.app_security_config;
CREATE POLICY "app_security_config_select_all"
  ON public.app_security_config FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT EXECUTE ON FUNCTION public.is_app_security_enabled() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_security_status() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_toggle_app_security(
  p_enable boolean,
  p_security_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_config public.app_security_config;
  v_admin_auth_hash text;
  v_actor text := 'admin';
BEGIN
  IF p_security_password IS NULL OR length(trim(p_security_password)) = 0 THEN
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan wajib diisi.';
  END IF;

  SELECT * INTO v_config
  FROM public.app_security_config
  WHERE id = 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konfigurasi keamanan aplikasi tidak ditemukan.';
  END IF;

  IF p_enable = false AND NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang sedang login yang dapat menonaktifkan Keamanan Aplikasi.';
  END IF;

  IF p_enable = true AND v_config.is_security_enabled = true AND NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang dapat mengubah status keamanan.';
  END IF;

  SELECT encrypted_password INTO v_admin_auth_hash
  FROM auth.users
  WHERE email = 'admin@madinblokagung.local'
  LIMIT 1;

  IF v_admin_auth_hash IS NOT NULL
     AND extensions.crypt(p_security_password, v_admin_auth_hash) = v_admin_auth_hash
     AND extensions.crypt(p_security_password, v_config.security_password_hash) <> v_config.security_password_hash THEN
    RAISE EXCEPTION 'Gunakan Kata Sandi Khusus Keamanan Aplikasi (bukan kata sandi login Master Admin).';
  END IF;

  IF extensions.crypt(p_security_password, v_config.security_password_hash) <> v_config.security_password_hash THEN
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan tidak sesuai. Perubahan status keamanan dibatalkan.';
  END IF;

  IF (SELECT auth.uid()) IS NOT NULL THEN
    SELECT COALESCE(username, 'admin') INTO v_actor
    FROM public.user_accounts
    WHERE id = (SELECT auth.uid());
  END IF;

  UPDATE public.app_security_config
  SET
    is_security_enabled = p_enable,
    updated_at = now(),
    updated_by = COALESCE(v_actor, 'admin')
  WHERE id = 1
  RETURNING * INTO v_config;

  RETURN jsonb_build_object(
    'is_security_enabled', v_config.is_security_enabled,
    'updated_at', v_config.updated_at,
    'updated_by', v_config.updated_by
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_app_security(boolean, text) TO anon, authenticated;

ALTER TABLE public.app_security_config
  DROP COLUMN IF EXISTS failed_attempts,
  DROP COLUMN IF EXISTS locked_until;

-- -----------------------------------------------------------------------------
-- 4. Pulihkan RLS Policies Tabel Operasional ke definisi 20261106 & 20261112
-- -----------------------------------------------------------------------------

-- 4A. SANTRI
DROP POLICY IF EXISTS "santri_select_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_insert_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_update_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_delete_scoped" ON public.santri;
DROP POLICY IF EXISTS "Authenticated full access on santri" ON public.santri;
CREATE POLICY "Authenticated full access on santri"
  ON public.santri FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- 4B. ASATIDZ
DROP POLICY IF EXISTS "asatidz_select_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_insert_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_update_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_delete_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "Authenticated full access on asatidz" ON public.asatidz;
CREATE POLICY "Authenticated full access on asatidz"
  ON public.asatidz FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- 4C. FORMASI_KELAS
DROP POLICY IF EXISTS "formasi_kelas_select_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_insert_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_update_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_delete_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "Authenticated full access on formasi_kelas" ON public.formasi_kelas;
CREATE POLICY "Authenticated full access on formasi_kelas"
  ON public.formasi_kelas FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- 4D. JADWAL_KBM_SLOTS, ABSENSI_RECORDS, SETORAN_HAFALAN_RECORDS
DROP POLICY IF EXISTS "jadwal_kbm_slots_select" ON public.jadwal_kbm_slots;
DROP POLICY IF EXISTS "jadwal_kbm_slots_write" ON public.jadwal_kbm_slots;
DROP POLICY IF EXISTS "Authenticated full access on jadwal_kbm_slots" ON public.jadwal_kbm_slots;
CREATE POLICY "Authenticated full access on jadwal_kbm_slots"
  ON public.jadwal_kbm_slots FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "absensi_records_select" ON public.absensi_records;
DROP POLICY IF EXISTS "absensi_records_write" ON public.absensi_records;
DROP POLICY IF EXISTS "Authenticated full access on absensi_records" ON public.absensi_records;
CREATE POLICY "Authenticated full access on absensi_records"
  ON public.absensi_records FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "setoran_hafalan_select" ON public.setoran_hafalan_records;
DROP POLICY IF EXISTS "setoran_hafalan_write" ON public.setoran_hafalan_records;
DROP POLICY IF EXISTS "Authenticated full access on setoran_hafalan_records" ON public.setoran_hafalan_records;
CREATE POLICY "Authenticated full access on setoran_hafalan_records"
  ON public.setoran_hafalan_records FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- 4E. APP_SETTINGS (Kembalikan ke kondisi 20261112)
DROP POLICY IF EXISTS "app_settings_select_pengurus" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_write_mapped" ON public.app_settings;
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

-- 4F. TABEL LOG, SYNC, SOLVER, KONSORSIUM, & WARTA BERITA
DROP POLICY IF EXISTS "notification_logs_pengurus" ON public.notification_logs;
DROP POLICY IF EXISTS "Authenticated full access on notification_logs" ON public.notification_logs;
CREATE POLICY "Authenticated full access on notification_logs"
  ON public.notification_logs FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "offline_sync_logs_pengurus" ON public.offline_sync_logs;
DROP POLICY IF EXISTS "Authenticated full access on offline_sync_logs" ON public.offline_sync_logs;
CREATE POLICY "Authenticated full access on offline_sync_logs"
  ON public.offline_sync_logs FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "schedule_solver_proposals_pengurus" ON public.schedule_solver_proposals;
DROP POLICY IF EXISTS "Authenticated full access on schedule_solver_proposals" ON public.schedule_solver_proposals;
CREATE POLICY "Authenticated full access on schedule_solver_proposals"
  ON public.schedule_solver_proposals FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "warta_berita_select_pengurus" ON public.warta_berita;
DROP POLICY IF EXISTS "warta_berita_write_scoped" ON public.warta_berita;
DROP POLICY IF EXISTS "Publik dapat membaca berita published" ON public.warta_berita;
DROP POLICY IF EXISTS "Admin dapat mengelola seluruh berita" ON public.warta_berita;

CREATE POLICY "Publik dapat membaca berita published"
  ON public.warta_berita FOR SELECT TO anon, authenticated
  USING (status = 'published'::post_status_enum);

CREATE POLICY "Admin dapat mengelola seluruh berita"
  ON public.warta_berita FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- Konsorsium: Kembalikan ke kondisi 20261105
GRANT ALL ON TABLE public.kelas_konsorsium TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.anggota_konsorsium TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.sesi_presensi_konsorsium TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.detail_presensi_konsorsium TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "kelas_konsorsium_pengurus" ON public.kelas_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on kelas_konsorsium" ON public.kelas_konsorsium;
CREATE POLICY "Authenticated full access on kelas_konsorsium"
  ON public.kelas_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "anggota_konsorsium_pengurus" ON public.anggota_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on anggota_konsorsium" ON public.anggota_konsorsium;
CREATE POLICY "Authenticated full access on anggota_konsorsium"
  ON public.anggota_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "sesi_presensi_konsorsium_pengurus" ON public.sesi_presensi_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on sesi_presensi_konsorsium" ON public.sesi_presensi_konsorsium;
CREATE POLICY "Authenticated full access on sesi_presensi_konsorsium"
  ON public.sesi_presensi_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "detail_presensi_konsorsium_pengurus" ON public.detail_presensi_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on detail_presensi_konsorsium" ON public.detail_presensi_konsorsium;
CREATE POLICY "Authenticated full access on detail_presensi_konsorsium"
  ON public.detail_presensi_konsorsium FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

-- -----------------------------------------------------------------------------
-- 5. Pulihkan activity_logs & push_subscriptions ke kondisi 20261112
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 6. Hapus Storage Policies Baru & Skema Private
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP POLICY IF EXISTS "madin_media_select_public" ON storage.objects;
    DROP POLICY IF EXISTS "madin_media_insert_pengurus" ON storage.objects;
    DROP POLICY IF EXISTS "madin_media_update_pengurus" ON storage.objects;
    DROP POLICY IF EXISTS "madin_media_delete_pengurus" ON storage.objects;
  END IF;
END
$$;

DROP FUNCTION IF EXISTS private.can_modify_app_setting(text);
DROP FUNCTION IF EXISTS private.can_page_mode(text, text);
DROP FUNCTION IF EXISTS private.is_blok_allowed(text);
DROP FUNCTION IF EXISTS private.is_gender_allowed(text);
DROP FUNCTION IF EXISTS private.is_active_pengurus();
DROP FUNCTION IF EXISTS private.is_admin_or_master();
DROP FUNCTION IF EXISTS private.is_master_admin();
DROP FUNCTION IF EXISTS private.current_user_account();
DROP SCHEMA IF EXISTS private;

COMMIT;
