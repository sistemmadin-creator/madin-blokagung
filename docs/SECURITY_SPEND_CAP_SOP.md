# SOP Pengendalian Biaya Cloud (Cloud Spend Cap & Budget Guard)
**Sistem Database & Presensi Madin Al-Amiriyyah Blokagung**

---

## 1. Latar Belakang & Identifikasi Resiko
Berdasarkan tinjauan keamanan aplikasi modern (vibe coding & cloud security best practices), insiden lonjakan tagihan tak terduga (*cloud bill explosion*) umumnya disebabkan oleh dua faktor utama:
1. **Bug Frontend (Runaway Loops):** Pemanggilan `fetch()` di dalam React `useEffect` tanpa array dependensi atau dependensi yang berubah terus-menerus (*state thrashing*), menghasilkan ribuan request per menit dari setiap browser pengguna.
2. **Serangan Eksternal (Spam Bot & DoS):** Penyerang melakukan *brute force* atau *loop query* ke endpoint API yang terhubung ke database atau layanan pihak ketiga berbayar (misal gateway WAHA atau SMS/Push).

---

## 2. Kebijakan Batas Biaya Supabase (Database & Auth)

### 2.1. Aktivasi Spend Cap (Hard Cap)
1. Buka [Supabase Dashboard](https://supabase.com/dashboard).
2. Pilih Organization Madin Blokagung > **Settings** > **Billing**.
3. Pastikan fitur **Spend Cap** dalam status **ENABLED** (Aktif):
   - Ketika kuota gratis atau kuota Pro tercapai, Supabase **tidak akan mengenakan biaya tambahan tak terduga**.
   - Sistem akan membatasi resource secara terukur (*fail-safe*) daripada membiarkan tagihan kartu kredit membengkak.

### 2.2. Query Timeout & Connection Pooling
1. Buka **Database** > **Settings** > **Connection Pooling**.
2. Gunakan port pooling `6543` (Transaction mode) untuk serverless Next.js.
3. Set `statement_timeout` maksimal 10.000 ms (10 detik) untuk mencegah query gantung yang menghabiskan CPU database.

---

## 3. Kebijakan Spend Management Vercel (Hosting & Edge Functions)

### 3.1. Konfigurasi Spend Alerts & Auto-Pause
1. Buka [Vercel Dashboard](https://vercel.com/dashboard).
2. Masuk ke **Settings** > **Spend Management**.
3. Atur **Monthly Budget Cap** (misal: \$20 atau \$50).
4. Aktifkan **Spend Alerts**:
   - **50% of budget:** Notifikasi peringatan dini via Email pengurus/developer.
   - **75% of budget:** Peringatan eskalasi.
   - **100% of budget:** Pilihan tindakan *Pause Projects* untuk menghentikan konsumsi resource serverless sebelum tagihan berlipat ganda.

### 3.2. Function Execution Duration Limit
- Atur `maxDuration` pada Route Handler Next.js maksimal 15 detik (default Vercel Hobby 10-15s) agar request yang mengalami hang otomatis dihentikan oleh runtime Edge/Node.js.

---

## 4. Proteksi di Sisi Codebase (Application Defenses)

1. **Sliding-Window Rate Limiting (`lib/security/rateLimiter.ts`):**
   - Endpoint broadcast `/api/push/send` dibatasi 10 request / menit.
   - Endpoint proxy `/api/waha/*` dibatasi 30 request / menit.
   - Request berlebih langsung dipotong dengan `429 Too Many Requests` tanpa mengeksekusi komputasi database.
2. **Validasi Skema Input (`lib/validations/pushNotificationSchema.ts`):**
   - Mencegah payload bervolume besar (*payload bombing*) yang dapat menguras memori server.
3. **Penyaringan Log & Monitoring (`lib/services/errorMonitoring.ts`):**
   - Sentry dikonfigurasi dengan `tracesSampleRate: 0.1` di production (hanya 10% sampling performa) untuk menghemat kuota event Sentry bulanan.
   - Data privasi santri (NIS, nomor HP, password) otomatis disamarkan (*redacted*) sebelum dikirim ke Sentry.

---

## 5. Prosedur Tanggap Darurat Lonjakan Trafik (Incident Response)

Jika sistem mendeteksi lonjakan trafik atau email peringatan Spend Alert diterima:
1. **Periksa Endpoint Pelaku:** Buka Vercel Analytics / Supabase Logs Explorer untuk melihat URL yang menerima lonjakan request.
2. **Aktifkan Attack Mode / Cloudflare / Vercel Firewall:**
   - Di Vercel: Masuk ke **Security** > **Firewall** > Aktifkan **Attack Mode**.
3. **Isolasi Bug Frontend:** Jika lonjakan berasal dari klien yang me-loop endpoint tertentu, blokir sementara endpoint tersebut di middleware atau ubah kode route handler untuk merespons status `503 Service Unavailable` sementara perbaikan dideploy.
