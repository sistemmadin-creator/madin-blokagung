-- =============================================================================
-- MIGRASI: 20261105_create_user_accounts_rbac.sql
-- TUJUAN : Tabel manajemen akun & otoritas granular (RBAC + 5 Otoritas Khusus)
--          beserta fungsi RPC SECURITY DEFINER khusus Master Admin.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_accounts (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'custom_user',
  role_label text NOT NULL DEFAULT 'Pengurus',
  is_active boolean NOT NULL DEFAULT true,
  page_permissions jsonb NOT NULL DEFAULT '{
    "dashboard": "edit",
    "santri": "edit",
    "asatidz": "edit",
    "jadwal-kbm": "edit",
    "hari-kbm": "edit",
    "formasi": "edit",
    "fan-pelajaran": "edit",
    "fan-pengajar": "edit",
    "daftar-pendidik": "edit",
    "setoran": "edit",
    "rekap-hafalan": "edit",
    "piagam": "edit",
    "absensi": "edit",
    "absen-cepat": "edit",
    "rekap-absensi": "edit",
    "kelola-berita": "edit",
    "pengaturan": "edit"
  }'::jsonb,
  special_authorities jsonb NOT NULL DEFAULT '{
    "blok_scope": "SEMUA",
    "gender_scope": "semua",
    "pengaturan_status": "aktif",
    "hide_edit_pages": [],
    "hide_delete_pages": []
  }'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;

-- Fungsi pemeriksa apakah pengguna saat ini adalah Master Admin
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

DROP POLICY IF EXISTS "user_accounts_select_policy" ON public.user_accounts;
CREATE POLICY "user_accounts_select_policy"
  ON public.user_accounts
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "user_accounts_modify_policy" ON public.user_accounts;
CREATE POLICY "user_accounts_modify_policy"
  ON public.user_accounts
  FOR ALL
  TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- Sinkronkan akun yang sudah ada di auth.users ke public.user_accounts
INSERT INTO public.user_accounts (
  id,
  username,
  email,
  full_name,
  role,
  role_label,
  is_active
)
SELECT
  u.id,
  COALESCE(
    u.raw_app_meta_data ->> 'username',
    split_part(u.email, '@', 1)
  ) AS username,
  u.email,
  COALESCE(
    u.raw_app_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'full_name',
    split_part(u.email, '@', 1)
  ) AS full_name,
  COALESCE(
    u.raw_app_meta_data ->> 'role',
    'custom_user'
  ) AS role,
  COALESCE(
    u.raw_app_meta_data ->> 'role_label',
    'Pengurus'
  ) AS role_label,
  true
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE
  SET username = EXCLUDED.username,
      email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      role_label = EXCLUDED.role_label,
      updated_at = now();

-- =============================================================================
-- RPC 1: Buat atau Perbarui Akun & Otoritas (Khusus Master Admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_upsert_user_account(
  p_user_id uuid DEFAULT NULL,
  p_username text DEFAULT '',
  p_password text DEFAULT NULL,
  p_full_name text DEFAULT '',
  p_role text DEFAULT 'custom_user',
  p_role_label text DEFAULT 'Pengurus',
  p_page_permissions jsonb DEFAULT '{}'::jsonb,
  p_special_authorities jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_uid uuid;
  v_username text;
  v_email text;
  v_full_name text;
  v_role text;
  v_role_label text;
  v_app_meta jsonb;
  v_user_meta jsonb;
  v_result public.user_accounts;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang diizinkan mengelola akun.';
  END IF;

  v_username := lower(regexp_replace(btrim(COALESCE(p_username, '')), '\s+', '', 'g'));
  IF v_username = '' THEN
    RAISE EXCEPTION 'Username tidak boleh kosong.';
  END IF;

  IF position('@' in v_username) > 0 THEN
    v_email := v_username;
    v_username := split_part(v_username, '@', 1);
  ELSE
    v_email := v_username || '@madinblokagung.local';
  END IF;

  v_full_name := btrim(COALESCE(p_full_name, ''));
  IF v_full_name = '' THEN
    v_full_name := v_username;
  END IF;

  v_role := COALESCE(NULLIF(btrim(p_role), ''), 'custom_user');
  IF v_username = 'admin' THEN
    v_role := 'master_admin';
  END IF;

  v_role_label := btrim(COALESCE(p_role_label, ''));
  IF v_role_label = '' THEN
    IF v_role = 'master_admin' THEN
      v_role_label := 'Master Admin';
    ELSE
      v_role_label := 'Pengurus';
    END IF;
  END IF;

  v_app_meta := jsonb_build_object(
    'provider', 'email',
    'providers', jsonb_build_array('email'),
    'username', v_username,
    'full_name', v_full_name,
    'role', v_role,
    'role_label', v_role_label,
    'page_permissions', COALESCE(p_page_permissions, '{}'::jsonb),
    'special_authorities', COALESCE(p_special_authorities, '{}'::jsonb)
  );

  IF p_user_id IS NULL THEN
    -- Pembuatan Akun Baru
    IF p_password IS NULL OR char_length(btrim(p_password)) < 6 THEN
      RAISE EXCEPTION 'Kata sandi akun baru minimal 6 karakter.';
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = v_email)
       OR EXISTS (SELECT 1 FROM public.user_accounts WHERE lower(username) = v_username) THEN
      RAISE EXCEPTION 'Username "%" sudah terdaftar. Gunakan username lain.', v_username;
    END IF;

    v_uid := extensions.gen_random_uuid();

    v_user_meta := jsonb_build_object(
      'sub', v_uid::text,
      'email', v_email,
      'username', v_username,
      'full_name', v_full_name,
      'role_label', v_role_label,
      'email_verified', true,
      'phone_verified', false
    );

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      is_sso_user, is_anonymous
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated', v_email,
      extensions.crypt(p_password, extensions.gen_salt('bf')),
      now(), v_app_meta, v_user_meta, now(), now(),
      '', '', '', '', '', '', '', '', false, false
    );

    INSERT INTO auth.identities (
      provider_id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      v_uid::text, v_uid, v_user_meta, 'email', now(), now(), now()
    )
    ON CONFLICT (provider_id, provider) DO UPDATE
      SET identity_data = EXCLUDED.identity_data,
          updated_at = now();

    INSERT INTO public.user_accounts (
      id, username, email, full_name, role, role_label,
      is_active, page_permissions, special_authorities,
      created_at, updated_at
    ) VALUES (
      v_uid, v_username, v_email, v_full_name, v_role, v_role_label,
      true, COALESCE(p_page_permissions, '{}'::jsonb), COALESCE(p_special_authorities, '{}'::jsonb),
      now(), now()
    )
    RETURNING * INTO v_result;
  ELSE
    -- Pembaruan Akun yang Sudah Ada
    v_uid := p_user_id;

    IF EXISTS (
      SELECT 1 FROM public.user_accounts
      WHERE lower(username) = v_username AND id <> v_uid
    ) THEN
      RAISE EXCEPTION 'Username "%" sudah dipakai akun lain.', v_username;
    END IF;

    v_user_meta := jsonb_build_object(
      'sub', v_uid::text,
      'email', v_email,
      'username', v_username,
      'full_name', v_full_name,
      'role_label', v_role_label,
      'email_verified', true,
      'phone_verified', false
    );

    IF p_password IS NOT NULL AND char_length(btrim(p_password)) > 0 THEN
      IF char_length(btrim(p_password)) < 6 THEN
        RAISE EXCEPTION 'Kata sandi baru minimal 6 karakter.';
      END IF;
      UPDATE auth.users
      SET email = v_email,
          encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
          raw_app_meta_data = v_app_meta,
          raw_user_meta_data = v_user_meta,
          updated_at = now()
      WHERE id = v_uid;
    ELSE
      UPDATE auth.users
      SET email = v_email,
          raw_app_meta_data = v_app_meta,
          raw_user_meta_data = v_user_meta,
          updated_at = now()
      WHERE id = v_uid;
    END IF;

    UPDATE auth.identities
    SET identity_data = v_user_meta,
        updated_at = now()
    WHERE user_id = v_uid;

    INSERT INTO public.user_accounts (
      id, username, email, full_name, role, role_label,
      is_active, page_permissions, special_authorities,
      created_at, updated_at
    ) VALUES (
      v_uid, v_username, v_email, v_full_name, v_role, v_role_label,
      true, COALESCE(p_page_permissions, '{}'::jsonb), COALESCE(p_special_authorities, '{}'::jsonb),
      now(), now()
    )
    ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          role = EXCLUDED.role,
          role_label = EXCLUDED.role_label,
          page_permissions = EXCLUDED.page_permissions,
          special_authorities = EXCLUDED.special_authorities,
          updated_at = now()
    RETURNING * INTO v_result;
  END IF;

  RETURN to_jsonb(v_result);
END;
$$;

-- =============================================================================
-- RPC 2: Hapus Akun (Khusus Master Admin)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user_account(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_username text;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Akses ditolak: Hanya Master Admin yang diizinkan menghapus akun.';
  END IF;

  IF p_user_id = (select auth.uid()) THEN
    RAISE EXCEPTION 'Anda tidak dapat menghapus akun yang sedang Anda gunakan.';
  END IF;

  SELECT username INTO v_username FROM public.user_accounts WHERE id = p_user_id;
  IF v_username = 'admin' THEN
    RAISE EXCEPTION 'Akun Master Admin utama (admin) tidak dapat dihapus.';
  END IF;

  DELETE FROM public.user_accounts WHERE id = p_user_id;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_master_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_user_account(uuid, text, text, text, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user_account(uuid) TO authenticated;

-- Aktifkan Realtime pada tabel user_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_accounts;
  END IF;
END
$$;

COMMIT;
