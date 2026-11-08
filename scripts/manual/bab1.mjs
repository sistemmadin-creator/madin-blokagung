import { renderCallout, renderBadge } from './styles.mjs';

export function getBab1Html() {
  return `
  <div class="page-break"></div>
  <h1>BAB 1: PENGENALAN EKOSISTEM &amp; FITUR GLOBAL APLIKASI</h1>

  <h2>1.1 Gambaran Umum Sistem &amp; Arsitektur Hybrid Real-Time / Offline-First</h2>
  <p>
    Sistem Informasi <strong>MADINA Blokagung</strong> (Madrasah Diniyyah Al Amiriyyah Pondok Pesantren Darussalam Blokagung) adalah aplikasi tata kelola akademik dan kesiswaan berbasis web terpadu yang dibangun dengan kerangka kerja modern <em>Next.js 14 App Router</em>, <em>TypeScript</em>, <em>Tailwind CSS</em>, dan mesin pangkalan data terdistribusi <em>Supabase PostgreSQL</em>.
  </p>
  <p>
    Aplikasi ini dirancang untuk menjawab tantangan geografis dan konektivitas pesantren yang luas, di mana dewan pengurus dan petugas piket harus melakukan input data di ruang kantor maupun di puluhan blok asrama putra dan putri dengan stabilitas sinyal internet yang bervariasi. Oleh karena itu, aplikasi mengimplementasikan arsitektur ganda:
  </p>
  <ul>
    <li><strong>Sinkronisasi Waktu Nyata (Supabase Realtime Channel):</strong> Setiap perubahan data presensi, jadwal, atau setoran langsung terdistribusi ke seluruh browser pengurus lain yang sedang aktif tanpa perlu memuat ulang peramban (<em>refresh</em>).</li>
    <li><strong>Arsitektur Luring Tangguh (Offline-First via IndexedDB <code>MadinaOfflineDB</code>):</strong> Ketika petugas piket berada di area blank-spot, data input tetap tersimpan secara aman di peramban lokal dan akan dikirimkan secara otomatis (<em>auto-flush</em>) saat koneksi terhubung kembali.</li>
  </ul>

  ${renderCallout('important', 'Prinsip Integritas Pesantren', 'Seluruh nomenklatur dalam aplikasi ini mempertahankan istilah pesantren salafiyah: Mustahiq/Mustahiqqoh, Munawib/Munawibbah, Lalaran, Nadzom, Syawir, Daur Awwal & Daur Tsani, Fan Kitab, serta pembagian Blok Diniyyah dan Asrama.')}

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>1.2 Portal Publik &amp; Warta Berita Pesantren (<code>/</code>, <code>/berita</code>, <code>/berita/[slug]</code>)</h2>
  
  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Portal publik berfungsi sebagai etalase resmi madrasah kepada masyarakat luas, wali santri, dan alumni. Portal ini menampilkan profil institusi, visi-misi pendidikan diniyyah, direktori jenjang (Ula, Wustho, Ulya, dan Program Unggulan), agenda kegiatan mendatang, serta majalah warta digital berkala yang mengadopsi standar desain editorial pesantren modern ala Lirboyo.net.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('Publik Bebas Akses', 'emerald')} Seluruh halaman portal publik dapat diakses oleh siapa pun tanpa memerlukan proses autentikasi (login). Rute yang termasuk dalam portal publik mencakup:
  </p>
  <ul>
    <li><code>/</code> : Halaman Beranda Publik (Hero profil, sambutan kepala madrasah, statistik santri, direktori fan, dan highlight berita).</li>
    <li><code>/berita</code> : Halaman Indeks Arsip Warta Madina dengan filter topik (Kelas Unggulan, Ula, Wustho, Ulya) dan pencarian judul.</li>
    <li><code>/berita/[slug]</code> : Halaman Baca Artikel Warta Berita 2 Kolom lengkap dengan pemutar video TikTok dan artikel terkait.</li>
  </ul>

  <h3>(c) Langkah Penggunaan Step-by-Step</h3>
  <ol>
    <li><strong>Membuka Halaman Utama:</strong> Arahkan peramban ke alamat domain utama MADINA Blokagung. Pengunjung disambut dengan slider showcase warta berita terbaru pada komponen <code>BeritaShowcaseSection</code>.</li>
    <li><strong>Membaca Sorotan Warta:</strong> Klik pada kartu berita besar (<em>Hero Lead</em>) di sisi kiri atau salah satu dari 4 kartu mini (<em>Highlight Grid</em>) di sebelah kanan.</li>
    <li><strong>Menjelajahi Arsip Berita:</strong> Klik menu <strong>Warta Madina</strong> pada navigasi atas atau tombol <em>Lihat Semua Warta</em>. Pengguna dapat memilih filter tab: <em>Semua, Kelas Unggulan, Tingkat Ula, Tingkat Wustho,</em> atau <em>Tingkat Ulya</em>.</li>
    <li><strong>Membaca Detail Warta (2 Kolom):</strong>
      <ul>
        <li><em>Kolom Kiri (Artikel Utama):</em> Berisi foto cover resolusi tinggi, kutipan cuplikan (<em>excerpt</em>), isi berita paragraf penuh, sisipan foto kegiatan (<em>caption</em>), sub-judul bab, serta dawuh masyayikh/kutipan ulama.</li>
        <li><em>Kolom Kanan (Sticky Widget):</em> Menyajikan <strong>Pemutar Video TikTok MADINA</strong> yang disematkan langsung (dapat diputar tanpa meninggalkan halaman) dan kartu kontak Redaksi Warta Diniyyah.</li>
      </ul>
    </li>
    <li><strong>Membagikan Artikel:</strong> Klik tombol <strong>Salin Tautan</strong> atau tombol <strong>Bagikan ke WhatsApp</strong> di bagian bawah artikel untuk menyebarkan rilis warta kepada wali santri.</li>
  </ol>

  <h3>(d) Fitur Khusus &amp; Pintasan</h3>
  <ul>
    <li><strong>Smart TikTok Video Extractor:</strong> Sistem secara otomatis mengekstrak ID numerik dari tautan TikTok yang diinput pengurus pada CMS (misal: <code>https://www.tiktok.com/@madinblokagung/video/7391823...</code>) dan merendernya dalam format player vertikal 9:16 responsif.</li>
    <li><strong>Fallback Saluran TikTok Resmi:</strong> Apabila artikel berita tidak menyertakan tautan video khusus, widget kanan secara dinamis menampilkan tombol tautan menuju akun resmi <code>@madinblokagung</code>.</li>
  </ul>

  <h3>(e) Tips &amp; Penanganan Kendala</h3>
  ${renderCallout('tip', 'Optimalisasi Bandwidth di Lingkungan Pesantren', 'Komponen gambar pada portal berita telah dilengkapi penanganan <code>onError</code> otomatis. Jika foto gagal dimuat akibat jaringan lambat, sistem akan merender kartu cadangan berpola gradasi emerald dengan ikon buku turots tanpa merusak tata letak halaman.')}

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>1.3 Autentikasi &amp; Keamanan Sesi Pengurus (<code>/login</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Halaman <code>/login</code> merupakan gerbang otentikasi tunggal bagi Dewan Asatidz, Mustahiq, Petugas Piket, PKM Kurikulum, PKM Muhafadzoh, PKM Kesiswaan, PKM Sapras, hingga Master Admin untuk memasuki ruang kerja administrasi MADINA Blokagung.
  </p>

  <h3>(b) Hak Akses &amp; Proteksi Rute (<code>middleware.ts</code>)</h3>
  <p>
    Semua rute di bawah grup direktori <code>app/(dashboard)/*</code> diproteksi secara ketat oleh <code>middleware.ts</code> Next.js. Mekanisme kerja proteksi rute adalah sebagai berikut:
  </p>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%;">Kondisi Sesi Pengguna</th>
        <th style="width: 35%;">Rute yang Dituju</th>
        <th style="width: 40%;">Aksi Sistem / Pengalihan (Redirect)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Belum Terautentikasi (Tamu)</td>
        <td>Rute Dashboard (misal: <code>/santri</code>, <code>/absensi</code>)</td>
        <td>Ditolak dan langsung diarahkan kembali ke <code>/login</code> dengan parameter kembali.</td>
      </tr>
      <tr>
        <td>Sudah Terautentikasi</td>
        <td>Halaman <code>/login</code></td>
        <td>Dialihkan langsung ke <code>/dashboard</code> (atau ke <code>/absen-cepat</code> jika akun piket khusus).</td>
      </tr>
      <tr>
        <td>Akun Terautentikasi</td>
        <td>Halaman yang status aksesnya <code>sembunyikan</code></td>
        <td>Ditolak oleh verifikasi RBAC dan dialihkan ke halaman peringatan hak akses.</td>
      </tr>
    </tbody>
  </table>

  <h3>(c) Langkah Penggunaan Step-by-Step Masuk Sistem</h3>
  <ol>
    <li>Ketikkan rute <code>/login</code> pada peramban web.</li>
    <li>Masukkan <strong>Email Pengurus</strong> atau <strong>Username Resmi</strong> yang telah didaftarkan oleh Master Admin.</li>
    <li>Ketikkan <strong>Kata Sandi (Password)</strong> akun Anda.</li>
    <li><em>(Opsional untuk Petugas Piket Lapangan):</em> Centang opsi <strong>Ingat Sesi Perangkat Ini (Persistent Device Session)</strong> jika Anda menggunakan tablet atau ponsel piket bersama di area gerbang asrama.</li>
    <li>Klik tombol hijau <strong>Masuk ke Ruang Kerja</strong>.</li>
    <li>Sistem akan memvalidasi kredensial ke Supabase Auth, mengambil profil RBAC dari tabel <code>user_accounts</code>, dan membuka antarmuka dashboard sesuai wewenang akun Anda.</li>
  </ol>

  <h3>(d) Fitur Khusus: Persistent Absen Cepat Device Session</h3>
  <p>
    Bagi petugas piket presensi asatidz harian, Master Admin dapat mengaktifkan bendera otoritas <code>persistent_absen_cepat</code> pada menu Pengaturan RBAC. Karakteristik fitur ini:
  </p>
  <ul>
    <li>Sesi login disimpan secara terisolasi pada brankas lokal peramban (<code>deviceSessionVault.ts</code>) sehingga tidak akan pernah kedaluwarsa (<em>never expires</em>) meskipun aplikasi ditutup.</li>
    <li>Setiap kali petugas membuka aplikasi web, sistem akan langsung meloncat (<em>bypass</em>) melewati beranda analitik dan membuka layar <code>/absen-cepat</code> secara otomatis.</li>
    <li>Sesi hanya dapat diakhiri jika petugas secara eksplisit menekan tombol <strong>Keluar Sesi (Logout)</strong> pada menu profil atas.</li>
  </ul>

  <h3>(e) Tips &amp; Penanganan Kendala</h3>
  ${renderCallout('warning', 'Lupa Kata Sandi / Akun Dinonaktifkan', 'Jika muncul notifikasi "Kredensial tidak valid atau akun dinonaktifkan", segera hubungi Master Admin di Bagian IT Sekretariat MADINA untuk melakukan reset kata sandi atau pengaktifan status akun melalui modul /pengaturan.')}

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>1.4 Anatomi Antarmuka Ruang Kerja (<code>layout.tsx</code>)</h2>
  <p>
    Setelah berhasil masuk, pengguna disajikan tata letak ruang kerja yang intuitif, bersih, dan konsisten di seluruh perangkat:
  </p>
  
  <h3>1. Tampilan Desktop (Layar Lebar &gt; 1024px)</h3>
  <ul>
    <li><strong>Sidebar Kiri Dinamis (<code>SidebarDesktop.tsx</code>):</strong>
      <ul>
        <li><em>Logo &amp; Identitas Lembaga:</em> Menampilkan lambang resmi MADINA Blokagung dan nama versi sistem.</li>
        <li><em>Grup Navigasi Terstruktur:</em> Menu dikelompokkan secara hirarkis: <strong>Beranda Utama</strong>, <strong>Data Pokok Pesantren</strong>, <strong>PKM. Kurikulum</strong>, <strong>PKM. Muhafadzoh</strong>, <strong>PKM. Kesiswaan</strong>, <strong>PKM. Sarana Prasarana</strong>, <strong>PKM. Publikasi &amp; Warta</strong>, serta <strong>Pengaturan Sistem</strong>.</li>
        <li><em>Fitur Lipat (Collapse/Expand):</em> Tombol chevron di sudut sidebar memungkinkan pengurus melipat sidebar menjadi mode ikon ramping agar bidang kerja tabel (seperti Matriks Jadwal dan Formasi) menjadi jauh lebih leluasa.</li>
      </ul>
    </li>
    <li><strong>Bilah Navigasi Atas (<code>Navbar.tsx</code>):</strong>
      <ul>
        <li><em>Tombol Buka-Tutup Menu (Hamburger):</em> Membuka atau menyembunyikan sidebar.</li>
        <li><em>Banner Tahun Ajaran Aktif:</em> Menampilkan label tahun ajaran berjalan (contoh: <code>1447–1448 H / 2026–2027 M [Semester Ganjil]</code>).</li>
        <li><em>Tombol Undo &amp; Redo Global:</em> Ikon panah melengkung kiri dan kanan lengkap dengan lencana jumlah tumpukan riwayat (<em>history stack count</em>).</li>
        <li><em>Lonceng Notifikasi Web-Push (<code>NotificationBellPrompt.tsx</code>):</em> Indikator pemberitahuan sistem dan permintaan izin push notification.</li>
        <li><em>Menu Profil &amp; Wewenang Akun:</em> Menampilkan nama lengkap, peran (Role), tombol cepat Pengaturan Hierarki, Audit Log, dan tombol Keluar (Logout).</li>
      </ul>
    </li>
  </ul>

  <h3>2. Tampilan Ponsel / Mobile (Layar &lt; 768px)</h3>
  <p>
    Pada perangkat seluler yang digunakan asatidz saat berkeliling di asrama, sidebar desktop secara otomatis disembunyikan dan digantikan oleh bilah navigasi bawah <strong><code>BottomNavMobile.tsx</code></strong> yang ramah sentuhan jempol:
  </p>
  <ul>
    <li><strong>Beranda:</strong> Menuju dashboard analitik ringkas.</li>
    <li><strong>Piket (Absen Cepat):</strong> Pintasan langsung untuk melakukan presensi mengajar guru per blok.</li>
    <li><strong>Setor:</strong> Akses instan ke formulir setoran muhafadzoh santri.</li>
    <li><strong>Catatan:</strong> Akses cepat daftar to-do dan agenda kerja pengurus.</li>
    <li><strong>Menu Lainnya:</strong> Membuka laci navigasi geser (<em>drawer sheet</em>) untuk mengakses seluruh sub-modul lainnya.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>1.5 Fitur Utilitas Global Aplikasi</h2>

  <h3>1. Mesin Pemulihan Data Global (Engine Undo / Redo Lintas Modul)</h3>
  <p>
    Salah satu keunggulan terbesar Sistem Informasi MADINA adalah kehadiran <strong><code>useUndoRedoStore</code></strong>. Fitur ini memungkinkan pengurus membatalkan kesalahan operasional (seperti salah menghapus slot jadwal, salah mengubah status presensi, atau salah memindahkan santri) dengan aman.
  </p>
  <ul>
    <li><strong>Kapasitas Tumpukan (Stack Limit):</strong> Sistem merekam hingga maksimal <strong>5 langkah tindakan terakhir</strong> (<code>MAX_HISTORY_STEPS = 5</code>) untuk menjaga efisiensi memori.</li>
    <li><strong>Pemberitahuan Mengambang (Floating Undo Toast):</strong> Setiap kali pengurus melakukan perubahan data, sebuah notifikasi toast muncul di sudut layar dengan tombol cepat <strong>Batalkan (Undo)</strong>.</li>
    <li><strong>Pendeteksi Benturan Status (Undo Conflict Resolution):</strong> Apabila data yang hendak di-undo telah diubah oleh pengurus lain di perangkat yang berbeda, modal dialog <code>UndoConflictModal.tsx</code> akan muncul dan memberikan pilihan: <em>Paksa Timpa (Force Undo)</em> atau <em>Batalkan Pemulihan</em>.</li>
  </ul>

  <h3>2. Modus Operasional Luring &amp; Antrean Mutasi (Offline-First via <code>OfflineSyncService</code>)</h3>
  <p>
    Petugas piket yang bertugas di asrama putri atau lantai atas madrasah sering kali mengalami kendala sinyal internet terputus (<em>offline</em>). Aplikasi mengatasinya secara elegan:
  </p>
  <ul>
    <li><strong>Pendeteksian Status Jaringan:</strong> Komponen <code>OfflineStatusIndicator.tsx</code> akan menampilkan bilah pita kuning di bagian atas aplikasi saat internet terputus, menginformasikan bahwa sistem beralih ke mode luring.</li>
    <li><strong>Antrean Mutasi IndexedDB:</strong> Setiap klik simpan presensi atau setoran akan dikemas ke dalam objek <code>OfflineMutation</code> dengan status <code>pending</code> di penyimpanan lokal peramban.</li>
    <li><strong>Sinkronisasi Otomatis Bertahap:</strong> Begitu perangkat mendeteksi sinyal internet kembali (event <code>window.online</code>), layanan <code>OfflineSyncService.flushPendingMutations()</code> secara otomatis mengeksekusi antrean ke server Supabase satu per satu hingga selesai, dan menampilkan lencana hijau bertuliskan <em>"Seluruh data telah tersinkronisasi"</em>.</li>
  </ul>

  <h3>3. Pemilih Tanggal Khusus Hari Ahad (<code>SundayDatePicker</code>)</h3>
  <p>
    Dalam tradisi MADINA Blokagung, setoran lalaran mingguan santri diwajibkan berlangsung pada malam Ahad dan hari Ahad. Komponen <code>SundayDatePicker.tsx</code> dirancang khusus agar input setoran tidak keliru:
  </p>
  <ul>
    <li>Kalender secara cerdas mengunci tanggal di luar hari Ahad sehingga pengguna hanya dapat mengklik tanggal-tanggal yang jatuh tepat pada hari Ahad.</li>
    <li>Dilengkapi tombol jalan pintas: <em>Ahad Ini, Ahad Depan,</em> dan <em>Ahad Sebelumnya</em>.</li>
  </ul>

  <h3>4. Pemfilteran Tahun Ajaran &amp; Kalender Hijriyah Global (<code>useTahunAjaranStore</code>)</h3>
  <p>
    Sistem bekerja secara multi-tahun ajaran (contoh: <code>2026/2027</code>) dan multi-semester (<em>Semester Ganjil / Daur Awwal</em> dan <em>Semester Genap / Daur Tsani</em>). Seluruh tabel dan rekapitulasi data akan secara otomatis difilter sesuai dengan Tahun Ajaran yang sedang diaktifkan oleh pengurus pada bilah atas aplikasi.
  </p>
  `;
}
