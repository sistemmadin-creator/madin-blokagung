-- Migrasi Saklar Keamanan Aplikasi MADINA Blokagung (Aktif / Non-Aktif untuk Masa Input Data)
-- Dilengkapi Verifikasi Kata Sandi Khusus Keamanan (Berbeda dari Kata Sandi Login Master Admin)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabel Singleton Konfigurasi Keamanan Aplikasi
CREATE TABLE IF NOT EXISTS public.app_security_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_security_enabled boolean NOT NULL DEFAULT true,
  security_password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'admin'
);

ALTER TABLE public.app_security_config ENABLE ROW LEVEL SECURITY;

-- Cabut akses penuh agar kolom security_password_hash tidak pernah terekspos ke client
REVOKE ALL ON public.app_security_config FROM anon, authenticated;
GRANT SELECT (id, is_security_enabled, updated_at, updated_by) ON public.app_security_config TO anon, authenticated;

DROP POLICY IF EXISTS "app_security_config_select_all" ON public.app_security_config;
CREATE POLICY "app_security_config_select_all"
  ON public.app_security_config FOR SELECT
  TO anon, authenticated
  USING (true);

-- Seed baris konfigurasi awal (Default: Keamanan Aktif, Sandi Khusus Awal: KunciMadina#2026)
INSERT INTO public.app_security_config (
  id,
  is_security_enabled,
  security_password_hash,
  updated_at,
  updated_by
)
VALUES (
  1,
  true,
  extensions.crypt('KunciMadina#2026', extensions.gen_salt('bf')),
  now(),
  'admin'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Fungsi Helper Cek Status Keamanan Aplikasi
CREATE OR REPLACE FUNCTION public.is_app_security_enabled()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_security_enabled FROM public.app_security_config WHERE id = 1),
    true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_app_security_enabled() TO anon, authenticated;

-- 3. Fungsi RPC Pembaca Status Keamanan untuk Middleware & Client
CREATE OR REPLACE FUNCTION public.get_app_security_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'is_security_enabled', COALESCE(is_security_enabled, true),
    'updated_at', updated_at,
    'updated_by', updated_by
  )
  FROM public.app_security_config
  WHERE id = 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_security_status() TO anon, authenticated;

-- 4. Fungsi RPC Saklar Keamanan Aplikasi (Wajib Sandi Khusus Keamanan)
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

  -- Jika menonaktifkan keamanan, pemanggil wajib sedang login sebagai Master Admin.
  -- Jika mengaktifkan kembali saat keamanan sedang non-aktif, diizinkan dengan Sandi Khusus Keamanan atau sesi Master Admin.
  IF p_enable = false AND NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang sedang login yang dapat menonaktifkan Keamanan Aplikasi.';
  END IF;

  IF p_enable = true AND v_config.is_security_enabled = true AND NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang dapat mengubah status keamanan.';
  END IF;

  -- Pastikan sandi yang dimasukkan bukan sandi login Master Admin
  SELECT encrypted_password INTO v_admin_auth_hash
  FROM auth.users
  WHERE email = 'admin@madinblokagung.local'
  LIMIT 1;

  IF v_admin_auth_hash IS NOT NULL
     AND extensions.crypt(p_security_password, v_admin_auth_hash) = v_admin_auth_hash
     AND extensions.crypt(p_security_password, v_config.security_password_hash) <> v_config.security_password_hash THEN
    RAISE EXCEPTION 'Gunakan Kata Sandi Khusus Keamanan Aplikasi (bukan kata sandi login Master Admin).';
  END IF;

  -- Verifikasi kecocokan Kata Sandi Khusus Keamanan
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

-- 5. Fungsi RPC Ubah Kata Sandi Khusus Keamanan (Khusus Master Admin)
CREATE OR REPLACE FUNCTION public.admin_update_security_password(
  p_current_security_password text,
  p_new_security_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_config public.app_security_config;
  v_admin_auth_hash text;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang dapat mengubah Kata Sandi Khusus Keamanan.';
  END IF;

  IF p_new_security_password IS NULL OR length(trim(p_new_security_password)) < 8 THEN
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan baru minimal harus 8 karakter.';
  END IF;

  SELECT * INTO v_config
  FROM public.app_security_config
  WHERE id = 1;

  IF extensions.crypt(COALESCE(p_current_security_password, ''), v_config.security_password_hash) <> v_config.security_password_hash THEN
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan saat ini tidak sesuai.';
  END IF;

  -- Pastikan sandi khusus baru BERBEDA dari kata sandi login Master Admin
  SELECT encrypted_password INTO v_admin_auth_hash
  FROM auth.users
  WHERE email = 'admin@madinblokagung.local'
  LIMIT 1;

  IF v_admin_auth_hash IS NOT NULL AND extensions.crypt(p_new_security_password, v_admin_auth_hash) = v_admin_auth_hash THEN
    RAISE EXCEPTION 'Kata Sandi Khusus Keamanan tidak boleh sama dengan kata sandi login Master Admin.';
  END IF;

  UPDATE public.app_security_config
  SET
    security_password_hash = extensions.crypt(p_new_security_password, extensions.gen_salt('bf')),
    updated_at = now(),
    updated_by = 'admin'
  WHERE id = 1;

  RETURN jsonb_build_object('updated', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_security_password(text, text) TO authenticated;

-- 6. Perbarui Kebijakan RLS Tabel Operasional agar mendukung Mode Tanpa Login saat is_app_security_enabled() = false
DROP POLICY IF EXISTS "Authenticated full access on santri" ON public.santri;
CREATE POLICY "Authenticated full access on santri"
  ON public.santri FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on asatidz" ON public.asatidz;
CREATE POLICY "Authenticated full access on asatidz"
  ON public.asatidz FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on formasi_kelas" ON public.formasi_kelas;
CREATE POLICY "Authenticated full access on formasi_kelas"
  ON public.formasi_kelas FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on jadwal_kbm_slots" ON public.jadwal_kbm_slots;
CREATE POLICY "Authenticated full access on jadwal_kbm_slots"
  ON public.jadwal_kbm_slots FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on absensi_records" ON public.absensi_records;
CREATE POLICY "Authenticated full access on absensi_records"
  ON public.absensi_records FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on setoran_hafalan_records" ON public.setoran_hafalan_records;
CREATE POLICY "Authenticated full access on setoran_hafalan_records"
  ON public.setoran_hafalan_records FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on app_settings" ON public.app_settings;
CREATE POLICY "Authenticated full access on app_settings"
  ON public.app_settings FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on activity_logs" ON public.activity_logs;
CREATE POLICY "Authenticated full access on activity_logs"
  ON public.activity_logs FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on notification_logs" ON public.notification_logs;
CREATE POLICY "Authenticated full access on notification_logs"
  ON public.notification_logs FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on offline_sync_logs" ON public.offline_sync_logs;
CREATE POLICY "Authenticated full access on offline_sync_logs"
  ON public.offline_sync_logs FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on schedule_solver_proposals" ON public.schedule_solver_proposals;
CREATE POLICY "Authenticated full access on schedule_solver_proposals"
  ON public.schedule_solver_proposals FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Authenticated full access on push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Authenticated full access on push_subscriptions"
  ON public.push_subscriptions FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));

DROP POLICY IF EXISTS "Admin dapat mengelola seluruh berita" ON public.warta_berita;
CREATE POLICY "Admin dapat mengelola seluruh berita"
  ON public.warta_berita FOR ALL TO anon, authenticated
  USING ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()))
  WITH CHECK ((select auth.uid()) IS NOT NULL OR NOT (select public.is_app_security_enabled()));
