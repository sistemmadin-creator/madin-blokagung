import { renderCallout } from './styles.mjs';

export function getPendahuluanHtml() {
  return `
  <!-- HALAMAN SAMPUL -->
  <div class="cover-section" style="text-align: center; padding-top: 50pt;">
    <div style="font-size: 14pt; letter-spacing: 2pt; font-weight: bold; color: #047857; text-transform: uppercase;">
      DOKUMEN PANDUAN RESMI SISTEM INFORMASI TERPADU
    </div>
    
    <div class="cover-title">
      BUKU PANDUAN PENGGUNA &amp; ADMINISTRATOR<br/>
      SISTEM INFORMASI MADINA BLOKAGUNG
    </div>

    <div class="cover-subtitle">
      Panduan Operasional Terpadu PKM. Kurikulum, PKM. Muhafadzoh, PKM. Kesiswaan,<br/>
      PKM. Sarana Prasarana, dan Manajemen Portal Warta Berita Publik Pesantren
    </div>

    <div style="margin: 30pt auto; width: 120pt; height: 3pt; background-color: #059669;"></div>

    <table class="cover-meta-table">
      <tr>
        <td style="width: 35%; font-weight: bold; color: #475569;">Lembaga / Institusi</td>
        <td style="width: 5%;">:</td>
        <td style="font-weight: bold; color: #064e3b;">Madrasah Diniyyah Al Amiriyyah (MADINA)</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Pesantren Induk</td>
        <td>:</td>
        <td>Pondok Pesantren Darussalam Blokagung, Banyuwangi</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Versi Aplikasi</td>
        <td>:</td>
        <td>Rilis 2.4 (Next.js 14 App Router &amp; Supabase Engine)</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Tahun Ajaran Aktif</td>
        <td>:</td>
        <td>1447–1448 H / 2026–2027 M</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Penyusun Dokumen</td>
        <td>:</td>
        <td>Tim Pengembang Sistem &amp; Dewan Redaksi IT MADINA</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Tanggal Rilis</td>
        <td>:</td>
        <td>November 2026</td>
      </tr>
      <tr>
        <td style="font-weight: bold; color: #475569;">Klasifikasi Dokumen</td>
        <td>:</td>
        <td>Panduan Operasional Resmi (Official Standard Operating Procedure)</td>
      </tr>
    </table>

    <div style="margin-top: 60pt; font-size: 10pt; color: #64748b;">
      Dilarang mereproduksi atau mendistribusikan salinan dokumen ini di luar peruntukan resmi operasional<br/>
      Madrasah Diniyyah Al Amiriyyah Pondok Pesantren Darussalam Blokagung.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- KATA PENGANTAR -->
  <div style="padding-top: 10pt;">
    <h1>KATA PENGANTAR</h1>
    <p style="font-style: italic; color: #047857; font-weight: bold;">
      Bismillahirrohmanirrohim. Alhamdulillahi Robbil 'Alamin, wash-sholatu was-salamu 'ala Asyrofil Anbiya'i wal Mursalin, Sayyidina Muhammadin wa 'ala alihi wa shohbihi ajma'in.
    </p>
    <p>
      Segala puji dan syukur kami haturkan ke hadirat Allah Subhanahu wa Ta'ala atas limpahan taufiq, hidayah, serta pertolongan-Nya, sehingga penyusunan <strong>Buku Panduan Pengguna &amp; Administrator Sistem Informasi MADINA Blokagung</strong> ini dapat diselesaikan dengan sempurna. Shalawat serta salam senantiasa tercurah kepada Baginda Nabi Agung Muhammad Shallallahu 'Alaihi wa Sallam, keluarga, sahabat, dan para penerus dakwah beliau.
    </p>
    <p>
      Madrasah Diniyyah Al Amiriyyah (MADINA) Pondok Pesantren Darussalam Blokagung Banyuwangi merupakan salah satu institusi pendidikan diniyyah salafiyah terbesar yang membina ribuan santriawan dan santriwati pada berbagai jenjang: Tingkat Ula, Tingkat Wustho, Tingkat Ulya, hingga Kelas Unggulan dan Program Pendampingan Khusus (Ihfad). Seiring bertambahnya populasi santri, ragam fan kitab kajian, intensitas setoran muhafadzoh, serta mobilitas dewan asatidz yang mengampu di puluhan blok kelas terpisah (Putra dan Putri), digitalisasi tata kelola administrasi menjadi kebutuhan mutlak yang mendesak.
    </p>
    <p>
      Sistem Informasi MADINA Blokagung hadir sebagai solusi komprehensif berbasis teknologi web mutakhir (<em>Next.js 14, Zustand State Architecture, Supabase PostgreSQL Real-time, serta IndexedDB Offline-First Caching</em>). Platform ini dirancang khusus guna merefleksikan seluruh tradisi, terminologi, dan pola kerja autentik di pesantren salafiyah, seperti pembagian rombel (Kls &amp; Bag), penetapan Mustahiq/Wali Kelas, matriks jam mengajar Diniyyah dan Takror, setoran nadzom/lalaran mingguan hari Ahad, absensi mengajar 4 jam pelajaran, konsorsium fan kitab, inventarisasi sapras per lokal, hingga pelaporan otomatis nilai hafalan via WhatsApp kepada para wali santri.
    </p>
    <p>
      Buku panduan ini disusun secara sistematis, terperinci, dan tidak diringkas. Setiap bab mengulas alur kerja nyata, arti label tombol antarmuka, pemfilteran data, pintasan klik kanan, penanganan kendala teknis (<em>troubleshooting</em>), hingga matriks Hak Akses Pengguna (RBAC). Diharapkan buku ini menjadi pegangan wajib bagi Pengurus Harian, Bagian Kurikulum, Bagian Muhafadzoh, Bagian Kesiswaan, Bagian Sapras, Dewan Asatidz, Mustahiq Rombel, maupun Tim Administrator IT MADINA Blokagung.
    </p>
    <p>
      Kami menyampaikan apresiasi dan penghormatan setinggi-tingginya kepada segenap Pengasuh Pondok Pesantren Darussalam Blokagung, Majelis Pimpinan MADINA, serta seluruh pihak yang telah mencurahkan tenaga, doa, dan dedikasi demi terwujudnya sistem ini. Semoga dedikasi ini dinilai sebagai amal jariyah yang mengalirkan keberkahan abadi. Amin ya Rabbal 'Alamin.
    </p>
    
    <table style="width: 100%; margin-top: 30pt; border-collapse: collapse;">
      <tr>
        <td style="width: 50%;"></td>
        <td style="width: 50%; text-align: center;">
          Blokagung, Banyuwangi, November 2026<br/>
          <strong>Pimpinan &amp; Tim IT MADINA Blokagung</strong><br/><br/><br/><br/>
          ( <u>Majelis Pimpinan MADINA</u> )
        </td>
      </tr>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- DAFTAR ISI -->
  <div>
    <h1>DAFTAR ISI LENGKAP</h1>
    <div style="border-bottom: 1.5pt solid #047857; margin-bottom: 12pt;"></div>

    <div class="toc-item"><span class="toc-title">KATA PENGANTAR</span></div>
    <div class="toc-item"><span class="toc-title">DAFTAR ISI LENGKAP</span></div>
    
    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 1: PENGENALAN EKOSISTEM &amp; FITUR GLOBAL APLIKASI</span></div>
    <div class="toc-item toc-sub">1.1 Gambaran Umum Sistem &amp; Arsitektur Hybrid Real-time/Offline-First</div>
    <div class="toc-item toc-sub">1.2 Portal Publik &amp; Warta Berita (Landing Page, Feed Berita, dan Sticky TikTok Widget)</div>
    <div class="toc-item toc-sub">1.3 Autentikasi &amp; Keamanan Sesi Pengurus (Login, Persistent Session, Proteksi Route)</div>
    <div class="toc-item toc-sub">1.4 Anatomi Antarmuka Ruang Kerja (Desktop Sidebar, Navbar, Mobile BottomNav)</div>
    <div class="toc-item toc-sub">1.5 Fitur Utilitas Global (Realtime Sync, Engine Undo/Redo, Offline Sync, SundayDatePicker, Filter TA)</div>

    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 2: BERANDA ANALITIK, DATA MASTER &amp; RUANG KERJA UMUM</span></div>
    <div class="toc-item toc-sub">2.1 Beranda Analitik &amp; KPI Utama (/dashboard)</div>
    <div class="toc-item toc-sub">2.2 Manajemen Data Santri (/santri) - Biodata, Ambil Foto Kamera, Import/Export Excel</div>
    <div class="toc-item toc-sub">2.3 Manajemen Data Dewan Asatidz (/asatidz) - Direktori &amp; Import Excel</div>
    <div class="toc-item toc-sub">2.4 Workspace Catatan &amp; To-Do List Pengurus (/catatan)</div>

    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 3: PANDUAN OPERASIONAL PKM. KURIKULUM</span></div>
    <div class="toc-item toc-sub">3.1 Formasi Kelas &amp; Kapasitas Ruang (/formasi, /formasi/pa, /formasi/pi)</div>
    <div class="toc-item toc-sub">3.2 Manajemen Fan Mata Pelajaran &amp; Pemetaan Pengajar (/fan/pelajaran, /fan/pengajar)</div>
    <div class="toc-item toc-sub">3.3 Direktori Pendidik &amp; Mustahiq Kelas (/daftar-pendidik)</div>
    <div class="toc-item toc-sub">3.4 Pengaturan Hari &amp; Slot Jam KBM (/hari-kbm)</div>
    <div class="toc-item toc-sub">3.5 Matriks Jadwal KBM (/jadwal-kbm) - Context Menu, Clipboard Bar, dan AutoScheduleSolver</div>
    <div class="toc-item toc-sub">3.6 Kalender Akademik Terpadu Masehi &amp; Hijriyah (/kalender-kegiatan)</div>

    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 4: PANDUAN OPERASIONAL PKM. MUHAFADZOH</span></div>
    <div class="toc-item toc-sub">4.1 Setoran Muhafadzoh Kantor (/setoran)</div>
    <div class="toc-item toc-sub">4.2 Setoran Mingguan Kelas Mustahiq (/setor-mustahiq &amp; /setor-mustahiq/rekap)</div>
    <div class="toc-item toc-sub">4.3 Setor Cepat Massal (/setor-cepat)</div>
    <div class="toc-item toc-sub">4.4 Linimasa Setor Bulanan (/linimasa-setor)</div>
    <div class="toc-item toc-sub">4.5 Rekapitulasi Ketuntasan Hafalan Santri (/rekap-hafalan)</div>
    <div class="toc-item toc-sub">4.6 Desain &amp; Cetak Piagam / Syahadah (/piagam)</div>
    <div class="toc-item toc-sub">4.7 Checklist Serah Terima Piagam (/serah-piagam) [Fitur Terbaru]</div>
    <div class="toc-item toc-sub">4.8 Broadcast WhatsApp Rapor Digital Hafalan (/kirim-wa)</div>

    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 5: PANDUAN OPERASIONAL PKM. KESISWAAN</span></div>
    <div class="toc-item toc-sub">5.1 Presensi Mengajar Harian Dewan Asatidz (/absensi)</div>
    <div class="toc-item toc-sub">5.2 Portal Presensi Cepat per Blok (/absen-cepat) &amp; Persistent Device Session</div>
    <div class="toc-item toc-sub">5.3 Presensi Musyawarah &amp; Konsorsium (/absen-konsorsium)</div>
    <div class="toc-item toc-sub">5.4 Rekapitulasi Kehadiran &amp; Generator Laporan WhatsApp (/rekap-absensi)</div>

    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 6: PANDUAN OPERASIONAL PKM. SARANA PRASARANA &amp; PUBLIKASI</span></div>
    <div class="toc-item toc-sub">6.1 Manajemen Sarana &amp; Prasarana (Inventaris, Perbaikan, Logistik, Rekap Audit)</div>
    <div class="toc-item toc-sub">6.2 CMS Manajemen Warta Berita MADINA (/kelola-berita) - Editor Sisip Foto &amp; Video TikTok</div>

    <div class="toc-item" style="margin-top: 8pt;"><span class="toc-title">BAB 7: PENGATURAN SISTEM, HAK AKSES (RBAC) &amp; PANDUAN PEMECAHAN MASALAH</span></div>
    <div class="toc-item toc-sub">7.1 Manajemen Hak Akses Pengguna Berbasis Peran (RBAC Matrix &amp; Otoritas Khusus)</div>
    <div class="toc-item toc-sub">7.2 Kustomisasi Navigasi Sidebar, Hierarki Kamar, dan Saklar Keamanan</div>
    <div class="toc-item toc-sub">7.3 Prosedur Operasional Standar (SOP) Transisi Pergantian Tahun Ajaran Baru</div>
    <div class="toc-item toc-sub">7.4 Tanya Jawab (FAQ) &amp; Panduan Pemecahan Masalah (Troubleshooting)</div>
  </div>
  `;
}
