/**
 * Master Assembler Dokumen Buku Panduan MADINA Blokagung (.doc)
 * Menggabungkan seluruh modul bab (Pendahuluan s.d. Bab 7)
 * ke dalam format Microsoft Word Document (.doc) berbasis MSO HTML/XML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { documentStyles } from './styles.mjs';
import { getPendahuluanHtml } from './pendahuluan.mjs';
import { getBab1Html } from './bab1.mjs';
import { getBab2Html } from './bab2.mjs';
import { getBab3Html } from './bab3.mjs';
import { getBab4Html } from './bab4.mjs';
import { getBab5Html } from './bab5.mjs';
import { getBab6Html } from './bab6.mjs';
import { getBab7Html } from './bab7.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../../docs');
const targetFile = path.join(targetDir, 'Buku_Panduan_Aplikasi_MADINA_Blokagung.doc');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

console.log('🔄 Menyusun konten buku panduan modular...');

const fullHtmlDocument = `
<html xmlns:o='urn:schemas-microsoft-com:office:office'
      xmlns:w='urn:schemas-microsoft-com:office:word'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Buku Panduan Pengguna &amp; Administrator Sistem Informasi MADINA Blokagung</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
      <w:Compatibility>
        <w:UseWord2013TrackBottomHyphenation/>
      </w:Compatibility>
    </w:WordDocument>
  </xml>
  <![endif]-->
  ${documentStyles}
</head>
<body>
  <!-- BAGIAN PENDAHULUAN & SAMPUL -->
  ${getPendahuluanHtml()}

  <!-- BAB 1: PENGENALAN EKOSISTEM & FITUR GLOBAL APLIKASI -->
  ${getBab1Html()}

  <!-- BAB 2: BERANDA ANALITIK, DATA MASTER & RUANG KERJA UMUM -->
  ${getBab2Html()}

  <!-- BAB 3: PANDUAN OPERASIONAL PKM. KURIKULUM -->
  ${getBab3Html()}

  <!-- BAB 4: PANDUAN OPERASIONAL PKM. MUHAFADZOH -->
  ${getBab4Html()}

  <!-- BAB 5: PANDUAN OPERASIONAL PKM. KESISWAAN -->
  ${getBab5Html()}

  <!-- BAB 6: PANDUAN OPERASIONAL PKM. SAPRAS & PUBLIKASI -->
  ${getBab6Html()}

  <!-- BAB 7: PENGATURAN SISTEM, HAK AKSES (RBAC) & TROUBLESHOOTING -->
  ${getBab7Html()}
</body>
</html>
`;

fs.writeFileSync(targetFile, fullHtmlDocument.trim(), 'utf-8');

const stats = fs.statSync(targetFile);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log('================================================================');
console.log('✅ BUKU PANDUAN RESMI BERHASIL DIBUAT DENGAN SEMPURNA!');
console.log(`📁 Lokasi Dokumen: ${targetFile}`);
console.log(`📊 Ukuran File   : ${fileSizeKB} KB (${stats.size} bytes)`);
console.log('================================================================');
