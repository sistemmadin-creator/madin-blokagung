import { renderCallout, renderBadge } from './styles.mjs';

export function getBab5Html() {
  return `
  <div class="page-break"></div>
  <h1>BAB 5: PANDUAN OPERASIONAL PKM. KESISWAAN</h1>

  <h2>5.1 Presensi Mengajar Harian Asatidz (<code>/absensi</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul Presensi Mengajar Harian (<code>/absensi</code>) adalah instrumen pengawasan kedisiplinan belajar mengajar dewan asatidz di seluruh lokal kelas. Modul ini memantau kehadiran guru secara rinci pada 4 jam pelajaran (Jam 1 s.d. Jam 4), mencatat guru yang terlambat, mengalokasikan asatidz badal (pengganti), serta mengelola tanggal libur KBM.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Kesiswaan & Petugas Piket', 'emerald')} Memiliki akses untuk mengubah status kehadiran, memilih guru badal, mengisi menit keterlambatan, dan mengatur hari libur operasional.
  </p>

  <h3>(c) Status Presensi Mengajar &amp; Arti Indikator</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 20%;">Status Kehadiran</th>
        <th style="width: 15%;">Lencana</th>
        <th style="width: 30%;">Kriteria &amp; Ketentuan</th>
        <th style="width: 35%;">Konsekuensi Sistem &amp; Badal</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hadir</strong></td>
        <td>${renderBadge('Hadir', 'emerald')}</td>
        <td>Asatidz hadir tepat waktu di ruang kelas dan mengajar penuh selama durasi jam pelajaran.</td>
        <td>Dihitung 1 poin kehadiran mengajar penuh.</td>
      </tr>
      <tr>
        <td><strong>Izin</strong></td>
        <td>${renderBadge('Izin', 'blue')}</td>
        <td>Asatidz mengirimkan surat izin resmi ke kantor sekretariat sebelum bel KBM berbunyi.</td>
        <td>Membutuhkan penunjukan asatidz badal jika kelas belum ada pendamping.</td>
      </tr>
      <tr>
        <td><strong>Sakit</strong></td>
        <td>${renderBadge('Sakit', 'amber')}</td>
        <td>Asatidz berhalangan mengajar karena kondisi kesehatan dengan konfirmasi pengurus.</td>
        <td>Terdata dalam laporan riwayat kesehatan asatidz.</td>
      </tr>
      <tr>
        <td><strong>Alfa / Tanpa Keterangan</strong></td>
        <td>${renderBadge('Alfa', 'rose')}</td>
        <td>Asatidz tidak hadir di lokal kelas tanpa pemberitahuan atau surat izin hingga bel berakhir.</td>
        <td>Otomatis memotong persentase kedisiplinan dan masuk daftar pantau pimpinan.</td>
      </tr>
      <tr>
        <td><strong>Terlambat</strong></td>
        <td>${renderBadge('Terlambat', 'amber')}</td>
        <td>Asatidz hadir setelah bel KBM berbunyi dengan selisih waktu tertentu.</td>
        <td>Petugas wajib menginput menit keterlambatan (misal: 15 menit).</td>
      </tr>
      <tr>
        <td><strong>Badal / Digantikan</strong></td>
        <td>${renderBadge('Badal', 'emerald')}</td>
        <td>Sesi kelas diisi oleh asatidz pengganti yang ditugaskan oleh petugas piket.</td>
        <td>Nama guru badal dicatat dan honor/poin mengajar dialokasikan ke guru badal.</td>
      </tr>
    </tbody>
  </table>

  <h3>(d) Penggunaan Modal Edit Presensi (<code>ModalEditAbsensi.tsx</code>)</h3>
  <ol>
    <li>Pilih tanggal dan hari mengajar pada pemilih tanggal atas.</li>
    <li>Temukan baris nama asatidz atau kelas target pada tabel sesi.</li>
    <li>Klik tombol status atau ikon edit untuk membuka modal presensi.</li>
    <li>Pilih status kehadiran baru (<em>Hadir, Izin, Sakit, Alfa, Terlambat, Badal</em>).</li>
    <li>Jika memilih status <strong>Badal</strong>, ketikkan atau pilih nama <strong>Asatidz Pengganti</strong> dari daftar dewan guru yang sedang tidak memiliki jadwal mengajar pada jam tersebut.</li>
    <li>Klik <strong>Simpan Perubahan Presensi</strong>. Sistem memperbarui log kehadiran dan mengaktifkan notifikasi waktu nyata ke perangkat pengurus lain.</li>
  </ol>

  <h3>(e) Pengaturan Hari Libur KBM (<code>ModalAturLibur.tsx</code>)</h3>
  <p>
    Jika terjadi peristiwa insidental (seperti pengajian akbar pondok, ta'ziyah masyayikh, atau banjir), petugas dapat mengklik tombol <strong>Liburkan Tanggal Ini</strong>. Sistem akan mengubah status seluruh sesi mengajar pada hari tersebut menjadi <code>Libur Pesantren</code> dan menonaktifkan penghitungan alpa.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>5.2 Portal Presensi Cepat per Blok (<code>/absen-cepat</code>)</h2>

  <h3>(a) Tujuan &amp; Filosofi Modul</h3>
  <p>
    Petugas piket lapangan yang bertugas mengontrol ratusan kelas di lantai asrama tidak mungkin membawa laptop besar atau mengisi formulir panjang satu per satu. Modul <code>/absen-cepat</code> dioptimalkan untuk perangkat ponsel pintar/tablet dengan antarmuka kartu layar sentuh ramah jempol.
  </p>

  <h3>(b) Alur Kerja Petugas Piket Lapangan</h3>
  <ol>
    <li><strong>Pemilihan Jam Aktif:</strong> Pilih tombol tab jam yang sedang berjalan: <strong>Jam 1</strong>, <strong>Jam 2</strong>, <strong>Jam 3</strong>, atau <strong>Jam 4</strong>.</li>
    <li><strong>Filter Blok Asrama:</strong> Pilih blok tempat bertugas (misal: <em>Blok A Sunan Ampel</em> atau <em>Blok Al-Barokah Putri</em>). Layar hanya akan menampilkan kelas yang berada di blok tersebut.</li>
    <li><strong>Sistem Kartu Sekali Sentuh:</strong> Setiap kartu kelas menampilkan nama guru dan fan kitab. Secara default kartu berstatus <em>Hadir</em>. Jika guru hadir, petugas tidak perlu melakukan apa pun.</li>
    <li><strong>Tindakan Cepat Jika Guru Tidak Ada:</strong> Cukup sentuh kartu kelas yang gurunya tidak hadir, pilih status (<em>Izin / Alfa</em>), lalu pilih asatidz badal dari menu cepat pop-up.</li>
    <li><strong>Presensi Massal (<code>ModalPresensiMassal.tsx</code>):</strong> Jika satu kompleks gedung diliburkan karena kegiatan asrama tertentu, petugas dapat mencentang blok tersebut dan mengubah status seluruh rombel serentak.</li>
  </ol>

  <h3>(c) Sistem Notifikasi Blok Asrama (<code>ModalNotifAbsenBlok.tsx</code>)</h3>
  <p>
    Petugas piket dapat memicu notifikasi siaga ke posko sekretariat jika mendapati ada lebih dari 3 kelas kosong dalam satu blok asrama agar tim piket cadangan segera diberangkatkan ke lokasi.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>5.3 Presensi Musyawarah &amp; Konsorsium (<code>/absen-konsorsium</code>)</h2>

  <h3>(a) Tujuan &amp; Penjadwalan Konsorsium</h3>
  <p>
    Konsorsium adalah forum musyawarah ilmiah mingguan dewan asatidz dan pendidik madrasah guna membedah kitab rujukan, menyamakan persepsi materi kurikulum, serta mengevaluasi perkembangan santri.
  </p>
  <ul>
    <li><strong>Konsorsium Mustahiq / Mustahiqqoh:</strong> Dilaksanakan rutin setiap <strong>Hari Kamis Siang / Sore</strong>.</li>
    <li><strong>Konsorsium Munawib / Munawibbah:</strong> Dilaksanakan rutin setiap <strong>Hari Selasa Siang / Sore</strong>.</li>
  </ul>

  <h3>(b) Tampilan Kartu &amp; Matriks Presensi Konsorsium</h3>
  <p>
    Modul ini mengelompokkan kehadiran berdasarkan 4 jenjang tingkatan: <code>ULA</code>, <code>WUSTHO</code>, <code>ULYA</code>, dan <code>ISTI'DAD</code>. Pengurus dapat mencatat kehadiran koordinator dan anggota konsorsium pada <code>ModalInputPresensiKonsor.tsx</code> serta melihat rekapitulasi semester via <code>ModalDetailMatriksTahunanKonsor.tsx</code>.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>5.4 Rekapitulasi Kehadiran &amp; Generator Laporan WhatsApp (<code>/rekap-absensi</code>)</h2>

  <h3>(a) Tujuan &amp; Analisis Rekap Kehadiran</h3>
  <p>
    Menyajikan data analitik kehadiran bulanan dan semesteran untuk seluruh dewan asatidz. Pimpinan dapat menyortir guru dengan tingkat kehadiran tertinggi hingga guru yang sering absen untuk keperluan evaluasi syahriyyah/bisyarah mengajar.
  </p>

  <h3>(b) Fitur Drilldown Harian (<code>ModalDrilldownRekap.tsx</code> &amp; <code>ModalDrilldownStatusAbsen.tsx</code>)</h3>
  <p>
    Setiap angka pada tabel rekap bersifat interaktif. Jika seorang asatidz tercatat memiliki 3 Alfa, pengurus cukup mengklik angka "3" tersebut. Sistem akan membuka modal drilldown yang merinci secara tepat: <em>tanggal berapa saja beliau alpa, hari apa, pada jam ke berapa, di kelas apa, dan fan pelajaran apa yang ditinggalkan</em>.
  </p>

  <h3>(c) Generator Laporan WhatsApp Siap Kirim (<code>ModalGeneratorWA.tsx</code>)</h3>
  <p>
    Setiap malam setelah bel KBM berakhir, tim kesiswaan wajib melaporkan rekap kehadiran guru ke grup WhatsApp Pengurus dan Masyayikh. Fitur ini mengotomatiskan pembuatan format laporan teks:
  </p>
  <ol>
    <li>Klik tombol hijau <strong>Generator Laporan WA</strong> di halaman rekap absensi.</li>
    <li>Pilih cakupan jam (contoh: <code>Jam 1 &amp; Jam 2</code> atau <code>Semua Jam</code>).</li>
    <li>Pilih filter gender: <code>SEMUA</code>, <code>PA</code> (Putra), atau <code>PI</code> (Putri).</li>
    <li>Sistem secara otomatis merangkum data dan menyusun format pesan resmi:
      <ul>
        <li>Jumlah total asatidz bertugas malam ini.</li>
        <li>Jumlah hadir, izin, sakit, dan alpa.</li>
        <li>Daftar rincian nama asatidz yang tidak hadir beserta kelas dan nama asatidz pengganti (badal).</li>
      </ul>
    </li>
    <li><strong>Kustomisasi Singkatan Nama (<code>ModalSingkatNamaWA.tsx</code>):</strong> Pengurus dapat menyesuaikan singkatan panggilan akrab dewan asatidz (contoh: <em>Ust. Ahmad Baidhowi</em> disingkat menjadi <em>Ust. Baidhowi</em>) agar pesan WhatsApp tidak terlalu panjang dan nyaman dibaca di layar ponsel.</li>
    <li>Klik tombol <strong>Salin Teks Laporan</strong> atau <strong>Buka WhatsApp Web</strong> untuk langsung menempelkannya ke grup resmi madrasah.</li>
  </ol>
  `;
}
