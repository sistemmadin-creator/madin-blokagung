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
export function sortAsatidzByKodeNatural<T extends { kode_guru?: string; nia?: string }>(list: T[]): T[] {
  return (list || []).slice().sort((a, b) => {
    const niaA = String(a?.kode_guru || '').trim();
    const niaB = String(b?.kode_guru || '').trim();
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
 * Mengambil daftar nama kelas yang berstatus Unggulan (`is_unggulan === true`) dari master formasi.
 * Jika parameter `papi` diberikan ('PA' atau 'PI'), hanya mengambil kelas unggulan untuk gender tersebut.
 */
export function getDaftarKelasUnggulan(formasiList: Formasi[], papi?: string): string[] {
  const setUg = new Map<string, string>();

  let filterGender = '';
  if (papi) {
    const p = String(papi).trim().toUpperCase();
    if (p === 'PA' || p === 'PUTRA') filterGender = 'PA';
    else if (p === 'PI' || p === 'PUTRI') filterGender = 'PI';
  }

  (formasiList || []).forEach((f) => {
    if (f && f.is_unggulan) {
      const fPapi = String(f.pa_pi || '').trim().toUpperCase();
      const fGender =
        fPapi === 'PA' || fPapi === 'PUTRA'
          ? 'PA'
          : fPapi === 'PI' || fPapi === 'PUTRI'
          ? 'PI'
          : '';

      if (filterGender && fGender && fGender !== filterGender) {
        return;
      }

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
 * Mengecek apakah suatu nama kelas ("1 A ULA", "2 A ULYA (PA)") berstatus Kelas Unggulan.
 * Mendukung deteksi gender langsung dari string atau parameter opsional `papi` ('PA' / 'PI')
 * sehingga kelas Putra dan Putri dinilai secara presisi dan independen.
 */
export function isKelasUnggulan(
  namaKelas: string,
  formasiList: Formasi[],
  papi?: string
): boolean {
  if (!formasiList || formasiList.length === 0) return false;

  let targetGender = '';
  if (papi) {
    const pUpper = String(papi).trim().toUpperCase();
    if (pUpper === 'PA' || pUpper === 'PUTRA') targetGender = 'PA';
    else if (pUpper === 'PI' || pUpper === 'PUTRI') targetGender = 'PI';
  } else {
    const match = String(namaKelas).match(/\b(PA|PI|PUTRA|PUTRI)\b/i);
    if (match) {
      const g = match[1].toUpperCase();
      targetGender = g === 'PA' || g === 'PUTRA' ? 'PA' : 'PI';
    }
  }

  const cleanNama = normalisasiKelasBandingUnggulan(namaKelas);

  if (targetGender) {
    const match = (formasiList || []).find((f) => {
      const fKls = String(f.din_kls || '').trim();
      const fBag = String(f.din_bag || '').trim().toUpperCase();
      const fTingkat = String(f.tingkat || '').trim().toUpperCase();
      const fPapi = String(f.pa_pi || '').trim().toUpperCase();
      const fGender =
        fPapi === 'PA' || fPapi === 'PUTRA'
          ? 'PA'
          : fPapi === 'PI' || fPapi === 'PUTRI'
          ? 'PI'
          : '';

      const fNamaClean = normalisasiKelasBandingUnggulan(`${fKls} ${fBag} ${fTingkat}`);
      return fNamaClean === cleanNama && fGender === targetGender;
    });

    if (match) {
      return Boolean(match.is_unggulan);
    }
  }

  return getDaftarKelasUnggulan(formasiList, targetGender).some(
    (k) => normalisasiKelasBandingUnggulan(k) === cleanNama
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
 * Mengekstrak daftar kelas unggulan unik ({ tingkat, kls }) dari master Formasi (is_unggulan === true)
 */
export function getDaftarKelasUnggulanUnik(
  formasiList: Formasi[]
): Array<{ tingkat: string; kls: string }> {
  const mapKelas = new Set<string>();

  (formasiList || []).forEach((f) => {
    if (f && f.is_unggulan) {
      const tingkat = String(f.tingkat || '').trim().toUpperCase();
      const kls = String(f.din_kls || '').trim().toUpperCase();
      if (tingkat && kls) {
        mapKelas.add(JSON.stringify({ tingkat, kls }));
      }
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
    const klsNum = p[0];
    const tkt = p[p.length - 1];
    // Coba format baru "${kls} ${tingkat} (Ug)"
    const ugUnifiedKey = `${klsNum} ${tkt} (Ug)`;
    if (Array.isArray(cfg[ugUnifiedKey]) && cfg[ugUnifiedKey].length) return cfg[ugUnifiedKey];
    // Fallback ke reguler "${kls} ${tingkat}"
    const fb = `${klsNum} ${tkt}`;
    if (Array.isArray(cfg[fb])) return cfg[fb];
  }
  return null;
}

/**
 * Mengambil daftar bagian (din_bag) yang berstatus Unggulan untuk Tingkat dan Din. Kls tertentu
 */
export function getDaftarBagUnggulanTingkatKls(
  tingkat: string,
  dinKls: string,
  formasiList: Formasi[]
): string[] {
  const tktUpper = String(tingkat || '').trim().toUpperCase();
  const klsStr = String(dinKls || '').trim();
  const bagSet = new Set<string>();

  (formasiList || []).forEach((f) => {
    if (
      f &&
      f.is_unggulan &&
      String(f.tingkat || '').trim().toUpperCase() === tktUpper &&
      String(f.din_kls || '').trim() === klsStr
    ) {
      const bag = String(f.din_bag || '').trim().toUpperCase();
      if (bag) bagSet.add(bag);
    }
  });

  return Array.from(bagSet).sort();
}

/**
 * Mengambil daftar nama Mustahiq berdasarkan Cakupan (Reguler vs Unggulan)
 * Menjamin Mustahiq kelas Unggulan tidak bocor ke kelas Reguler, dan sebaliknya.
 */
export function getMustahiqByScope(
  params: {
    tingkat: string;
    dinKls: string;
    scope: 'reguler' | 'unggulan';
    selectedBag?: string; // Jika 'ALL' atau kosong, mencakup semua bagian pada cakupan tersebut
  },
  asatidzList: Asatidz[],
  formasiList: Formasi[]
): string[] {
  const tktUpper = String(params.tingkat || '').trim().toUpperCase();
  const klsStr = String(params.dinKls || '').trim();
  const selBag = String(params.selectedBag || '').trim().toUpperCase();
  const daftarBagUg = getDaftarBagUnggulanTingkatKls(tktUpper, klsStr, formasiList);
  const result: string[] = [];

  (asatidzList || []).forEach((a) => {
    const rTkt = String(a.tingkat_asatidz || '').trim().toUpperCase();
    const rKls = String(a.din_kls_asatidz || '').trim();
    const rBag = String(a.din_bag_asatidz || '').trim().toUpperCase();
    const rNama = String(a.nama_asatidz || '').trim();

    if (!rNama || rTkt !== tktUpper || rKls !== klsStr) return;

    const { isMS } = cekKategoriJahAsatidz(a.jah_asatidz);
    if (!isMS) return;

    const isUgBag = daftarBagUg.includes(rBag) || isKelasUnggulan(`${klsStr} ${rBag} ${tktUpper}`, formasiList);

    if (params.scope === 'reguler') {
      // Untuk kelas reguler, HANYA masukkan Mustahiq yang BUKAN kelas unggulan
      if (!isUgBag) {
        if (!result.includes(rNama)) result.push(rNama);
      }
    } else {
      // Untuk kelas unggulan, HANYA masukkan Mustahiq kelas unggulan
      if (isUgBag) {
        if (selBag && selBag !== 'ALL') {
          if (rBag === selBag && !result.includes(rNama)) {
            result.push(rNama);
          }
        } else {
          if (!result.includes(rNama)) result.push(rNama);
        }
      }
    }
  });

  return result;
}

