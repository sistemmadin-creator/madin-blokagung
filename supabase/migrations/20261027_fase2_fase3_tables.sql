-- ============================================================================
-- MIGRASI FASE 2 & FASE 3: OFFLINE SYNC LOGS, SMART SOLVER & NOTIFIKASI
-- Aplikasi: Madina Blokagung (madinblokagung-next)
-- ============================================================================

-- 1. TABEL: notification_logs
-- Mencatat seluruh riwayat pengiriman notifikasi WhatsApp & Telegram
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_type TEXT NOT NULL CHECK (recipient_type IN ('santri', 'asatidz', 'wali', 'grup', 'mustahiq')),
    recipient_target TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('absensi', 'hafalan', 'badal', 'kbm', 'pengumuman')),
    message TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'sms')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_category ON public.notification_logs (category);
CREATE INDEX IF NOT EXISTS idx_notif_created_at ON public.notification_logs (created_at DESC);

-- 2. TABEL: offline_sync_logs
-- Merekam aktivitas sinkronisasi antrean mutasi lokal (PWA Offline-First) ke server
CREATE TABLE IF NOT EXISTS public.offline_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    synced_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    details JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABEL: schedule_solver_proposals
-- Menyimpan proposal jadwal otomatis yang dihasilkan oleh Auto-Schedule Solver
CREATE TABLE IF NOT EXISTS public.schedule_solver_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'applied', 'rejected', 'archived')),
    proposed_slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    conflicts_detected INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_solver_proposals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'notification_logs' AND policyname = 'Enable all for anon on notification_logs'
    ) THEN
        CREATE POLICY "Enable all for anon on notification_logs" ON public.notification_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'offline_sync_logs' AND policyname = 'Enable all for anon on offline_sync_logs'
    ) THEN
        CREATE POLICY "Enable all for anon on offline_sync_logs" ON public.offline_sync_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'schedule_solver_proposals' AND policyname = 'Enable all for anon on schedule_solver_proposals'
    ) THEN
        CREATE POLICY "Enable all for anon on schedule_solver_proposals" ON public.schedule_solver_proposals FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
