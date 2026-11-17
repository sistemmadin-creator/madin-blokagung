-- =============================================================================
-- MIGRASI: 20261117_drop_app_security_switch.sql
-- TUJUAN : Menghapus fitur Saklar Keamanan Aplikasi MADINA Blokagung secara
--          permanen (tabel app_security_config & 4 fungsi RPC terkait).
--          Seluruh rute internal & API beroperasi wajib login (fail-closed).
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "app_security_config_select_all" ON public.app_security_config;
DROP POLICY IF EXISTS "app_security_config_select_authenticated" ON public.app_security_config;

DROP FUNCTION IF EXISTS public.admin_toggle_app_security(boolean, text);
DROP FUNCTION IF EXISTS public.admin_update_security_password(text, text);
DROP FUNCTION IF EXISTS public.get_app_security_status();
DROP FUNCTION IF EXISTS public.is_app_security_enabled();

DROP TABLE IF EXISTS public.app_security_config;

COMMIT;
