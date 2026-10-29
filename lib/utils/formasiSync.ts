import { FormasiKelas } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { Santri } from '@/types/santri';

export const VALID_JAH_WALIKELAS = ['MUSTAHIQ', 'MS & KOOR', 'MUSTAHIQOH'];

export function norm(val: string | number | null | undefined): string {
  return String(val || '').trim().toUpperCase();
}

/**
 * Mencari Asatidz yang bertugas sebagai Wali Kelas (Mustahiq, MS & Koor, Mustahiqoh)
 * sesuai Tingkat, Kelas, Bagian, dan Gender pada Formasi Kelas
 */
export function findWaliKelasAsatidz(f: Partial<FormasiKelas>, listAsatidz: Asatidz[]): Asatidz[] {
  if (!f || !listAsatidz || listAsatidz.length === 0) return [];

  const fTingkat = norm(f.tingkat);
  const fKls = norm(f.din_kls);
  const fBag = norm(f.din_bag);
  const fGender = norm(f.pa_pi);

  return listAsatidz.filter((a) => {
    const jah = norm(a.jah_asatidz);
    if (!VALID_JAH_WALIKELAS.includes(jah)) return false;

    const matchTingkat = norm(a.tingkat_asatidz) === fTingkat;
    const matchKls = norm(a.din_kls_asatidz) === fKls;
    const matchBag = norm(a.din_bag_asatidz) === fBag;
    const matchGender = !fGender || !a.pa_pi || norm(a.pa_pi) === fGender;

    return matchTingkat && matchKls && matchBag && matchGender;
  });
}

/**
 * Mengambil informasi gabungan Formasi & Asatidz Wali Kelas (termasuk fallback lokasi/domisili)
 */
export function getWaliKelasSyncInfo(f: Partial<FormasiKelas>, listAsatidz: Asatidz[]) {
  const matchedAsatidz = findWaliKelasAsatidz(f, listAsatidz);

  let waliKelasText = f.id_mustahiq || '-';
  if (matchedAsatidz.length > 0) {
    waliKelasText = matchedAsatidz.map((a) => a.nama_asatidz).join(', ');
  }

  const primaryAsatidz = matchedAsatidz[0] || null;

  // Nilai murni dari Formasi Kelas (tanpa fallback pinjaman dari data pribadi asatidz)
  const domisili = f.domisili || '-';
  const lokasiTakror = f.lokasi_takror || '-';
  const lokasiDiniyyah = f.lokasi_diniyyah || '-';
  const blokDiniyyah = f.blok_diniyyah || '-';
  const blokTakror = f.blok_takror || '-';
  const fotoTakror = f.foto_takror || '';
  const fotoDiniyyah = f.foto_diniyyah || '';

  return {
    matchedAsatidz,
    waliKelasText,
    domisili,
    lokasiTakror,
    lokasiDiniyyah,
    blokDiniyyah,
    blokTakror,
    fotoTakror,
    fotoDiniyyah,
  };
}

/**
 * Mengambil daftar santri dari listSantri yang masuk ke dalam Formasi Kelas ini
 */
export function getSantriInFormasi(f: Partial<FormasiKelas>, listSantri: Santri[]): Santri[] {
  if (!f || !listSantri || listSantri.length === 0) return [];

  const fTingkat = norm(f.tingkat);
  const fKls = norm(f.din_kls);
  const fBag = norm(f.din_bag);
  const fGender = norm(f.pa_pi);

  const matched = listSantri.filter((s) => {
    const matchTingkat = norm(s.tingkat) === fTingkat;
    const matchKls = norm(s.din_kls) === fKls;
    const matchBag = norm(s.din_bag) === fBag;
    const matchGender = !fGender || !s.pa_pi || norm(s.pa_pi) === fGender;

    return matchTingkat && matchKls && matchBag && matchGender;
  });

  return matched.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
}
