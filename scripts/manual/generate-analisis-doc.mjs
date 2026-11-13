/**
 * Generator Dokumen Microsoft Word (.doc)
 * PROPOSAL INVESTASI & LAPORAN SPESIFIKASI SISTEM INFORMASI TERPADU MADINA BLOKAGUNG
 * Ditujukan Khusus untuk Klien / Pimpinan Lembaga / Majelis Pengurus
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { documentStyles } from './styles.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../../docs');
const targetFileDoc = path.join(targetDir, 'Analisis_Buku_Panduan_dan_Valuasi_Harga_Vibecoding.doc');
const targetFileMd = path.join(targetDir, 'Analisis_Buku_Panduan_dan_Valuasi_Harga_Vibecoding.md');

const docHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Laporan Spesifikasi Sistem &amp; Proposal Investasi Digitalisasi MADINA Blokagung</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  ${documentStyles}
  <style>
    .letterhead {
      text-align: center;
      border-bottom: 2.5pt double #064e3b;
      padding-bottom: 10pt;
      margin-bottom: 18pt;
    }
    .letterhead-title {
      font-size: 15pt;
      font-weight: bold;
      color: #064e3b;
      text-transform: uppercase;
      letter-spacing: 1.5pt;
      margin-bottom: 2pt;
    }
    .letterhead-sub {
      font-size: 10.5pt;
      color: #047857;
      font-weight: bold;
      margin-bottom: 3pt;
    }
    .letterhead-address {
      font-size: 8.5pt;
      color: #475569;
    }
    .recipient-box {
      background-color: #f8fafc;
      border: 1pt solid #cbd5e1;
      padding: 10pt 14pt;
      margin: 14pt 0 18pt 0;
      border-radius: 4pt;
      font-size: 10.5pt;
    }
    .highlight-card {
      background-color: #f8fafc;
      border: 1pt solid #cbd5e1;
      border-left: 4.5pt solid #059669;
      padding: 10pt 14pt;
      margin: 10pt 0;
      border-radius: 4pt;
    }
    .pricing-card {
      border: 1.5pt solid #059669;
      background-color: #f0fdf4;
      padding: 14pt;
      margin: 12pt 0;
      border-radius: 6pt;
    }
  </style>
</head>
<body>

  <!-- HALAMAN SAMPUL PROPOSAL EKSEKUTIF -->
  <div class="cover-section" style="text-align: center; padding-top: 40pt;">
    <div style="font-size: 13pt; letter-spacing: 2pt; font-weight: bold; color: #047857; text-transform: uppercase;">
      DOKUMEN PROPOSAL INVESTASI &amp; STUDI KELAYAKAN SISTEM
    </div>
    
    <div class="cover-title" style="font-size: 24pt; margin-top: 25pt; line-height: 1.25;">
      LAPORAN SPESIFIKASI SISTEM, ANALISIS KEBUTUHAN<br/>
      &amp; PENAWARAN PENGEMBANGAN TEKNOLOGI INFORMASI
    </div>

    <div class="cover-subtitle" style="margin-top: 15pt; margin-bottom: 30pt;">
      Solusi Digitalisasi Administrasi Terpadu Kurikulum, Muhafadzoh, Kesiswaan, Sarana Prasarana,<br/>
      dan Portal Warta Berita Pesantren Berbasis Waktu Nyata &amp; Ketahanan Luring (Offline-First)
    </div>

    <div style="margin: 20pt auto; width: 140pt; height: 3pt; background-color: #059669;"></div>

    <table class="cover-meta-table">
      <tr>
        <td style="width: 35%; font-weight: bold; color: #475569;">Ditujukan Kepada</td>
        <td style="width: 5%;">:</td>
        <td style="font-weight: bold; color: #064e3b;">Majelis Pimpinan Madrasah Diniyyah Al Amiriyyah (MADINA)</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Lembaga Induk</td>
        <td>:</td>
        <td>Pondok Pesantren Darussalam Blokagung, Banyuwangi</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Nama Sistem</td>
        <td>:</td>
        <td>Sistem Informasi Manajemen Terpadu MADINA Blokagung</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Arsitektur Solusi</td>
        <td>:</td>
        <td>Next.js 14 App Router, Supabase PostgreSQL Real-time, IndexedDB Offline</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Dokumen Pelengkap</td>
        <td>:</td>
        <td>Buku Panduan Operasional &amp; Administrasi Resmi (100+ Halaman)</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Tahun Ajaran</td>
        <td>:</td>
        <td>1447–1448 H / 2026–2027 M</td>
      </tr>
    </table>

    <div style="margin-top: 50pt; font-size: 10pt; color: #64748b;">
      Disusun dengan penuh rasa takzim dan dedikasi profesional untuk kemajuan pendidikan turots salafiyah<br/>
      Pondok Pesantren Darussalam Blokagung.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SURAT PENGANTAR RESMI -->
  <div class="letterhead">
    <div class="letterhead-title">PENGEMBANGAN SISTEM INFORMASI &amp; DIGITALISASI PESANTREN</div>
    <div class="letterhead-sub">KONSULTAN &amp; REKAYASA PERANGKAT LUNAK PENDIDIKAN SALAFIYAH</div>
    <div class="letterhead-address">Sekretariat Pengembangan Sistem Informasi MADINA Blokagung, Banyuwangi, Jawa Timur</div>
  </div>

  <div class="recipient-box">
    <strong>Nomor</strong> : 012/PROP-MADINA/XI/2026<br/>
    <strong>Lampiran</strong> : 1 (Satu) Berkas Buku Panduan Resmi (.doc)<br/>
    <strong>Perihal</strong> : <strong>Laporan Spesifikasi Sistem &amp; Penawaran Investasi Pengembangan Aplikasi MADINA</strong><br/><br/>
    Kepada Yth.<br/>
    <strong>Majelis Pimpinan &amp; Pengurus Harian</strong><br/>
    Madrasah Diniyyah Al Amiriyyah (MADINA)<br/>
    Pondok Pesantren Darussalam Blokagung<br/>
    di Tempat
  </div>

  <p style="font-style: italic; color: #064e3b; font-weight: bold;">
    Assalamu'alaikum Warahmatullahi Wabarakatuh.
  </p>
  <p>
    Bismillahirrohmanirrohim. Alhamdulillahi Robbil 'Alamin, puji syukur kami panjatkan ke hadirat Allah Subhanahu wa Ta'ala atas limpahan nikmat, kesehatan, dan taufiq-Nya. Shalawat serta salam senantiasa tercurah kepada junjungan kita Nabi Besar Muhammad Shallallahu 'Alaihi wa Sallam.
  </p>
  <p>
    Seiring dengan pesatnya pertumbuhan populasi santri di Pondok Pesantren Darussalam Blokagung yang kini membina ribuan santriawan dan santriwati pada berbagai tingkatan (Ula, Wustho, Ulya, dan Kelas Unggulan), tuntutan terhadap tata kelola administrasi yang cepat, akurat, dan transparan menjadi kebutuhan mendesak bagi lembaga. Pengelolaan manual berbasis kertas saat ini menghadapi tantangan besar: risiko bentrok jadwal guru, keterlambatan pelaporan setoran hafalan kepada wali santri, potensi salah serah piagam wisuda, serta lambatnya rekapitulasi kehadiran dewan asatidz.
  </p>
  <p>
    Bersama surat ini, kami dengan penuh rasa hormat menyampaikan <strong>Laporan Spesifikasi Sistem, Analisis Efisiensi Anggaran, dan Penawaran Investasi Pengembangan Sistem Informasi Terpadu MADINA Blokagung</strong>. Seluruh modul aplikasi (<strong>35 modul terpadu enterprise</strong>) telah selesai dibangun, diuji coba melalui 27 skenario uji regresi otomatis Playwright E2E (100% lulus), dan dilengkapi dengan <strong>Buku Panduan Operasional &amp; Administrasi Resmi (SOP) setebal 100+ halaman</strong> yang siap dijadikan pedoman kerja dewan asatidz dan pengurus.
  </p>
  <p>
    Besar harapan kami agar dokumen ini dapat memberikan gambaran utuh mengenai nilai strategis dan efisiensi jangka panjang yang dihadirkan oleh sistem ini bagi kemajuan almamater tercinta.
  </p>
  <p style="font-style: italic; color: #064e3b; font-weight: bold;">
    Wassalamu'alaikum Warahmatullahi Wabarakatuh.
  </p>

  <table style="width: 100%; margin-top: 20pt; border-collapse: collapse;">
    <tr>
      <td style="width: 55%;"></td>
      <td style="width: 45%; text-align: center;">
        Blokagung, November 2026<br/>
        Hormat kami,<br/>
        <strong>Tim Pengembang &amp; Arsitek Sistem MADINA</strong><br/><br/><br/><br/>
        ( <u>Pengembang Sistem MADINA</u> )
      </td>
    </tr>
  </table>

  <div class="page-break"></div>

  <!-- BAGIAN 1: PROFIL & CAPAIAN SISTEM YANG TELAH SELESAI DIBANGUN -->
  <h1>1. PROFIL DAN CAPAIAN SISTEM YANG TELAH SELESAI DIBANGUN</h1>

  <p>
    Sistem Informasi MADINA Blokagung dirancang secara khusus untuk menjawab seluruh tradisi dan kebutuhan autentik madrasah diniyyah salafiyah. Sistem ini mencakup <strong>35 modul terpadu enterprise</strong> yang terbagi ke dalam 8 pilar operasional utama:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Divisi / Bidang Kerja</th>
        <th style="width: 35%;">Modul &amp; Fitur Unggulan</th>
        <th style="width: 40%;">Manfaat Nyata bagi Madrasah</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Ruang Kendali Beranda &amp; Universal Search</strong></td>
        <td>
          • Beranda Navigasi Eksekutif (<code>/beranda</code>)<br/>
          • Dashboard Analitik &amp; KPI Klasik (<code>/dashboard</code>)<br/>
          • <strong>Universal Global Search (<kbd>Ctrl + K</kbd> / <kbd>Cmd + K</kbd>)</strong><br/>
          • Modal Detail Jenjang KBM (Ula, Wustho, Ulya)<br/>
          • Drawer Profil Cepat Santri &amp; Asatidz
        </td>
        <td>
          Memberikan visibilitas instan bagi pimpinan lembaga, akses navigasi kilat tanpa tersesat di menu, dan membedah sebaran santri per rombel secara mendalam.
        </td>
      </tr>
      <tr>
        <td><strong>2. PKM. Kurikulum</strong></td>
        <td>
          • Formasi Kelas PA &amp; PI (Kapasitas Lokal &amp; Blok Gedung)<br/>
          • Generator Formasi Rombel Otomatis<br/>
          • Matriks Jadwal KBM Interaktif (Klik Kanan: Pindah, Tukar, Tempel)<br/>
          • Mesin Deteksi &amp; Penyelesai Bentrok Guru/Ruang (CSP Solver)<br/>
          • Kalender Akademik Terpadu (Masehi &amp; Hijriyah)
        </td>
        <td>
          Mencegah terjadinya asatidz yang terjadwal mengajar di 2 kelas berbeda pada jam yang sama, menata kuota santri per ruang kelas, serta mengotomatiskan libur KBM terintegrasi ke absensi.
        </td>
      </tr>
      <tr>
        <td><strong>3. PKM. Muhafadzoh</strong></td>
        <td>
          • Setoran Hafalan Kantor &amp; Cetak Kartu Bukti Klasik (6:3)<br/>
          • Setor Mingguan Mustahiq via <code>SundayDatePicker</code><br/>
          • Setor Cepat Massal Rombel &amp; Linimasa Capaian Bulanan<br/>
          • Studio Cetak Piagam / Syahadah Massal<br/>
          • <strong>Checklist Serah Terima Piagam</strong> (Kartu 3 Kolom &amp; Rasio Kelayakan)<br/>
          • <strong>Broadcast WhatsApp Rapor Hafalan</strong> (Otomatis ke Wali Santri)
        </td>
        <td>
          Meningkatkan akuntabilitas capaian hafalan nadzom santri, memastikan penyerahan piagam di panggung Haflah tepat sasaran tanpa ada yang tertukar/hilang, serta mendekatkan silaturahmi dengan wali santri.
        </td>
      </tr>
      <tr>
        <td><strong>4. PKM. Kesiswaan</strong></td>
        <td>
          • Presensi Mengajar Harian Asatidz (Jam 1 s.d. Jam 4)<br/>
          • Penugasan &amp; Pencatatan Asatidz Badal (Pengganti)<br/>
          • <strong>Portal Absen Cepat per Blok</strong> (Optimal untuk HP/Tablet)<br/>
          • Presensi Musyawarah Konsorsium Mustahiq &amp; Munawib<br/>
          • <strong>Generator Laporan WhatsApp Otomatis</strong>
        </td>
        <td>
          Petugas piket di lantai asrama dapat mengabsen dengan cepat dalam 1 klik, pengurus langsung mengetahui kelas mana yang kosong, dan laporan harian ke dewan masyayikh terkirim otomatis tiap malam.
        </td>
      </tr>
      <tr>
        <td><strong>5. PKM. Sapras &amp; Sistem Barcode</strong></td>
        <td>
          • Inventaris Fasilitas per Ruang Kelas &amp; Tiket Perbaikan<br/>
          • <strong>Inventaris Madin &amp; Barcode Aset</strong> (<code>/sapras/inventaris-madin</code>)<br/>
          • <strong>Scanner Barcode Kamera Real-time</strong> (<code>ModalBarcodeScanner.tsx</code>)<br/>
          • <strong>Studio Cetak Label Stiker Vektor SVG</strong> (<code>ModalCetakLabelSapras.tsx</code>)<br/>
          • Mutasi Aset Antar-Gedung &amp; Buku Stok Logistik ATK KBM
        </td>
        <td>
          Mencegah pemborosan ATK KBM, menjaga kelas selalu siap pakai, mengamankan aset berharga dengan label barcode resmi, dan mempercepat audit fisik langsung via kamera smartphone.
        </td>
      </tr>
      <tr>
        <td><strong>6. Divisi EBTADIN (Ujian &amp; Kelulusan)</strong></td>
        <td>
          • Pusat Kendali EBTADIN (<code>/ebtadin</code>)<br/>
          • Rekap &amp; Arsip Nilai Ujian Angkatan (<code>/ebtadin/ujian</code>)<br/>
          • Rekap Kelulusan Santri Akhir (<code>/ebtadin/kelulusan</code>)<br/>
          • <strong>Checklist Serah Terima Ijazah &amp; Syahadah</strong> (<code>/ebtadin/serah-ijazah</code>)
        </td>
        <td>
          Mengelola siklus ujian akhir madrasah secara terstruktur, mengarsipkan data kelulusan lintas angkatan santri, dan menjamin distribusi ijazah transparan dan terdokumentasi rapi.
        </td>
      </tr>
      <tr>
        <td><strong>7. PKM. Publikasi &amp; Warta</strong></td>
        <td>
          • Portal Publik Profil MADINA &amp; Direktori Jenjang<br/>
          • CMS Warta Berita dengan Fitur Klik Kanan Sisip Foto<br/>
          • <strong>Penyematan Video TikTok Edukasi Santri</strong> vertikal 9:16
        </td>
        <td>
          Membangun citra positif pesantren di mata publik, menyajikan dokumentasi kajian turots santri secara modern, dan mempermudah masyarakat mengakses profil madrasah.
        </td>
      </tr>
      <tr>
        <td><strong>8. Keamanan Siber 4 Pilar &amp; Uji Regresi</strong></td>
        <td>
          • <strong>Pilar 1:</strong> Proteksi Kredensial &amp; Anti-SSRF Whitelist<br/>
          • <strong>Pilar 2:</strong> RBAC Multi-Lapisan &amp; RLS Postgres Anti-BOLA/IDOR<br/>
          • <strong>Pilar 3:</strong> Validasi Skema Zod &amp; Sliding-Window Rate Limiter<br/>
          • <strong>Pilar 4:</strong> Sentry SDK v11+ Error Monitoring &amp; Anti-PII Data Filter<br/>
          • Mode Luring (*Offline-First*) via IndexedDB &amp; Undo/Redo Engine<br/>
          • <strong>27 Uji Otomatis Playwright E2E</strong> (100% Pass)
        </td>
        <td>
          Menjamin integritas database santri kebal dari eksploitasi hacker luar, melindungi data pribadi wali santri sesuai UU PDP, dan memastikan keandalan sistem tanpa downtime.
        </td>
      </tr>
    </tbody>
  </table>

  <hr style="border: 0; border-top: 1pt solid #cbd5e1; margin: 18pt 0;"/>

  <!-- BAGIAN 2: ANALISIS KELAYAKAN INVESTASI & EFISIENSI BIAYA OPERASIONAL (ROI) -->
  <h1>2. ANALISIS KELAYAKAN INVESTASI &amp; EFISIENSI OPERASIONAL (ROI)</h1>

  <p>
    Pengembangan sistem informasi ini bukan sekadar pengadaan teknologi, melainkan **investasi strategis** yang mendatangkan efisiensi anggaran dan waktu secara nyata bagi madrasah setiap tahunnya:
  </p>

  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">1. Efisiensi Pengadaan Kertas &amp; Pencetakan Fisik (Saving Budget)</h3>
    <p>
      Sebelum ada sistem, madrasah harus mencetak ribuan buku presensi mengajar harian (4 jam x puluhan rombel), lembar rekapitulasi setoran mingguan, blanko izin, dan kartu kendali hafalan. Dengan beralih ke digital, madrasah menghemat anggaran kertas, tinta printer, dan fotokopi setidaknya **Rp 6.000.000 – Rp 10.000.000 setiap tahun ajaran**.
    </p>
  </div>

  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">2. Pengurangan Beban Jam Kerja Pengurus (Productivity Gain)</h3>
    <p>
      Rekapitulasi kehadiran dewan asatidz dan penghitungan bisyarah yang biasanya memakan waktu berhari-hari oleh tim bendahara kini tersaji instan dalam hitungan detik. Pengurus dapat memusatkan energi pada peningkatan mutu pendidikan dan bimbingan akhlak santri.
    </p>
  </div>

  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">3. Peningkatan Kepercayaan &amp; Kepuasan Wali Santri (Social Return)</h3>
    <p>
      Pemberitahuan otomatis capaian hafalan langsung ke nomor WhatsApp wali santri memberikan rasa tenang dan bangga bagi orang tua di rumah. Hal ini berdampak langsung pada kelancaran pembayaran infaq/syahriyyah santri dan loyalitas masyarakat terhadap pesantren.
    </p>
  </div>

  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">4. Pengamanan Aset Pesantren (Asset Security &amp; Audit Trail)</h3>
    <p>
      Sistem barcode inventaris sarana prasarana memastikan aset bernilai tinggi milik madrasah (seperti pengeras suara, proyektor, genset, dan mebel) teridentifikasi secara jelas, mencegah kehilangan barang, serta memudahkan audit fisik berkala.
    </p>
  </div>

  <hr style="border: 0; border-top: 1pt solid #cbd5e1; margin: 18pt 0;"/>

  <!-- BAGIAN 3: STUDI PERBANDINGAN NILAI PASAR (MARKET VALUE BENCHMARK) -->
  <h1>3. STUDI PERBANDINGAN NILAI PASAR PERANGKAT LUNAK</h1>

  <p>
    Sebagai wujud transparansi, kami menyajikan perbandingan estimasi biaya riil apabila pengembangan sistem dengan spesifikasi 35 modul terpadu enterprise, pemindai barcode kamera, cetak SVG, dan arsitektur keamanan siber 4 pilar ini ditenderkan kepada pihak ketiga:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Vendor Pengembang</th>
        <th style="width: 20%;">Waktu Pengerjaan</th>
        <th style="width: 25%;">Struktur Biaya</th>
        <th style="width: 30%;">Estimasi Biaya Pasar (Market Rate)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Software House Komersial</strong><br/><span style="font-size: 8.5pt; color: #64748b;">(Perusahaan Pengembang IT)</span></td>
        <td>5 – 7 Bulan</td>
        <td>Tim Lengkap (Project Manager, Solution Architect, UI/UX Designer, Frontend, Backend, QA Engineer, Security Specialist)</td>
        <td><strong>Rp 120.000.000 – Rp 220.000.000</strong><br/><span style="font-size: 8.5pt; color: #64748b;">+ Biaya Pemeliharaan Rp 3 Juta – Rp 6 Juta / bulan</span></td>
      </tr>
      <tr>
        <td><strong>Konsultan / Freelancer Senior</strong><br/><span style="font-size: 8.5pt; color: #64748b;">(Tenaga Ahli Lepas)</span></td>
        <td>3 – 4 Bulan</td>
        <td>Biaya jasa pengembangan modul manual</td>
        <td><strong>Rp 50.000.000 – Rp 85.000.000</strong><br/><span style="font-size: 8.5pt; color: #64748b;">+ Biaya Maintenance Rp 1,5 Juta – Rp 2,5 Juta / bulan</span></td>
      </tr>
      <tr>
        <td><strong>Penawaran Khusus Pengembangan Internal MADINA</strong></td>
        <td>Sistem Telah Siap Pakai (100% Selesai)</td>
        <td>Pengabdian Almamater &amp; Kolaborasi Terpadu</td>
        <td><strong style="color: #047857; font-size: 11pt;">Lihat Pilihan Paket Investasi di Bawah</strong><br/><span style="font-size: 8.5pt; color: #047857;">(Penghematan hingga 88% dari tarif komersial)</span></td>
      </tr>
    </tbody>
  </table>

  <hr style="border: 0; border-top: 1pt solid #cbd5e1; margin: 18pt 0;"/>

  <!-- BAGIAN 4: PILIHAN PAKET INVESTASI PENGEMBANGAN SISTEM -->
  <h1>4. PILIHAN PAKET INVESTASI PENGEMBANGAN SISTEM</h1>

  <p>
    Kami memahami karakteristik tata kelola anggaran pondok pesantren. Oleh karena itu, kami menawarkan <strong>tiga alternatif skema investasi</strong> yang fleksibel, rasional, dan dapat disesuaikan dengan kemampuan kas madrasah:
  </p>

  <!-- PAKET A -->
  <div class="pricing-card">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="color: #064e3b; margin: 0; font-size: 13pt;">PAKET A: INVESTASI TERPADU &amp; SERAH TERIMA PENUH (ONE-OFF)</h3>
      <span class="badge badge-emerald" style="font-size: 10pt; padding: 3pt 8pt;">Rekomendasi Utama</span>
    </div>
    <p style="margin-top: 6pt; margin-bottom: 8pt; color: #334155;">
      Skema kepemilikan penuh sistem tanpa kewajiban biaya langganan bulanan di masa depan.
    </p>
    <div style="background-color: #ffffff; border: 1pt solid #a7f3d0; padding: 8pt 12pt; border-radius: 4pt; margin-bottom: 8pt;">
      <span style="font-size: 10pt; color: #64748b;">Total Nilai Investasi:</span><br/>
      <span style="font-size: 16pt; font-weight: bold; color: #047857;">Rp 12.500.000,-</span>
      <span style="font-size: 9pt; color: #64748b;">(Dua Belas Juta Lima Ratus Ribu Rupiah)</span>
    </div>
    <p><strong>Deliverable &amp; Hak yang Diterima Lembaga:</strong></p>
    <ul>
      <li>Penyerahan 100% kode sumber (<em>source code</em>) repositori aplikasi <code>madinblokagung-next</code>.</li>
      <li>Konfigurasi dan pemasangan lengkap pada server cloud (Supabase PostgreSQL + Vercel/VPS + Gateway WAHA lokal).</li>
      <li>Dokumen fisik cetak <strong>Buku Panduan Operasional &amp; Administrasi Resmi (SOP) 100+ Halaman</strong>.</li>
      <li>Bimbingan teknis &amp; pelatihan intensif bagi seluruh jajaran pengurus PKM dan Mustahiq (1–2 hari).</li>
      <li>Garansi pendampingan dan perbaikan kendala teknis (<em>bug fix</em>) gratis selama **3 (tiga) bulan pertama**.</li>
    </ul>
  </div>

  <!-- PAKET B -->
  <div class="pricing-card" style="background-color: #eff6ff; border-color: #2563eb;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="color: #1e3a8a; margin: 0; font-size: 13pt;">PAKET B: INVESTASI KEMITRAAN BERKELANJUTAN (SETUP + MAINTENANCE)</h3>
      <span class="badge badge-blue" style="font-size: 10pt; padding: 3pt 8pt;">Sangat Ramah Anggaran</span>
    </div>
    <p style="margin-top: 6pt; margin-bottom: 8pt; color: #334155;">
      Dirancang khusus agar madrasah tidak terbebani biaya besar di awal, disertai pendampingan teknis rutin setiap bulan.
    </p>
    <table style="width: 100%; border: none; font-size: 10pt; margin-bottom: 8pt;">
      <tr>
        <td style="width: 45%; padding: 4pt 0;"><strong>Biaya Implementasi &amp; Pelatihan Awal:</strong></td>
        <td style="font-weight: bold; color: #1e40af; font-size: 13pt;">Rp 5.000.000,- <span style="font-size: 9pt; font-weight: normal; color: #64748b;">(sekali bayar)</span></td>
      </tr>
      <tr>
        <td style="padding: 4pt 0;"><strong>Biaya Pendampingan Rutin (Maintenance):</strong></td>
        <td style="font-weight: bold; color: #1e40af; font-size: 13pt;">Rp 600.000,- <span style="font-size: 9pt; font-weight: normal; color: #64748b;">/ bulan</span></td>
      </tr>
    </table>
    <p><strong>Cakupan Layanan Pendampingan Bulanan:</strong></p>
    <ul>
      <li>Pencadangan rutin pangkalan data (*data backup*) menjelang ujian Nisfu Sanah dan Imtihan Akhirussanah.</li>
      <li>Pemeliharaan koneksi server gateway WhatsApp (WAHA) agar notifikasi rapor wali santri tidak terputus.</li>
      <li>Bantuan administratif transisi pergantian tahun ajaran baru, mutasi kelas, dan penyesuaian kalender libur pondok.</li>
      <li>Dukungan prioritas (Fast Response Support) via WhatsApp jika pengurus mengalami kendala operasional.</li>
    </ul>
  </div>

  <!-- PAKET C -->
  <div class="pricing-card" style="background-color: #fffbeb; border-color: #d97706;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="color: #78350f; margin: 0; font-size: 13pt;">PAKET C: PENGABDIAN KHIDMAH ALMAMATER (INFAQ DEDIKASI)</h3>
      <span class="badge badge-amber" style="font-size: 10pt; padding: 3pt 8pt;">Khidmah Pesantren</span>
    </div>
    <p style="margin-top: 6pt; margin-bottom: 8pt; color: #334155;">
      Didedikasikan atas dasar khidmah santri/alumni kepada masyayikh dan kemajuan almamater Pondok Pesantren Darussalam Blokagung.
    </p>
    <ul>
      <li><strong>Bisyarah / Jasa Software:</strong> Menyesuaikan sepenuhnya dengan kebijakan dan kerelaan Majelis Pimpinan Madrasah (infaq pengabdian).</li>
      <li><strong>Kewajiban Lembaga:</strong> Madrasah hanya perlu memfasilitasi kebutuhan biaya infrastruktur server pihak ketiga (domain resmi madrasah dan komputer operasional sekretariat).</li>
    </ul>
  </div>

  <hr style="border: 0; border-top: 1pt solid #cbd5e1; margin: 18pt 0;"/>

  <!-- BAGIAN 5: ESTIMASI BIAYA INFRASTRUKTUR PIHAK KETIGA -->
  <h1>5. BIAYA INFRASTRUKTUR PIHAK KETIGA (SERVER &amp; DOMAIN)</h1>

  <h2>5.1 Estimasi Biaya Dasar (Baseline Operasional Awal)</h2>
  <p>
    Untuk menjaga independensi dan kepemilikan aset lembaga, seluruh akun infrastruktur didaftarkan langsung atas nama resmi yayasan/pesantren:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Komponen Infrastruktur</th>
        <th style="width: 25%;">Kebutuhan Sistem</th>
        <th style="width: 25%;">Estimasi Biaya</th>
        <th style="width: 25%;">Keterangan &amp; Solusi Hemat</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Domain Resmi Madrasah</strong></td>
        <td><code>madinblokagung.com</code> atau <code>madina.sch.id</code></td>
        <td>Rp 150.000 – Rp 250.000 / tahun</td>
        <td>Identitas resmi lembaga di peramban internet.</td>
      </tr>
      <tr>
        <td><strong>Hosting Aplikasi (Next.js)</strong></td>
        <td>Vercel Cloud Platform</td>
        <td><strong>Rp 0,- (Gratis)</strong></td>
        <td>Memanfaatkan paket gratis Vercel yang sudah sangat mumpuni melayani ribuan kunjungan harian.</td>
      </tr>
      <tr>
        <td><strong>Database &amp; Storage</strong></td>
        <td>Supabase Managed Cloud</td>
        <td><strong>Rp 0,- (Gratis)</strong> s.d. $25/bln</td>
        <td>Kapasitas gratis 500 MB cukup menampung skala awal/pilot project.</td>
      </tr>
      <tr>
        <td><strong>Server Gateway WhatsApp</strong></td>
        <td>Komputer/Laptop Kantor Sekretariat</td>
        <td><strong>Rp 0,- (Aset yang Ada)</strong></td>
        <td>Memanfaatkan PC piket kantor yang menyala saat KBM untuk menjalankan bot WhatsApp Baileys lokal.</td>
      </tr>
    </tbody>
  </table>

  <h2>5.2 Skenario Skala Penuh (7.000 Santri, Dewan Asatidz Aktif, &amp; Ketuntasan Hafalan Masif)</h2>
  <p>
    Ketika sistem dioperasikan secara penuh pada skala riil pesantren besar dengan parameter:
  </p>
  <ul>
    <li><strong>Data Dewan Asatidz:</strong> ~150 s.d. 200 dewan asatidz aktif mengajar.</li>
    <li><strong>Data Santri:</strong> Bertambah hingga <strong>7.000 santri aktif</strong> (lengkap dengan 37 atribut data biodata + pasfoto profil webcam rasio 3x4).</li>
    <li><strong>Absensi Mengajar Asatidz (1 Tahun Ajaran Penuh):</strong> 150–200 asatidz &times; ~15 jam mengajar/minggu &times; 38 minggu efektif KBM = <strong>~85.000 s.d. 114.000 baris riwayat presensi</strong> pada tabel <code>riwayat_absensi</code>.</li>
    <li><strong>Setoran Hafalan Santri (Tingkat Ketuntasan Masif):</strong>
      <ul>
        <li><em>90% Santri Hafalan Wajib Tuntas:</em> 6.300 santri &times; 15 kali setor berkala = <strong>~94.500 transaksi</strong>.</li>
        <li><em>70% Santri Hafalan Sunnah Tuntas:</em> 4.900 santri &times; 8 kali setor berkala = <strong>~39.200 transaksi</strong>.</li>
        <li><em>30% Santri Hafalan Kitab Tuntas:</em> 2.100 santri &times; 12 kali setor nadzom = <strong>~25.200 transaksi</strong>.</li>
        <li><em>15% Santri Hafalan Tahfidz Tuntas:</em> 1.050 santri &times; 20 kali setor juz = <strong>~21.000 transaksi</strong>.</li>
        <li><strong>Total Transaksi Setoran per Tahun: ~179.900 baris data setoran hafalan!</strong></li>
      </ul>
    </li>
  </ul>

  <h2>5.3 Analisis Dampak Teknis &amp; Titik Batas Kapasitas (Capacity Thresholds)</h2>
  
  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">1. Pangkalan Data PostgreSQL (Supabase Cloud)</h3>
    <p>
      • <strong>Kalkulasi Volume Data:</strong> Master Santri (7.000 baris &times; 37 kolom: ~20 MB) + Pasfoto Profil (7.000 &times; ~100 KB: ~700 MB storage file) + Log Absensi 1 Tahun (~100.000 baris: ~45 MB) + Transaksi Setoran 1 Tahun (~180.000 baris: ~85 MB) + Relasi Jadwal, Sapras, Konsorsium, &amp; Audit Logs (~60 MB) + Indeks B-Tree (~120 MB).<br/>
      • <strong>Total Ukuran Database Tahun Pertama:</strong> <strong>~650 MB s.d. 950 MB</strong> (bertambah ~300 MB s.d. 350 MB per tahun ajaran berikutnya).<br/>
      • <strong>Batas Free Tier Supabase:</strong> Paket gratis Supabase dibatasi maksimal <strong>500 MB database</strong>. Pada skenario 7.000 santri ini, kuota 500 MB <strong>PASTI terlampaui</strong> pada pertengahan tahun ajaran (semester genap).<br/>
      • <strong>Rekomendasi Wajib Upgrade:</strong> Madrasah <strong>wajib mengalokasikan anggaran untuk Supabase Pro Tier ($25/bulan atau ~Rp 400.000/bulan)</strong>.<br/>
      • <strong>Keuntungan Supabase Pro bagi Madrasah:</strong> Kapasitas database melonjak menjadi <strong>8 GB</strong>, media storage <strong>100 GB</strong>, bandwidth egress <strong>250 GB/bulan</strong>, <strong>500 Concurrent Realtime Connections</strong> (bebas macet saat ratusan pengurus/mustahiq input serentak), dan <strong>Daily Automated Backup (Retensi 7 Hari)</strong> standar AWS.
    </p>
  </div>

  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">2. Hosting Aplikasi Web (Vercel Platform)</h3>
    <p>
      Akses harian dari 150 asatidz, puluhan petugas piket, dan ribuan wali santri menghasilkan transfer data sekitar 25 GB – 45 GB per bulan. Madrasah <strong>tetap dapat menggunakan Vercel Free Tier (Rp 0,- / Gratis)</strong> karena batas kuota gratis Vercel menyediakan 100 GB bandwidth bulanan. File pasfoto santri yang berat dialirkan langsung melalui CDN Supabase Storage.
    </p>
  </div>

  <div class="highlight-card">
    <h3 style="color: #064e3b; margin-top: 0;">3. Server Gateway WhatsApp (WAHA / Baileys) untuk 7.000 Santri</h3>
    <p>
      Mengirimkan siaran rapor hafalan berkala ke 7.000 nomor WhatsApp wali santri dengan jeda anti-ban 5 detik per nomor diselesaikan bertahap dalam <strong>~9,7 jam</strong> (dijalankan bergelombang per rombel kelas).<br/>
      • <strong>Opsi A (Komputer Kantor Sekretariat - Rp 0,-):</strong> Memanfaatkan 1 unit PC kantor (minimal prosesor Core i3 / RAM 8 GB dengan UPS penstabil daya) untuk menjalankan skrip <code>start-waha-gateway.bat</code>.<br/>
      • <strong>Opsi B (Cloud VPS Linux Lokal - Rp 100.000 – Rp 150.000/bulan):</strong> <em>Sangat direkomendasikan</em> untuk skala 7.000 santri agar bot WhatsApp madrasah aktif 24 jam nonstop di cloud tanpa risiko mati saat kantor pesantren mati lampu.
    </p>
  </div>

  <h2>5.4 Analisis Kelebihan &amp; Kekurangan Penggunaan Supabase Pro Tier</h2>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 50%;">Kelebihan Menggunakan Supabase Pro Tier</th>
        <th style="width: 50%;">Tantangan &amp; Kekurangan yang Perlu Diantisipasi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>1. Sistem Tidak Pernah Tertidur (No Inactivity Pausing):</strong><br/>
          Pada paket gratis, jika tidak ada aktivitas selama 7 hari (misal saat libur Ramadhan), database otomatis tertidur. Pada Pro Tier, sistem aktif 24/7/365 dengan SLA ketersediaan 99.9%.<br/><br/>
          <strong>2. Kapasitas Database Longgar (8 GB Included):</strong><br/>
          Meningkat 16 kali lipat dari paket gratis (500 MB), memberikan ruang gerak sangat leluasa untuk puluhan tahun data santri.<br/><br/>
          <strong>3. Cloud File Storage Melimpah (100 GB Included):</strong><br/>
          Menampung hingga 1.000.000 pasfoto santri dan arsip digital piagam syahadah tanpa khawatir kehabisan ruang.<br/><br/>
          <strong>4. Skalabilitas Realtime (500 Koneksi Serentak):</strong><br/>
          Mencegah kegagalan koneksi ketika seluruh Mustahiq dan petugas piket menginput absensi dan lalaran secara bersamaan di malam Ahad.<br/><br/>
          <strong>5. Cadangan Otomatis Harian (Daily Backup Retensi 7 Hari):</strong><br/>
          Perlindungan data mutlak berstandar cloud enterprise. Jika terjadi kesalahan fatal manusia, database dapat dipulihkan ke hari sebelumnya dengan 1 klik.<br/><br/>
          <strong>6. Fitur Disk Auto-Scaling:</strong><br/>
          Jika kapasitas 8 GB terlampaui di masa depan, Supabase otomatis memperluas disk tanpa memutus layanan, dengan tarif sangat murah (~Rp 2.000/GB/bulan).
        </td>
        <td>
          <strong>1. Biaya Berlangganan Tetap (Fixed Operational Cost):</strong><br/>
          Madrasah perlu mengalokasikan anggaran rutin sebesar <strong>$25 USD / bulan (sekitar Rp 400.000 / bulan atau Rp 4.800.000 / tahun)</strong> dari kas operasional.<br/><br/>
          <strong>2. Metode Pembayaran Valuta Asing (USD):</strong><br/>
          Tagihan diproses dalam kurs Dollar AS melalui kartu debit/kredit internasional (Visa/Mastercard, seperti BCA Mastercard, Mandiri Visa, Jenius BTPN, atau Bank Jago). Bendahara perlu menyiapkan kartu debit berizin transaksi online luar negeri.<br/><br/>
          <strong>3. Sensitivitas Terhadap Fluktuasi Kurs:</strong><br/>
          Nominal konversi rupiah dapat sedikit berfluktuasi mengikuti nilai tukar USD terhadap IDR di pasar valuta asing.
        </td>
      </tr>
    </tbody>
  </table>

  <h2>5.5 Kalkulasi Matematis Proyeksi Masa Simpan Data (Daya Tampung per Tahun Angkatan)</h2>
  
  <p>
    Berdasarkan arsitektur data pangkalan data MADINA Blokagung, berikut adalah rincian kalkulasi matematis daya tampung pangkalan data dan penyimpanan berkas saat menggunakan Supabase Pro Tier:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Tabel Data Pangkalan Data</th>
        <th style="width: 25%;">Volume Transaksi / Tahun</th>
        <th style="width: 25%;">Ukuran Rata-rata per Baris</th>
        <th style="width: 25%;">Akumulasi Data Tahunan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Data Santri Baru &amp; Mutasi</strong></td>
        <td>~2.500 santri baru masuk / tahun</td>
        <td>~2 KB / santri (37 kolom atribut)</td>
        <td><strong>~5 MB / tahun</strong></td>
      </tr>
      <tr>
        <td><strong>Log Absensi Asatidz (1 Tahun)</strong></td>
        <td>~100.000 baris log KBM</td>
        <td>~350 byte / baris sesi</td>
        <td><strong>~35 MB / tahun</strong></td>
      </tr>
      <tr>
        <td><strong>Transaksi Setoran Hafalan</strong></td>
        <td>~180.000 transaksi setoran</td>
        <td>~300 byte / transaksi</td>
        <td><strong>~54 MB / tahun</strong></td>
      </tr>
      <tr>
        <td><strong>Sapras, Konsorsium, &amp; Catatan</strong></td>
        <td>~20.000 entri berkala</td>
        <td>~500 byte / entri</td>
        <td><strong>~10 MB / tahun</strong></td>
      </tr>
      <tr>
        <td><strong>Jejak Audit Log Pengurus</strong></td>
        <td>~50.000 aktivitas</td>
        <td>~400 byte / entri log</td>
        <td><strong>~20 MB / tahun</strong></td>
      </tr>
      <tr>
        <td><strong>Indeks Cepat Database (B-Tree)</strong></td>
        <td>Indeks pencarian multi-kolom</td>
        <td>Struktur indeks otomatis</td>
        <td><strong>~100 MB / tahun</strong></td>
      </tr>
      <tr>
        <td><strong>PostgreSQL WAL &amp; Overhead</strong></td>
        <td>System catalogs &amp; buffer</td>
        <td>Cadangan sistem internal</td>
        <td><strong>~76 MB / tahun</strong></td>
      </tr>
      <tr style="background-color: #f0fdf4; font-weight: bold;">
        <td>TOTAL PERTUMBUHAN DATAAN</td>
        <td>~350.000 Transaksi / Tahun</td>
        <td>—</td>
        <td style="color: #047857;">~300 MB / Tahun Ajaran</td>
      </tr>
    </tbody>
  </table>

  <div class="pricing-card" style="background-color: #f8fafc; border: 1.5pt solid #0f766e; padding: 12pt 16pt;">
    <h3 style="color: #0f766e; margin-top: 0; font-size: 12pt;">1. Kalkulasi Daya Tampung Pangkalan Data (8 GB Database Limit):</h3>
    <ul style="margin-bottom: 6pt;">
      <li>Kapasitas Database Termasuk: <strong>8 GB = 8.192 MB</strong></li>
      <li>Beban Master Data Awal (Tahun ke-1): 7.000 Santri + 200 Asatidz + Formasi Awal = <strong>~600 MB</strong></li>
      <li>Sisa Kuota Bersih untuk Arsip Transaksi: <strong>8.192 MB &minus; 600 MB = 7.592 MB</strong></li>
      <li>Laju Pertumbuhan Data Transaksi Tahunan: <strong>~300 MB / tahun ajaran</strong></li>
    </ul>
    <div style="background-color: #f0fdf4; border: 1pt solid #059669; padding: 8pt 12pt; border-radius: 4pt; font-size: 11pt; color: #064e3b;">
      <strong>Proyeksi Daya Tampung Pangkalan Data:</strong><br/>
      <span style="font-size: 14pt; font-weight: bold; color: #047857;">
        7.592 MB &divide; 300 MB/tahun &approx; 25,3 TAHUN AJARAN SANTRI!
      </span><br/>
      <em>Artinya, kuota 8 GB pada Supabase Pro Tier mampu menampung seluruh catatan absensi, nilai, dan setoran hafalan madrasah hingga <strong>20 sampai 25 tahun angkatan</strong> tanpa perlu menambah biaya storage pangkalan data.</em>
    </div>
  </div>

  <div class="pricing-card" style="background-color: #f8fafc; border: 1.5pt solid #2563eb; padding: 12pt 16pt; margin-top: 10pt;">
    <h3 style="color: #1e40af; margin-top: 0; font-size: 12pt;">2. Kalkulasi Daya Tampung Media Pasfoto Santri (100 GB Cloud Storage):</h3>
    <ul style="margin-bottom: 6pt;">
      <li>Kapasitas Media Storage Termasuk: <strong>100 GB = 102.400 MB</strong></li>
      <li>Rata-rata Ukuran Pasfoto Terkompresi: <strong>~100 KB</strong> per santri</li>
      <li>Beban Pasfoto Awal (7.000 Santri): 7.000 &times; 100 KB = <strong>700 MB (0,7 GB)</strong></li>
      <li>Pertambahan Pasfoto Santri Baru per Tahun: ~2.500 santri &times; 100 KB = <strong>250 MB / tahun (0,25 GB / tahun)</strong></li>
    </ul>
    <div style="background-color: #eff6ff; border: 1pt solid #3b82f6; padding: 8pt 12pt; border-radius: 4pt; font-size: 11pt; color: #1e3a8a;">
      <strong>Proyeksi Daya Tampung Pasfoto Profil:</strong><br/>
      <span style="font-size: 14pt; font-weight: bold; color: #1d4ed8;">
        (100 GB &minus; 0,7 GB) &divide; 0,25 GB/tahun &approx; 397 TAHUN ANGKATAN!
      </span><br/>
      <em>Kuota 100 GB penyimpanan berkas praktis mencukupi untuk menyimpan pasfoto ratusan generasi santri Pondok Pesantren Darussalam Blokagung.</em>
    </div>
  </div>

  <h2>5.6 Rangkuman Anggaran Maintenance Infrastruktur Tahunan (Skenario 7.000 Santri)</h2>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Komponen Infrastruktur</th>
        <th style="width: 25%;">Spesifikasi Layanan</th>
        <th style="width: 25%;">Skema Pembayaran</th>
        <th style="width: 25%;">Estimasi Biaya Tahunan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Domain Resmi Madrasah</strong></td>
        <td>Domain <code>.sch.id</code> / <code>.com</code></td>
        <td>Tahunan</td>
        <td>Rp 150.000 – Rp 250.000 / tahun</td>
      </tr>
      <tr>
        <td><strong>Hosting Aplikasi (Next.js)</strong></td>
        <td>Vercel Platform (Hobby Tier)</td>
        <td>Bulanan</td>
        <td><strong>Rp 0,- (Gratis)</strong></td>
      </tr>
      <tr>
        <td><strong>Database &amp; Auth (PostgreSQL)</strong></td>
        <td>Supabase Pro Tier ($25/bln)</td>
        <td>Bulanan (~Rp 400.000/bln)</td>
        <td>Rp 4.800.000 / tahun</td>
      </tr>
      <tr>
        <td><strong>Server Gateway WhatsApp</strong></td>
        <td>PC Kantor Madrasah <em>(Opsi A)</em><br/>Cloud VPS Linux <em>(Opsi B)</em></td>
        <td>Aset Kantor<br/>Bulanan (~Rp 100.000/bln)</td>
        <td><strong>Rp 0,-</strong> <em>(Opsi A)</em><br/>Rp 1.200.000 / tahun <em>(Opsi B)</em></td>
      </tr>
      <tr>
        <td><strong>Cadangan SSL &amp; Bandwidth</strong></td>
        <td>Let's Encrypt / Vercel Edge CDN</td>
        <td>Otomatis</td>
        <td><strong>Rp 0,- (Gratis)</strong></td>
      </tr>
      <tr style="background-color: #f0fdf4; font-weight: bold;">
        <td colspan="3">TOTAL BIAYA INFRASTRUKTUR (OPSI A - PC KANTOR)</td>
        <td style="color: #047857; font-size: 11pt;">Rp 4.950.000 – Rp 5.050.000 / tahun<br/><span style="font-size: 8.5pt; font-weight: normal; color: #475569;">(~Rp 415.000 / bulan)</span></td>
      </tr>
      <tr style="background-color: #eff6ff; font-weight: bold;">
        <td colspan="3">TOTAL BIAYA INFRASTRUKTUR (OPSI B - CLOUD VPS NONSTOP)</td>
        <td style="color: #1e40af; font-size: 11pt;">Rp 6.150.000 – Rp 6.250.000 / tahun<br/><span style="font-size: 8.5pt; font-weight: normal; color: #475569;">(~Rp 515.000 / bulan)</span></td>
      </tr>
    </tbody>
  </table>

  <div class="pricing-card" style="background-color: #f0fdf4; border: 1.5pt solid #059669; padding: 10pt 14pt;">
    <strong>💡 Analisis Efisiensi Biaya per Santri (Rasio Anggaran Sangat Hemat):</strong><br/>
    Dengan total biaya infrastruktur sekitar <strong>Rp 5.000.000 / tahun</strong> untuk melayani <strong>7.000 santri</strong>, maka beban biaya server per santri hanya:
    <div style="font-size: 13pt; font-weight: bold; color: #047857; margin: 4pt 0;">
      Rp 5.000.000 &divide; 7.000 santri &approx; Rp 714,- per santri per tahun!
    </div>
    Angka ini jauh lebih murah dibandingkan biaya pengadaan 1 lembar kartu ujian atau 1 buku presensi fisik, namun menghadirkan keandalan teknologi cloud kelas dunia bagi tata kelola madrasah.
  </div>

  <hr style="border: 0; border-top: 1pt solid #cbd5e1; margin: 18pt 0;"/>

  <!-- BAGIAN 6: TAHAPAN IMPLEMENTASI & JADWAL KERJA -->
  <h1>6. TAHAPAN IMPLEMENTASI &amp; JADWAL KERJA</h1>

  <p>
    Karena sistem telah selesai dibangun hingga tahap produksi, proses implementasi di lapangan dapat segera dilaksanakan dalam kurun waktu yang sangat singkat:
  </p>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%;">Tahapan</th>
        <th style="width: 25%;">Kegiatan Utama</th>
        <th style="width: 35%;">Hasil / Output</th>
        <th style="width: 25%;">Jadwal Pelaksanaan</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Tahap 1</strong></td>
        <td>Penyelarasan Server &amp; Domain</td>
        <td>Aplikasi aktif di domain resmi pesantren</td>
        <td>Hari ke-1 s.d. ke-2</td>
      </tr>
      <tr>
        <td><strong>Tahap 2</strong></td>
        <td>Migrasi Data Santri &amp; Asatidz</td>
        <td>Pangkalan data awal terisi lengkap via Import Excel</td>
        <td>Hari ke-3 s.d. ke-4</td>
      </tr>
      <tr>
        <td><strong>Tahap 3</strong></td>
        <td>Pelatihan &amp; Sosialisasi Pengurus</td>
        <td>Staf PKM dan Mustahiq mahir mengoperasikan sistem</td>
        <td>Hari ke-5 s.d. ke-6</td>
      </tr>
      <tr>
        <td><strong>Tahap 4</strong></td>
        <td>Serah Terima Buku Panduan Resmi</td>
        <td>Penyerahan buku SOP fisik dan masa pendampingan</td>
        <td>Hari ke-7 (Go-Live)</td>
      </tr>
    </tbody>
  </table>

  <hr style="border: 0; border-top: 1pt solid #cbd5e1; margin: 18pt 0;"/>

  <!-- BAGIAN 7: PENUTUP & LEMBAR PERSETUJUAN -->
  <h1>7. PENUTUP &amp; LEMBAR PENGESAHAN</h1>

  <p>
    Demikian proposal spesifikasi sistem dan penawaran investasi ini kami sampaikan dengan penuh tanggung jawab. Kami meyakini bahwa kehadiran Sistem Informasi Terpadu MADINA Blokagung ini akan menjadi tonggak sejarah kemajuan tata kelola pendidikan Islam salafiyah di Pondok Pesantren Darussalam Blokagung, memadukan keluhuran nilai turots ulama dengan efisiensi teknologi modern.
  </p>
  <p>
    Atas perhatian, arahan, dan kepercayaan yang diberikan oleh Majelis Pimpinan Madrasah, kami menghaturkan ucapan terima kasih yang sebesar-besarnya. Jazakumullahu Khoiron Katsiron.
  </p>

  <table style="width: 100%; margin-top: 35pt; border-collapse: collapse; font-size: 10.5pt;">
    <tr>
      <td style="width: 45%; text-align: center;">
        Menyetujui &amp; Mengesahkan,<br/>
        <strong>Majelis Pimpinan MADINA Blokagung</strong><br/><br/><br/><br/><br/>
        ( .............................................................. )<br/>
        NIP / Jabatan:
      </td>
      <td style="width: 10%;"></td>
      <td style="width: 45%; text-align: center;">
        Blokagung, ............................... 2026<br/>
        Diajukan Oleh,<br/>
        <strong>Tim Pengembang Sistem MADINA</strong><br/><br/><br/><br/><br/>
        ( .............................................................. )<br/>
        Koordinator Rekayasa Sistem
      </td>
    </tr>
  </table>

</body>
</html>
`;

// Tulis ke file .doc
fs.writeFileSync(targetFileDoc, docHtml.trim(), 'utf-8');
const statsDoc = fs.statSync(targetFileDoc);

console.log('================================================================');
console.log('✅ DOKUMEN PROPOSAL & SPESIFIKASI SISTEM KLIEN (.doc) BERHASIL DIBUAT!');
console.log(`📁 Lokasi Dokumen: ${targetFileDoc}`);
console.log(`📊 Ukuran File   : ${(statsDoc.size / 1024).toFixed(2)} KB (${statsDoc.size} bytes)`);
console.log('================================================================');
