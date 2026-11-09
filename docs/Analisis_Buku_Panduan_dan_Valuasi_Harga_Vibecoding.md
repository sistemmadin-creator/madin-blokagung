# LAPORAN SPESIFIKASI SISTEM, KELAYAKAN INVESTASI & PENAWARAN PENGEMBANGAN TEKNOLOGI INFORMASI
## Sistem Informasi Terpadu MADINA Blokagung
**Pondok Pesantren Darussalam Blokagung, Banyuwangi**
*Dokumen Resmi Pengajuan kepada Majelis Pimpinan & Pengurus Lembaga*

---

### SURAT PENGANTAR PENGAJUAN
**Nomor** : 012/PROP-MADINA/XI/2026  
**Lampiran** : 1 (Satu) Berkas Buku Panduan Resmi Operasional (100+ Halaman)  
**Perihal** : **Laporan Spesifikasi Sistem & Penawaran Investasi Pengembangan Sistem Informasi MADINA**  

Kepada Yth.  
**Majelis Pimpinan & Pengurus Harian**  
Madrasah Diniyyah Al Amiriyyah (MADINA)  
Pondok Pesantren Darussalam Blokagung  
di Tempat  

*Assalamu’alaikum Warahmatullahi Wabarakatuh.*  

Bismillahirrohmanirrohim. Alhamdulillahi Robbil 'Alamin, puji syukur kami panjatkan ke hadirat Allah SWT atas limpahan rahmat dan taufiq-Nya. Seiring pertumbuhan ribuan santri pada jenjang Ula, Wustho, Ulya, hingga Kelas Unggulan, tata kelola administrasi manual berbasis kertas menghadapi tantangan besar: potensi jadwal guru bentrok, keterlambatan laporan hafalan ke wali santri, risiko piagam hilang/salah serah di panggung wisuda, serta lambatnya rekap presensi mengajar.  

Bersama dokumen ini, kami menyampaikan **Laporan Spesifikasi Sistem, Analisis Efisiensi Anggaran, dan Penawaran Investasi Pengembangan Sistem Informasi Terpadu MADINA Blokagung**. Seluruh sistem (28 modul) telah selesai dibangun, diuji coba, dan dilengkapi dengan **Buku Panduan Operasional & Administrasi Resmi (SOP) 100+ Halaman** yang siap dijadikan acuan operasional lembaga.  

---

## 1. PROFIL DAN CAPAIAN SISTEM YANG TELAH SELESAI DIBANGUN

Aplikasi ini mencakup **28 modul terpadu** yang melayani 6 pilar operasional madrasah:

| Divisi / Bidang Kerja | Modul & Fitur Kunci | Manfaat Nyata bagi Madrasah |
| :--- | :--- | :--- |
| **1. PKM. Kurikulum** | • Formasi Kelas PA/PI & Blok Gedung<br/>• Generator Rombel Otomatis<br/>• Matriks Jadwal KBM (Klik Kanan: Pindah, Tukar, Tempel)<br/>• Deteksi & Penyelesai Bentrok Guru/Ruang (CSP Backtracking)<br/>• Kalender Akademik Masehi/Hijriyah | Menghilangkan jadwal asatidz bentrok, memastikan kapasitas ruang tidak overload, serta integrasi libur KBM ke absensi secara otomatis. |
| **2. PKM. Muhafadzoh** | • Setoran Hafalan Kantor & Cetak Kartu Bukti Klasik (6:3)<br/>• Setor Mingguan Mustahiq via `SundayDatePicker`<br/>• Setor Cepat Massal Rombel & Linimasa Capaian Bulanan<br/>• Studio Cetak Piagam/Syahadah Massal<br/>• **Checklist Serah Terima Piagam** (Kartu 3 Kolom & Rasio)<br/>• **Broadcast WhatsApp Rapor Hafalan** ke Wali Santri | Transparansi setoran hafalan nadzom, memastikan piagam haflah tidak salah serah, dan mempererat silaturahmi dengan wali santri melalui WhatsApp. |
| **3. PKM. Kesiswaan** | • Presensi Mengajar Harian Asatidz (Jam 1 s.d. Jam 4)<br/>• Penugasan & Pencatatan Asatidz Badal (Pengganti)<br/>• **Portal Absen Cepat per Blok** (Optimal untuk HP/Tablet)<br/>• Presensi Musyawarah Konsorsium Mustahiq & Munawib<br/>• **Generator Laporan WhatsApp Otomatis** | Piket di asrama dapat mengabsen cepat, pengurus langsung mengetahui kelas kosong, dan laporan malam ke dewan masyayikh tersusun otomatis. |
| **4. PKM. Sarana Prasarana** | • Inventaris Fasilitas per Ruang Kelas (Papan Tulis, Meja)<br/>• Sistem Tiket Pelaporan Kerusakan & Teknisi<br/>• Distribusi Logistik KBM (Stok Spidol, Tinta, ATK)<br/>• Rekapitulasi Audit Kelayakan Belajar | Mengendalikan pengeluaran ATK, menjaga kelas selalu siap pakai, dan memprioritaskan perbaikan sarana belajar santri. |
| **5. PKM. Publikasi & Warta** | • Portal Publik Profil MADINA & Direktori Jenjang<br/>• CMS Warta Berita dengan Fitur Klik Kanan Sisip Foto<br/>• **Penyematan Video TikTok Edukasi Santri** vertikal 9:16 | Membangun citra positif pesantren, menyajikan syiar ngaji turots secara kekinian, dan mempermudah akses informasi publik. |
| **6. Tata Kelola & Keamanan** | • Hak Akses RBAC 3 Tingkat (Edit, Baca, Sembunyikan)<br/>• Isolasi Wilayah Blok Asrama & Gender (Putra/Putri)<br/>• Mesin Pemulihan Data (*Undo/Redo Engine* 5 riwayat)<br/>• **Mode Luring (*Offline-First*) via IndexedDB** | Menjaga kerahasiaan data santri putri dari pengurus putra, aman dari kesalahan hapus data, dan sistem tetap jalan walau internet mati. |

---

## 2. ANALISIS KELAYAKAN INVESTASI & EFISIENSI BIAYA (ROI)

1. **Penghematan Anggaran Kertas & Cetak (Cost Saving):** Menggantikan ribuan buku presensi fisik, kartu setoran, formulir izin, dan blangko cetak. Menghemat anggaran operasional sebesar **Rp 6.000.000 – Rp 10.000.000 setiap tahun ajaran**.
2. **Peningkatan Produktivitas Pengurus (Productivity Gain):** Rekapitulasi kehadiran guru dan jam mengajar untuk bisyarah kini selesai instan dalam hitungan detik.
3. **Kepuasan & Kepercayaan Wali Santri (Social Value):** Rapor hafalan berkala via WhatsApp membuat wali santri merasa tenang dan meningkatkan ketertiban administrasi santri di pesantren.

---

## 3. STUDI PERBANDINGAN NILAI PASAR PERANGKAT LUNAK

| Vendor Pengembang | Estimasi Waktu Kerja | Struktur Biaya Pasar | Estimasi Nilai Pasar (Market Rate) |
| :--- | :--- | :--- | :--- |
| **Software House Komersial** | 4 – 6 Bulan | Dihitung per jam kerja tim (PM, UI/UX, Dev, QA) | **Rp 80.000.000 – Rp 175.000.000**<br/>*(Maintenance: Rp 3 Juta – Rp 5 Juta/bln)* |
| **Konsultan / Freelancer Senior** | 2 – 3 Bulan | Biaya jasa pengembangan modul | **Rp 35.000.000 – Rp 65.000.000**<br/>*(Maintenance: Rp 1 Juta – Rp 2 Juta/bln)* |
| **Penawaran Khusus Pengembangan MADINA** | **100% Selesai & Siap Pakai** | **Pengabdian Almamater & Kerjasama Terpadu** | **Lihat Pilihan Paket Investasi di Bawah**<br/>*(Penghematan hingga 85% dari harga pasar)* |

---

## 4. PILIHAN PAKET INVESTASI PENGEMBANGAN SISTEM

### 🟢 PAKET A: INVESTASI TERPADU & SERAH TERIMA PENUH (ONE-OFF) — *Rekomendasi Utama*
* **Total Nilai Investasi:** **Rp 12.500.000,-** *(Dua Belas Juta Lima Ratus Ribu Rupiah)*
* **Hak & Deliverable yang Diterima Lembaga:**
  1. Penyerahan 100% *source code* aplikasi `madinblokagung-next`.
  2. Pemasangan dan penerapan lengkap di server cloud (Supabase + Vercel + Gateway WAHA lokal).
  3. Dokumen fisik cetak **Buku Panduan Operasional & Administrasi Resmi (SOP) 100+ Halaman**.
  4. Sesi pelatihan & bimbingan teknis bagi pengurus PKM dan Mustahiq (1–2 hari).
  5. Garansi perbaikan kendala teknis (*bug fix*) gratis selama **3 bulan pertama**.

---

### 🔵 PAKET B: INVESTASI KEMITRAAN BERKELANJUTAN (SETUP + MAINTENANCE) — *Sangat Ramah Anggaran*
* **Biaya Implementasi & Setup Awal:** **Rp 5.000.000,-** *(sekali bayar)*
* **Biaya Pendampingan Rutin (Maintenance Retainer):** **Rp 600.000,- / bulan**
* **Cakupan Layanan Maintenance Bulanan:**
  * Pencadangan data (*backup*) berkala menjelang Nisfu Sanah dan Imtihan Akhirussanah.
  * Pemantauan server gateway WhatsApp (WAHA) agar siaran rapor tidak terputus.
  * Pendampingan saat pergantian tahun ajaran baru, mutasi rombel, dan kalender libur pondok.
  * Layanan bantuan cepat (Fast Response) jika terjadi kendala teknis operasional.

---

### 🟡 PAKET C: PENGABDIAN KHIDMAH ALMAMATER (INFAQ DEDIKASI)
* **Bisyarah / Jasa Pengembangan:** Menyesuaikan sepenuhnya dengan kebijakan dan kerelaan Majelis Pimpinan Madrasah.
* **Kewajiban Lembaga:** Menanggung biaya infrastruktur resmi atas nama madrasah (domain dan PC server kantor).

---

## 5. BIAYA INFRASTRUKTUR PIHAK KETIGA (SERVER & DOMAIN)

### 5.1 Estimasi Biaya Dasar (Baseline Operasional Awal)

| Komponen Infrastruktur | Kebutuhan | Estimasi Biaya | Keterangan |
| :--- | :--- | :--- | :--- |
| **Domain Resmi Madrasah** | `madinblokagung.com` / `.sch.id` | Rp 150.000 – Rp 250.000 / tahun | Identitas resmi lembaga di internet. |
| **Hosting Aplikasi (Next.js)** | Vercel Platform | **Rp 0,- (Gratis)** | Paket gratis sangat mumpuni melayani ribuan akses. |
| **Database & Auth (PostgreSQL)** | Supabase Managed Cloud | **Rp 0,- (Gratis)** s.d. $25/bln | Paket gratis 500 MB cukup untuk skala awal/pilot project. |
| **Server Gateway WhatsApp** | PC/Laptop Kantor Sekretariat | **Rp 0,- (Aset yang Ada)** | Dijalankan pada komputer piket kantor tanpa sewa VPS luar. |

---

### 5.2 Skenario Skala Penuh (7.000 Santri, Dewan Asatidz Aktif, & Ketuntasan Hafalan Masif)

Ketika sistem beroperasi penuh pada skala riil pesantren besar dengan parameter:
* **Data Asatidz:** ~150 s.d. 200 dewan asatidz aktif mengajar.
* **Data Santri:** Bertambah hingga **7.000 santri aktif** (lengkap 37 atribut data + foto profil webcam 3x4).
* **Absensi Asatidz (1 Tahun Penuh):** 150–200 asatidz x ~15 jam mengajar/minggu x 38 minggu efektif KBM = **~85.000 s.d. 114.000 baris riwayat presensi** di tabel `riwayat_absensi`.
* **Setoran Hafalan Santri (Tingkat Ketuntasan Nyata):**
  * *90% Santri Hafalan Wajib Tuntas:* 6.300 santri x 15 kali setoran bertahap = **~94.500 transaksi**.
  * *70% Santri Hafalan Sunnah Tuntas:* 4.900 santri x 8 kali setoran bertahap = **~39.200 transaksi**.
  * *30% Santri Hafalan Kitab Tuntas:* 2.100 santri x 12 kali setoran nadzom = **~25.200 transaksi**.
  * *15% Santri Hafalan Tahfidz Tuntas:* 1.050 santri x 20 kali setoran juz = **~21.000 transaksi**.
  * **Total Transaksi Setoran per Tahun: ~179.900 baris data setoran hafalan!**

---

### 5.3 Analisis Dampak Teknis & Titik Batas Kapasitas (*Capacity Thresholds*)

#### 1. Pangkalan Data PostgreSQL (Supabase Cloud)
* **Kalkulasi Volume Data:**
  * Master Santri (7.000 baris x 37 kolom): ~20 MB.
  * Pasfoto Profil Terkompresi (7.000 santri x ~100 KB): ~700 MB storage file.
  * Log Absensi Asatidz 1 Tahun (~100.000 baris): ~45 MB.
  * Transaksi Setoran Hafalan 1 Tahun (~180.000 baris): ~85 MB.
  * Struktur Relasi Jadwal, Sapras, Konsorsium, & Audit Logs: ~60 MB.
  * Indeks Pencarian Cepat (B-Tree Indexes): ~120 MB.
  * **Total Ukuran Database di Tahun Pertama:** **~650 MB s.d. 950 MB** (bertambah ~350 MB setiap tahun ajaran berikutnya).
* **Batas Free Tier Supabase:**
  Paket gratis Supabase dibatasi maksimal **500 MB database**. Pada skenario 7.000 santri dan ~300.000 transaksi tahunan di atas, kuota 500 MB **PASTI terlampaui** pada pertengahan tahun ajaran (semester genap). Jika kuota habis, database akan terkunci ke status *read-only*.
* **Rekomendasi Wajib Upgrade:**
  Madrasah **wajib mengalokasikan anggaran untuk Supabase Pro Tier ($25/bulan atau ~Rp 400.000/bulan)**.
* **Keuntungan yang Didapat Lembaga (Supabase Pro):**
  * Batas database melonjak menjadi **8 GB** (sangat aman menampung data 7.000 santri selama 7–10 tahun ke depan).
  * Kuota media storage **100 GB** (sangat longgar untuk puluhan ribu pasfoto santri dan dokumen piagam).
  * Kuota bandwidth keluar (*egress*) **250 GB/bulan**.
  * **500 Concurrent Realtime Connections** (menjamin tidak ada koneksi terputus saat ratusan mustahiq dan petugas piket menginput data serentak di hari Ahad).
  * **Daily Automated Backup (Retensi 7 Hari)** yang dijamin oleh cloud AWS/Supabase, melindungi data madrasah dari bencana kehilangan data.

#### 2. Hosting Aplikasi Web (Vercel Platform)
* **Analisis Beban Trafik:** Akses harian dari 150 asatidz, puluhan petugas piket, dan ribuan wali santri menghasilkan transfer data sekitar 25 GB – 45 GB per bulan.
* **Rekomendasi:** Madrasah **tetap dapat menggunakan Vercel Free Tier (Rp 0,- / Gratis)**, karena batas gratis Vercel menyediakan 100 GB bandwidth bulanan. Seluruh aset gambar berat dialirkan langsung melalui CDN Supabase Storage, bukan melalui server Vercel.
* *Opsi Cadangan:* Jika saat momen puncak Haflah Akhirussanah trafik wali santri membludak, madrasah dapat mengaktifkan Vercel Pro ($20/bulan / ~Rp 320.000) hanya untuk 1 bulan tersebut.

#### 3. Server Gateway WhatsApp (WAHA / Baileys) untuk 7.000 Santri
* **Karakteristik Pengiriman:** Mengirimkan siaran rapor hafalan berkala ke 7.000 nomor WhatsApp wali santri. Dengan jeda acak anti-banned 5 detik per nomor, antrean siaran diselesaikan secara bertahap dalam **~9,7 jam** (dijalankan bergelombang per rombel kelas).
* **Dua Opsi Penempatan Server Gateway:**
  * **Opsi A (Komputer Kantor Sekretariat - Rp 0,-):** Memanfaatkan 1 unit PC kantor (minimal prosesor Intel Core i3 / Ryzen 3, RAM 8 GB, koneksi LAN stabil, dan UPS penstabil daya) untuk menjalankan skrip `start-waha-gateway.bat`.
  * **Opsi B (Sewa Cloud VPS Linux Lokal - Rp 100.000 – Rp 150.000 / bulan):** *Sangat direkomendasikan* untuk skala 7.000 santri agar bot WhatsApp madrasah berjalan 24 jam nonstop di cloud tanpa risiko mati saat kantor pesantren mati lampu.

---

### 5.4 Rangkuman Anggaran Maintenance Infrastruktur Tahunan (Skenario 7.000 Santri)

Berikut adalah kalkulasi transparan pemeliharaan infrastruktur cloud & server yang dibayarkan langsung oleh yayasan/madrasah kepada penyedia layanan:

| Komponen Infrastruktur | Spesifikasi Layanan | Skema Pembayaran | Estimasi Biaya Tahunan |
| :--- | :--- | :--- | :--- |
| **Domain Resmi Madrasah** | Domain `.sch.id` / `.com` | Tahunan | Rp 150.000 – Rp 250.000 / tahun |
| **Hosting Aplikasi (Next.js)** | Vercel Platform (Hobby Tier) | Bulanan | **Rp 0,- (Gratis)** |
| **Database & Auth (PostgreSQL)** | Supabase Pro Tier ($25/bln) | Bulanan (~Rp 400.000/bln) | Rp 4.800.000 / tahun |
| **Server Gateway WhatsApp** | PC Kantor Madrasah *(Opsi A)*<br/>Cloud VPS Linux *(Opsi B)* | Aset Kantor<br/>Bulanan (~Rp 100.000/bln) | **Rp 0,-** *(Opsi A)*<br/>Rp 1.200.000 / tahun *(Opsi B)* |
| **Cadangan SSL & Bandwidth** | Let's Encrypt / Vercel Edge CDN | Otomatis | **Rp 0,- (Gratis)** |
| **TOTAL BIAYA INFRASTRUKTUR (OPSI A - PC KANTOR)** | | **Tahunan** | **Rp 4.950.000 – Rp 5.050.000 / tahun**<br/>*(~Rp 415.000 / bulan)* |
| **TOTAL BIAYA INFRASTRUKTUR (OPSI B - CLOUD VPS)** | | **Tahunan** | **Rp 6.150.000 – Rp 6.250.000 / tahun**<br/>*(~Rp 515.000 / bulan)* |

> 💡 **Analisis Efisiensi Biaya per Santri (Rasio Anggaran Sangat Hemat):**  
> Dengan total biaya infrastruktur sekitar **Rp 5.000.000 / tahun** untuk melayani **7.000 santri**, maka biaya operasional server per santri hanya sebesar:  
> $$\frac{\text{Rp } 5.000.000}{7.000 \text{ santri}} \approx \mathbf{Rp\ 714,-\ \text{per santri per tahun!}}$$  
> Angka ini jauh lebih murah dibandingkan biaya pengadaan 1 lembar kartu ujian atau 1 buku presensi fisik, namun menghadirkan efisiensi kelas dunia bagi tata kelola madrasah.

---

## 6. JADWAL IMPLEMENTASI CEPAT

* **Hari ke-1 s.d. ke-2:** Penyelarasan domain resmi dan server produksi.
* **Hari ke-3 s.d. ke-4:** Migrasi data santri dan asatidz via Import Excel.
* **Hari ke-5 s.d. ke-6:** Pelatihan teknis pengurus PKM dan dewan mustahiq.
* **Hari ke-7:** Serah terima Buku Panduan Fisik dan sistem aktif penuh (*Go-Live*).

---

## 7. LEMBAR PENGESAHAN

Blokagung, ............................... 2026  

| Menyetujui & Mengesahkan,<br/>**Majelis Pimpinan MADINA Blokagung** | Diajukan Oleh,<br/>**Tim Pengembang Sistem MADINA** |
| :---: | :---: |
| <br/><br/><br/><br/>( .............................................................. )<br/>NIP / Jabatan: | <br/><br/><br/><br/>( .............................................................. )<br/>Koordinator Rekayasa Sistem |
