import { renderCallout, renderBadge } from './styles.mjs';

export function getBab2Html() {
  return `
  <div class="page-break"></div>
  <h1>BAB 2: BERANDA ANALITIK, DATA MASTER &amp; RUANG KERJA UMUM</h1>

  <h2>2.1 Beranda Analitik &amp; KPI Utama (<code>/dashboard</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Halaman Beranda Analitik (<code>/dashboard</code>) adalah pusat komando dan kendali visual terpadu bagi pimpinan madrasah, kepala PKM, dan pengurus harian. Halaman ini mengonsolidasikan data dari seluruh departemen secara waktu nyata ke dalam widget KPI, grafik tren kehadiran, visualisasi matriks jam belajar harian, serta papan peringkat (<em>leaderboard</em>) capaian hafalan.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('Semua Pengurus Terdaftar', 'emerald')} Dapat diakses oleh seluruh pengguna yang memiliki akun resmi aktif (Master Admin, Pengurus PKM, Mustahiq, maupun Petugas Piket). Tampilan data dan agregasi angka disesuaikan secara dinamis dengan cakupan wilayah gender (PA/PI) atau blok asrama yang diberikan kepada akun tersebut.
  </p>

  <h3>(c) Anatomi Widget &amp; Cara Membaca Data</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Nama Widget</th>
        <th style="width: 35%;">Sumber Data &amp; Komponen</th>
        <th style="width: 40%;">Arti Indikator &amp; Cara Analisis</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Kartu KPI Utama (<code>KpiCardGrid</code>)</strong></td>
        <td>Agregasi tabel <code>santri</code>, <code>asatidz</code>, <code>riwayat_absensi</code>, dan <code>setoran_hafalan</code></td>
        <td>
          • <strong>Total Santri Aktif:</strong> Jumlah santri terdaftar pada TA aktif (terpisah PA &amp; PI).<br/>
          • <strong>Dewan Asatidz:</strong> Jumlah guru aktif mengajar.<br/>
          • <strong>Kehadiran KBM Hari Ini:</strong> Persentase kehadiran asatidz pada Jam 1 s.d. 4.<br/>
          • <strong>Ketuntasan Muhafadzoh:</strong> Persentase santri yang telah mencapai target materi wajib.
        </td>
      </tr>
      <tr>
        <td><strong>Grafik Tren Kehadiran (<code>AbsensiTrendLineChart</code>)</strong></td>
        <td>Log presensi 7 s.d. 30 hari terakhir</td>
        <td>Menampilkan kurva fluktuasi kehadiran guru per hari. Warna hijau menandakan kehadiran di atas 90%, sedangkan warna merah/kuning mengindikasikan lonjakan izin, sakit, atau jadwal badal.</td>
      </tr>
      <tr>
        <td><strong>Matriks KBM Harian (<code>ClassKbmMatrixWidget</code>)</strong></td>
        <td>Tabel <code>jadwal_kbm</code> &amp; status presensi real-time</td>
        <td>Memetakan seluruh rombel kelas secara langsung. Menunjukkan kelas mana yang sedang berlangsung, siapa asatidz yang mengajar di lokal, serta deteksi kelas kosong (badal belum terisi).</td>
      </tr>
      <tr>
        <td><strong>Papan Peringkat (<code>LeaderboardWidget</code>)</strong></td>
        <td>Rekap setoran mingguan <code>setoran_hafalan</code></td>
        <td>Daftar 10 kelas dan santri dengan capaian setoran lalaran terbanyak minggu ini. Menjadi tolok ukur pemberian penghargaan (<em>reward</em>) bulanan.</td>
      </tr>
      <tr>
        <td><strong>Pusat Aksi Cepat (<code>QuickActionHub</code>)</strong></td>
        <td>Pintasan modul utama</td>
        <td>Tombol cepat untuk: <em>Input Absen Cepat, Setor Hafalan, Buat Formasi,</em> dan <em>Cetak Piagam</em>.</td>
      </tr>
    </tbody>
  </table>

  <h3>(d) Fitur Khusus: Live Status Banner &amp; Activity Ticker</h3>
  <ul>
    <li><strong>Live Status Banner:</strong> Menampilkan status sinkronisasi Supabase Realtime Channel secara langsung. Jika terputus, banner beralih ke warna kuning dengan tombol <em>Hubungkan Ulang</em>.</li>
    <li><strong>Recent Activity Ticker:</strong> Menampilkan deretan aktivitas pengurus secara langsung (misal: "Mustahiq 2B Ula baru saja memverifikasi 32 setoran santri", "Piket Blok A mencatat 1 asatidz badal").</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>2.2 Manajemen Data Santri (<code>/santri</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul <code>/santri</code> adalah pangkalan data induk (<em>master database</em>) kependudukan santri MADINA Blokagung. Modul ini mengelola 37 atribut data lengkap untuk setiap santri, mulai dari nomor identitas madrasah, biodata kelahiran, alamat kedaerahan, domisili asrama/kamar pesantren, penempatan rombel diniyyah, hingga kontak wali santri untuk kebutuhan pelaporan WhatsApp.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <ul>
    <li>${renderBadge('Akses Edit', 'emerald')} <strong>Master Admin &amp; PKM Kesiswaan:</strong> Dapat menambah santri baru, mengubah seluruh 37 kolom biodata, mengambil foto webcam, serta mengimpor dan mengekspor Excel.</li>
    <li>${renderBadge('Akses Baca', 'blue')} <strong>Mustahiq &amp; PKM Kurikulum:</strong> Dapat melihat biodata, mencari santri, dan mengekspor daftar santri rombelnya.</li>
    <li>${renderBadge('Override RBAC', 'rose')} Jika akun memiliki bendera <code>hide_delete_pages: ['santri']</code>, tombol hapus santri akan disembunyikan untuk mencegah kecelakaan penghapusan data.</li>
  </ul>

  <h3>(c) Langkah Penggunaan Step-by-Step</h3>
  
  <h4>1. Menambah / Mengubah Data Santri</h4>
  <ol>
    <li>Buka menu <strong>Data Santri</strong> pada sidebar.</li>
    <li>Klik tombol hijau <strong>+ Tambah Santri</strong> di sudut kanan atas untuk membuka <code>ModalInputSantri.tsx</code> (atau klik ikon pensil pada baris santri untuk mengedit).</li>
    <li>Isi kolom data wajib:
      <ul>
        <li><strong>No. Induk (NIS):</strong> Nomor induk unik madrasah (kunci primer).</li>
        <li><strong>Gender (PA/PI):</strong> Pilih Putra (PA) atau Putri (PI).</li>
        <li><strong>Nama Lengkap:</strong> Ketik nama lengkap santri sesuai dokumen akta kelahiran/ijazah.</li>
        <li><strong>Domisili Pesantren:</strong> Pilih Blok Asrama dan Nomor Kamar.</li>
        <li><strong>Penempatan Rombel:</strong> Pilih Tingkat (Ula/Wustho/Ulya), Kelas (1/2/3), dan Bagian (A/B/C...).</li>
        <li><strong>Kontak Wali:</strong> Masukkan nomor telepon/WhatsApp wali santri diawali kode <code>62</code> atau <code>08</code>.</li>
      </ul>
    </li>
    <li>Klik <strong>Simpan Data Santri</strong>.</li>
  </ol>

  <h4>2. Mengambil Foto Santri Menggunakan Kamera Langsung (<code>CameraCaptureModal</code>)</h4>
  <ol>
    <li>Pada formulir biodata santri, klik tombol <strong>Ambil Foto Kamera</strong>.</li>
    <li>Peramban akan meminta izin akses kamera. Klik <strong>Allow / Izinkan</strong>.</li>
    <li>Sistem menyalakan sensor kamera dengan bingkai panduan potret standar pasfoto <strong>rasio 3x4</strong>.</li>
    <li>Gunakan tombol <strong>Ganti Kamera</strong> jika ingin beralih antara kamera depan dan kamera belakang (pada tablet/ponsel).</li>
    <li>Instruksikan santri untuk tegap menghadap kamera, lalu klik tombol rana (<em>Shutter</em>) berikon kamera.</li>
    <li>Sistem melalui fungsi <code>cropVideoTo3x4()</code> dan <code>compressImageFile()</code> akan secara otomatis memotong gambar tepat 3x4 dan mengompresnya di bawah ukuran 150 KB untuk menghemat kuota server.</li>
    <li>Klik <strong>Gunakan Foto Ini</strong> untuk menyematkannya ke profil santri.</li>
  </ol>

  <h4>3. Prosedur Import &amp; Export Data Santri Excel (<code>ModalImportExcelSantri</code>)</h4>
  <ol>
    <li><strong>Unduh Template Resmi:</strong> Klik tombol <strong>Import Excel</strong>, lalu klik tautan <em>Unduh Format Kolom Template Excel (.xlsx)</em>. Jangan mengubah susunan urutan kolom header template.</li>
    <li><strong>Unggah File:</strong> Seret file Excel yang telah diisi atau klik bidang unggah file.</li>
    <li><strong>Pratinjau &amp; Validasi Data:</strong> Sistem akan memindai seluruh baris data. Jika terdapat No Induk duplikat atau kolom wajib yang kosong, baris tersebut akan ditandai dengan warna merah.</li>
    <li><strong>Proses Impor Cerdas (Upsert):</strong> Klik tombol <strong>Mulai Impor Data</strong>. Sistem mengeksekusi operasi upsert: baris dengan No Induk baru akan dibuatkan data baru, sedangkan No Induk yang sudah ada akan diperbarui datanya tanpa menghapus riwayat setoran hafalan yang telah tersimpan sebelumnya.</li>
  </ol>

  <h3>(d) Fitur Khusus &amp; Pintasan</h3>
  <ul>
    <li><strong>Modal Filter Santri Berlapis (<code>ModalFilterSantri.tsx</code>):</strong> Memfilter daftar santri berdasarkan kombinasi multi-kriteria: Gender PA/PI, Tingkat (Ula, Wustho, Ulya), Rombel Kelas, Blok Asrama, serta Daerah Asal Santri (Kabupaten/Provinsi).</li>
    <li><strong>Kustomisasi Visibilitas Kolom (<code>ModalHideColumns.tsx</code>):</strong> Tabel santri memiliki 37 kolom. Pengurus dapat mencentang kolom mana saja yang ingin dimunculkan atau disembunyikan di layar untuk kenyamanan bekerja.</li>
    <li><strong>Zoom Foto Cepat (<code>ModalFotoZoom.tsx</code>):</strong> Klik pada lingkaran foto santri di baris tabel untuk memperbesar pasfoto santri ke resolusi penuh.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>2.3 Manajemen Data Dewan Asatidz (<code>/asatidz</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul direktori <code>/asatidz</code> mendokumentasikan seluruh data dewan guru/asatidz MADINA Blokagung. Pangkalan data ini menjadi fondasi relasional bagi pemetaan jadwal KBM, absensi mengajar 4 jam, pengisian jadwal badal, konsorsium fan kitab, serta penugasan Mustahiq rombel.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Kurikulum & Master Admin', 'emerald')} Memiliki akses penuh untuk menambah, mengedit biodata, menonaktifkan status mengajar asatidz, dan mengimpor file Excel dewan asatidz.
  </p>

  <h3>(c) Atribut Data &amp; Langkah Pengelolaan</h3>
  <ul>
    <li><strong>Nomor Induk Asatidz (NIA):</strong> Kode unik identitas asatidz di pesantren.</li>
    <li><strong>Nama Lengkap &amp; Gelar:</strong> Nama dewan asatidz beserta singkatan panggilan resmi (digunakan pada laporan WhatsApp singkat).</li>
    <li><strong>Gender:</strong> Menentukan penugasan mengajar di blok kelas Putra atau Putri.</li>
    <li><strong>Status Keaktifan:</strong> <code>Aktif Mengajar</code>, <code>Cuti / Izin Khusus</code>, atau <code>Non-Aktif</code>.</li>
    <li><strong>Kontak &amp; Alamat Domisili:</strong> Nomor telepon/WA pribadi asatidz dan alamat domisili kamar pondok / tempat tinggal.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>2.4 Workspace Catatan &amp; To-Do List Pengurus (<code>/catatan</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul <code>/catatan</code> berfungsi sebagai ruang kerja kolaboratif harian bagi dewan pengurus madrasah untuk mencatat notula rapat, instruksi pimpinan masyayikh, pedoman teknis kurikulum, checklist persiapan ujian (Imtihan), serta daftar tugas (<em>to-do list</em>) yang terintegrasi langsung dengan akun masing-masing pengurus.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('Semua Pengurus', 'emerald')} Setiap pengurus yang login dapat membuat, menyunting, dan mencentang tugas-tugas pada ruang catatan ini.
  </p>

  <h3>(c) Fitur &amp; Langkah Penggunaan</h3>
  <ol>
    <li><strong>Kategorisasi Catatan Berwarna:</strong> Setiap catatan dapat dikelompokkan ke dalam 5 kategori:
      <ul>
        <li><code>panduan</code> : Panduan &amp; Sistem IT (Tema Biru).</li>
        <li><code>kurikulum</code> : PKM. Kurikulum &amp; Jadwal (Tema Emerald).</li>
        <li><code>muhafadzoh</code> : PKM. Muhafadzoh &amp; Hafalan (Tema Amber).</li>
        <li><code>kesiswaan</code> : PKM. Kesiswaan &amp; Tatib (Tema Rose).</li>
        <li><code>umum</code> : Catatan Rapat Umum Pengurus (Tema Slate).</li>
      </ul>
    </li>
    <li><strong>Daftar Tugas Interaktif (Interactive To-Do List):</strong> Pengurus dapat menambahkan poin-poin pekerjaan dengan tingkat prioritas <code>Penting</code> (merah menyala) atau <code>Normal</code>. Tugas yang selesai dikerjakan cukup dicentang, dan sistem akan mencoret teks serta menghitung persentase progres secara otomatis.</li>
    <li><strong>Sematkan Catatan Penting (Pin Note):</strong> Klik ikon pin (📌) di sudut kartu catatan agar notula instruksi mendesak selalu menempati urutan paling atas di halaman catatan pengurus.</li>
  </ol>
  `;
}
