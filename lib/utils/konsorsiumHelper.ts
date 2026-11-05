import { JenisKonsorsium, PertemuanInfo } from '@/types/konsorsium';

export const NAMA_BULAN_IND = [
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

export const NAMA_BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agt',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/**
 * Menentukan indeks hari dalam seminggu untuk jenis konsorsium
 * Mustahiq/qoh = Hari KAMIS (index 4)
 * Munawib/bah  = Hari SELASA (index 2)
 */
export function getHariIndexKonsorsium(jenis: JenisKonsorsium): number {
  return jenis === 'Mustahiq/qoh' ? 4 : 2;
}

export function getHariNamaKonsorsium(jenis: JenisKonsorsium): string {
  return jenis === 'Mustahiq/qoh' ? 'Kamis' : 'Selasa';
}

/**
 * Menghasilkan daftar tanggal pertemuan (1, 2, 3, 4, [5]) dalam suatu bulan
 * berdasarkan hari wajib jenis konsorsium (Kamis untuk Mustahiq/qoh, Selasa untuk Munawib/bah)
 */
export function getDaftarPertemuanBulan(
  tahun: number,
  bulan1Based: number, // 1 = Januari ... 12 = Desember
  jenis: JenisKonsorsium
): PertemuanInfo[] {
  const targetDay = getHariIndexKonsorsium(jenis);
  const hariNama = getHariNamaKonsorsium(jenis);

  // Jumlah hari dalam bulan tertentu
  const daysInMonth = new Date(tahun, bulan1Based, 0).getDate();
  const list: PertemuanInfo[] = [];

  let count = 1;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(tahun, bulan1Based - 1, day);
    if (d.getDay() === targetDay) {
      const dd = String(day).padStart(2, '0');
      const mm = String(bulan1Based).padStart(2, '0');
      const tanggalISO = `${tahun}-${mm}-${dd}`;
      const blnShort = NAMA_BULAN_PENDEK[bulan1Based - 1];

      list.push({
        ke: count,
        tanggal: tanggalISO,
        labelTanggal: `${dd}/${mm}`,
        hariNama,
        fullFormatted: `${hariNama}, ${dd} ${blnShort} ${tahun}`,
      });
      count++;
    }
  }

  return list;
}

export interface BulanTahunAjaran {
  tahun: number;
  bulan: number; // 1-12
  namaBulan: string;
  pertemuanList: PertemuanInfo[];
}

/**
 * Menghitung rentang Tahun Ajaran Madin:
 * Berjalan dari bulan JULI tahun awal s/d JUNI tahun berikutnya (12 Bulan).
 * Otomatis bergeser ke tahun berikutnya jika sudah melewati 30 Juni!
 */
export function getTahunAjaranKonsorsium(
  refDate: Date = new Date(),
  jenis: JenisKonsorsium = 'Mustahiq/qoh'
): {
  startYear: number;
  endYear: number;
  labelTahunAjaran: string;
  bulanList: BulanTahunAjaran[];
} {
  const currentMonth = refDate.getMonth() + 1; // 1 - 12
  const currentYear = refDate.getFullYear();

  let startYear = currentYear;
  let endYear = currentYear + 1;

  // Jika sebelum Juli (Januari - Juni), kita masih berada di paruh akhir tahun ajaran sebelumnya
  if (currentMonth < 7) {
    startYear = currentYear - 1;
    endYear = currentYear;
  }

  // 12 Bulan: Juli(7)..Desember(12) di startYear, lalu Januari(1)..Juni(6) di endYear
  const urutanBulan: { bulan: number; tahun: number }[] = [
    { bulan: 7, tahun: startYear },
    { bulan: 8, tahun: startYear },
    { bulan: 9, tahun: startYear },
    { bulan: 10, tahun: startYear },
    { bulan: 11, tahun: startYear },
    { bulan: 12, tahun: startYear },
    { bulan: 1, tahun: endYear },
    { bulan: 2, tahun: endYear },
    { bulan: 3, tahun: endYear },
    { bulan: 4, tahun: endYear },
    { bulan: 5, tahun: endYear },
    { bulan: 6, tahun: endYear },
  ];

  const bulanList: BulanTahunAjaran[] = urutanBulan.map(({ bulan, tahun }) => ({
    tahun,
    bulan,
    namaBulan: NAMA_BULAN_IND[bulan - 1],
    pertemuanList: getDaftarPertemuanBulan(tahun, bulan, jenis),
  }));

  return {
    startYear,
    endYear,
    labelTahunAjaran: `${startYear}/${endYear}`,
    bulanList,
  };
}
