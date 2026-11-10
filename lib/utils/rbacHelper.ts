import {
  APP_PAGE_CATALOG,
  AppPageId,
  GenderScope,
  PageAccessMode,
  PagePermissionsMap,
  SpecialAuthorities,
  UserAccountRecord,
} from '@/types/rbac';

export function createDefaultPagePermissions(
  defaultMode: PageAccessMode = 'edit'
): PagePermissionsMap {
  const map = {} as PagePermissionsMap;
  for (const page of APP_PAGE_CATALOG) {
    map[page.id] = defaultMode;
  }
  return map;
}

export function createDefaultSpecialAuthorities(): SpecialAuthorities {
  return {
    blok_scope: 'SEMUA',
    gender_scope: 'semua',
    pengaturan_status: 'aktif',
    hide_edit_pages: [],
    hide_delete_pages: [],
    persistent_absen_cepat: false,
  };
}

export function normalizePagePermissions(
  raw: Partial<Record<string, unknown>> | null | undefined,
  fallbackMode: PageAccessMode = 'edit'
): PagePermissionsMap {
  const base = createDefaultPagePermissions(fallbackMode);
  if (!raw || typeof raw !== 'object') return base;

  for (const page of APP_PAGE_CATALOG) {
    const val = raw[page.id];
    if (val === 'edit' || val === 'baca' || val === 'sembunyikan') {
      base[page.id] = val;
    }
  }
  return base;
}

export function normalizeSpecialAuthorities(
  raw: Partial<Record<string, unknown>> | null | undefined
): SpecialAuthorities {
  const base = createDefaultSpecialAuthorities();
  if (!raw || typeof raw !== 'object') return base;

  if (raw.blok_scope === 'SEMUA') {
    base.blok_scope = 'SEMUA';
  } else if (Array.isArray(raw.blok_scope)) {
    const cleaned = raw.blok_scope
      .map((b) => String(b || '').trim())
      .filter(Boolean);
    base.blok_scope = cleaned.length > 0 ? Array.from(new Set(cleaned)) : 'SEMUA';
  }

  if (
    raw.gender_scope === 'semua' ||
    raw.gender_scope === 'putra' ||
    raw.gender_scope === 'putri'
  ) {
    base.gender_scope = raw.gender_scope;
  }

  if (raw.pengaturan_status === 'aktif' || raw.pengaturan_status === 'non_aktif') {
    base.pengaturan_status = raw.pengaturan_status;
  }

  const validPageIds = new Set<string>(APP_PAGE_CATALOG.map((p) => p.id));

  if (Array.isArray(raw.hide_edit_pages)) {
    base.hide_edit_pages = raw.hide_edit_pages
      .map((p) => String(p))
      .filter((p): p is AppPageId => validPageIds.has(p));
  }

  if (Array.isArray(raw.hide_delete_pages)) {
    base.hide_delete_pages = raw.hide_delete_pages
      .map((p) => String(p))
      .filter((p): p is AppPageId => validPageIds.has(p));
  }

  base.persistent_absen_cepat = raw.persistent_absen_cepat === true;

  return base;
}

export function normalizeUserAccountRecord(
  raw: Partial<UserAccountRecord> & { id: string; username: string }
): UserAccountRecord {
  const isMaster = raw.role === 'master_admin' || raw.username === 'admin';
  const pagePermissions = isMaster
    ? createDefaultPagePermissions('edit')
    : normalizePagePermissions(
        raw.page_permissions as Record<string, unknown> | undefined,
        'edit'
      );

  const rawSpecial = raw.special_authorities as unknown as
    | Record<string, unknown>
    | undefined;
  const specialAuthorities = isMaster
    ? {
        ...createDefaultSpecialAuthorities(),
        persistent_absen_cepat: rawSpecial?.persistent_absen_cepat === true,
      }
    : normalizeSpecialAuthorities(rawSpecial);

  // Sinkronkan otoritas pengaturan_status dengan akses halaman pengaturan
  if (!isMaster && specialAuthorities.pengaturan_status === 'non_aktif') {
    pagePermissions.pengaturan = 'sembunyikan';
  }

  // Pastikan halaman Absen Cepat tidak tersembunyi jika Otoritas Spesial Absen Cepat aktif
  if (
    !isMaster &&
    specialAuthorities.persistent_absen_cepat &&
    pagePermissions['absen-cepat'] === 'sembunyikan'
  ) {
    pagePermissions['absen-cepat'] = 'edit';
  }

  return {
    id: raw.id,
    username: raw.username.trim().toLowerCase(),
    email: raw.email || `${raw.username.trim().toLowerCase()}@madinblokagung.local`,
    full_name: raw.full_name || raw.username,
    role: isMaster ? 'master_admin' : raw.role || 'custom_user',
    role_label:
      raw.role_label || (isMaster ? 'Master Admin' : 'Pengurus'),
    is_active: raw.is_active !== false,
    page_permissions: pagePermissions,
    special_authorities: specialAuthorities,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export function resolvePageIdFromPathname(pathname: string): AppPageId | null {
  const clean = (pathname || '').split('?')[0].replace(/\/+$/, '') || '/';
  if (clean === '/dashboard') return 'dashboard';
  if (clean.startsWith('/santri')) return 'santri';
  if (clean.startsWith('/asatidz')) return 'asatidz';
  if (clean.startsWith('/catatan')) return 'catatan';
  if (clean.startsWith('/jadwal-kbm')) return 'jadwal-kbm';
  if (clean.startsWith('/hari-kbm')) return 'hari-kbm';
  if (clean.startsWith('/kalender-kegiatan')) return 'kalender-kegiatan';
  if (clean.startsWith('/formasi')) return 'formasi';
  if (clean.startsWith('/fan/pelajaran')) return 'fan-pelajaran';
  if (clean.startsWith('/fan/pengajar')) return 'fan-pengajar';
  if (clean.startsWith('/daftar-pendidik')) return 'daftar-pendidik';
  if (clean.startsWith('/setor-mustahiq')) return 'setor-mustahiq';
  if (clean.startsWith('/setor-cepat')) return 'setor-cepat';
  if (clean.startsWith('/linimasa-setor')) return 'linimasa-setor';
  if (clean.startsWith('/setoran')) return 'setoran';
  if (clean.startsWith('/rekap-hafalan')) return 'rekap-hafalan';
  if (clean.startsWith('/piagam')) return 'piagam';
  if (clean.startsWith('/serah-piagam')) return 'serah-piagam';
  if (clean.startsWith('/kirim-wa')) return 'kirim-wa';
  if (clean.startsWith('/absensi')) return 'absensi';
  if (clean.startsWith('/absen-cepat')) return 'absen-cepat';
  if (clean.startsWith('/absen-konsorsium')) return 'absen-konsorsium';
  if (clean.startsWith('/rekap-absensi')) return 'rekap-absensi';
  if (clean.startsWith('/sapras/perbaikan')) return 'sapras-perbaikan';
  if (clean.startsWith('/sapras/logistik')) return 'sapras-logistik';
  if (clean.startsWith('/sapras/rekap')) return 'sapras-rekap';
  if (clean.startsWith('/sapras')) return 'sapras-inventaris';
  if (clean.startsWith('/kelola-berita')) return 'kelola-berita';
  if (clean.startsWith('/ebtadin/serah-ijazah')) return 'ebtadin-serah-ijazah';
  if (clean.startsWith('/ebtadin')) return 'ebtadin';
  if (clean.startsWith('/pengaturan')) return 'pengaturan';
  return null;
}

export function canViewPage(
  account: UserAccountRecord | null,
  pageId: AppPageId,
  pathname?: string
): boolean {
  if (!account) return true;
  if (account.role === 'master_admin') return true;

  if (
    pageId === 'pengaturan' &&
    account.special_authorities.pengaturan_status === 'non_aktif'
  ) {
    return false;
  }

  if (pathname) {
    const cleanPath = pathname.split('?')[0];
    if (
      cleanPath === '/formasi/pa' &&
      account.special_authorities.gender_scope === 'putri'
    ) {
      return false;
    }
    if (
      cleanPath === '/formasi/pi' &&
      account.special_authorities.gender_scope === 'putra'
    ) {
      return false;
    }
  }

  const mode = account.page_permissions[pageId] || 'edit';
  return mode !== 'sembunyikan';
}

export function getFirstAllowedRoute(account: UserAccountRecord | null): string {
  if (account?.special_authorities?.persistent_absen_cepat === true) {
    return '/absen-cepat';
  }
  if (!account || account.role === 'master_admin') return '/dashboard';
  for (const page of APP_PAGE_CATALOG) {
    if (canViewPage(account, page.id, page.routes[0])) {
      if (page.id === 'formasi') {
        if (account.special_authorities.gender_scope === 'putra') return '/formasi/pa';
        if (account.special_authorities.gender_scope === 'putri') return '/formasi/pi';
      }
      return page.routes[0];
    }
  }
  return '/dashboard';
}

// Menentukan apakah tombol Tambah / Input Baru / Impor diizinkan pada suatu halaman.
// Tetap bernilai true walaupun halaman masuk ke hide_edit_pages (selama akses halaman 'edit').
export function canCreateOnPage(
  account: UserAccountRecord | null,
  pageId: AppPageId
): boolean {
  if (!account) return true;
  if (account.role === 'master_admin') return true;
  if (!canViewPage(account, pageId)) return false;
  return account.page_permissions[pageId] === 'edit';
}

// Menentukan apakah tombol Edit / Ubah data lama diizinkan pada suatu halaman.
export function canEditOnPage(
  account: UserAccountRecord | null,
  pageId: AppPageId
): boolean {
  if (!account) return true;
  if (account.role === 'master_admin') return true;
  if (!canCreateOnPage(account, pageId)) return false;
  return !account.special_authorities.hide_edit_pages.includes(pageId);
}

// Menentukan apakah tombol Hapus (satuan maupun bulk) diizinkan pada suatu halaman.
export function canDeleteOnPage(
  account: UserAccountRecord | null,
  pageId: AppPageId
): boolean {
  if (!account) return true;
  if (account.role === 'master_admin') return true;
  if (!canCreateOnPage(account, pageId)) return false;
  return !account.special_authorities.hide_delete_pages.includes(pageId);
}

// Menentukan apakah fitur Pengaturan (terpusat di /pengaturan maupun tombol pengaturan di setiap halaman) aktif.
export function canAccessSettingsAuthority(
  account: UserAccountRecord | null
): boolean {
  if (!account) return true;
  if (account.role === 'master_admin') return true;
  if (account.special_authorities.pengaturan_status === 'non_aktif') return false;
  return account.page_permissions.pengaturan !== 'sembunyikan';
}

export function isGenderAllowed(
  paPi: string | null | undefined,
  genderScope: GenderScope
): boolean {
  if (genderScope === 'semua') return true;
  const norm = String(paPi || '').trim().toUpperCase();
  if (!norm) return true;
  if (genderScope === 'putra') {
    return norm === 'PA' || norm === 'PUTRA' || norm === 'L';
  }
  if (genderScope === 'putri') {
    return norm === 'PI' || norm === 'PUTRI' || norm === 'P';
  }
  return true;
}

export function isBlokAllowed(
  itemBlok: string | null | undefined,
  blokScope: 'SEMUA' | string[]
): boolean {
  if (blokScope === 'SEMUA') return true;
  if (!Array.isArray(blokScope) || blokScope.length === 0) return true;

  const cleanTarget = String(itemBlok || '').trim().toLowerCase();
  if (!cleanTarget || cleanTarget === '-') return false;

  return blokScope.some((allowed) => {
    const cleanAllowed = allowed.trim().toLowerCase();
    if (!cleanAllowed) return false;
    if (cleanTarget === cleanAllowed) return true;
    const strippedTarget = cleanTarget.replace(/^blok\s+/i, '').trim();
    const strippedAllowed = cleanAllowed.replace(/^blok\s+/i, '').trim();
    if (strippedTarget && strippedTarget === strippedAllowed) return true;
    // Dukungan kecocokan sinonim Blok KBM vs Blok Kamar (mis. "Blok Induk" <-> "Blok Induk Putra")
    if (
      cleanAllowed === 'blok induk putra' &&
      (cleanTarget === 'blok induk' || cleanTarget === 'induk putra')
    ) {
      return true;
    }
    if (
      (cleanAllowed === 'induk putri utara' ||
        cleanAllowed === 'induk putri selatan') &&
      (cleanTarget === 'blok putri' || cleanTarget === 'induk putri')
    ) {
      return true;
    }
    return false;
  });
}

export interface ClassScopeTarget {
  tingkat?: string | null;
  din_kls?: string | number | null;
  din_bag?: string | null;
  pa_pi?: string | null;
  blok_diniyyah?: string | null;
  blok_takror?: string | null;
  domisili?: string | null;
}

function normStr(val: string | number | null | undefined): string {
  return String(val ?? '').trim().toUpperCase();
}

// Filter Blok & Gender berbasis kelas untuk Formasi Kelas, Jadwal KBM, Hari KBM, dan Absensi.
export function isClassAllowedByAuthority(
  kelas: ClassScopeTarget,
  account: UserAccountRecord | null,
  santriList?: Array<{
    tingkat?: string;
    din_kls?: string;
    din_bag?: string;
    pa_pi?: string;
    blok?: string;
  }>,
  asatidzList?: Array<{
    tingkat_asatidz?: string;
    din_kls_asatidz?: string;
    din_bag_asatidz?: string;
    pa_pi?: string;
    blok?: string;
  }>
): boolean {
  if (!account || account.role === 'master_admin') return true;

  const { gender_scope, blok_scope } = account.special_authorities;

  if (!isGenderAllowed(kelas.pa_pi, gender_scope)) {
    return false;
  }

  if (blok_scope === 'SEMUA' || !Array.isArray(blok_scope) || blok_scope.length === 0) {
    return true;
  }

  // 1. Cek apakah atribut blok pada kelas itu sendiri cocok dengan blok_scope
  if (
    isBlokAllowed(kelas.blok_diniyyah, blok_scope) ||
    isBlokAllowed(kelas.blok_takror, blok_scope) ||
    isBlokAllowed(kelas.domisili, blok_scope)
  ) {
    return true;
  }

  const kTingkat = normStr(kelas.tingkat);
  const kKls = normStr(kelas.din_kls);
  const kBag = normStr(kelas.din_bag);
  const kPaPi = normStr(kelas.pa_pi);

  // 2. Cek apakah kelas ini memiliki santri yang berdomisili di blok_scope
  if (Array.isArray(santriList) && santriList.length > 0 && kKls) {
    const hasMatchingSantri = santriList.some((s) => {
      if (!isBlokAllowed(s.blok, blok_scope)) return false;
      const matchKls = normStr(s.din_kls) === kKls;
      const matchBag = !kBag || normStr(s.din_bag) === kBag;
      const matchTingkat = !kTingkat || normStr(s.tingkat) === kTingkat;
      const matchGender = !kPaPi || normStr(s.pa_pi) === kPaPi;
      return matchKls && matchBag && matchTingkat && matchGender;
    });
    if (hasMatchingSantri) return true;
  }

  // 3. Cek apakah wali kelas / mustahiq kelas ini berdomisili di blok_scope
  if (Array.isArray(asatidzList) && asatidzList.length > 0 && kKls) {
    const hasMatchingWali = asatidzList.some((a) => {
      if (!isBlokAllowed(a.blok, blok_scope)) return false;
      const matchKls = normStr(a.din_kls_asatidz) === kKls;
      const matchBag = !kBag || normStr(a.din_bag_asatidz) === kBag;
      const matchTingkat = !kTingkat || normStr(a.tingkat_asatidz) === kTingkat;
      const matchGender = !kPaPi || normStr(a.pa_pi) === kPaPi;
      return matchKls && matchBag && matchTingkat && matchGender;
    });
    if (hasMatchingWali) return true;
  }

  return false;
}
