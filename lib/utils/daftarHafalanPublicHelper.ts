import {
  DEFAULT_HAFALAN_WAJIB,
  normalizeToItemDetail,
} from '@/lib/utils/setoranHelper';
import {
  HafalanItemType,
  ItemHafalanDetail,
  SilabusConfigMap,
  SilabusItemRule,
} from '@/types/setoran';

export type JenjangHafalanSlug = 'ula' | 'wustho' | 'ulya';

export type KategoriHafalanPublic = 'Wajib' | 'Sunnah' | 'Kitab';

export interface PublicHafalanPayload {
  hafWajib: Record<string, HafalanItemType[]>;
  hafSunnah: Record<string, HafalanItemType[]>;
  hafKitab: Record<string, HafalanItemType[]>;
  silabus: SilabusConfigMap;
}

export interface PublicHafalanItemView {
  id: string;
  nama: string;
  kategori: KategoriHafalanPublic;
  detail: ItemHafalanDetail;
  silabusBulan?: string;
}

export interface PublicHafalanKelasGroup {
  tingkatKey: string;
  labelKelas: string;
  items: PublicHafalanItemView[];
}

export const JENJANG_HAFALAN_ORDER: JenjangHafalanSlug[] = ['ula', 'wustho', 'ulya'];

export const JENJANG_HAFALAN_META: Record<
  JenjangHafalanSlug,
  {
    slug: JenjangHafalanSlug;
    label: string;
    judul: string;
    ringkasan: string;
    prefix: string;
  }
> = {
  ula: {
    slug: 'ula',
    label: 'ULA',
    judul: 'Daftar Hafalan Jenjang Ula',
    ringkasan:
      'Materi hafalan wajib, sunnah, dan kitab tingkat dasar (Kelas 1 – 4 Ula) Madrasah Diniyyah Al-Amiriyyah.',
    prefix: 'ULA_',
  },
  wustho: {
    slug: 'wustho',
    label: 'WUSTHO',
    judul: 'Daftar Hafalan Jenjang Wustho',
    ringkasan:
      'Materi hafalan wajib, sunnah, dan kitab tingkat menengah (Kelas 1 – 2 Wustho) Madrasah Diniyyah Al-Amiriyyah.',
    prefix: 'WUSTHO_',
  },
  ulya: {
    slug: 'ulya',
    label: 'ULYA',
    judul: 'Daftar Hafalan Jenjang Ulya',
    ringkasan:
      'Materi hafalan wajib, sunnah, dan kitab tingkat tinggi (Kelas 1 – 2 Ulya) Madrasah Diniyyah Al-Amiriyyah.',
    prefix: 'ULYA_',
  },
};

export const FALLBACK_PUBLIC_HAFALAN_PAYLOAD: PublicHafalanPayload = {
  hafWajib: DEFAULT_HAFALAN_WAJIB,
  hafSunnah: {},
  hafKitab: {},
  silabus: {},
};

export function parseJenjangSlug(raw?: string | null): JenjangHafalanSlug {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'wustho') return 'wustho';
  if (val === 'ulya') return 'ulya';
  return 'ula';
}

export function formatTingkatKeyLabel(tingkatKey: string): string {
  const clean = String(tingkatKey || '').trim().toUpperCase();
  const parts = clean.split('_');
  if (parts.length === 2 && /^\d+$/.test(parts[1])) {
    return `Kelas ${parts[1]} ${parts[0]}`;
  }
  return clean.replace(/_/g, ' ');
}

function findSilabusScheduleText(
  rules: SilabusItemRule[] | undefined,
  materiNama: string,
  kategori: KategoriHafalanPublic
): string | undefined {
  if (!Array.isArray(rules) || rules.length === 0) return undefined;
  const targetName = materiNama.trim().toLowerCase();
  const match = rules.find(
    (r) =>
      r.materi_nama.trim().toLowerCase() === targetName &&
      (!r.kategori || r.kategori.toLowerCase() === kategori.toLowerCase())
  );
  if (!match) return undefined;
  if (match.dari_bulan_nama && match.sampai_bulan_nama) {
    return `${match.dari_bulan_nama} – ${match.sampai_bulan_nama}`;
  }
  return undefined;
}

export function buildDaftarHafalanGroups(
  payload: PublicHafalanPayload,
  jenjang: JenjangHafalanSlug
): PublicHafalanKelasGroup[] {
  const prefix = JENJANG_HAFALAN_META[jenjang].prefix;

  const keySet = new Set<string>();
  [payload.hafWajib, payload.hafSunnah, payload.hafKitab].forEach((bucket) => {
    if (!bucket || typeof bucket !== 'object') return;
    Object.keys(bucket).forEach((k) => {
      const upper = k.trim().toUpperCase();
      if (upper.startsWith(prefix) || upper === jenjang.toUpperCase()) {
        keySet.add(k);
      }
    });
  });

  const sortedKeys = Array.from(keySet).sort((a, b) => {
    const numA = parseInt(a.replace(/\D+/g, ''), 10) || 0;
    const numB = parseInt(b.replace(/\D+/g, ''), 10) || 0;
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });

  const buckets: { data: Record<string, HafalanItemType[]>; kategori: KategoriHafalanPublic }[] = [
    { data: payload.hafWajib || {}, kategori: 'Wajib' },
    { data: payload.hafSunnah || {}, kategori: 'Sunnah' },
    { data: payload.hafKitab || {}, kategori: 'Kitab' },
  ];

  return sortedKeys
    .map((tingkatKey) => {
      const items: PublicHafalanItemView[] = [];
      const silabusRules = payload.silabus?.[tingkatKey];

      buckets.forEach(({ data, kategori }) => {
        const list = data?.[tingkatKey];
        if (!Array.isArray(list)) return;

        list.forEach((rawItem, idx) => {
          const detail = normalizeToItemDetail(rawItem, idx);
          if (!detail.nama.trim()) return;

          items.push({
            id: `${tingkatKey}-${kategori}-${detail.id || idx}`,
            nama: detail.nama.trim(),
            kategori,
            detail,
            silabusBulan: findSilabusScheduleText(silabusRules, detail.nama, kategori),
          });
        });
      });

      return {
        tingkatKey,
        labelKelas: formatTingkatKeyLabel(tingkatKey),
        items,
      };
    })
    .filter((group) => group.items.length > 0);
}
