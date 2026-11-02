-- Migration: Tabel push_subscriptions untuk Web Push Notification HP
-- Mendukung browser Chrome / Android / PWA mobile notifications

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    device_type TEXT DEFAULT 'mobile',
    role TEXT DEFAULT 'wali',
    target_identifier TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks performa pencarian endpoint dan target
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_role ON public.push_subscriptions(role);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_target ON public.push_subscriptions(target_identifier);

-- RLS (Row Level Security)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public insert push subscription" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "Allow public select push subscription" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "Allow public update push subscription" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "Allow public delete push subscription" ON public.push_subscriptions;
END $$;

CREATE POLICY "Allow public insert push subscription" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public select push subscription" 
ON public.push_subscriptions FOR SELECT 
USING (true);

CREATE POLICY "Allow public update push subscription" 
ON public.push_subscriptions FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete push subscription" 
ON public.push_subscriptions FOR DELETE 
USING (true);
