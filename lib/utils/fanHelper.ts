import { Formasi } from '@/types/formasi';
import { Asatidz } from '@/types/asatidz';
import { FanConfigMap, ParsedFanItem } from '@/types/fan';

export const URUTAN_TINGKAT: Record<string, number> = {
  ULA: 1,
  WUSTHO: 2,
  ULYA: 3,
  "ISTI'DAD": 4,
  IST: 4,
};

/**
 * Natural Sort berdasarkan Kode / NIA (A1, A2, A3 ... A10, lalu B1, B2 ... dst.)
 */
export function compareNIANatural(niaA: string | undefined | null, niaB: string | undefined | null): number {
  const strA = String(niaA || '').trim().toUpperCase();
  const strB = String(niaB || '').trim().toUpperCase();
  const mA = strA.match(/^([A-Za-z]*)(\d+)/);
  const mB = strB.match(/^([A-Za-z]*)(\d+)/);
  if (mA && mB) {
    const letA = mA[1], letB = mB[1];
    if (letA !== letB) return letA.localeCompare(letB);
    return parseInt(mA[2], 10) - parseInt(mB[2], 10);
  }
  return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Mengurutkan array Asatidz berdasarkan properti `nia` secara natural
 */
export function sortAsatidzByKodeNatural<T extends { nia?: string }>(list: T[]): T[] {
  return (list || []).slice().sort((a, b) => {
    const niaA = String(a?.nia || '').trim();
    const niaB = String(b?.nia || '').trim();
    if (!niaA && !niaB) return 0;
    if (!niaA) return 1;
    if (!niaB) return -1;
    return compareNIANatural(niaA, niaB);
  });
}

/**
 * Konversi angka kelas ke angka Romawi (1 -> I, 2 -> II, 3 -> III, 4 -> IV, dst.)
 */
export function toRomanNumeralKls(numStr: string | number): string {
  const n = parseInt(String(numStr), 10);
  if (isNaN(n)) return String(numStr || '');
  const romanMap: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI' };
  return romanMap[n] || String(numStr);
}

/**
 * Memecah format "(NamaFan) Nama Kitab/Mapel"
 * Contoh: "(Fiqih) Mabadi Fiqih Juz I II III" -> { fan: "Fiqih", mapel: "Mabadi Fiqih Juz I II III" }
 */
export function parseFanItemString(itemStr: string | null | undefined): ParsedFanItem {
  if (!itemStr) return { fan: '-', mapel: '-' };
  const str = String(itemStr).trim();
  const match = str.match(/^\s*\(([^)]+)\)\s*(.*)$/);
  if (match) {
    return {
      fan: match[1].trim() || '-',
      mapel: match[2].trim() || '-',
    };
  }
  return {
    fan: '-',
    mapel: str,
  };
}

/**
 * Klasifikasi Jabatan (Jah) Asatidz menjadi MS (Mustahiq) vs MB (Munawib)
 */
export function cekKategoriJahAsatidz(jahStr: string | null | undefined): { isMS: boolean; isMB: boolean } {
  const j = String(jahStr || '').trim().toLowerCase();
  const isMS =
    j === 'mustahiq' ||
    j === 'mustahiqoh' ||
    j === 'ms & koor' ||
    j === 'ist' ||
    j.includes("isti'dad");
  const isMB =
    j === 'munawib' ||
    j === 'munawibah' ||
    j === 'mb & top' ||
    j === 'mb & media' ||
    j === 'tm & mb' ||
    j === 'tu & mb';
  return { isMS, isMB };
}

export function normalisasiKelasBandingUnggulan(str: string | null | undefined): string {
  return String(str || '')
    .replace(/\(\s*(Ug|PA|PI)\s*\)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Mengambil daftar nama kelas yang berstatus Unggulan (`is_unggulan === true`) dari master formasi
 */
export function getDaftarKelasUnggulan(formasiList: Formasi[]): string[] {
  const setUg = new Map<string, string>();

  (formasiList || []).forEach((f) => {
    if (f && f.is_unggulan) {
      const kls = String(f.din_kls || '').trim();
      const bag = String(f.din_bag || '').trim().toUpperCase();
      const tingkat = String(f.tingkat || '').trim().toUpperCase();
      if (kls && bag && tingkat) {
        const nama = `${kls} ${bag} ${tingkat}`;
        setUg.set(normalisasiKelasBandingUnggulan(nama), nama);
      }
    }
  });

  return Array.from(setUg.values());
}

/**
 * Mengecek apakah suatu nama kelas ("1 A ULA") berstatus Kelas Unggulan
 */
export function isKelasUnggulan(namaKelas: string, formasiList: Formasi[]): boolean {
  const clean = normalisasiKelasBandingUnggulan(namaKelas);
  return getDaftarKelasUnggulan(formasiList).some(
    (k) => normalisasiKelasBandingUnggulan(k) === clean
  );
}

/**
 * Mengekstrak daftar kelas reguler unik ({ tingkat, kls }) dari gabungan master Formasi dan Asatidz
 */
export function getDaftarKelasUnikDariMaster(
  formasiList: Formasi[],
  asatidzList: Asatidz[]
): Array<{ tingkat: string; kls: string }> {
  const mapKelas = new Set<string>();

  (formasiList || []).forEach((f) => {
    const tingkat = String(f.tingkat || '').trim().toUpperCase();
    const kls = String(f.din_kls || '').trim().toUpperCase();
    if (tingkat && kls) {
      mapKelas.add(JSON.stringify({ tingkat, kls }));
    }
  });

  (asatidzList || []).forEach((a) => {
    const tingkat = String(a.tingkat_asatidz || '').trim().toUpperCase();
    const kls = String(a.din_kls_asatidz || '').trim().toUpperCase();
    if (tingkat && kls) {
      mapKelas.add(JSON.stringify({ tingkat, kls }));
    }
  });

  const arr = Array.from(mapKelas).map((s) => JSON.parse(s) as { tingkat: string; kls: string });
  arr.sort((a, b) => {
    const orderA = URUTAN_TINGKAT[a.tingkat] || 99;
    const orderB = URUTAN_TINGKAT[b.tingkat] || 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.kls.localeCompare(b.kls, undefined, { numeric: true });
  });

  return arr;
}

/**
 * Mengambil daftar item fan dari config dengan fallback jika Unggulan belum didefinisikan secara khusus
 */
export function getItemsKonfigFanKelas(
  kelasKey: string,
  fanConfig: FanConfigMap
): string[] | null {
  const cfg = fanConfig || {};
  if (Array.isArray(cfg[kelasKey]) && cfg[kelasKey].length) return cfg[kelasKey];
  if (/\(Ug\)\s*$/i.test(kelasKey)) {
    const p = kelasKey.replace(/\s*\(Ug\)\s*$/i, '').trim().split(/\s+/);
    const fb = p[0] + ' ' + p[p.length - 1];
    if (Array.isArray(cfg[fb])) return cfg[fb];
  }
  return null;
}
