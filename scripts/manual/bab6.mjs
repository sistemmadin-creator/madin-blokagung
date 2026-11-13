import { renderCallout, renderBadge } from './styles.mjs';

export function getBab6Html() {
  return `
  <div class="page-break"></div>
  <h1>BAB 6: PANDUAN OPERASIONAL PKM. SAPRAS &amp; PUBLIKASI</h1>

  <h2>6.1 Manajemen Sarana &amp; Prasarana (<code>/sapras/*</code>)</h2>

  <h3>(a) Gambaran Umum Modul Sarana Prasarana</h3>
  <p>
    Kelancaran kegiatan belajar mengajar di puluhan gedung madrasah sangat bergantung pada kesiapan fisik ruang kelas dan ketersediaan alat tulis kantor (ATK). Ruang kerja Sarana Prasarana (<code>SaprasWorkspaceModule.tsx</code>) mengintegrasikan 4 pilar pengelolaan fasilitas:
  </p>
  <ul>
    <li><code>/sapras/inventaris-kelas</code> : Pendataan kondisi fisik inventaris per lokal kelas.</li>
    <li><code>/sapras/perbaikan</code> : Sistem tiket pengajuan pelaporan kerusakan dan penanganan teknisi.</li>
    <li><code>/sapras/logistik</code> : Buku stok dan mutasi distribusi ATK (spidol, tinta, penghapus).</li>
    <li><code>/sapras/rekap</code> : Laporan audit berkala persentase kelayakan sarana belajar.</li>
  </ul>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Sapras & Master Admin', 'emerald')} Memiliki izin untuk memutakhirkan kondisi kelas, menindaklanjuti tiket perbaikan, menambah stok gudang logistik, dan mengunduh audit rekap.
  </p>

  <h3>(c) Standar Klasifikasi Kondisi Inventaris</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 20%;">Kategori Kondisi</th>
        <th style="width: 15%;">Lencana</th>
        <th style="width: 35%;">Definisi Fisik Lapangan</th>
        <th style="width: 30%;">Tindak Lanjut Rekomendasi</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>BAIK</strong></td>
        <td>${renderBadge('Baik & Layak', 'emerald')}</td>
        <td>Fasilitas utuh, bersih, dan berfungsi normal tanpa hambatan (contoh: papan tulis licin, meja guru kokoh).</td>
        <td>Pemeliharaan berkala dan pembersihan rutin.</td>
      </tr>
      <tr>
        <td><strong>RUSAK_RINGAN</strong></td>
        <td>${renderBadge('Rusak Ringan', 'amber')}</td>
        <td>Terdapat cacat estetika atau fungsi minor namun masih dapat dipakai (contoh: list papan lepas sebagian, cat meja terkelupas).</td>
        <td>Penjadwalan perbaikan ringan oleh tukang pondok.</td>
      </tr>
      <tr>
        <td><strong>RUSAK_BERAT</strong></td>
        <td>${renderBadge('Rusak Berat', 'rose')}</td>
        <td>Fasilitas patah, retak parah, atau tidak dapat difungsikan (contoh: papan tulis berlubang, kaki meja patah).</td>
        <td>Penggantian unit baru atau renovasi menyeluruh.</td>
      </tr>
      <tr>
        <td><strong>BELUM_ADA</strong></td>
        <td>${renderBadge('Belum Ada', 'slate')}</td>
        <td>Ruang kelas belum memiliki fasilitas dasar tersebut.</td>
        <td>Pengadaan inventaris baru dari logistik pusat.</td>
      </tr>
    </tbody>
  </table>

  <h3>(d) Alur Pengajuan Tiket Kerusakan &amp; Perbaikan (<code>/sapras/perbaikan</code>)</h3>
  <ol>
    <li>Mustahiq atau petugas piket yang mendapati fasilitas kelas rusak mengklik tombol <strong>+ Buat Laporan Kerusakan</strong>.</li>
    <li>Pilih <strong>Rombel Kelas / Lokasi Gedung</strong> yang mengalami kerusakan.</li>
    <li>Pilih jenis fasilitas yang bermasalah (<em>Papan Tulis, Meja Guru, Lampu/Penerangan, Kipas Angin, Kunci Pintu</em>).</li>
    <li>Tentukan <strong>Tingkat Urgensi</strong>:
      <ul>
        <li><code>Mendesak</code> : Menghentikan jalannya KBM (contoh: seluruh lampu padam, papan tulis jatuh).</li>
        <li><code>Sedang</code> : Mengganggu kenyamanan namun KBM masih dapat berjalan.</li>
        <li><code>Rendah</code> : Perbaikan kosmetik atau pemeliharaan berkala.</li>
      </ul>
    </li>
    <li>Unggah foto bukti kerusakan dan ketikkan keterangan detail masalah.</li>
    <li>Tim PKM Sapras meninjau tiket dan memperbarui statusnya secara bertahap:
      <br/><code>Diajukan</code> ➔ <code>Dalam Penanganan Teknisi</code> ➔ <code>Selesai Diperbaiki</code>.
    </li>
  </ol>

  <h3>(e) Manajemen Logistik &amp; Distribusi ATK KBM (<code>/sapras/logistik</code>)</h3>
  <p>
    Modul logistik memantau keluar-masuk barang habis pakai:
  </p>
  <ul>
    <li><strong>Pencatatan Stok Gudang:</strong> Menghitung sisa kuota botol tinta whiteboard, puluhan kotak spidol, dan penghapus busa.</li>
    <li><strong>Distribusi Rutin Mingguan:</strong> Setiap hari Sabtu sore sebelum bel mengajar berbunyi, perwakilan kelas mengambil paket spidol dan tinta. Petugas mencatat tanggal pengambilan dan nama santri pengambil untuk mencegah pemborosan ATK.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>6.2 Inventaris Madin &amp; Sistem Barcode Aset (<code>/sapras/inventaris-madin</code>)</h2>

  <h3>(a) Tujuan &amp; Gambaran Umum Modul</h3>
  <p>
    Modul <strong>Inventaris Madin</strong> (<code>InventarisMadinModule.tsx</code>) adalah sistem manajemen aset fisik dan perlengkapan sarana prasarana berbasis kode batang (<em>barcode / QR code</em>). Sistem ini mendata seluruh aset bernilai milik madrasah (seperti pengeras suara, proyektor, meja guru jati, almari arsip, genset, hingga perlengkapan KBM) lengkap dengan nomor identifikasi unik, riwayat mutasi antar-gedung, serta penilaian kondisi aset secara berkala.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Sapras & Master Admin', 'emerald')} Memiliki izin untuk mendaftarkan aset baru, memutakhirkan kondisi barang, melakukan mutasi lokasi, memindai barcode via kamera, serta mencetak lembar label stiker aset.
  </p>

  <h3>(c) Struktur Data Aset &amp; Master Tempat Lokasi</h3>
  <ul>
    <li>
      <strong>Master Tempat &amp; Gedung (<code>SaprasTempatLokasi</code>):</strong> Mengelompokkan aset berdasarkan nama gedung (misal: <em>Gedung Diniyyah Pusat, Asrama Al-Fattah Lt. 2, Laboratorium Bahasa</em>), nomor ruangan/lantai, nama penanggung jawab (PJ), dan kontak telepon. Pengurus dapat memfilter aset per gedung dengan mengklik tab lokasi di bagian atas.
    </li>
    <li>
      <strong>Kode Aset Unik (Barcode ID):</strong> Kode alfanumerik otomatis berstandar madrasah (contoh: <code>BRC-2026-ELK-0012</code>) yang dapat dipindai secara cepat menggunakan pemindai laser genggam maupun kamera ponsel.
    </li>
    <li>
      <strong>Kategori Barang (<code>KategoriInventarisMadin</code>):</strong> <code>Elektronik</code>, <code>Mebel &amp; Perabot</code>, <code>Audio &amp; Visual</code>, <code>Kitab &amp; Buku Perpustakaan</code>, <code>Alat Kebersihan</code>, dan <code>Perlengkapan Umum</code>.
    </li>
    <li>
      <strong>Penilaian Kondisi &amp; Valuasi:</strong> Mencatat kondisi (<em>Baik, Rusak Ringan, Rusak Berat, Hilang</em>), jumlah unit, tanggal perolehan/pembelian, serta estimasi nilai rupiah aset untuk audit kekayaan madrasah.
    </li>
  </ul>

  <h3>(d) Pemindai Barcode Kamera Real-time (<code>ModalBarcodeScanner.tsx</code>)</h3>
  <p>
    Untuk mempercepat audit stok fisik di lapangan tanpa membawa alat pemindai khusus, sistem dilengkapi pemindai kamera terintegrasi:
  </p>
  <ol>
    <li>Klik tombol berikon pemindai <strong>Pindai Barcode Aset</strong> di bilah atas.</li>
    <li>Beri izin akses kamera pada peramban ponsel atau laptop pengurus.</li>
    <li>Jika menggunakan smartphone, pengurus dapat mengklik tombol <strong>Ganti Kamera</strong> untuk menggunakan kamera belakang berlensa tajam.</li>
    <li>Arahkan jendela bidik kamera ke label stiker barcode yang tertempel pada fisik barang.</li>
    <li>Sistem secara instan mendeteksi kode barcode, membunyikan nada konfirmasi audio (<em>beep</em>), dan seketika membuka kartu detail barang tersebut untuk pemeriksaan langsung atau pembaruan status kondisi.</li>
  </ol>

  <h3>(e) Studio Desain &amp; Cetak Label Stiker Barcode (<code>ModalCetakLabelSapras.tsx</code>)</h3>
  <p>
    Sistem menyediakan studio percetakan stiker aset siap pakai yang menghasilkan kode batang berbasis grafik vektor SVG presisi tinggi (<code>generateQrSvgPath</code>) tanpa pecah saat dicetak pada kertas stiker:
  </p>
  <ol>
    <li>Pilih satu atau beberapa barang inventaris yang ingin dicetak labelnya (atau klik <em>Pilih Semua Barang di Lokasi Ini</em>).</li>
    <li>Klik tombol <strong>Cetak Label Stiker</strong>.</li>
    <li>Pilih format tata letak lembar cetak:
      <ul>
        <li><strong>Tata Letak 1 Kolom (Besar):</strong> Cocok untuk aset berukuran besar seperti almari, sound system, atau podium. Menampilkan nama madrasah, logo resmi, nama aset, barcode lebar, dan lokasi ruangan.</li>
        <li><strong>Tata Letak 2 Kolom (Sedang):</strong> Format standar label meja guru, kipas angin dinding, atau papan tulis.</li>
        <li><strong>Tata Letak 3 Kolom (Kecil - Standar Kertas Stiker Tom &amp; Jerry):</strong> Format ekonomis untuk barang berukuran kecil seperti mikrofon, kabel adaptor, dan jam dinding.</li>
      </ul>
    </li>
    <li>Periksa pratinjau lembar cetak di layar, lalu klik tombol biru <strong>Cetak Lembar Stiker (Print Document)</strong> untuk mengirim perintah langsung ke printer stiker label.</li>
  </ol>

  <h3>(f) Prosedur Mutasi Aset Antar-Ruangan</h3>
  <ol>
    <li>Cari barang yang akan dipindahkan pada tabel inventaris atau pindai barcodenya.</li>
    <li>Klik ikon panah bolak-balik <strong>Mutasi Lokasi</strong> pada baris barang.</li>
    <li>Pilih <strong>Lokasi Ruangan / Gedung Tujuan Baru</strong>.</li>
    <li>Ketikkan <strong>Nama Petugas Pemindah</strong> dan alasan mutasi (misal: <em>"Dipindahkan ke Ruang Kelas 3 Ulya B untuk persiapan imtihan"</em>).</li>
    <li>Klik <strong>Simpan Mutasi</strong>. Sistem mencatat riwayat pemindahan pada log audit aset sehingga tidak ada barang yang hilang tanpa jejak.</li>
  </ol>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>6.3 CMS Manajemen Warta Berita MADINA (<code>/kelola-berita</code>)</h2>

  <h3>(a) Tujuan &amp; Filosofi Modul</h3>
  <p>
    Modul <code>/kelola-berita</code> adalah sistem manajemen konten (CMS) internal yang dirancang khusus untuk tim redaksi jurnalistik santri MADINA Blokagung. Modul ini memungkinkan pembuatan artikel berita, pengarsipan foto kegiatan turots, serta publikasi rilis pers yang langsung tayang pada portal publik pesantren.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('Redaksi Warta & Master Admin', 'emerald')} Memiliki akses untuk membuat draf berita, menyunting teks, mengunggah foto kegiatan, menyematkan tautan video TikTok, dan menerbitkan (<em>publish</em>) artikel.
  </p>

  <h3>(c) Langkah Menulis &amp; Menerbitkan Artikel (<code>ModalFormBerita.tsx</code>)</h3>
  <ol>
    <li>Buka menu <strong>Kelola Berita</strong> pada sidebar.</li>
    <li>Klik tombol hijau <strong>+ Tulis Berita Baru</strong>.</li>
    <li>Isi kolom-kolom utama berita:
      <ul>
        <li><strong>Judul Berita:</strong> Ketik judul artikel yang menarik dan informatif.</li>
        <li><strong>Slug URL Otomatis:</strong> Sistem secara otomatis menghasilkan tautan ramah SEO saat judul diketik (misal: <em>"evaluasi-daur-tsani-kelas-unggulan"</em>).</li>
        <li><strong>Topik Berita:</strong> Pilih kategori: <code>Kelas Unggulan</code>, <code>Tingkat ULA</code>, <code>Tingkat WUSTHO</code>, atau <code>Tingkat ULYA</code>.</li>
        <li><strong>Tipe Tampilan (Display Type):</strong>
          <br/>• <code>Hero Lead</code> : Artikel unggulan besar sebelah kiri dengan gambar dominan.
          <br/>• <code>Highlight Grid</code> : Tampil pada salah satu dari 4 kotak sorotan di sisi kanan slider.
          <br/>• <code>Regular</code> : Tampil pada daftar umpan artikel berita berkala di bawah slider.
        </li>
        <li><strong>Unggah Foto Cover:</strong> Masukkan URL foto cover atau unggah langsung gambar beresolusi tajam. Sistem secara otomatis mengompres foto cover untuk kenyamanan pembaca.</li>
        <li><strong>Cuplikan Ringkasan (Excerpt):</strong> Tuliskan 1 hingga 2 kalimat pembuka yang menggugah selera baca.</li>
      </ul>
    </li>
    <li>Pilih status publikasi: <code>Published</code> (langsung tayang) atau <code>Draft</code> (disimpan sebagai konsep).</li>
    <li>Klik <strong>Simpan &amp; Publikasikan Warta</strong>.</li>
  </ol>

  <h3>(d) Fitur Khusus: Klik Kanan di Editor untuk Sisip Foto Kegiatan</h3>
  <p>
    Salah satu inovasi penting pada antarmuka penulisan berita adalah kemudahan menyisipkan dokumentasi foto di tengah paragraf teks tanpa harus mengetik kode manual:
  </p>
  <ol>
    <li>Pada area teks konten berita (<em>Textarea Content</em>), letakkan kursor pada baris baru di mana Anda ingin menaruh foto dokumentasi.</li>
    <li><strong>Klik Kanan Mouse</strong> pada posisi tersebut. Menu konteks pop-up <strong>Sisip Foto Kegiatan di Tengah Teks</strong> akan muncul tepat di posisi kursor.</li>
    <li>Pilih salah satu cara input:
      <ul>
        <li><em>Metode Unggah Cepat:</em> Klik <strong>Pilih File dari Komputer/Ponsel</strong>. Foto akan dikompres dan diunggah secara instan.</li>
        <li><em>Metode Tautan Gambar:</em> Tempelkan URL gambar yang sudah ada di internet.</li>
      </ul>
    </li>
    <li>Ketikkan <strong>Teks Keterangan Foto (Caption)</strong>, misalnya: <em>"Suasana syawir kubro santri tingkat Ulya di serambi masjid"</em>.</li>
    <li>Klik <strong>Sisipkan ke Dalam Teks</strong>.</li>
    <li>Sistem secara otomatis menginjeksikan sintaks markdown khusus:
      <br/><code>![Suasana syawir kubro santri tingkat Ulya](https://...)</code>
    </li>
    <li>Ketika artikel dibuka oleh pengunjung di halaman publik <code>/berita/[slug]</code>, sistem akan merender gambar tersebut dalam bingkai foto sudut melengkung profesional lengkap dengan teks <em>"Foto: Suasana syawir kubro..."</em> di bagian bawahnya.</li>
  </ol>

  <h3>(e) Panduan Menyematkan Video TikTok Resmi (<code>tiktok_url</code>)</h3>
  <p>
    Untuk menarik minat generasi muda dan wali santri milenial, sistem warta MADINA mendukung integrasi video pendek TikTok:
  </p>
  <ol>
    <li>Buka aplikasi TikTok atau browser, lalu salin tautan video kegiatan resmi madrasah (contoh: <code>https://www.tiktok.com/@madinblokagung/video/7391829182739182</code>).</li>
    <li>Pada formulir pembuatan berita, tempelkan tautan tersebut ke dalam kolom input <strong>Tautan Video TikTok (tiktok_url)</strong>.</li>
    <li>Simpan artikel.</li>
    <li>Sistem pada fungsi <code>extractTikTokVideoId()</code> akan mengambil ID angka unik video tersebut dan menampilkan pemutar video interaktif vertikal 9:16 di bilah samping (<em>Sticky Widget</em>) halaman pembaca. Pengunjung dapat menonton video langsung di portal madrasah tanpa dialihkan ke aplikasi lain.</li>
  </ol>
  `;
}
