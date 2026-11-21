'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { HafalanConfig, SetoranHafalan } from '@/types/setoran';
import { UserAccountRecord } from '@/types/rbac';
import { TahunAjaranKalenderConfig } from '@/types/kalender';
import {
  cariMustahiqSantri,
  formatDateTimeSetoran,
  formatJenisKelaminLengkap,
  getDaftarTingkatKelasDiniyyah,
  getNowLocalDateTimeString,
  norm,
  normalizeTahunAjaranDash,
  normalizeTahunAjaranSlash,
} from '@/lib/utils/setoranHelper';
import {
  getAllKurikulumCatalog,
  getKurikulumItemsForKelas,
  getSetoranTahunAjaran,
  KriteriaKurikulum,
  KurikulumCatalogEntry,
} from '@/lib/utils/rekapPertingkatanHelper';

interface SetoranTampilan1ViewProps {
  santriList: any[];
  asatidzList: any[];
  formasiList: any[];
  setoranList: SetoranHafalan[];
  config: HafalanConfig;
  activeTahunAjaran: string;
  daftarTahunAjaran: TahunAjaranKalenderConfig[];
  currentAccount: UserAccountRecord | null;
  canCreate: boolean;
  canDelete: boolean;
  onAddSetoran: (entry: SetoranHafalan) => Promise<boolean>;
  onDeleteSetoran: (key: {
    noInduk: string;
    tglSetor: string;
    hafalan: string;
  }) => Promise<boolean>;
}

const KRITERIA_BADGE_STYLES: Record<KriteriaKurikulum, string> = {
  Wajib: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Sunnah: 'bg-blue-50 text-blue-800 border-blue-200',
  Wisuda: 'bg-rose-50 text-rose-800 border-rose-200',
  Kitab: 'bg-amber-50 text-amber-800 border-amber-200',
};

function formatSantriTtl(santri: any): string {
  if (!santri) return '-';
  const tempat = String(santri.tempat_lahir || '').trim();
  const tglRaw = String(santri.tgl_lahir || '').trim();
  const tgl = /^\d$/.test(tglRaw) ? `0${tglRaw}` : tglRaw;
  const bln = String(santri.bln_lahir || '').trim();
  const thn = String(santri.thn_lahir || '').trim();

  const tanggalPart = [tgl, bln, thn].filter((v) => v && v !== '-').join(' ');
  const parts = [tempat && tempat !== '-' ? tempat : '', tanggalPart].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function formatSantriAlamat(santri: any): string {
  if (!santri) return '-';
  const segments = [
    santri.dusun,
    santri.desa,
    santri.kecamatan,
    santri.kabupaten,
    santri.provinsi,
  ]
    .map((v) => String(v || '').trim())
    .filter((v) => v && v !== '-');
  return segments.length > 0 ? segments.join(', ') : '-';
}

export default function SetoranTampilan1View({
  santriList,
  asatidzList,
  formasiList,
  setoranList,
  config,
  activeTahunAjaran,
  daftarTahunAjaran,
  currentAccount,
  canCreate,
  canDelete,
  onAddSetoran,
  onDeleteSetoran,
}: SetoranTampilan1ViewProps) {
  const normalizedActiveTaSlash = normalizeTahunAjaranSlash(activeTahunAjaran || '2026/2027');
  const activeTaDash = normalizeTahunAjaranDash(normalizedActiveTaSlash);

  const [selectedTaSlash, setSelectedTaSlash] = useState<string>(normalizedActiveTaSlash);
  const [selectedNoInduk, setSelectedNoInduk] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [busyItemKey, setBusyItemKey] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // State Fitur Hafalan Lain (Lintas Kelas & Tingkat)
  const [isHafalanLainOpen, setIsHafalanLainOpen] = useState<boolean>(false);
  const [extraFilterTingkat, setExtraFilterTingkat] = useState<string>('ALL');
  const [extraFilterKelasKey, setExtraFilterKelasKey] = useState<string>('ALL');
  const [extraSearchQuery, setExtraSearchQuery] = useState<string>('');
  const [isExtraDropdownOpen, setIsExtraDropdownOpen] = useState<boolean>(false);
  const [selectedExtraKeys, setSelectedExtraKeys] = useState<string[]>([]);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const extraDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedTaSlash(normalizedActiveTaSlash);
  }, [normalizedActiveTaSlash]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (extraDropdownRef.current && !extraDropdownRef.current.contains(e.target as Node)) {
        setIsExtraDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Daftar santri aktif yang bisa dipilih (non-BOYONG)
  const selectableSantri = useMemo(() => {
    return santriList
      .filter((s) => {
        if (!s?.no_induk || !s?.nama) return false;
        const statusRaw = s.status_santri || s.ket_status;
        if (statusRaw && norm(statusRaw) === 'BOYONG') return false;
        return true;
      })
      .sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || ''), 'id'));
  }, [santriList]);

  const selectedSantri = useMemo(() => {
    if (!selectedNoInduk) return null;
    return (
      selectableSantri.find((s) => String(s.no_induk).trim() === selectedNoInduk) ||
      santriList.find((s) => String(s.no_induk).trim() === selectedNoInduk) ||
      null
    );
  }, [selectableSantri, santriList, selectedNoInduk]);

  // Sinkronkan input combobox saat santri terpilih berubah
  const selectedLabel = selectedSantri
    ? `${String(selectedSantri.no_induk).trim()} - ${String(selectedSantri.nama).trim()}`
    : '';

  const filteredSantriOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const list = q
      ? selectableSantri.filter((s) => {
          const nis = String(s.no_induk || '').toLowerCase();
          const nama = String(s.nama || '').toLowerCase();
          const combo = `${nis} - ${nama}`;
          return nis.includes(q) || nama.includes(q) || combo.includes(q);
        })
      : selectableSantri;
    return list.slice(0, 60);
  }, [selectableSantri, searchTerm]);

  const biodata = useMemo(() => {
    if (!selectedSantri) {
      return {
        nis: '',
        nama: '',
        jenisKelamin: '',
        kelasMadin: '',
        mustahiq: '',
        namaAyah: '',
        unitSekolah: '',
        ttl: '',
        alamat: '',
        tingkat: '',
        dinKls: '',
        dinBag: '',
        paPi: '',
      };
    }

    const tingkat = String(selectedSantri.tingkat || '').trim();
    const dinKls = String(selectedSantri.din_kls || '').trim();
    const dinBag = String(selectedSantri.din_bag || '').trim();
    const paPi = String(selectedSantri.pa_pi || '').trim();
    const kelasMadin = [dinKls, dinBag, tingkat].filter((v) => v && v !== '-').join(' ');
    const mustahiq = cariMustahiqSantri(
      tingkat,
      dinBag,
      dinKls,
      paPi,
      asatidzList,
      formasiList
    );

    return {
      nis: String(selectedSantri.no_induk || '').trim(),
      nama: String(selectedSantri.nama || '').trim(),
      jenisKelamin: formatJenisKelaminLengkap(paPi),
      kelasMadin: kelasMadin || '-',
      mustahiq: mustahiq && mustahiq !== 'Belum Ditentukan' ? `Ust. ${mustahiq.replace(/^ust\.?\s*/i, '').replace(/^ustdz\.?\s*/i, '')}` : 'Belum Ditentukan',
      rawMustahiq: mustahiq,
      namaAyah: String(selectedSantri.nama_ayah || '-').trim(),
      unitSekolah: String(selectedSantri.unit || '-').trim(),
      ttl: formatSantriTtl(selectedSantri),
      alamat: formatSantriAlamat(selectedSantri),
      tingkat,
      dinKls,
      dinBag,
      paPi,
    };
  }, [selectedSantri, asatidzList, formasiList]);

  // Daftar kurikulum hafalan untuk kelas santri terpilih
  const daftarHafalanKelas = useMemo(() => {
    if (!selectedSantri) return [];
    return getKurikulumItemsForKelas(config, biodata.tingkat, biodata.dinKls, {
      includeKitab: true,
    });
  }, [selectedSantri, config, biodata.tingkat, biodata.dinKls]);

  // Peta record setoran santri pada Tahun Ajaran terpilih
  const santriRecordsInSelectedTa = useMemo(() => {
    if (!selectedSantri) return [];
    const targetNis = norm(selectedSantri.no_induk);
    return setoranList.filter((r) => {
      if (norm(r.no_induk) !== targetNis) return false;
      return getSetoranTahunAjaran(r) === selectedTaSlash;
    });
  }, [selectedSantri, setoranList, selectedTaSlash]);

  const completedItemMap = useMemo(() => {
    const map = new Map<string, SetoranHafalan[]>();
    santriRecordsInSelectedTa.forEach((r) => {
      const k = norm(r.item_hafalan);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return map;
  }, [santriRecordsInSelectedTa]);

  const wajibStats = useMemo(() => {
    const wajibItems = daftarHafalanKelas.filter((it) => it.kriteria === 'Wajib');
    const done = wajibItems.filter((it) => completedItemMap.has(norm(it.nama))).length;
    return { done, total: wajibItems.length };
  }, [daftarHafalanKelas, completedItemMap]);

  // Katalog seluruh hafalan lintas tingkat & kelas untuk fitur 'Hafalan Lain'
  const allCatalogItems = useMemo(() => {
    const pairs = getDaftarTingkatKelasDiniyyah(formasiList, santriList);
    return getAllKurikulumCatalog(config, pairs);
  }, [config, formasiList, santriList]);

  const currentSantriClassKey =
    biodata.tingkat && biodata.dinKls
      ? `${norm(biodata.tingkat)}_${norm(biodata.dinKls)}`
      : '';

  const otherClassCatalogItems = useMemo(() => {
    const mainNormNames = new Set(daftarHafalanKelas.map((it) => norm(it.nama)));
    return allCatalogItems.filter((entry) => {
      if (currentSantriClassKey && entry.kelasKey === currentSantriClassKey) return false;
      if (mainNormNames.has(norm(entry.nama))) return false;
      return true;
    });
  }, [allCatalogItems, currentSantriClassKey, daftarHafalanKelas]);

  const extraTingkatOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: string[] = [];
    otherClassCatalogItems.forEach((it) => {
      if (!seen.has(it.tingkat)) {
        seen.add(it.tingkat);
        opts.push(it.tingkat);
      }
    });
    return opts;
  }, [otherClassCatalogItems]);

  const extraKelasOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: Array<{ kelasKey: string; kelasLabel: string; tingkat: string }> = [];
    otherClassCatalogItems.forEach((it) => {
      if (extraFilterTingkat !== 'ALL' && it.tingkat !== extraFilterTingkat) return;
      if (!seen.has(it.kelasKey)) {
        seen.add(it.kelasKey);
        opts.push({
          kelasKey: it.kelasKey,
          kelasLabel: it.kelasLabel,
          tingkat: it.tingkat,
        });
      }
    });
    return opts;
  }, [otherClassCatalogItems, extraFilterTingkat]);

  const filteredExtraDropdownItems = useMemo(() => {
    const q = extraSearchQuery.trim().toLowerCase();
    return otherClassCatalogItems.filter((it) => {
      if (extraFilterTingkat !== 'ALL' && it.tingkat !== extraFilterTingkat) return false;
      if (extraFilterKelasKey !== 'ALL' && it.kelasKey !== extraFilterKelasKey) return false;
      if (!q) return true;
      return (
        it.nama.toLowerCase().includes(q) ||
        it.kelasLabel.toLowerCase().includes(q) ||
        it.kriteria.toLowerCase().includes(q) ||
        (it.keterangan || '').toLowerCase().includes(q)
      );
    });
  }, [otherClassCatalogItems, extraFilterTingkat, extraFilterKelasKey, extraSearchQuery]);

  // Gabungan item yang dipilih manual + item luar kelas yang sudah tercatat di riwayat santri (selectedTaSlash)
  const displayedHafalanLainRows = useMemo(() => {
    const catalogByKey = new Map<string, KurikulumCatalogEntry>();
    const catalogByNormName = new Map<string, KurikulumCatalogEntry>();
    otherClassCatalogItems.forEach((it) => {
      catalogByKey.set(it.idKey, it);
      const nn = norm(it.nama);
      if (!catalogByNormName.has(nn)) catalogByNormName.set(nn, it);
    });

    const mainNormNames = new Set(daftarHafalanKelas.map((it) => norm(it.nama)));
    const result: Array<KurikulumCatalogEntry & { isDraftSelected: boolean }> = [];
    const seenNormNames = new Set<string>();

    // 1. Yang sudah tersimpan di setoran santri luar kelas (otomatis tampil agar status centang sinkron)
    santriRecordsInSelectedTa.forEach((rec) => {
      const nn = norm(rec.item_hafalan);
      if (!nn || mainNormNames.has(nn) || seenNormNames.has(nn)) return;
      seenNormNames.add(nn);

      const matched = catalogByNormName.get(nn);
      if (matched) {
        result.push({
          ...matched,
          isDraftSelected: selectedExtraKeys.includes(matched.idKey),
        });
      } else {
        const rawKat = String(rec.kategori || 'Wajib').trim();
        const safeKriteria: KriteriaKurikulum =
          rawKat === 'Sunnah' || rawKat === 'Wisuda' || rawKat === 'Kitab'
            ? rawKat
            : 'Wajib';
        result.push({
          idKey: `RECORD::${safeKriteria}::${nn}`,
          nama: rec.item_hafalan,
          kriteria: safeKriteria,
          keterangan: 'Semua',
          detail: {
            id: `rec_${nn}`,
            nama: rec.item_hafalan,
            targetType: 'sentence',
          },
          tingkat: '-',
          dinKls: '-',
          kelasKey: 'LUAR_KELAS',
          kelasLabel: 'Luar Kelas',
          isDraftSelected: false,
        });
      }
    });

    // 2. Yang ditambahkan secara manual melalui kolom Ketik & Pilih
    selectedExtraKeys.forEach((idKey) => {
      const matched = catalogByKey.get(idKey);
      if (!matched) return;
      const nn = norm(matched.nama);
      if (seenNormNames.has(nn)) return;
      seenNormNames.add(nn);
      result.push({
        ...matched,
        isDraftSelected: true,
      });
    });

    return result;
  }, [
    otherClassCatalogItems,
    daftarHafalanKelas,
    santriRecordsInSelectedTa,
    selectedExtraKeys,
  ]);

  const submittedExtraCount = useMemo(() => {
    return displayedHafalanLainRows.filter((row) =>
      completedItemMap.has(norm(row.nama))
    ).length;
  }, [displayedHafalanLainRows, completedItemMap]);

  const taDropdownOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: Array<{ slash: string; label: string }> = [];

    const addOpt = (slashRaw: string) => {
      const slash = normalizeTahunAjaranSlash(slashRaw);
      if (!slash || seen.has(slash)) return;
      seen.add(slash);
      const dash = normalizeTahunAjaranDash(slash);
      const isAktif = slash === normalizedActiveTaSlash;
      options.push({
        slash,
        label: isAktif ? `${dash} (Aktif)` : dash,
      });
    };

    addOpt(normalizedActiveTaSlash);
    daftarTahunAjaran.forEach((cfg) => addOpt(cfg.tahunAjaranMasehi));
    return options;
  }, [daftarTahunAjaran, normalizedActiveTaSlash]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => {
      setFeedbackBanner((curr) => (curr?.text === text ? null : curr));
    }, 3200);
  };

  const handleToggleChecklist = async (
    itemNama: string,
    kriteria: KriteriaKurikulum
  ) => {
    if (!selectedSantri) return;
    const normName = norm(itemNama);
    const existingMatches = completedItemMap.get(normName) || [];
    const isCurrentlyChecked = existingMatches.length > 0;

    if (isCurrentlyChecked && !canDelete) {
      showToast('error', 'Akun Anda tidak memiliki izin untuk menghapus catatan setoran.');
      return;
    }
    if (!isCurrentlyChecked && !canCreate) {
      showToast('error', 'Akun Anda tidak memiliki izin untuk mencatat setoran.');
      return;
    }

    setBusyItemKey(normName);

    try {
      if (isCurrentlyChecked) {
        // Pertahankan baris di tabel Hafalan Lain sebagai draft tidak tercentang agar tidak langsung menghilang
        const matchedExtra = otherClassCatalogItems.find(
          (entry) => norm(entry.nama) === normName
        );
        if (matchedExtra) {
          setSelectedExtraKeys((prev) =>
            prev.includes(matchedExtra.idKey) ? prev : [...prev, matchedExtra.idKey]
          );
        }

        let allDeleted = true;
        for (const rec of existingMatches) {
          const ok = await onDeleteSetoran({
            noInduk: rec.no_induk,
            tglSetor: rec.tanggal,
            hafalan: rec.item_hafalan,
          });
          if (!ok) allDeleted = false;
        }
        if (allDeleted) {
          showToast('success', `Setoran "${itemNama}" dibatalkan untuk ${biodata.nama}.`);
        }
      } else {
        const formattedTgl = formatDateTimeSetoran(getNowLocalDateTimeString());
        const penjagaLogin =
          (currentAccount?.full_name || '').trim() ||
          (currentAccount?.username || '').trim() ||
          'Admin';
        const kelasGabung = `${biodata.dinKls} ${biodata.dinBag} ${biodata.tingkat}`.trim();

        const newRecord: SetoranHafalan = {
          id: `${biodata.nis}_${formattedTgl}_${itemNama}`,
          no_induk: biodata.nis,
          tanggal: formattedTgl,
          nama: biodata.nama,
          tgl_lahir: String(selectedSantri.tgl_lahir || ''),
          bln_lahir: String(selectedSantri.bln_lahir || ''),
          thn_lahir: String(selectedSantri.thn_lahir || ''),
          tempat_lahir: String(selectedSantri.tempat_lahir || ''),
          penjaga: penjagaLogin,
          mustahiq: biodata.rawMustahiq || biodata.mustahiq,
          tingkat: biodata.tingkat,
          din_bag: biodata.dinBag,
          din_kls: biodata.dinKls,
          kecamatan: String(selectedSantri.kecamatan || ''),
          kabupaten: String(selectedSantri.kabupaten || ''),
          provinsi: String(selectedSantri.provinsi || ''),
          bin: String(selectedSantri.nama_ayah || ''),
          item_hafalan: itemNama,
          kategori: kriteria,
          tahun_ajaran: selectedTaSlash,
          kelas: kelasGabung,
          capaian: itemNama,
          nilai: 'Mumtaz (A)',
        };

        const ok = await onAddSetoran(newRecord);
        if (ok) {
          showToast('success', `Setoran "${itemNama}" dicatat atas nama ${biodata.nama}.`);
        }
      }
    } finally {
      setBusyItemKey(null);
    }
  };

  const handleSelectSantri = (santri: any) => {
    setSelectedNoInduk(String(santri.no_induk || '').trim());
    setSearchTerm('');
    setIsDropdownOpen(false);
    setSelectedExtraKeys([]);
    setExtraSearchQuery('');
    setIsExtraDropdownOpen(false);
  };

  const handleClearSantri = () => {
    setSelectedNoInduk('');
    setSearchTerm('');
    setIsDropdownOpen(false);
    setSelectedExtraKeys([]);
    setExtraSearchQuery('');
    setIsExtraDropdownOpen(false);
    setIsHafalanLainOpen(false);
  };

  const handleAddExtraItem = (entry: KurikulumCatalogEntry) => {
    setSelectedExtraKeys((prev) =>
      prev.includes(entry.idKey) ? prev : [...prev, entry.idKey]
    );
    setExtraSearchQuery('');
  };

  const handleRemoveExtraDraft = (idKey: string) => {
    setSelectedExtraKeys((prev) => prev.filter((k) => k !== idKey));
  };

  return (
    <div data-testid="setoran-tampilan-1" className="space-y-5">
      {/* Baris Kontrol Atas: Tahun Ajaran Aktif & Cari NIS / Nama Santri */}
      <div className="card-panel border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label
              htmlFor="t1-tahun-ajaran-aktif"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Tahun Ajaran Aktif
            </label>
            <input
              id="t1-tahun-ajaran-aktif"
              type="text"
              readOnly
              value={activeTaDash}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-100/80 text-sm font-semibold text-slate-700 cursor-default focus:outline-none"
            />
          </div>

          <div className="md:col-span-7 relative" ref={dropdownRef}>
            <label
              htmlFor="t1-cari-santri"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Cari NIS / Nama Santri
            </label>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                id="t1-cari-santri"
                type="text"
                value={isDropdownOpen ? searchTerm : selectedLabel || searchTerm}
                onFocus={() => {
                  setIsDropdownOpen(true);
                  setSearchTerm('');
                }}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownOpen(true);
                }}
                placeholder="Ketik NIS atau Nama Santri..."
                className="w-full h-11 pl-10 pr-20 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/15 transition"
              />
              <div className="absolute right-1.5 flex items-center gap-0.5">
                {(selectedNoInduk || searchTerm) && (
                  <button
                    type="button"
                    onClick={handleClearSantri}
                    aria-label="Hapus pilihan santri"
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  aria-label="Buka daftar santri"
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>
            </div>

            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-40 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {filteredSantriOptions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Santri tidak ditemukan. Coba kata kunci NIS atau nama lain.
                  </div>
                ) : (
                  filteredSantriOptions.map((s) => {
                    const nis = String(s.no_induk || '').trim();
                    const nama = String(s.nama || '').trim();
                    const kls = [s.din_kls, s.din_bag, s.tingkat]
                      .filter((v) => v && v !== '-')
                      .join(' ');
                    const isSelected = nis === selectedNoInduk;
                    return (
                      <button
                        key={nis}
                        type="button"
                        onClick={() => handleSelectSantri(s)}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 text-left flex items-center justify-between gap-2 hover:bg-emerald-50/70 transition cursor-pointer ${
                          isSelected ? 'bg-emerald-50 text-emerald-900' : 'text-slate-800'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold truncate">
                            {nis} - {nama}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {kls || 'Kelas belum diatur'} • {formatJenisKelaminLengkap(s.pa_pi)}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedbackBanner && (
        <div
          role="status"
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            aria-label="Tutup notifikasi"
            className="p-1 rounded hover:bg-black/5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Grid Utama 2 Kolom: Detail Biodata Santri (Kiri) & Input Hafalan (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Panel Kiri: Detail Biodata Santri */}
        <div className="lg:col-span-5 card-panel border border-slate-200 p-0 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <User className="w-4 h-4 text-emerald-700 shrink-0" />
            <h3 className="text-sm font-bold text-slate-800 m-0">Detail Biodata Santri</h3>
          </div>

          <div className="p-5 space-y-3.5">
            {[
              { label: 'NIS', value: biodata.nis },
              { label: 'Nama', value: biodata.nama },
              { label: 'Jenis Kelamin', value: biodata.jenisKelamin },
              { label: 'Kelas Madin', value: biodata.kelasMadin },
              { label: 'Mustahiq', value: biodata.mustahiq },
              { label: 'Nama Ayah', value: biodata.namaAyah },
              { label: 'Unit Sekolah', value: biodata.unitSekolah },
              { label: 'Tempat dan Tanggal Lahir', value: biodata.ttl },
            ].map((field) => (
              <div key={field.label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {field.label}
                </label>
                <input
                  type="text"
                  readOnly
                  value={field.value || ''}
                  placeholder="-"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none cursor-default"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Alamat
              </label>
              <textarea
                readOnly
                rows={3}
                value={biodata.alamat || ''}
                placeholder="-"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none resize-none cursor-default"
              />
            </div>
          </div>
        </div>

        {/* Panel Kanan: Input Hafalan */}
        <div className="lg:col-span-7 card-panel border border-slate-200 p-0 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-emerald-700 shrink-0" />
            <h3 className="text-sm font-bold text-slate-800 m-0">Input Hafalan</h3>
          </div>

          <div className="p-5 space-y-4">
            {/* Sub-header Daftar Hafalan & Selector Tahun Ajaran */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 m-0">Daftar Hafalan</h4>
                <p className="text-xs text-slate-600 mt-1 m-0">
                  {selectedSantri ? (
                    <>
                      Hafalan wajib yang telah diselesaikan (
                      <strong className="text-emerald-800">
                        {wajibStats.done}/{wajibStats.total} selesai
                      </strong>
                      ).
                    </>
                  ) : (
                    'Pilih santri pada kolom pencarian di atas untuk melihat daftar hafalan.'
                  )}
                </p>
              </div>

              <div className="shrink-0">
                <select
                  aria-label="Pilih Tahun Ajaran Daftar Hafalan"
                  value={selectedTaSlash}
                  onChange={(e) => setSelectedTaSlash(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                >
                  {taDropdownOptions.map((opt) => (
                    <option key={opt.slash} value={opt.slash}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tabel Checklist Daftar Hafalan */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              {!selectedSantri ? (
                <div className="py-12 px-4 text-center space-y-1.5">
                  <p className="text-sm font-bold text-slate-700 m-0">
                    Belum ada santri yang dipilih
                  </p>
                  <p className="text-xs text-slate-500 m-0">
                    Cari NIS atau nama santri di kotak atas untuk menampilkan daftar hafalan kelasnya.
                  </p>
                </div>
              ) : daftarHafalanKelas.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-1.5">
                  <p className="text-sm font-bold text-slate-700 m-0">
                    Daftar hafalan untuk kelas {biodata.kelasMadin} belum dikonfigurasi
                  </p>
                  <p className="text-xs text-slate-500 m-0">
                    Klik tombol Pengaturan di toolbar atas untuk menambahkan materi hafalan jenjang ini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs">
                        <th className="w-14 py-3 px-3 text-center font-bold">Status</th>
                        <th className="py-3 px-3 text-left font-bold">Nama Hafalan</th>
                        <th className="py-3 px-3 text-left font-bold">Keterangan</th>
                        <th className="w-28 py-3 px-3 text-right sm:text-center font-bold">
                          Kriteria
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {daftarHafalanKelas.map((item) => {
                        const normName = norm(item.nama);
                        const isChecked = completedItemMap.has(normName);
                        const isBusy = busyItemKey === normName;

                        return (
                          <tr
                            key={`${item.kriteria}_${item.nama}`}
                            onClick={() => {
                              if (!isBusy) {
                                void handleToggleChecklist(item.nama, item.kriteria);
                              }
                            }}
                            className={`transition cursor-pointer select-none ${
                              isChecked ? 'bg-emerald-50/45 hover:bg-emerald-50/75' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td
                              className="py-2 px-2 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isChecked}
                                aria-label={`Tandai ${item.nama} (${item.kriteria})`}
                                disabled={isBusy}
                                onClick={() => void handleToggleChecklist(item.nama, item.kriteria)}
                                className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                                ) : (
                                  <span
                                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                                      isChecked
                                        ? 'bg-emerald-700 border-emerald-700 text-white'
                                        : 'bg-white border-slate-300 text-transparent hover:border-emerald-600'
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                )}
                              </button>
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900">
                              {item.nama}
                            </td>
                            <td className="py-3 px-3 text-slate-600 text-xs sm:text-sm">
                              {item.keterangan || 'Semua'}
                            </td>
                            <td className="py-3 px-3 text-right sm:text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                  KRITERIA_BADGE_STYLES[item.kriteria]
                                }`}
                              >
                                {item.kriteria}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Fitur Hafalan Lain (Lintas Kelas & Tingkat) */}
            {selectedSantri && (
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    data-testid="btn-toggle-hafalan-lain"
                    onClick={() => setIsHafalanLainOpen((prev) => !prev)}
                    aria-expanded={isHafalanLainOpen}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isHafalanLainOpen
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-slate-50 hover:bg-emerald-50/60 border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-900'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Hafalan Lain</span>
                    {displayedHafalanLainRows.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white">
                        {submittedExtraCount}/{displayedHafalanLainRows.length}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                        isHafalanLainOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {!isHafalanLainOpen && submittedExtraCount > 0 && (
                    <span className="text-[11px] font-semibold text-emerald-800">
                      {submittedExtraCount} hafalan lintas kelas tercatat
                    </span>
                  )}
                </div>

                {isHafalanLainOpen && (
                  <div
                    data-testid="panel-hafalan-lain"
                    className="rounded-xl border border-emerald-200 bg-emerald-50/25 p-4 space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 m-0">
                          Hafalan Lain (Lintas Kelas & Tingkat)
                        </h5>
                        <p className="text-[11px] text-slate-600 m-0 mt-0.5">
                          Pilih satu atau lebih hafalan dari kelas lain untuk langsung disetorkan tanpa syarat hafalan wajib selesai terlebih dahulu.
                        </p>
                      </div>
                    </div>

                    {/* Filter Tingkat, Filter Kelas & Kolom Ketik-Pilih */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                      <div className="sm:col-span-3">
                        <label
                          htmlFor="t1-extra-tingkat"
                          className="block text-[11px] font-bold text-slate-700 mb-1"
                        >
                          Filter Tingkat
                        </label>
                        <select
                          id="t1-extra-tingkat"
                          value={extraFilterTingkat}
                          onChange={(e) => {
                            setExtraFilterTingkat(e.target.value);
                            setExtraFilterKelasKey('ALL');
                          }}
                          className="w-full h-10 px-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                        >
                          <option value="ALL">Semua Tingkat</option>
                          {extraTingkatOptions.map((tk) => (
                            <option key={tk} value={tk}>
                              {tk}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor="t1-extra-kelas"
                          className="block text-[11px] font-bold text-slate-700 mb-1"
                        >
                          Filter Kelas
                        </label>
                        <select
                          id="t1-extra-kelas"
                          value={extraFilterKelasKey}
                          onChange={(e) => setExtraFilterKelasKey(e.target.value)}
                          className="w-full h-10 px-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-700 cursor-pointer"
                        >
                          <option value="ALL">Semua Kelas</option>
                          {extraKelasOptions.map((kls) => (
                            <option key={kls.kelasKey} value={kls.kelasKey}>
                              {kls.kelasLabel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-6 relative" ref={extraDropdownRef}>
                        <label
                          htmlFor="t1-cari-hafalan-lain"
                          className="block text-[11px] font-bold text-slate-700 mb-1"
                        >
                          Pilih Hafalan Lain (Ketik/Pilih)
                        </label>
                        <div className="relative flex items-center">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                          <input
                            id="t1-cari-hafalan-lain"
                            type="text"
                            value={extraSearchQuery}
                            onFocus={() => setIsExtraDropdownOpen(true)}
                            onChange={(e) => {
                              setExtraSearchQuery(e.target.value);
                              setIsExtraDropdownOpen(true);
                            }}
                            placeholder="Ketik atau pilih hafalan kelas lain..."
                            className="w-full h-10 pl-9 pr-14 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-600/15 transition"
                          />
                          <div className="absolute right-1.5 flex items-center gap-0.5">
                            {extraSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setExtraSearchQuery('')}
                                aria-label="Hapus kata kunci hafalan lain"
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setIsExtraDropdownOpen((prev) => !prev)}
                              aria-label="Buka daftar hafalan lain"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform ${
                                  isExtraDropdownOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>

                        {isExtraDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl z-40 max-h-64 overflow-y-auto divide-y divide-slate-100">
                            {filteredExtraDropdownItems.length === 0 ? (
                              <div className="p-3.5 text-center text-xs text-slate-500">
                                Materi hafalan tidak ditemukan untuk filter tingkat/kelas ini.
                              </div>
                            ) : (
                              filteredExtraDropdownItems.map((entry) => {
                                const alreadyInTable = displayedHafalanLainRows.some(
                                  (r) => norm(r.nama) === norm(entry.nama)
                                );
                                return (
                                  <button
                                    key={entry.idKey}
                                    type="button"
                                    onClick={() => handleAddExtraItem(entry)}
                                    className={`w-full min-h-[42px] px-3 py-2 text-left flex items-center justify-between gap-2 hover:bg-emerald-50/70 transition cursor-pointer ${
                                      alreadyInTable
                                        ? 'bg-emerald-50/60 text-emerald-950'
                                        : 'text-slate-800'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold truncate">
                                        {entry.nama}
                                      </div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        <span className="font-semibold text-emerald-800">
                                          Kelas {entry.kelasLabel}
                                        </span>
                                        <span>•</span>
                                        <span>{entry.kriteria}</span>
                                        {entry.keterangan && entry.keterangan !== 'Semua' && (
                                          <>
                                            <span>•</span>
                                            <span className="truncate">{entry.keterangan}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-emerald-200 bg-white text-emerald-800">
                                      {alreadyInTable ? (
                                        <>
                                          <Check className="w-3 h-3" />
                                          Dipilih
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="w-3 h-3" />
                                          Tambah
                                        </>
                                      )}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tabel Hafalan Lain (Desain Identik dengan Daftar Hafalan Utama) */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                      {displayedHafalanLainRows.length === 0 ? (
                        <div className="py-8 px-4 text-center space-y-1">
                          <p className="text-xs sm:text-sm font-bold text-slate-700 m-0">
                            Belum ada hafalan lain yang dipilih
                          </p>
                          <p className="text-[11px] text-slate-500 m-0">
                            Gunakan filter Tingkat/Kelas dan kolom ketik di atas untuk menambahkan satu atau lebih hafalan dari kelas lain.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table
                            data-testid="tabel-hafalan-lain"
                            className="w-full text-xs sm:text-sm border-collapse"
                          >
                            <thead>
                              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 text-xs">
                                <th className="w-14 py-3 px-3 text-center font-bold">Status</th>
                                <th className="py-3 px-3 text-left font-bold">Nama Hafalan</th>
                                <th className="py-3 px-3 text-left font-bold">Keterangan</th>
                                <th className="w-32 py-3 px-3 text-right sm:text-center font-bold">
                                  Kriteria
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {displayedHafalanLainRows.map((item) => {
                                const normName = norm(item.nama);
                                const isChecked = completedItemMap.has(normName);
                                const isBusy = busyItemKey === normName;

                                return (
                                  <tr
                                    key={item.idKey}
                                    onClick={() => {
                                      if (!isBusy) {
                                        void handleToggleChecklist(item.nama, item.kriteria);
                                      }
                                    }}
                                    className={`transition cursor-pointer select-none ${
                                      isChecked
                                        ? 'bg-emerald-50/45 hover:bg-emerald-50/75'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    <td
                                      className="py-2 px-2 text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        role="checkbox"
                                        aria-checked={isChecked}
                                        aria-label={`Tandai ${item.nama} (${item.kriteria})`}
                                        disabled={isBusy}
                                        onClick={() =>
                                          void handleToggleChecklist(item.nama, item.kriteria)
                                        }
                                        className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 transition cursor-pointer disabled:opacity-60"
                                      >
                                        {isBusy ? (
                                          <Loader2 className="w-5 h-5 text-emerald-700 animate-spin" />
                                        ) : (
                                          <span
                                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                                              isChecked
                                                ? 'bg-emerald-700 border-emerald-700 text-white'
                                                : 'bg-white border-slate-300 text-transparent hover:border-emerald-600'
                                            }`}
                                          >
                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                          </span>
                                        )}
                                      </button>
                                    </td>
                                    <td className="py-3 px-3">
                                      <div className="font-bold text-slate-900">{item.nama}</div>
                                      <div className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                                        Kelas Asal: {item.kelasLabel}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 text-xs sm:text-sm">
                                      {item.keterangan || 'Semua'}
                                    </td>
                                    <td className="py-3 px-3 text-right sm:text-center">
                                      <div className="inline-flex items-center gap-1.5 justify-end sm:justify-center">
                                        <span
                                          className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                            KRITERIA_BADGE_STYLES[item.kriteria]
                                          }`}
                                        >
                                          {item.kriteria}
                                        </span>
                                        {!isChecked && item.isDraftSelected && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRemoveExtraDraft(item.idKey);
                                            }}
                                            aria-label={`Hapus ${item.nama} dari daftar hafalan lain`}
                                            title="Keluarkan dari daftar"
                                            className="w-7 h-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
