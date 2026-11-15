-- =============================================================================
-- MIGRASI: 20261115_harden_full_rbac_storage_and_security_switch.sql
-- TUJUAN :
--   1. Memindahkan fungsi helper SECURITY DEFINER ke skema privat (`private`).
--   2. Memperbaiki helper is_active_pengurus() & is_admin_or_master() (fail-closed,
--      selalu mengecek user_accounts.is_active = true agar JWT lama tidak tembus).
--   3. Menutup bypass RLS level `anon` dari Saklar Keamanan & menambah DB lockout
--      anti-brute-force pada admin_toggle_app_security().
--   4. Menegakkan RBAC (page_permissions, blok_scope, gender_scope,
--      hide_edit_pages, hide_delete_pages) langsung pada Postgres RLS.
--   5. Anti-spoofing activity_logs via trigger server-side & anti-BOLA push_subscriptions.
--   6. Menambahkan RLS Storage bucket 'madin-media' (jika tabel storage.objects ada).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Skema Private (Tidak Terekspos melalui API PostgREST Supabase)
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- Helper membaca baris akun aktif pemanggil secara konsisten (fail-closed)
CREATE OR REPLACE FUNCTION private.current_user_account()
RETURNS public.user_accounts
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ua.*
  FROM public.user_accounts ua
  WHERE ua.id = (SELECT auth.uid())
    AND ua.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_master_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_accounts ua
    WHERE ua.id = (SELECT auth.uid())
      AND ua.is_active = true
      AND (ua.role = 'master_admin' OR ua.username = 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin_or_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Catatan keamanan: WAJIB cek database real-time (AND is_active = true),
  -- TIDAK mengandalkan OR terhadap JWT claim lama agar akun nonaktif langsung diblokir.
  SELECT EXISTS (
    SELECT 1
    FROM public.user_accounts ua
    WHERE ua.id = (SELECT auth.uid())
      AND ua.is_active = true
      AND (
        ua.role IN ('master_admin', 'admin', 'pkm_kurikulum', 'ketua_madin')
        OR ua.username = 'admin'
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.is_active_pengurus()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Fail-closed: wajib memiliki profil di public.user_accounts dengan is_active = true
  SELECT EXISTS (
    SELECT 1
    FROM public.user_accounts ua
    WHERE ua.id = (SELECT auth.uid())
      AND ua.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_gender_allowed(p_pa_pi text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc public.user_accounts;
  v_scope text;
  v_norm text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_acc FROM private.current_user_account();
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_acc.role = 'master_admin' OR v_acc.username = 'admin' THEN RETURN true; END IF;

  v_scope := lower(COALESCE(v_acc.special_authorities ->> 'gender_scope', 'semua'));
  IF v_scope = 'semua' OR v_scope = '' THEN RETURN true; END IF;

  v_norm := upper(btrim(COALESCE(p_pa_pi, '')));
  IF v_norm = '' THEN RETURN true; END IF;

  IF v_scope = 'putra' THEN
    RETURN v_norm IN ('PA', 'PUTRA', 'L');
  ELSIF v_scope = 'putri' THEN
    RETURN v_norm IN ('PI', 'PUTRI', 'P');
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.is_blok_allowed(p_blok text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc public.user_accounts;
  v_scope jsonb;
  v_target text;
  v_stripped_target text;
  v_item text;
  v_clean_allowed text;
  v_stripped_allowed text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_acc FROM private.current_user_account();
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_acc.role = 'master_admin' OR v_acc.username = 'admin' THEN RETURN true; END IF;

  v_scope := v_acc.special_authorities -> 'blok_scope';
  IF v_scope IS NULL OR v_scope = '"SEMUA"'::jsonb OR jsonb_typeof(v_scope) <> 'array' THEN
    RETURN true;
  END IF;
  IF jsonb_array_length(v_scope) = 0 THEN
    RETURN true;
  END IF;

  v_target := lower(btrim(COALESCE(p_blok, '')));
  IF v_target = '' OR v_target = '-' THEN
    RETURN false;
  END IF;
  v_stripped_target := btrim(regexp_replace(v_target, '^blok\s+', '', 'i'));

  FOR v_item IN SELECT jsonb_array_elements_text(v_scope)
  LOOP
    v_clean_allowed := lower(btrim(COALESCE(v_item, '')));
    CONTINUE WHEN v_clean_allowed = '';

    IF v_target = v_clean_allowed THEN RETURN true; END IF;

    v_stripped_allowed := btrim(regexp_replace(v_clean_allowed, '^blok\s+', '', 'i'));
    IF v_stripped_target <> '' AND v_stripped_target = v_stripped_allowed THEN
      RETURN true;
    END IF;

    -- Sinonim blok selaras dengan lib/utils/rbacHelper.ts
    IF v_clean_allowed = 'blok induk putra' AND v_target IN ('blok induk', 'induk putra') THEN
      RETURN true;
    END IF;
    IF v_clean_allowed IN ('induk putri utara', 'induk putri selatan') AND v_target IN ('blok putri', 'induk putri') THEN
      RETURN true;
    END IF;
  END LOOP;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.can_page_mode(p_page_id text, p_required_mode text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc public.user_accounts;
  v_mode text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN RETURN false; END IF;
  SELECT * INTO v_acc FROM private.current_user_account();
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_acc.role = 'master_admin' OR v_acc.username = 'admin' THEN RETURN true; END IF;

  IF p_page_id = 'pengaturan' AND COALESCE(v_acc.special_authorities ->> 'pengaturan_status', 'aktif') = 'non_aktif' THEN
    RETURN false;
  END IF;

  v_mode := COALESCE(v_acc.page_permissions ->> p_page_id, 'edit');
  IF p_required_mode = 'view' THEN
    RETURN v_mode <> 'sembunyikan';
  ELSIF p_required_mode = 'edit' THEN
    RETURN v_mode = 'edit';
  ELSIF p_required_mode = 'update' THEN
    RETURN v_mode = 'edit' AND NOT (COALESCE(v_acc.special_authorities -> 'hide_edit_pages', '[]'::jsonb) ? p_page_id);
  ELSIF p_required_mode = 'delete' THEN
    RETURN v_mode = 'edit' AND NOT (COALESCE(v_acc.special_authorities -> 'hide_delete_pages', '[]'::jsonb) ? p_page_id);
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION private.can_modify_app_setting(p_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF private.is_admin_or_master() THEN RETURN true; END IF;
  IF NOT private.is_active_pengurus() THEN RETURN false; END IF;

  -- Petakan key pengaturan operasional ke izin halaman masing-masing modul
  IF p_key = 'ABSENSI_ASATIDZ_DATA' THEN
    RETURN private.can_page_mode('absensi', 'edit') OR private.can_page_mode('absen-cepat', 'edit');
  ELSIF p_key = 'MADIN_SINGKATAN_ASATIDZ_WA' THEN
    RETURN private.can_page_mode('rekap-absensi', 'edit') OR private.can_page_mode('absensi', 'edit');
  ELSIF p_key IN ('PENGATURAN_LIBUR_MADIN', 'MADIN_KALENDER_KEGIATAN_V3') THEN
    RETURN private.can_page_mode('kalender-kegiatan', 'edit') OR private.can_page_mode('absensi', 'edit') OR private.can_page_mode('absen-cepat', 'edit');
  ELSIF p_key = 'MADIN_CATATAN_DATA_V1' THEN
    RETURN private.can_page_mode('catatan', 'edit');
  ELSIF p_key IN ('FAN_CONFIG', 'FAN_PELAJARAN_DETAIL', 'GRUP_ASAL_ASATIDZ') THEN
    RETURN private.can_page_mode('fan-pelajaran', 'edit') OR private.can_page_mode('fan-pengajar', 'edit') OR private.can_page_mode('asatidz', 'edit');
  ELSIF p_key = 'JADWAL_MENGAJAR_ASATIDZ' THEN
    RETURN private.can_page_mode('jadwal-kbm', 'edit') OR private.can_page_mode('hari-kbm', 'edit') OR private.can_page_mode('formasi', 'edit') OR private.can_page_mode('asatidz', 'edit');
  ELSIF p_key IN ('PENGATURAN_BLOK_KELAS', 'HIERARKI_LOKASI_KBM') THEN
    RETURN private.can_page_mode('formasi', 'edit') OR private.can_page_mode('pengaturan', 'edit');
  ELSIF p_key = 'APP_SETTINGS' THEN
    RETURN private.can_page_mode('pengaturan', 'edit') OR private.can_page_mode('santri', 'edit') OR private.can_page_mode('asatidz', 'edit') OR private.can_page_mode('formasi', 'edit');
  ELSIF p_key = 'KONSORSIUM_DATA' THEN
    RETURN private.can_page_mode('absen-konsorsium', 'edit');
  ELSIF p_key IN ('RIWAYAT_MUHAFADZOH_DATA', 'MUHAFADZOH_HAFALAN_CONFIG', 'MUHAFADZOH_SILABUS_CONFIG', 'KEY_DB_MUHAFADZOH', 'KEY_DB_HAFALAN_CONFIG', 'SETOR_MUSTAHIQ_LOGS_DATA', 'SETOR_MUSTAHIQ_ACTIVE_STATES') THEN
    RETURN private.can_page_mode('setoran', 'edit') OR private.can_page_mode('setor-mustahiq', 'edit') OR private.can_page_mode('setor-cepat', 'edit');
  ELSIF p_key = 'PIAGAM_TEMPLATES_CONFIG' THEN
    RETURN private.can_page_mode('piagam', 'edit');
  ELSIF p_key = 'MADIN_PKM_SAPRAS_DATA_V1' THEN
    RETURN private.can_page_mode('sapras-inventaris', 'edit') OR private.can_page_mode('sapras-perbaikan', 'edit') OR private.can_page_mode('sapras-logistik', 'edit');
  END IF;

  -- Key sistem sensitif (SIDEBAR_CUSTOM_CONFIG, MADIN_GLOBAL_TAHUN_AJARAN_V1, dsb.) wajib admin / pengaturan = 'edit'
  RETURN private.can_page_mode('pengaturan', 'edit');
END;
$$;

-- Pertahankan wrapper public yang kompatibel dengan RPC/Policy yang ada, didelegasikan ke private
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.is_master_admin();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_master()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.is_admin_or_master();
$$;

CREATE OR REPLACE FUNCTION public.is_active_pengurus()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.is_active_pengurus();
$$;

REVOKE EXECUTE ON FUNCTION public.is_master_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_master() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_master() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_active_pengurus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_pengurus() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Perketat Saklar Keamanan (Cabut dari `anon`, tambah brute-force lockout)
-- -----------------------------------------------------------------------------
ALTER TABLE public.app_security_config
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz NULL;

REVOKE ALL ON public.app_security_config FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, is_security_enabled, updated_at, updated_by) ON public.app_security_config TO authenticated;

-- Hanya Master Admin yang login (authenticated) boleh memanggil toggle ini
REVOKE EXECUTE ON FUNCTION public.admin_toggle_app_security(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_toggle_app_security(boolean, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_app_security_enabled() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_security_enabled() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_app_security_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_app_security_status() TO authenticated;

-- Pastikan app_security_config hanya dibaca authenticated (tidak perlu dibaca anon publik)
DROP POLICY IF EXISTS "app_security_config_select_all" ON public.app_security_config;
DROP POLICY IF EXISTS "app_security_config_select_authenticated" ON public.app_security_config;
CREATE POLICY "app_security_config_select_authenticated"
  ON public.app_security_config FOR SELECT
  TO authenticated
  USING (private.is_active_pengurus());

CREATE OR REPLACE FUNCTION public.admin_toggle_app_security(
  p_enable boolean,
  p_security_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, private
AS $$
DECLARE
  v_config public.app_security_config;
  v_admin_auth_hash text;
  v_actor text := 'admin';
  v_next_attempts integer;
BEGIN
  IF NOT private.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin aktif yang dapat mengubah status keamanan aplikasi.';
  END IF;

  IF p_security_password IS NULL OR length(trim(p_security_password)) = 0 THEN
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan wajib diisi.';
  END IF;

  SELECT * INTO v_config
  FROM public.app_security_config
  WHERE id = 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Konfigurasi keamanan aplikasi tidak ditemukan.';
  END IF;

  IF v_config.locked_until IS NOT NULL AND v_config.locked_until > now() THEN
    RAISE EXCEPTION 'Terlalu banyak percobaan sandi salah. Coba lagi setelah %.', to_char(v_config.locked_until AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS WIB');
  END IF;

  SELECT encrypted_password INTO v_admin_auth_hash
  FROM auth.users
  WHERE id = (SELECT auth.uid())
  LIMIT 1;

  IF v_admin_auth_hash IS NOT NULL
     AND extensions.crypt(p_security_password, v_admin_auth_hash) = v_admin_auth_hash
     AND extensions.crypt(p_security_password, v_config.security_password_hash) <> v_config.security_password_hash THEN
    RAISE EXCEPTION 'Gunakan Kata Sandi Khusus Keamanan Aplikasi (bukan kata sandi login Master Admin).';
  END IF;

  IF extensions.crypt(p_security_password, v_config.security_password_hash) <> v_config.security_password_hash THEN
    v_next_attempts := COALESCE(v_config.failed_attempts, 0) + 1;
    UPDATE public.app_security_config
    SET
      failed_attempts = v_next_attempts,
      locked_until = CASE WHEN v_next_attempts >= 5 THEN now() + interval '15 minutes' ELSE NULL END
    WHERE id = 1;
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan tidak sesuai. Perubahan status keamanan dibatalkan.';
  END IF;

  SELECT COALESCE(username, 'admin') INTO v_actor
  FROM public.user_accounts
  WHERE id = (SELECT auth.uid());

  UPDATE public.app_security_config
  SET
    is_security_enabled = p_enable,
    failed_attempts = 0,
    locked_until = NULL,
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

-- -----------------------------------------------------------------------------
-- 3. RLS Granular Person & Halaman (Cabut total akses anon pada tabel internal)
-- -----------------------------------------------------------------------------

-- 3A. SANTRI
DROP POLICY IF EXISTS "Authenticated full access on santri" ON public.santri;
DROP POLICY IF EXISTS "santri_select_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_insert_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_update_scoped" ON public.santri;
DROP POLICY IF EXISTS "santri_delete_scoped" ON public.santri;

CREATE POLICY "santri_select_scoped" ON public.santri FOR SELECT TO authenticated
  USING (private.is_active_pengurus() AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

CREATE POLICY "santri_insert_scoped" ON public.santri FOR INSERT TO authenticated
  WITH CHECK (private.can_page_mode('santri', 'edit') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

CREATE POLICY "santri_update_scoped" ON public.santri FOR UPDATE TO authenticated
  USING (private.can_page_mode('santri', 'update') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok))
  WITH CHECK (private.can_page_mode('santri', 'update') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

CREATE POLICY "santri_delete_scoped" ON public.santri FOR DELETE TO authenticated
  USING (private.can_page_mode('santri', 'delete') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

-- 3B. ASATIDZ
DROP POLICY IF EXISTS "Authenticated full access on asatidz" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_select_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_insert_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_update_scoped" ON public.asatidz;
DROP POLICY IF EXISTS "asatidz_delete_scoped" ON public.asatidz;

CREATE POLICY "asatidz_select_scoped" ON public.asatidz FOR SELECT TO authenticated
  USING (private.is_active_pengurus() AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

CREATE POLICY "asatidz_insert_scoped" ON public.asatidz FOR INSERT TO authenticated
  WITH CHECK (private.can_page_mode('asatidz', 'edit') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

CREATE POLICY "asatidz_update_scoped" ON public.asatidz FOR UPDATE TO authenticated
  USING (private.can_page_mode('asatidz', 'update') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok))
  WITH CHECK (private.can_page_mode('asatidz', 'update') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

CREATE POLICY "asatidz_delete_scoped" ON public.asatidz FOR DELETE TO authenticated
  USING (private.can_page_mode('asatidz', 'delete') AND private.is_gender_allowed(pa_pi) AND private.is_blok_allowed(blok));

-- 3C. FORMASI_KELAS (Gender scope enforced; blok dicek di kelas atau via page_permissions)
DROP POLICY IF EXISTS "Authenticated full access on formasi_kelas" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_select_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_insert_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_update_scoped" ON public.formasi_kelas;
DROP POLICY IF EXISTS "formasi_kelas_delete_scoped" ON public.formasi_kelas;

CREATE POLICY "formasi_kelas_select_scoped" ON public.formasi_kelas FOR SELECT TO authenticated
  USING (private.is_active_pengurus() AND private.is_gender_allowed(pa_pi));

CREATE POLICY "formasi_kelas_insert_scoped" ON public.formasi_kelas FOR INSERT TO authenticated
  WITH CHECK (private.can_page_mode('formasi', 'edit') AND private.is_gender_allowed(pa_pi));

CREATE POLICY "formasi_kelas_update_scoped" ON public.formasi_kelas FOR UPDATE TO authenticated
  USING (private.can_page_mode('formasi', 'update') AND private.is_gender_allowed(pa_pi))
  WITH CHECK (private.can_page_mode('formasi', 'update') AND private.is_gender_allowed(pa_pi));

CREATE POLICY "formasi_kelas_delete_scoped" ON public.formasi_kelas FOR DELETE TO authenticated
  USING (private.can_page_mode('formasi', 'delete') AND private.is_gender_allowed(pa_pi));

-- 3D. JADWAL_KBM_SLOTS, ABSENSI_RECORDS, SETORAN_HAFALAN_RECORDS
DROP POLICY IF EXISTS "Authenticated full access on jadwal_kbm_slots" ON public.jadwal_kbm_slots;
DROP POLICY IF EXISTS "jadwal_kbm_slots_select" ON public.jadwal_kbm_slots;
DROP POLICY IF EXISTS "jadwal_kbm_slots_write" ON public.jadwal_kbm_slots;
CREATE POLICY "jadwal_kbm_slots_select" ON public.jadwal_kbm_slots FOR SELECT TO authenticated
  USING (private.is_active_pengurus() AND private.is_gender_allowed(pa_pi));
CREATE POLICY "jadwal_kbm_slots_write" ON public.jadwal_kbm_slots FOR ALL TO authenticated
  USING ((private.can_page_mode('jadwal-kbm', 'edit') OR private.can_page_mode('hari-kbm', 'edit')) AND private.is_gender_allowed(pa_pi))
  WITH CHECK ((private.can_page_mode('jadwal-kbm', 'edit') OR private.can_page_mode('hari-kbm', 'edit')) AND private.is_gender_allowed(pa_pi));

DROP POLICY IF EXISTS "Authenticated full access on absensi_records" ON public.absensi_records;
DROP POLICY IF EXISTS "absensi_records_select" ON public.absensi_records;
DROP POLICY IF EXISTS "absensi_records_write" ON public.absensi_records;
CREATE POLICY "absensi_records_select" ON public.absensi_records FOR SELECT TO authenticated
  USING (private.is_active_pengurus() AND private.is_gender_allowed(gender) AND private.is_blok_allowed(blok));
CREATE POLICY "absensi_records_write" ON public.absensi_records FOR ALL TO authenticated
  USING ((private.can_page_mode('absensi', 'edit') OR private.can_page_mode('absen-cepat', 'edit')) AND private.is_gender_allowed(gender) AND private.is_blok_allowed(blok))
  WITH CHECK ((private.can_page_mode('absensi', 'edit') OR private.can_page_mode('absen-cepat', 'edit')) AND private.is_gender_allowed(gender) AND private.is_blok_allowed(blok));

DROP POLICY IF EXISTS "Authenticated full access on setoran_hafalan_records" ON public.setoran_hafalan_records;
DROP POLICY IF EXISTS "setoran_hafalan_select" ON public.setoran_hafalan_records;
DROP POLICY IF EXISTS "setoran_hafalan_write" ON public.setoran_hafalan_records;
CREATE POLICY "setoran_hafalan_select" ON public.setoran_hafalan_records FOR SELECT TO authenticated
  USING (private.is_active_pengurus());
CREATE POLICY "setoran_hafalan_write" ON public.setoran_hafalan_records FOR ALL TO authenticated
  USING (private.can_page_mode('setoran', 'edit') OR private.can_page_mode('setor-mustahiq', 'edit') OR private.can_page_mode('setor-cepat', 'edit'))
  WITH CHECK (private.can_page_mode('setoran', 'edit') OR private.can_page_mode('setor-mustahiq', 'edit') OR private.can_page_mode('setor-cepat', 'edit'));

-- 3E. APP_SETTINGS (Key-Mapped Operational Access)
DROP POLICY IF EXISTS "Authenticated full access on app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_all" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_modify_admin_only" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_select_pengurus" ON public.app_settings;
DROP POLICY IF EXISTS "app_settings_write_mapped" ON public.app_settings;

CREATE POLICY "app_settings_select_pengurus" ON public.app_settings FOR SELECT TO authenticated
  USING (private.is_active_pengurus());

CREATE POLICY "app_settings_write_mapped" ON public.app_settings FOR ALL TO authenticated
  USING (private.can_modify_app_setting(key))
  WITH CHECK (private.can_modify_app_setting(key));

-- 3F. TABEL LOG, SYNC, SOLVER, KONSORSIUM, & WARTA BERITA
DROP POLICY IF EXISTS "Authenticated full access on notification_logs" ON public.notification_logs;
DROP POLICY IF EXISTS "notification_logs_pengurus" ON public.notification_logs;
CREATE POLICY "notification_logs_pengurus" ON public.notification_logs FOR ALL TO authenticated
  USING (private.is_active_pengurus()) WITH CHECK (private.is_active_pengurus());

DROP POLICY IF EXISTS "Authenticated full access on offline_sync_logs" ON public.offline_sync_logs;
DROP POLICY IF EXISTS "offline_sync_logs_pengurus" ON public.offline_sync_logs;
CREATE POLICY "offline_sync_logs_pengurus" ON public.offline_sync_logs FOR ALL TO authenticated
  USING (private.is_active_pengurus()) WITH CHECK (private.is_active_pengurus());

DROP POLICY IF EXISTS "Authenticated full access on schedule_solver_proposals" ON public.schedule_solver_proposals;
DROP POLICY IF EXISTS "schedule_solver_proposals_pengurus" ON public.schedule_solver_proposals;
CREATE POLICY "schedule_solver_proposals_pengurus" ON public.schedule_solver_proposals FOR ALL TO authenticated
  USING (private.can_page_mode('jadwal-kbm', 'edit')) WITH CHECK (private.can_page_mode('jadwal-kbm', 'edit'));

-- Warta Berita: Publik (anon) hanya SELECT berita published; pengelolaan khusus pengurus berizin
DROP POLICY IF EXISTS "Publik dapat membaca berita published" ON public.warta_berita;
CREATE POLICY "Publik dapat membaca berita published" ON public.warta_berita FOR SELECT TO anon, authenticated
  USING (status = 'published'::post_status_enum);

DROP POLICY IF EXISTS "Admin dapat mengelola seluruh berita" ON public.warta_berita;
DROP POLICY IF EXISTS "warta_berita_select_pengurus" ON public.warta_berita;
DROP POLICY IF EXISTS "warta_berita_write_scoped" ON public.warta_berita;
CREATE POLICY "warta_berita_select_pengurus" ON public.warta_berita FOR SELECT TO authenticated
  USING (private.is_active_pengurus());
CREATE POLICY "warta_berita_write_scoped" ON public.warta_berita FOR ALL TO authenticated
  USING (private.can_page_mode('kelola-berita', 'edit'))
  WITH CHECK (private.can_page_mode('kelola-berita', 'edit'));

-- Konsorsium: Cabut GRANT & policy anon/legacy dari 20261105, lalu ikat ke is_active_pengurus + page_permissions
REVOKE ALL ON TABLE public.kelas_konsorsium FROM anon;
REVOKE ALL ON TABLE public.anggota_konsorsium FROM anon;
REVOKE ALL ON TABLE public.sesi_presensi_konsorsium FROM anon;
REVOKE ALL ON TABLE public.detail_presensi_konsorsium FROM anon;

DROP POLICY IF EXISTS allow_all_kelas_konsorsium ON public.kelas_konsorsium;
DROP POLICY IF EXISTS "Allow all on kelas_konsorsium" ON public.kelas_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on kelas_konsorsium" ON public.kelas_konsorsium;
DROP POLICY IF EXISTS "kelas_konsorsium_pengurus" ON public.kelas_konsorsium;

DROP POLICY IF EXISTS allow_all_anggota_konsorsium ON public.anggota_konsorsium;
DROP POLICY IF EXISTS "Allow all on anggota_konsorsium" ON public.anggota_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on anggota_konsorsium" ON public.anggota_konsorsium;
DROP POLICY IF EXISTS "anggota_konsorsium_pengurus" ON public.anggota_konsorsium;

DROP POLICY IF EXISTS allow_all_sesi_konsorsium ON public.sesi_presensi_konsorsium;
DROP POLICY IF EXISTS "Allow all on sesi_presensi_konsorsium" ON public.sesi_presensi_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on sesi_presensi_konsorsium" ON public.sesi_presensi_konsorsium;
DROP POLICY IF EXISTS "sesi_presensi_konsorsium_pengurus" ON public.sesi_presensi_konsorsium;

DROP POLICY IF EXISTS allow_all_detail_presensi ON public.detail_presensi_konsorsium;
DROP POLICY IF EXISTS "Allow all on detail_presensi_konsorsium" ON public.detail_presensi_konsorsium;
DROP POLICY IF EXISTS "Authenticated full access on detail_presensi_konsorsium" ON public.detail_presensi_konsorsium;
DROP POLICY IF EXISTS "detail_presensi_konsorsium_pengurus" ON public.detail_presensi_konsorsium;

CREATE POLICY "kelas_konsorsium_pengurus" ON public.kelas_konsorsium FOR ALL TO authenticated
  USING (private.is_active_pengurus()) WITH CHECK (private.can_page_mode('absen-konsorsium', 'edit'));
CREATE POLICY "anggota_konsorsium_pengurus" ON public.anggota_konsorsium FOR ALL TO authenticated
  USING (private.is_active_pengurus()) WITH CHECK (private.can_page_mode('absen-konsorsium', 'edit'));
CREATE POLICY "sesi_presensi_konsorsium_pengurus" ON public.sesi_presensi_konsorsium FOR ALL TO authenticated
  USING (private.is_active_pengurus()) WITH CHECK (private.can_page_mode('absen-konsorsium', 'edit'));
CREATE POLICY "detail_presensi_konsorsium_pengurus" ON public.detail_presensi_konsorsium FOR ALL TO authenticated
  USING (private.is_active_pengurus()) WITH CHECK (private.can_page_mode('absen-konsorsium', 'edit'));

-- -----------------------------------------------------------------------------
-- 4. Anti-Spoofing activity_logs & Anti-BOLA push_subscriptions
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated full access on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_modify_master_only" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_delete_master_only" ON public.activity_logs;

CREATE POLICY "activity_logs_select_policy" ON public.activity_logs FOR SELECT TO authenticated
  USING (
    private.is_admin_or_master()
    OR username = (SELECT ua.username FROM public.user_accounts ua WHERE ua.id = (SELECT auth.uid()))
  );

-- Paksa username & nama terisi dari profil autentik di DB agar tidak bisa dipalsukan klien
CREATE OR REPLACE FUNCTION private.enforce_activity_log_actor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acc public.user_accounts;
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    SELECT * INTO v_acc FROM public.user_accounts WHERE id = (SELECT auth.uid());
    IF FOUND THEN
      NEW.username := v_acc.username;
      NEW.nama := v_acc.full_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_activity_log_actor ON public.activity_logs;
CREATE TRIGGER trg_enforce_activity_log_actor
  BEFORE INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION private.enforce_activity_log_actor();

CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (private.is_active_pengurus());
CREATE POLICY "activity_logs_modify_master_only" ON public.activity_logs FOR UPDATE TO authenticated
  USING (private.is_master_admin()) WITH CHECK (private.is_master_admin());
CREATE POLICY "activity_logs_delete_master_only" ON public.activity_logs FOR DELETE TO authenticated
  USING (private.is_master_admin());

-- Push Subscriptions: Ikat kepemilikan ke user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated full access on push_subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_select_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_modify_policy" ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_policy" ON public.push_subscriptions;

CREATE POLICY "push_subscriptions_select_policy" ON public.push_subscriptions FOR SELECT TO authenticated
  USING (
    private.is_admin_or_master()
    OR user_id = (SELECT auth.uid())
    OR target_identifier = (SELECT auth.uid())::text
  );

CREATE POLICY "push_subscriptions_insert_policy" ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    private.is_active_pengurus()
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY "push_subscriptions_modify_policy" ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (private.is_admin_or_master() OR user_id = (SELECT auth.uid()))
  WITH CHECK (private.is_admin_or_master() OR user_id = (SELECT auth.uid()));

CREATE POLICY "push_subscriptions_delete_policy" ON public.push_subscriptions FOR DELETE TO authenticated
  USING (private.is_admin_or_master() OR user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Storage Bucket 'madin-media' (Aman & Idempoten)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'madin-media',
      'madin-media',
      true,
      2097152, -- 2 MB
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE
      SET file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;

    DROP POLICY IF EXISTS "madin_media_select_public" ON storage.objects;
    DROP POLICY IF EXISTS "madin_media_insert_pengurus" ON storage.objects;
    DROP POLICY IF EXISTS "madin_media_update_pengurus" ON storage.objects;
    DROP POLICY IF EXISTS "madin_media_delete_pengurus" ON storage.objects;

    CREATE POLICY "madin_media_select_public" ON storage.objects FOR SELECT TO anon, authenticated
      USING (bucket_id = 'madin-media');

    CREATE POLICY "madin_media_insert_pengurus" ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'madin-media' AND private.is_active_pengurus());

    CREATE POLICY "madin_media_update_pengurus" ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'madin-media' AND private.is_active_pengurus())
      WITH CHECK (bucket_id = 'madin-media' AND private.is_active_pengurus());

    CREATE POLICY "madin_media_delete_pengurus" ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'madin-media' AND private.is_active_pengurus());
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 6. Kunci search_path fungsi EBTADIN/trigger & cabut EXECUTE anon pada RPC Admin
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.fn_daftar_kelas_ebtadin(uuid, uuid[]) SET search_path = public;
ALTER FUNCTION public.fn_generate_nomor_seri_ijazah(uuid) SET search_path = public;
ALTER FUNCTION public.fn_sanitize_asatidz_kbm_assignment() SET search_path = public;
ALTER FUNCTION public.fn_sinkronkan_ebtadin_dari_master(uuid) SET search_path = public;
ALTER FUNCTION public.fn_tetapkan_data_ebtadin(uuid, text) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.admin_delete_user_account(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_update_security_password(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_security_password(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_upsert_user_account(uuid, text, text, text, text, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_user_account(uuid, text, text, text, text, text, jsonb, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

COMMIT;
