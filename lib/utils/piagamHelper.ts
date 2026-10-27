import { PiagamColumnElement, PiagamTextTransform } from '@/types/piagam';

export const DEFAULT_PIAGAM_COLUMNS: PiagamColumnElement[] = [
  {
    id: 'col_1',
    title: 'Nama Penerima',
    text: '<<NAMA>>',
    x: 50,
    y: 42,
    size: 38,
    color: '#0f172a',
    fontFamily: "'Playfair Display', serif",
    isBold: true,
    align: 'center',
    textTransform: 'uppercase',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
  {
    id: 'col_2',
    title: 'Keterangan Kelulusan',
    text: 'Telah Menyelesaikan Setoran Hafalan:\n<<HAFALAN_GABUNG>>',
    x: 50,
    y: 56,
    size: 18,
    color: '#334155',
    fontFamily: "'Inter', sans-serif",
    isBold: false,
    align: 'center',
    textTransform: 'none',
    show: true,
    lockX: false,
    lockY: false,
    lockSize: false,
  },
];

export function extractGoogleDriveThumbnail(link: string): string {
  if (!link) return '';
  const cleanLink = link.trim();
  if (cleanLink.includes('drive.google.com')) {
    const fileIdMatch = cleanLink.match(/[-\w]{25,}/);
    if (fileIdMatch && fileIdMatch[0]) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[0]}&sz=w3000`;
    }
  }
  return cleanLink;
}

export function formatTanggalIndo(date: Date = new Date()): string {
  const blnIndo = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  return `${date.getDate()} ${blnIndo[date.getMonth()]} ${date.getFullYear()}`;
}

export function getHafalanSantri(noInduk: string, setoranList: any[] = []): string {
  if (!noInduk || !setoranList || setoranList.length === 0) return '-';
  const targetInduk = String(noInduk).trim();
  const riwayat = setoranList.filter(
    (m) => String(m.no_induk || m[1] || '').trim() === targetInduk
  );
  if (riwayat.length === 0) return '-';
  const unik = Array.from(
    new Set(
      riwayat
        .map((m) => String(m.item_hafalan || m[17] || '').trim())
        .filter(Boolean)
    )
  );
  return unik.length > 0 ? unik.join(', ') : '-';
}

export function getHafalanTerakhirSantri(noInduk: string, setoranList: any[] = []): string {
  if (!noInduk || !setoranList || setoranList.length === 0) return '-';
  const targetInduk = String(noInduk).trim();
  const riwayat = setoranList.filter(
    (m) => String(m.no_induk || m[1] || '').trim() === targetInduk
  );
  if (riwayat.length === 0) return '-';
  const terakhir = riwayat[riwayat.length - 1];
  return (terakhir?.item_hafalan || terakhir?.[17] || '-').trim();
}

export function parseMergeTags(
  text: string,
  santri: any | null,
  setoranList: any[] = [],
  transform: PiagamTextTransform = 'none'
): string {
  if (!text) return '';
  let parsed = text;

  if (santri) {
    const sInduk = String(santri.no_induk || santri[1] || '').trim();
    const sNama = String(santri.nama || santri[5] || '').trim();
    const sNisn = String(santri.nisn || santri[3] || '').trim();
    const sTtl = `${santri.tempat_lahir || santri[6] || '-'}, ${
      santri.tgl_lahir || santri[7] || ''
    } ${santri.bln_lahir || santri[8] || ''} ${santri.thn_lahir || santri[9] || ''}`.trim();
    const sGender =
      (santri.pa_pi || santri[4]) === 'PA'
        ? 'Putra'
        : (santri.pa_pi || santri[4]) === 'PI'
        ? 'Putri'
        : '';
    const sAlamat = `Ds. ${santri.desa || santri[11] || '-'}, Kec. ${
      santri.kecamatan || santri[12] || '-'
    }, Kab. ${santri.kabupaten || santri[13] || '-'}`;
    const sKelas = `${santri.din_kls || santri[24] || ''} ${
      santri.din_bag || santri[25] || ''
    } ${santri.tingkat || santri[26] || ''}`.trim();
    const sKamar = `${santri.asrama || santri[17] || ''} - ${
      santri.kamar || santri[18] || ''
    }`.trim();
    const sNamaAyah = String(santri.nama_ayah || santri[30] || '').trim();
    const sNoTelp = String(santri.telepon || santri[34] || '').trim();
    const sHafalanGabung = getHafalanSantri(sInduk, setoranList);
    const sHafalanTerakhir = getHafalanTerakhirSantri(sInduk, setoranList);
    const sTglSekarang = formatTanggalIndo();
    const sThnAjaran = '2026/2027';

    const tagValues: Record<string, string> = {
      '<<NAMA>>': sNama,
      '<<NO_INDUK>>': sInduk,
      '<<NISN>>': sNisn,
      '<<TTL>>': sTtl,
      '<<GENDER>>': sGender,
      '<<ALAMAT>>': sAlamat,
      '<<KELAS>>': sKelas,
      '<<KAMAR>>': sKamar,
      '<<NAMA_AYAH>>': sNamaAyah,
      '<<NO_TELEPON>>': sNoTelp,
      '<<HAFALAN_GABUNG>>': sHafalanGabung,
      '<<HAFALAN_TERAKHIR>>': sHafalanTerakhir,
      '<<TANGGAL_SEKARANG>>': sTglSekarang,
      '<<TAHUN_AJARAN>>': sThnAjaran,
    };

    for (const [tag, val] of Object.entries(tagValues)) {
      if (parsed.includes(tag)) {
        parsed = parsed.split(tag).join(val || '');
      }
    }

    // Dynamic tag hafalan target: <<HAFALAN:NamaHafalan>>
    if (setoranList.length > 0) {
      const regex = /<<HAFALAN:(.*?)>>/g;
      parsed = parsed.replace(regex, (_, targetItem) => {
        const targetClean = String(targetItem || '').trim().toLowerCase();
        const riwayat = setoranList.filter(
          (m) => String(m.no_induk || m[1] || '').trim() === sInduk
        );
        const isLulus = riwayat.some((m) => {
          const item = String(m.item_hafalan || m[17] || '').trim().toLowerCase();
          return item.includes(targetClean) || targetClean.includes(item);
        });
        return isLulus ? targetItem.trim() : '';
      });
    }
  }

  // Text Transform
  if (transform === 'uppercase') {
    return parsed.toUpperCase();
  } else if (transform === 'lowercase') {
    return parsed.toLowerCase();
  } else if (transform === 'capitalize') {
    return parsed.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return parsed;
}
