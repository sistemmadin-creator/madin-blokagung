import { renderCallout, renderBadge } from './styles.mjs';

export function getBab3Html() {
  return `
  <div class="page-break"></div>
  <h1>BAB 3: PANDUAN OPERASIONAL PKM. KURIKULUM</h1>

  <h2>3.1 Formasi Kelas &amp; Kapasitas Ruang (<code>/formasi</code>, <code>/formasi/pa</code>, <code>/formasi/pi</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul Formasi Kelas adalah pilar arsitektur akademik madrasah. Halaman ini mengatur pemetaan seluruh rombongan belajar (rombel), batas kapasitas maksimal lokal ruang kelas, penugasan Mustahiq/Wali Kelas, serta pembagian hierarki lokasi Kegiatan Belajar Mengajar (KBM) Diniyyah (malam hari) dan Takror (sore/pagi hari).
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Kurikulum & Master Admin', 'emerald')} Memiliki wewenang penuh untuk membuat formasi baru, menjalankan generator massal rombel, mengatur kuota kapasitas ruang, dan menetapkan lokasi gedung.
  </p>

  <h3>(c) Langkah Penggunaan Step-by-Step</h3>
  
  <h4>1. Menavigasi Tampilan Formasi Rombel</h4>
  <ul>
    <li><code>/formasi</code> : Menampilkan master seluruh rombongan belajar gabungan (Putra dan Putri).</li>
    <li><code>/formasi/pa</code> : Menampilkan khusus rombongan belajar santri Putra (Blok A, B, C, D, Induk PA).</li>
    <li><code>/formasi/pi</code> : Menampilkan khusus rombongan belajar santri Putri (Blok Al-Barokah, Khodijah, Fatimah, Induk PI).</li>
  </ul>

  <h4>2. Membuat Rombel Otomatis Menggunakan Generator (<code>ModalGeneratorFormasi</code>)</h4>
  <ol>
    <li>Buka halaman formasi, klik tombol <strong>+ Generator Formasi Kelas</strong>.</li>
    <li>Pilih <strong>Tingkat</strong>: <code>ULA</code>, <code>WUSTHO</code>, atau <code>ULYA</code>.</li>
    <li>Pilih <strong>Gender</strong>: <code>PA</code> (Putra) atau <code>PI</code> (Putri).</li>
    <li>Pilih <strong>Angka Kelas</strong>: Kelas <code>1</code>, <code>2</code>, atau <code>3</code>.</li>
    <li>Tentukan rentang abjad rombel: <strong>Bagian Awal</strong> (misal: <code>A</code>) sampai <strong>Bagian Akhir</strong> (misal: <code>J</code>).</li>
    <li>Tentukan <strong>Kapasitas Maksimal Ruang</strong> per kelas (default standar pesantren: <code>80</code> santri).</li>
    <li>Klik <strong>Eksekusi Generator</strong>. Sistem secara cerdas akan langsung membuat 10 rombel (misal: 1A, 1B, s.d. 1J) lengkap dengan validasi integritas database pangkalan data.</li>
  </ol>

  <h4>3. Menata Hierarki Blok KBM (<code>ModalHierarkiBlokKBM</code>)</h4>
  <p>
    Pesantren Blokagung memiliki puluhan gedung belajar yang tersebar. Fitur hierarki 2 tingkat memetakan:
  </p>
  <ul>
    <li><strong>Tingkat 1 (Nama Blok / Kompleks Gedung):</strong> Contoh: <em>Gedung Madin Pusat, Blok Al-Barokah, Blok Rusunawa, Asrama Sunan Ampel</em>.</li>
    <li><strong>Tingkat 2 (Daftar Lokasi Lokal Ruang):</strong> Contoh: <em>Lokal 101, Lokal 102, Aula Gedung Putih, Serambi Masjid Lantai 2</em>.</li>
    <li>Pengurus dapat mengatur hierarki terpisah untuk <strong>KBM Diniyyah</strong> dan <strong>KBM Takror</strong>. Lokasi yang dipilih pada formasi ini akan otomatis diwariskan ke matriks jadwal dan modul presensi.</li>
  </ul>

  <h3>(d) Fitur Khusus: Indikator Rasio &amp; Bar Keterisian Santri</h3>
  <p>
    Setiap kartu/baris formasi dilengkapi indikator persentase keterisian waktu nyata. Jika kapasitas kelas ditetapkan 80 santri dan saat ini terisi 84 santri, bilah bar akan berubah menjadi warna merah menyala dengan status <strong>Kelebihan Kapasitas (Overload)</strong>, memperingatkan tim kurikulum untuk segera memecah rombel atau memindahkan sebagian santri.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>3.2 Manajemen Fan Mata Pelajaran &amp; Pemetaan Pengajar (<code>/fan/pelajaran</code>, <code>/fan/pengajar</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul Fan Pelajaran mengelola kurikulum turots salafiyah: mendata daftar kitab kajian per tingkatan, mengelompokkannya ke dalam rumpun keilmuan (Kelompok Asal), serta memetakan asatidz yang memiliki kompetensi sanad mengajar untuk masing-masing fan kitab.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Kurikulum', 'emerald')} Akses penuh mengelola master kitab dan penugasan guru pengajar fan.
  </p>

  <h3>(c) Struktur Kelompok Asal &amp; Fan Kitab</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Kelompok Asal (Rumpun)</th>
        <th style="width: 35%;">Tingkat Ula</th>
        <th style="width: 40%;">Tingkat Wustho &amp; Ulya</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Fan Fiqih</strong></td>
        <td>Mabadi'ul Fiqhiyyah Juz 1–3, Safinatun Naja</td>
        <td>Fathul Qorib, Fathul Mu'in, Kifayatul Akhyar</td>
      </tr>
      <tr>
        <td><strong>Fan Nahwu &amp; Gramatika</strong></td>
        <td>Al-Jurumiyyah, Al-Amtsilah At-Tashrifiyyah</td>
        <td>Mutammimah Al-Ajurumiyyah, Nadzom Imrithi, Alfiyyah Ibnu Malik</td>
      </tr>
      <tr>
        <td><strong>Fan Tauhid / Akidah</strong></td>
        <td>'Aqidatul Awam, Tijan Ad-Darori</td>
        <td>Kifayatul Awam, Syarah Ummil Barohin</td>
      </tr>
      <tr>
        <td><strong>Fan Akhlaq &amp; Tasawuf</strong></td>
        <td>Al-Akhlaq Lil Banin/Banat, Wasoya</td>
        <td>Ta'limul Muta'allim, Bidayatul Hidayah, Ihya' 'Ulumiddin</td>
      </tr>
      <tr>
        <td><strong>Fan Hadits &amp; Tarikh</strong></td>
        <td>Khulasoh Nuril Yaqin, Al-Arba'in An-Nawawiyyah</td>
        <td>Bulughul Marom, Shohih Bukhori, Mustholah Hadits</td>
      </tr>
    </tbody>
  </table>

  <h3>(d) Fitur Khusus: Pemetaan Pengajar Fan (<code>ModalPilihAsatidzFan.tsx</code>)</h3>
  <p>
    Pada modul <code>/fan/pengajar</code>, kurikulum dapat memilih seorang asatidz dan menentukan fan kitab apa saja yang diizinkan untuk diampu oleh beliau. Pembatasan ini secara otomatis mengunci menu dropdown saat menyusun jadwal di <code>/jadwal-kbm</code>, sehingga asatidz Fiqih tidak akan keliru ditempatkan pada jam Nahwu.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>3.3 Direktori Pendidik &amp; Mustahiq Kelas (<code>/daftar-pendidik</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul <code>/daftar-pendidik</code> menyajikan buku induk dewan asatidz yang bertugas sebagai Mustahiq (Wali Kelas) dan Munawib (Wakil Wali Kelas) pada tahun ajaran aktif. Halaman ini menjadi referensi cepat bagi pimpinan pesantren untuk memantau rombel mana yang belum memiliki Mustahiq resmi.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>3.4 Pengaturan Hari &amp; Jam KBM (<code>/hari-kbm</code>)</h2>

  <h3>(a) Konfigurasi Hari Aktif Pesantren</h3>
  <p>
    Berbeda dengan sekolah formal pada umumnya, hari aktif KBM di Pondok Pesantren Darussalam Blokagung berlangsung selama <strong>6 hari aktif per minggu</strong>:
  </p>
  <ul>
    <li><strong>Sabtu s.d. Kamis:</strong> Hari aktif pembelajaran diniyyah reguler.</li>
    <li><strong>Jumat:</strong> Hari libur umum pesantren (kegiatan ekstra, ro'an akbar, dan ibadah shalat Jumat).</li>
  </ul>

  <h3>(b) Pembagian Slot Jam Pelajaran (Jam 1 s.d. 4)</h3>
  <ul>
    <li><strong>Jam Ke-1 &amp; Jam Ke-2 (KBM Diniyyah Malam Hari):</strong> Sesi utama pembelajaran kitab turots di gedung madrasah (ba'da Isya' s.d. selesai).</li>
    <li><strong>Jam Ke-3 &amp; Jam Ke-4 (KBM Takror / Bimbingan Khusus):</strong> Sesi musyawarah, lalaran nadzom terarah, dan takror malam di asrama.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>3.5 Matriks Jadwal KBM (<code>/jadwal-kbm</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul Jadwal KBM adalah salah satu modul paling kompleks dan krusial dalam sistem. Modul ini menyajikan matriks kisi interaktif dua arah: jadwal per kelas/rombel dan jadwal mengajar per dewan asatidz.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Kurikulum & Master Admin', 'emerald')} Akses penuh mengedit slot matriks jadwal, menyalin slot, menukar asatidz, serta menjalankan solver penyusunan jadwal otomatis.
  </p>

  <h3>(c) Panduan Penggunaan Menu Klik Kanan (Context Menu - <code>ContextMenuKG.tsx</code>)</h3>
  <p>
    Untuk mempercepat penyusunan jadwal tanpa membuka formulir yang lambat, tim kurikulum cukup <strong>mengklik kanan</strong> pada salah satu sel slot jadwal di dalam tabel matriks:
  </p>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Pilihan Menu Klik Kanan</th>
        <th style="width: 35%;">Ikon &amp; Aksi Sistem</th>
        <th style="width: 40%;">Deskripsi Fungsi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Edit / Ubah Slot</strong></td>
        <td><code>UserCog</code> / Membuka <code>ModalInputJadwalKelas</code></td>
        <td>Mengubah nama fan kitab, memilih guru pengampu dari daftar kompetensi, dan menyesuaikan ruangan.</td>
      </tr>
      <tr>
        <td><strong>Pindah Slot (Cut / Mode Pindah)</strong></td>
        <td><code>Scissors</code> / Mengaktifkan Clipboard Bar</td>
        <td>Memotong slot sesi saat ini ke memori clipboard untuk dipindahkan ke hari, jam, atau kelas lain.</td>
      </tr>
      <tr>
        <td><strong>Tempel Slot (Paste)</strong></td>
        <td><code>ClipboardCheck</code> / Eksekusi Tempel</td>
        <td>Menempelkan sesi dari clipboard ke sel target. Mengaktifkan algoritma <em>Smart Auto-Sync 4 Poin</em>.</td>
      </tr>
      <tr>
        <td><strong>Tukar Slot (Swap)</strong></td>
        <td><code>ArrowLeftRight</code> / Pertukaran Dua Arah</td>
        <td>Menukar secara instan sesi guru A dan guru B pada jam yang sama tanpa merusak data kelas lain.</td>
      </tr>
      <tr>
        <td><strong>Hapus Slot</strong></td>
        <td><code>Trash2</code> / Konfirmasi Hapus</td>
        <td>Mengosongkan sesi mengajar pada jam tersebut dan mengembalikan status slot menjadi "KOSONG".</td>
      </tr>
    </tbody>
  </table>

  <h3>(d) Bilah Mengambang Clipboard (<code>FloatingBarClipboardKG.tsx</code>)</h3>
  <p>
    Ketika pengurus memilih aksi <em>Pindah Slot (Cut)</em>, sebuah bilah mengambang berwarna gelap dengan garis tepi amber menyala akan muncul di bagian bawah tengah layar. Bilah ini menampilkan ringkasan sesi yang sedang dipotong: <em>Nama Asatidz, Fan Kitab Singkat, Kelas Asal, serta Hari &amp; Jam Asal</em>. Pengurus dapat mengklik sel tujuan untuk menempelkannya, atau menekan tombol <kbd>ESC</kbd> untuk membatalkan mode pindah.
  </p>

  <h3>(e) Algoritma Smart Auto-Sync 4 Poin</h3>
  <p>
    Setiap kali sebuah sesi jadwal diubah atau ditempelkan, sistem secara otomatis memperbarui 4 titik database relasional secara atomik (<em>atomic transaction</em>):
  </p>
  <ol>
    <li>Memperbarui struktur sel jadwal pada rombel kelas target.</li>
    <li>Memperbarui jadwal mengajar pribadi dewan asatidz terkait pada tabel ringkasan guru.</li>
    <li>Menghitung ulang total jam mengajar mingguan asatidz secara instan.</li>
    <li>Menyelaraskan status pemetaan fan pelajaran kurikulum.</li>
  </ol>

  <h3>(f) Smart Auto-Schedule Solver Engine (<code>AutoScheduleSolverService</code>)</h3>
  <p>
    Untuk mengatasi jadwal bentrok di madrasah dengan ratusan kelas, aplikasi menyertakan mesin pemecah kendala otomatis berbasis algoritma <em>Constraint Satisfaction Problem (CSP) Backtracking</em>:
  </p>
  <ul>
    <li><strong>Deteksi Bentrok Guru:</strong> Sistem menandai sel dengan warna merah berkedip jika seorang asatidz terjadwal mengajar di dua rombel berbeda pada hari dan jam yang sama.</li>
    <li><strong>Deteksi Bentrok Ruangan:</strong> Menandai sel jika satu ruang lokal fisik (misal: Ruang 103) digunakan oleh dua kelas berbeda secara bersamaan.</li>
    <li><strong>Auto-Solve:</strong> Tombol <em>Susun Jadwal Otomatis</em> akan mencari kombinasi penempatan slot bebas bentrok untuk seluruh mata pelajaran yang belum terisi.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>3.6 Kalender Akademik Terpadu (<code>/kalender-kegiatan</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Kalender Akademik menyatukan penanggalan Masehi dengan sistem Kalender Hijriyah khas pesantren (dengan penyesuaian hisab/ru'yat rukyatul hilal). Modul ini mendokumentasikan seluruh agenda tahunan: Ujian UUB, Imtihan, Haflah Akhirussanah, libur Romadhon, serta libur musyawarah.
  </p>

  <h3>(b) Integrasi Otomatis Status Libur KBM ke Modul Absensi</h3>
  ${renderCallout('important', 'Koneksi Kalender ke Absensi Harian', 'Setiap agenda kalender yang diberi centang <strong>"Liburkan KBM Reguler"</strong> akan secara otomatis menonaktifkan presensi mengajar pada modul Absensi Kesiswaan di tanggal tersebut. Asatidz tidak akan terhitung Alpa atau Terlambat pada hari yang telah ditetapkan sebagai hari libur resmi.')}

  <h3>(c) Kode Singkatan Agenda Resmi Kalender</h3>
  <p>
    Aplikasi menggunakan kode singkatan resmi kegiatan pesantren: <code>PAL</code> (Pembukaan Awal Tahun), <code>NM</code> (Nisfu Sanah), <code>UUB</code> (Ujian Umum Bersama), <code>IMTHN</code> (Ikhtibar Imtihan Akhir), <code>HBH</code> (Halal Bihalal), dan <code>LHR</code> (Libur Hari Raya).
  </p>
  `;
}
