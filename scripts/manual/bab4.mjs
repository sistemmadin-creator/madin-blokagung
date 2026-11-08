import { renderCallout, renderBadge } from './styles.mjs';

export function getBab4Html() {
  return `
  <div class="page-break"></div>
  <h1>BAB 4: PANDUAN OPERASIONAL PKM. MUHAFADZOH</h1>

  <h2>4.1 Setoran Muhafadzoh Kantor (<code>/setoran</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul Setoran Kantor adalah pusat pelayanan administrasi hafalan resmi MADINA Blokagung. Digunakan oleh petugas piket kantor muhafadzoh untuk mencatat setoran santri di luar jam kelas (setoran mandiri, remidi, atau uji kelayakan syahadah), menerbitkan kartu bukti setoran cetak, dan mengelola target materi hafalan wajib maupun sunnah.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Muhafadzoh & Petugas Kantor', 'emerald')} Memiliki wewenang menginput capaian, mencetak kartu, dan menyunting konfigurasi materi hafalan (<code>ModalSettingsHafalan.tsx</code>).
  </p>

  <h3>(c) Langkah Input Setoran &amp; Cetak Kartu Bukti (<code>KartuBuktiSetoran</code>)</h3>
  <ol>
    <li>Buka menu <strong>Setoran Muhafadzoh</strong>.</li>
    <li>Ketikkan <strong>No. Induk (NIS)</strong> atau nama santri pada kotak pencarian cepat. Sistem secara otomatis menarik biodata santri: nama, kelas, nama mustahiq, dan domisili kamar.</li>
    <li>Pilih <strong>Kategori Hafalan</strong>:
      <ul>
        <li><code>Wajib</code> : Target kurikulum pokok sesuai jenjang kelas.</li>
        <li><code>Sunnah</code> : Hafalan turots pelengkap.</li>
        <li><code>Tahfidz</code> : Setoran juz Al-Qur'an (Juz 1 s.d. 30).</li>
        <li><code>Kitab</code> : Hafalan matan nadzom turots (Imrithi, Maqsud, Alfiyyah).</li>
      </ul>
    </li>
    <li>Pilih <strong>Item Hafalan</strong> dan masukkan <strong>Capaian Setor</strong> (misal: <em>Bait 1 s.d. 50</em> atau <em>Surat An-Naba'</em>).</li>
    <li>Ketikkan nama <strong>Petugas Penjaga Kantor</strong> yang menyimak hafalan.</li>
    <li>Klik <strong>Simpan Setoran</strong>. Sistem akan menyimpan data dan menampilkan pratinjau fisik <strong>Kartu Bukti Setoran (rasio 6:3)</strong> bergaya sertifikat resmi pesantren klasik berbingkai ganda.</li>
    <li>Klik tombol <strong>Cetak Kartu</strong> untuk mencetak kartu fisik yang diserahkan kepada santri sebagai tanda bukti sah telah menyetorkan hafalan di kantor.</li>
  </ol>

  <h3>(d) Konfigurasi Target Numerik vs Kalimat (<code>ModalSettingsHafalan</code>)</h3>
  <p>
    Sistem mendukung dua mode evaluasi hafalan:
  </p>
  <ul>
    <li><strong>Target Numerik (Numeric Unit):</strong> Menghitung progres berbasis angka kontinu: unit <code>bait</code>, <code>baris</code>, <code>halaman</code>, atau skor <code>1–100</code>.</li>
    <li><strong>Target Kalimat / Rangkaian (Sentence / List Target):</strong> Berupa daftar nama surat Al-Qur'an atau bab-bab kitab yang dicentang berurutan.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.2 Setoran Kelas Mingguan Mustahiq (<code>/setor-mustahiq</code> &amp; <code>/setor-mustahiq/rekap</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Dalam tradisi pesantren Blokagung, setiap malam Ahad dan hari Ahad, santri di setiap rombel wajib melaksanakan lalaran mingguan di hadapan Mustahiq (Wali Kelas). Modul <code>/setor-mustahiq</code> dirancang khusus bagi Mustahiq untuk menginput capaian mingguan seluruh santri rombelnya secara efisien, serta memantau rekapitulasi semester melalui <code>/setor-mustahiq/rekap</code>.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('Mustahiq Kelas & PKM Muhafadzoh', 'emerald')} Mustahiq hanya dapat melihat dan menginput data santri yang terdaftar di kelas asuhannya.
  </p>

  <h3>(c) Langkah Penggunaan Step-by-Step</h3>
  <ol>
    <li>Buka menu <strong>Setor Mustahiq</strong>.</li>
    <li>Pilih tanggal menggunakan <strong><code>SundayDatePicker</code></strong>. Kalender ini secara otomatis mengarahkan pilihan pada hari Ahad aktif.</li>
    <li>Pilih <strong>Rombel Kelas</strong> yang Anda ampu (contoh: <code>1 A ULA (PA)</code>).</li>
    <li>Tabel memunculkan seluruh daftar santri di kelas tersebut beserta riwayat setoran minggu lalu.</li>
    <li>Ketikkan capaian terbaru atau pilih status ketuntasan per santri (<em>Lancar, Kurang Lancar, Tidak Setor</em>).</li>
    <li>Klik tombol <strong>Simpan Seluruh Capaian Rombel</strong>. Data tersimpan secara instan ke server dan antrean laporan WhatsApp otomatis disiapkan.</li>
  </ol>

  <h3>(d) Matriks Rekapitulasi Mingguan (<code>/setor-mustahiq/rekap</code>)</h3>
  <p>
    Halaman rekap menampilkan matriks kisi kolom tanggal Ahad ke-1 s.d. Ahad ke-16 dalam satu semester. Mustahiq dapat melihat santri mana yang konsisten setor dan santri mana yang sering absen lalaran melalui gradasi warna sel.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.3 Setor Cepat Massal (<code>/setor-cepat</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Ketika satu rombel kelas menyetorkan bait nadzom yang sama secara serentak (contoh: 35 santri tuntas bersamaan membaca Bab Kalam bait 1–30), modul <code>/setor-cepat</code> memungkinkan pengurus memperbarui capaian seluruh santri hanya dalam 2 kali klik.
  </p>

  <h3>(b) Langkah Operasional Setor Massal</h3>
  <ol>
    <li>Pilih kelas target dan materi nadzom yang diujikan.</li>
    <li>Gunakan tombol <strong>Centang Semua (Select All)</strong> pada daftar santri.</li>
    <li>Hapus centang pada 1 atau 2 santri yang berhalangan atau belum lancar.</li>
    <li>Ketikkan batas bait yang tuntas dicapai (contoh: <em>Bait 30</em>).</li>
    <li>Klik tombol <strong>Terapkan Setoran ke Santri Terpilih</strong>. Sistem secara otomatis memperbarui puluhan baris data santri sekaligus.</li>
  </ol>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.4 Linimasa Setor Bulanan (<code>/linimasa-setor</code>)</h2>
  <p>
    Modul linimasa menyajikan grafik visual dan kronologi setoran santri dari bulan ke bulan. Membantu pengurus muhafadzoh memantau kurva peningkatan volume hafalan menjelang periode evaluasi Nisfu Sanah dan Imtihan Akhirussanah.
  </p>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.5 Rekapitulasi Ketuntasan Hafalan (<code>/rekap-hafalan</code>)</h2>
  <p>
    Menyajikan tabel audit makro untuk pimpinan madrasah mengenai persentase kelulusan target materi wajib per jenjang:
  </p>
  <ul>
    <li><strong>Tingkat Ula:</strong> Juz 'Amma, Nadzom 'Aqidatul Awam, Al-Jurumiyyah, Al-Amtsilah At-Tashrifiyyah.</li>
    <li><strong>Tingkat Wustho:</strong> Nadzom Imrithi, Maqsud, Syi'ir Ro'sun Sirah, Al-Fara'id.</li>
    <li><strong>Tingkat Ulya:</strong> Alfiyyah Ibnu Malik (Juz 1 &amp; Juz 2), Jauharotut Tauhid, Sullamul Munauroq.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.6 Desain &amp; Cetak Piagam / Syahadah (<code>/piagam</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Digunakan untuk mencetak sertifikat penghargaan dan Piagam Syahadah resmi bagi santri yang telah dinyatakan khatam/tuntas menyelesaikan target hafalan nadzom.
  </p>

  <h3>(b) Fitur Kanvas Pratinjau (<code>PiagamCanvasPreview</code>)</h3>
  <ul>
    <li><strong>WYSIWYG Interactive Canvas:</strong> Menampilkan bentuk fisik piagam berornamen islami secara persis sebelum dicetak ke kertas linen/karton sertifikat.</li>
    <li><strong>Kustomisasi Tata Letak:</strong> Menyesuaikan posisi nama santri, nomor piagam, predikat nilai (<em>Jayyid, Jayyid Jiddan, Mumtaz</em>), kaligrafi fan kitab, tanggal Hijriyah, serta tanda tangan digital Kepala Madin dan Ketua PKM Muhafadzoh.</li>
    <li><strong>Seleksi Santri Massal (<code>ModalSelectSantriPiagam.tsx</code>):</strong> Memilih santri yang tuntas untuk dicetak secara beruntun (<em>batch printing</em>).</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.7 Checklist Serah Terima Piagam (<code>/serah-piagam</code>) [FITUR TERBARU]</h2>

  <h3>(a) Tujuan &amp; Filosofi Modul</h3>
  <p>
    Sebelum piagam fisik diserahkan kepada santri atau wali santri pada malam Haflah Akhirussanah, sering kali timbul masalah piagam hilang, salah serah, atau belum terdata siapa yang mengambil. Modul <code>/serah-piagam</code> hadir sebagai instrumen checklist dan audit digital serah terima piagam santri berbasis rombongan belajar.
  </p>

  <h3>(b) Hak Akses (RBAC)</h3>
  <p>
    ${renderBadge('PKM Muhafadzoh & Master Admin', 'emerald')} Akses penuh mencentang status serah, mengekspor laporan CSV, dan mencetak dokumen serah terima. Didaftarkan pada sistem RBAC dengan ID rute <code>serah-piagam</code>.
  </p>

  <h3>(c) Tata Letak Antarmuka &amp; Kartu Kelas 3 Kolom (<code>KartuKelasSerahPiagam.tsx</code>)</h3>
  <p>
    Antarmuka modul <code>SerahPiagamModule.tsx</code> mengusung tata letak kisi 3 kolom yang lapang dan teratur:
  </p>
  <ul>
    <li><strong>Widget Statistik Interaktif (<code>WidgetStatistikSerahPiagam.tsx</code>):</strong>
      <ul>
        <li><em>Total Santri:</em> Menampilkan seluruh populasi santri yang berhak menerima piagam.</li>
        <li><em>Sudah Menerima:</em> Kotak filter hijau menampilkan jumlah santri yang telah diserahi piagam. Klik kotak ini untuk memfilter tabel hanya menampilkan santri berstatus Menerima.</li>
        <li><em>Belum Menerima:</em> Kotak filter merah menampilkan jumlah piagam yang masih tertahan di kantor. Klik kotak ini untuk melihat siapa saja yang belum mengambil piagam.</li>
      </ul>
    </li>
    <li><strong>Kartu Rombel 3 Kolom (Desktop Grid):</strong> Menampilkan 9 rombel per halaman (3 baris x 3 kolom). Setiap kartu memuat:
      <ul>
        <li>Lencana singkatan rombel (contoh: <code>1A ULA PA</code>).</li>
        <li>Target Materi Kitab (contoh: <em>Al-Jurumiyyah &amp; Juz 'Amma</em>).</li>
        <li><strong>Rasio Ketuntasan Serah:</strong> Ditampilkan secara mencolok, misalnya <code>7/30</code> (artinya 7 dari 30 santri telah menerima piagam) beserta bilah persentase warna hijau.</li>
      </ul>
    </li>
  </ul>

  <h3>(d) Prosedur Pencentangan Status "Menerima"</h3>
  <ol>
    <li>Gunakan kotak <strong>Pencarian Cepat</strong> atau pilih filter <strong>Tingkat (Ula/Wustho/Ulya)</strong> dan <strong>Gender (PA/PI)</strong>.</li>
    <li>Temukan kartu kelas santri yang bersangkutan.</li>
    <li>Pada baris nama santri di dalam kartu kelas, klik kotak centang (<em>Checkbox</em>) <strong>Menerima</strong>.</li>
    <li>Sistem secara otomatis mencatat stempel waktu penyerahan (<code>tanggal_serah</code>) dan nama akun pengurus yang menyerahkan (<code>diserahkan_oleh</code>) ke pangkalan data Supabase.</li>
    <li>Angka rasio kartu kelas langsung bertambah (misal dari 7/30 menjadi 8/30) secara waktu nyata.</li>
  </ol>

  <h3>(e) Ekspor CSV &amp; Cetak Lembar Serah Terima Resmi</h3>
  <ul>
    <li><strong>Ekspor CSV:</strong> Klik tombol <strong>Ekspor CSV</strong> untuk mengunduh rekapitulasi penyerahan piagam lengkap dengan No Induk, Nama, Kamar, Kelas, Status Terima, dan Tanggal Penyerahan untuk pelaporan ke pimpinan yayasan.</li>
    <li><strong>Cetak Daftar Serah Terima:</strong> Klik tombol ikon printer <strong>Cetak Serah Terima</strong> untuk menghasilkan lembar tabel bertanda tangan fisik yang digunakan sebagai bukti serah terima di atas panggung haflah.</li>
  </ul>

  <hr style="border: 0; border-top: 1pt solid #e2e8f0; margin: 16pt 0;"/>

  <h2>4.8 Broadcast WhatsApp Rapor Hafalan (<code>/kirim-wa</code>)</h2>

  <h3>(a) Tujuan &amp; Fungsi Halaman</h3>
  <p>
    Modul <code>/kirim-wa</code> menjembatani komunikasi antara madrasah dengan para wali santri di rumah. Sistem secara otomatis menyusun pesan laporan berkala perkembangan hafalan santri dan mengirimkannya langsung ke nomor WhatsApp wali santri.
  </p>

  <h3>(b) Arsitektur Integrasi WAHA Proxy &amp; Gateway Baileys</h3>
  <p>
    Aplikasi terhubung dengan layanan <em>WhatsApp HTTP API (WAHA) Gateway</em> lokal pesantren (port <code>3008</code>) yang didukung oleh pustaka <code>@adiwajshing/baileys</code>:
  </p>
  <ul>
    <li><strong>Pemeriksaan Sesi QR:</strong> Pengurus memindai QR Code WhatsApp resmi sekretariat madrasah pada modul <code>wahaService.ts</code>.</li>
    <li><strong>Proxy Anti-CORS:</strong> Pengiriman pesan disalurkan melalui route handler <code>app/api/waha/[...path]/route.ts</code> sehingga aman dari pembatasan peramban.</li>
    <li><strong>Jeda Acak Anti-Banned (Delay Range):</strong> Untuk mencegah nomor resmi madrasah terblokir oleh pihak WhatsApp karena aktivitas massal (<em>spam</em>), sistem memberlakukan jeda acak antara <strong>4 hingga 7 detik</strong> (<code>delayMin: 4, delayMax: 7</code>) di setiap pengiriman pesan santri.</li>
  </ul>

  <h3>(c) Template Otomatis Pesan Laporan Rapor Hafalan</h3>
  <p>
    Format pesan yang dikirimkan ke wali santri tersusun secara rapi:
  </p>
  <div style="background-color: #f0fdf4; border: 1pt solid #bbf7d0; padding: 10pt; border-radius: 6pt; font-family: Consolas, monospace; font-size: 9.5pt; color: #166534;">
    Assalamu'alaikum Wr. Wb.<br/><br/>
    Yth. Bapak/Ibu Wali dari Ananda: <strong>{nama}</strong><br/>
    NIS: {nis} | Kelas: {kelas} | Kamar: {kamar}<br/>
    Mustahiq: {mustahiq}<br/><br/>
    Berikut laporan perkembangan setoran hafalan mingguan ananda di <em>Madrasah Diniyyah Al Amiriyyah Blokagung</em>:<br/>
    • Kategori: Hafalan Wajib<br/>
    • Target Hafalan: {materi} ({target})<br/>
    • Capaian Setoran: {capaian} ({persen}%)<br/>
    • Status: Tuntas / Berjalan<br/><br/>
    *3 Riwayat Setor Terakhir:*<br/>
    {riwayat_terakhir}<br/><br/>
    Wassalamu'alaikum Wr. Wb.<br/>
    <em>- PKM. Muhafadzoh MADINA Blokagung -</em>
  </div>
  `;
}
