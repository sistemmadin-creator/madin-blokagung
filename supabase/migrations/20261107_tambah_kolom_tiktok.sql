-- Migrasi Penambahan Kolom Video TikTok pada Tabel Warta Berita MADINA
-- Mendukung Widget Video TikTok Samping Berita di Halaman Detail

DO $$ 
BEGIN
    -- Tambah kolom tiktok_url jika belum ada
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'warta_berita' 
          AND column_name = 'tiktok_url'
    ) THEN
        ALTER TABLE public.warta_berita ADD COLUMN tiktok_url TEXT;
    END IF;
END $$;
