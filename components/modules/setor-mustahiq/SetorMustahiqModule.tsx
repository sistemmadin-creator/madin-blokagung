'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BarChart2,
  Search,
  Plus,
  Trash2,
  X,
  TrendingUp,
  CheckCircle2,
  History,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  ArrowRightLeft,
  Sparkles,
  Lock,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  useSetorMustahiqStore,
  buildSantriSetorRow,
  computeMateriProgressForSantri,
  getMateriOptionsWithStatusForSantri,
  getMateriListForTingkat,
  getUnitLabel,
} from '@/stores/useSetorMustahiqStore';
import { SantriSetorMustahiqRow, MateriOptionWithStatus } from '@/types/setor-mustahiq';
import {
  formatTargetPreview,
  norm,
  getDaftarTingkatKelasDiniyyah,
} from '@/lib/utils/setoranHelper';
import ModalSettingsHafalan from '@/components/modules/setoran/ModalSettingsHafalan';
import SundayDatePicker from '@/components/ui/SundayDatePicker';

const CARDS_PER_PAGE = 6;
const TABLE_PAGE_SIZE = 30;

export default function SetorMustahiqModule() {
  const { santriList, fetchSantri, isLoading: isLoadingSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const {
    config,
    fetchSetoranData,
    openSettings,
  } = useMuhafadzohStore();
  const {
    logs,
    activeStates,
    isLoading: isLoadingMustahiq,
    fetchMustahiqData,
    addLogSetoran,
    addLogSetoranBatch,
    deleteLogSetoran,
    deleteSantriLogsBatch,
    switchActiveHafalan,
  } = useSetorMustahiqStore();

  const {
    currentAccount,
    isMasterAdmin,
    canCreate,
    canEdit,
    canDelete,
    canAccessSettings,
    isPersonAllowed,
    isClassAllowed,
  } = usePagePermission('setor-mustahiq');

  // View & Filter states
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<string>('ALL');
  const [filterKelas, setFilterKelas] = useState<string>('ALL');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [filterKamar, setFilterKamar] = useState<string>('ALL');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Pagination states
  const [cardPage, setCardPage] = useState(1);
  const [tablePage, setTablePage] = useState(1);

  // Table selection & column visibility states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isColMenuOpen, setIsColMenuOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    status: true,
    kamar: true,
    kelas: true,
    proses: true,
    aksi: true,
  });

  // Detail Setoran Modal state
  const [selectedSantriNoInduk, setSelectedSantriNoInduk] = useState<string | null>(null);
  const [tglSetor, setTglSetor] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [tambahAngka, setTambahAngka] = useState<string>('');
  const [kalimatDipilih, setKalimatDipilih] = useState<string>('');
  const [selectedKalimatList, setSelectedKalimatList] = useState<string[]>([]);
  const [isKalimatDropdownOpen, setIsKalimatDropdownOpen] = useState(false);
  const [kalimatSearch, setKalimatSearch] = useState('');
  const [catatan, setCatatan] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Input Tahfidz (untuk Santri Program Tahfidz)
  const [selectedJuzTahfidz, setSelectedJuzTahfidz] = useState<number>(1);
  const [catatanTahfidz, setCatatanTahfidz] = useState<string>('');
  const [isSubmittingTahfidz, setIsSubmittingTahfidz] = useState(false);

  // Modal "Ganti Hafalan Selanjutnya" state
  const [gantiHafalanTargetNoInduk, setGantiHafalanTargetNoInduk] = useState<string | null>(null);
  const [chosenNextMateri, setChosenNextMateri] = useState<string>('');
  const [chosenNextKategori, setChosenNextKategori] = useState<'Wajib' | 'Sunnah' | 'Kitab' | 'Tahfidz'>('Wajib');
  const [markCurrentAsDone, setMarkCurrentAsDone] = useState<boolean>(true);
  const [selectedExternalKey, setSelectedExternalKey] = useState<string>('ULA_1');
  const [externalSearchQuery, setExternalSearchQuery] = useState<string>('');

  // Quick Input Setoran Modal ('+' button in toolbar)
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickSearchSantri, setQuickSearchSantri] = useState('');

  const autoOpenedFromQueryRef = React.useRef<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchSantri();
    fetchAsatidz();
    fetchFormasi();
    fetchSetoranData();
    fetchMustahiqData();
  }, [fetchSantri, fetchAsatidz, fetchFormasi, fetchSetoranData, fetchMustahiqData]);

  // Deteksi apakah akun yang login adalah Mustahiq spesifik untuk penguncian kelas otomatis
  const lockedMustahiqClass = useMemo(() => {
    if (!currentAccount || isMasterAdmin) return null;
    const accName = norm(currentAccount.full_name);
    const accUser = norm(currentAccount.username);
    if (!accName && !accUser) return null;

    // Cek di tabel asatidz
    const matchedAsatidz = asatidzList.find((a) => {
      const nAsatidz = norm(a.nama_asatidz);
      const niaAsatidz = norm(a.nia);
      return (
        (accName && nAsatidz && (nAsatidz === accName || nAsatidz.includes(accName))) ||
        (accUser && niaAsatidz && niaAsatidz === accUser)
      );
    });

    if (
      matchedAsatidz &&
      matchedAsatidz.tingkat_asatidz &&
      matchedAsatidz.din_kls_asatidz &&
      matchedAsatidz.din_bag_asatidz &&
      matchedAsatidz.tingkat_asatidz !== '-'
    ) {
      const tk = norm(matchedAsatidz.tingkat_asatidz);
      const kls = norm(matchedAsatidz.din_kls_asatidz);
      const bag = norm(matchedAsatidz.din_bag_asatidz);
      return {
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        kelasKey: `${kls}_${tk}_${bag}`,
        label: `${kls} ${tk} ${bag}`,
        mustahiqName: matchedAsatidz.nama_asatidz,
      };
    }

    // Cek di tabel formasi_kelas (id_mustahiq)
    const matchedFormasi = formasiList.find((f) => {
      const mName = norm(f.id_mustahiq);
      return accName && mName && (mName === accName || mName.includes(accName));
    });

    if (matchedFormasi) {
      const tk = norm(matchedFormasi.tingkat);
      const kls = norm(matchedFormasi.din_kls);
      const bag = norm(matchedFormasi.din_bag);
      return {
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        kelasKey: `${kls}_${tk}_${bag}`,
        label: `${kls} ${tk} ${bag}`,
        mustahiqName: matchedFormasi.id_mustahiq,
      };
    }

    return null;
  }, [currentAccount, isMasterAdmin, asatidzList, formasiList]);

  // Build rows for all allowed santri
  const allRows: SantriSetorMustahiqRow[] = useMemo(() => {
    const allowedSantri = santriList.filter((s) => {
      if (!s.no_induk || !s.nama) return false;
      const statusRaw = (s as any).status_santri || (s as any).ket_status;
      if (statusRaw && norm(statusRaw) === 'BOYONG') return false;
      if (!isPersonAllowed(s)) return false;
      if (
        !isClassAllowed(
          {
            tingkat: s.tingkat,
            din_kls: s.din_kls,
            din_bag: s.din_bag,
            pa_pi: s.pa_pi,
          },
          santriList,
          asatidzList
        )
      ) {
        return false;
      }

      // Jika terkunci ke kelas Mustahiq yang login
      if (lockedMustahiqClass) {
        if (
          norm(s.tingkat) !== lockedMustahiqClass.tingkat ||
          norm(s.din_kls) !== lockedMustahiqClass.din_kls ||
          norm(s.din_bag) !== lockedMustahiqClass.din_bag
        ) {
          return false;
        }
      }

      return true;
    });

    return allowedSantri.map((s) =>
      buildSantriSetorRow(
        s,
        config,
        logs,
        activeStates,
        asatidzList,
        formasiList,
        tahun
      )
    );
  }, [
    santriList,
    config,
    logs,
    activeStates,
    asatidzList,
    formasiList,
    tahun,
    isPersonAllowed,
    isClassAllowed,
    lockedMustahiqClass,
  ]);

  // Unique filter options
  const uniqueKelasOptions = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; shortBadge: string; tingkat: string; din_kls: string; din_bag: string }
    >();
    allRows.forEach((r) => {
      const key = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: r.kelas_label,
          shortBadge: r.short_kelas_badge,
          tingkat: r.tingkat,
          din_kls: r.din_kls,
          din_bag: r.din_bag,
        });
      }
    });
    const orderTk: Record<string, number> = { ULA: 1, WUSTHO: 2, WUSTHA: 2, ULYA: 3 };
    return Array.from(map.values()).sort((a, b) => {
      const tA = orderTk[a.tingkat] || 99;
      const tB = orderTk[b.tingkat] || 99;
      if (tA !== tB) return tA - tB;
      const kCmp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
      if (kCmp !== 0) return kCmp;
      return a.din_bag.localeCompare(b.din_bag, 'id');
    });
  }, [allRows]);

  const uniqueKamarOptions = useMemo(() => {
    const set = new Set<string>();
    allRows.forEach((r) => {
      if (r.kamar && r.kamar !== '-') set.add(r.kamar);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [allRows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterTingkat !== 'ALL') count++;
    if (filterKelas !== 'ALL') count++;
    if (filterKategori !== 'ALL') count++;
    if (filterStatus !== 'ALL') count++;
    if (filterGender !== 'ALL') count++;
    if (filterKamar !== 'ALL') count++;
    return count;
  }, [
    filterTingkat,
    filterKelas,
    filterKategori,
    filterStatus,
    filterGender,
    filterKamar,
  ]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = norm(search);
    return allRows
      .filter((r) => {
        if (q) {
          const matchName = norm(r.nama).includes(q);
          const matchNis = norm(r.no_induk).includes(q);
          const matchMateri = norm(r.active_item.nama).includes(q);
          const matchKelas = norm(r.kelas_label).includes(q) || norm(r.short_kelas_badge).includes(q);
          if (!matchName && !matchNis && !matchMateri && !matchKelas) return false;
        }
        if (filterTingkat !== 'ALL' && r.tingkat !== filterTingkat) return false;
        if (filterKelas !== 'ALL') {
          const key = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
          if (key !== filterKelas) return false;
        }
        if (filterKategori !== 'ALL' && r.active_kategori !== filterKategori) return false;
        if (filterGender !== 'ALL' && r.pa_pi !== filterGender) return false;
        if (filterKamar !== 'ALL' && r.kamar !== filterKamar) return false;
        if (filterStatus === 'TUNTAS' && !r.is_target_met) return false;
        if (filterStatus === 'PROSES' && (r.is_target_met || r.progress_pct === 0)) return false;
        if (filterStatus === 'BELUM' && r.progress_pct > 0) return false;
        return true;
      })
      .sort((a, b) => {
        const orderTk: Record<string, number> = { ULA: 1, WUSTHO: 2, WUSTHA: 2, ULYA: 3 };
        const tA = orderTk[a.tingkat] || 99;
        const tB = orderTk[b.tingkat] || 99;
        if (tA !== tB) return tA - tB;
        const kCmp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
        if (kCmp !== 0) return kCmp;
        const bCmp = a.din_bag.localeCompare(b.din_bag, 'id');
        if (bCmp !== 0) return bCmp;
        return a.nama.localeCompare(b.nama, 'id');
      });
  }, [
    allRows,
    search,
    filterTingkat,
    filterKelas,
    filterKategori,
    filterGender,
    filterKamar,
    filterStatus,
  ]);

  // Group filtered rows into Class Cards (for Mode Kartu)
  const classGroups = useMemo(() => {
    const groupMap = new Map<
      string,
      {
        groupKey: string;
        shortBadge: string;
        kelasLabel: string;
        tingkat: string;
        din_kls: string;
        din_bag: string;
        mustahiq: string;
        defaultTargetName: string;
        defaultTargetPreview: string;
        students: SantriSetorMustahiqRow[];
      }
    >();

    filteredRows.forEach((row) => {
      const gKey = `${row.din_kls}_${row.tingkat}_${row.din_bag}`;
      if (!groupMap.has(gKey)) {
        groupMap.set(gKey, {
          groupKey: gKey,
          shortBadge: row.short_kelas_badge,
          kelasLabel: row.kelas_label,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          mustahiq: row.mustahiq,
          defaultTargetName: row.active_item.nama,
          defaultTargetPreview: formatTargetPreview(row.active_item),
          students: [],
        });
      }
      groupMap.get(gKey)!.students.push(row);
    });

    return Array.from(groupMap.values());
  }, [filteredRows]);

  const totalCardPages = Math.max(1, Math.ceil(classGroups.length / CARDS_PER_PAGE));
  const paginatedCardGroups = useMemo(() => {
    const safePage = Math.min(cardPage, totalCardPages);
    const start = (safePage - 1) * CARDS_PER_PAGE;
    return classGroups.slice(start, start + CARDS_PER_PAGE);
  }, [classGroups, cardPage, totalCardPages]);

  const totalTablePages = Math.max(1, Math.ceil(filteredRows.length / TABLE_PAGE_SIZE));
  const paginatedTableRows = useMemo(() => {
    const safePage = Math.min(tablePage, totalTablePages);
    const start = (safePage - 1) * TABLE_PAGE_SIZE;
    return filteredRows.slice(start, start + TABLE_PAGE_SIZE);
  }, [filteredRows, tablePage, totalTablePages]);

  // Reset pagination when filters change
  useEffect(() => {
    setCardPage(1);
    setTablePage(1);
  }, [search, filterTingkat, filterKelas, filterKategori, filterStatus, filterGender, filterKamar]);

  // Selected Santri Detail Data
  const selectedRow = useMemo(() => {
    if (!selectedSantriNoInduk) return null;
    return (
      allRows.find((r) => norm(r.no_induk) === norm(selectedSantriNoInduk)) || null
    );
  }, [allRows, selectedSantriNoInduk]);

  const selectedSantriDetail = useMemo(() => {
    if (!selectedRow) return null;
    const prog = computeMateriProgressForSantri(
      selectedRow.no_induk,
      selectedRow.active_item,
      logs,
      tahun
    );
    const materiOptions = getMateriOptionsWithStatusForSantri(
      selectedRow.no_induk,
      selectedRow.config_key,
      config,
      logs,
      activeStates[selectedRow.no_induk],
      tahun
    );
    return {
      row: selectedRow,
      prog,
      materiOptions,
    };
  }, [selectedRow, logs, tahun, config, activeStates]);

  const riwayatLogs = useMemo(() => {
    if (!selectedSantriDetail) return [];
    if (selectedSantriDetail.row.is_tahfidz) {
      return logs
        .filter(
          (l) =>
            norm(l.no_induk) === norm(selectedSantriDetail.row.no_induk) &&
            (l.tahun === tahun || !l.tahun)
        )
        .sort((a, b) => b.tanggal.localeCompare(a.tanggal));
    }
    return selectedSantriDetail.prog.matchingLogs;
  }, [selectedSantriDetail, logs, tahun]);

  // Set default sentence dropdown when opening Detail Modal for sentence-based item
  useEffect(() => {
    if (selectedSantriDetail) {
      const item = selectedSantriDetail.row.active_item;
      if (item.targetType === 'sentence') {
        const sentences =
          item.sentences && item.sentences.length > 0
            ? item.sentences
            : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer'];
        const doneSet = new Set(
          selectedSantriDetail.prog.completedSentences.map((s) => norm(s))
        );
        const firstUnfinished =
          sentences.find((s) => !doneSet.has(norm(s))) || sentences[0] || '';
        setKalimatDipilih(firstUnfinished);
      } else {
        setKalimatDipilih('');
      }
    }
  }, [selectedSantriDetail?.row.no_induk, selectedSantriDetail?.row.active_item.nama]);

  // Target Santri for "Ganti Hafalan Selanjutnya" Modal
  const gantiHafalanData = useMemo(() => {
    if (!gantiHafalanTargetNoInduk) return null;
    const row = allRows.find(
      (r) => norm(r.no_induk) === norm(gantiHafalanTargetNoInduk)
    );
    if (!row) return null;
    const options = getMateriOptionsWithStatusForSantri(
      row.no_induk,
      row.config_key,
      config,
      logs,
      activeStates[row.no_induk],
      tahun
    );
    const allWajibDone = options
      .filter((o) => o.kategori === 'Wajib')
      .every((o) => o.isCompleted || (o.isCurrentActive && row.is_target_met));

    return {
      row,
      options,
      wajibOptions: options.filter((o) => o.kategori === 'Wajib'),
      sunnahKitabOptions: options.filter((o) => o.kategori !== 'Wajib'),
      allWajibDone,
    };
  }, [gantiHafalanTargetNoInduk, allRows, config, logs, activeStates, tahun]);

  const availableTingkatKelasOptions = useMemo(() => {
    return getDaftarTingkatKelasDiniyyah(formasiList, santriList);
  }, [formasiList, santriList]);

  const externalMateriList = useMemo(() => {
    if (!selectedExternalKey) return [];
    const list = getMateriListForTingkat(config, selectedExternalKey);
    if (!externalSearchQuery.trim()) return list;
    const q = norm(externalSearchQuery);
    return list.filter((m) => norm(m.item.nama).includes(q));
  }, [selectedExternalKey, config, externalSearchQuery]);

  const handleOpenDetailModal = (noInduk: string) => {
    setSelectedSantriNoInduk(noInduk);
    setTambahAngka('');
    setCatatan('');
    setSelectedKalimatList([]);
    setKalimatDipilih('');
    setKalimatSearch('');
    setIsKalimatDropdownOpen(false);
    setTglSetor(new Date().toISOString().split('T')[0]);

    // Inisialisasi status Tahfidz jika santri mengikuti program Tahfidz
    const targetSantri = allRows.find((r) => norm(r.no_induk) === norm(noInduk));
    if (targetSantri && targetSantri.is_tahfidz) {
      const maxJuz = targetSantri.tahfidz_target_juz || 3;
      const completedSet = new Set(targetSantri.tahfidz_completed_juz || []);
      let firstUncompleted = 1;
      for (let j = 1; j <= maxJuz; j++) {
        if (!completedSet.has(j)) {
          firstUncompleted = j;
          break;
        }
      }
      setSelectedJuzTahfidz(firstUncompleted);
      setCatatanTahfidz('');
    } else {
      setSelectedJuzTahfidz(1);
      setCatatanTahfidz('');
    }
  };

  // Auto-open Modal Detail Setoran (Gambar 2) ketika halaman dibuka dari hasil scan barcode (?santri=...)
  useEffect(() => {
    if (typeof window === 'undefined' || allRows.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const santriParam = params.get('santri')?.trim();
    const tahunParam = params.get('tahun')?.trim();

    if (tahunParam && /^\d{4}$/.test(tahunParam)) {
      const parsedYear = Number(tahunParam);
      if (parsedYear !== tahun) {
        setTahun(parsedYear);
      }
    }

    if (santriParam && autoOpenedFromQueryRef.current !== santriParam) {
      const matched = allRows.find((r) => norm(r.no_induk) === norm(santriParam));
      if (matched) {
        autoOpenedFromQueryRef.current = santriParam;
        handleOpenDetailModal(matched.no_induk);
      }
    }
  }, [allRows, tahun]);

  const handleOpenGantiHafalanModal = (noInduk: string) => {
    const row = allRows.find((r) => norm(r.no_induk) === norm(noInduk));
    if (!row) return;
    const options = getMateriOptionsWithStatusForSantri(
      row.no_induk,
      row.config_key,
      config,
      logs,
      activeStates[row.no_induk],
      tahun
    );
    const recommended =
      options.find((o) => o.isRecommendedNext) ||
      options.find((o) => !o.isCurrentActive) ||
      options[0];

    const otherOption = availableTingkatKelasOptions.find((opt) => opt.key !== row.config_key);
    setSelectedExternalKey(otherOption?.key || 'ULA_1');
    setExternalSearchQuery('');

    setGantiHafalanTargetNoInduk(noInduk);
    setChosenNextMateri(recommended?.item.nama || row.active_item.nama);
    setChosenNextKategori(recommended?.kategori || row.active_kategori);
    setMarkCurrentAsDone(row.is_target_met);
  };

  const handleSubmitSetoran = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSantriDetail) return;

    const { row } = selectedSantriDetail;
    const item = row.active_item;

    if (item.targetType === 'numeric') {
      const numVal = parseInt(tambahAngka, 10);
      if (!numVal || numVal <= 0) {
        alert(`Masukkan jumlah pertambahan ${row.satuan_label} yang valid (lebih dari 0).`);
        return;
      }
      const noteVal = catatan.trim() || undefined;
      setIsSubmitting(true);
      setTambahAngka('');
      setCatatan('');
      await addLogSetoran(
        {
          no_induk: row.no_induk,
          nama_santri: row.nama,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          materi_nama: item.nama,
          kategori: row.active_kategori,
          target_type: 'numeric',
          tanggal: tglSetor,
          tahun,
          tambah_angka: numVal,
          catatan: noteVal,
          mustahiq: row.mustahiq,
        },
        item
      );
      try {
        await useMuhafadzohStore.getState().addSetoran({
          no_induk: row.no_induk,
          nama: row.nama,
          tanggal: tglSetor,
          item_hafalan: item.nama,
          kategori: row.active_kategori,
          penjaga: row.mustahiq || 'Mustahiq Kelas',
          mustahiq: row.mustahiq,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          capaian: `${numVal} ${row.satuan_label}`,
        });
      } catch {}
      setIsSubmitting(false);
    } else {
      const itemsToSubmit =
        selectedKalimatList.length > 0
          ? selectedKalimatList
          : kalimatDipilih.trim()
          ? [kalimatDipilih.trim()]
          : [];

      if (itemsToSubmit.length === 0) {
        alert(`Pilih tahapan ${row.satuan_label} yang disetorkan.`);
        return;
      }
      const noteVal = catatan.trim() || undefined;
      setIsSubmitting(true);
      setCatatan('');

      if (itemsToSubmit.length === 1) {
        const chosenKalimat = itemsToSubmit[0];
        const sentences = item.sentences || [];
        const idx = sentences.findIndex((s) => norm(s) === norm(chosenKalimat));
        await addLogSetoran(
          {
            no_induk: row.no_induk,
            nama_santri: row.nama,
            tingkat: row.tingkat,
            din_kls: row.din_kls,
            din_bag: row.din_bag,
            materi_nama: item.nama,
            kategori: row.active_kategori,
            target_type: 'sentence',
            tanggal: tglSetor,
            tahun,
            kalimat_dipilih: chosenKalimat,
            kalimat_index: idx !== -1 ? idx + 1 : undefined,
            catatan: noteVal,
            mustahiq: row.mustahiq,
          },
          item
        );
      } else {
        await addLogSetoranBatch(
          {
            no_induk: row.no_induk,
            nama_santri: row.nama,
            tingkat: row.tingkat,
            din_kls: row.din_kls,
            din_bag: row.din_bag,
            materi_nama: item.nama,
            kategori: row.active_kategori,
            target_type: 'sentence',
            tanggal: tglSetor,
            tahun,
            catatan: noteVal,
            mustahiq: row.mustahiq,
          },
          itemsToSubmit,
          item
        );
      }
      try {
        await useMuhafadzohStore.getState().addSetoran({
          no_induk: row.no_induk,
          nama: row.nama,
          tanggal: tglSetor,
          item_hafalan: item.nama,
          kategori: row.active_kategori,
          penjaga: row.mustahiq || 'Mustahiq Kelas',
          mustahiq: row.mustahiq,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          capaian: itemsToSubmit.join(', '),
        });
      } catch {}
      setSelectedKalimatList([]);
      setKalimatDipilih('');
      setIsSubmitting(false);
    }
  };

  const handleSubmitTahfidzOnly = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSantriDetail) return;
    const { row } = selectedSantriDetail;
    if (!row.is_tahfidz) return;

    const juzNum = Number(selectedJuzTahfidz) || 1;
    const noteVal = catatanTahfidz.trim() || undefined;

    setIsSubmittingTahfidz(true);
    try {
      const itemDetail = {
        id: `tahfidz_juz_${juzNum}`,
        nama: `Juz ${juzNum}`,
        kategori: 'Tahfidz' as const,
        targetType: 'numeric' as const,
        targetAkhirAngka: 1,
        satuanAngka: 'Juz',
      };

      await addLogSetoran(
        {
          no_induk: row.no_induk,
          nama_santri: row.nama,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          materi_nama: `Juz ${juzNum}`,
          kategori: 'Tahfidz',
          target_type: 'numeric',
          tanggal: tglSetor,
          tahun,
          tambah_angka: 1,
          catatan: noteVal,
          mustahiq: row.mustahiq,
        },
        itemDetail
      );

      try {
        await useMuhafadzohStore.getState().addSetoran({
          no_induk: row.no_induk,
          nama: row.nama,
          tanggal: tglSetor,
          item_hafalan: `Juz ${juzNum}`,
          kategori: 'Tahfidz',
          penjaga: row.mustahiq || 'Mustahiq Kelas',
          mustahiq: row.mustahiq,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          capaian: `Juz ${juzNum}`,
        });
      } catch {}

      const nextJuz = Math.min(juzNum + 1, row.tahfidz_target_juz || 3);
      setSelectedJuzTahfidz(nextJuz);
      setCatatanTahfidz('');
    } finally {
      setIsSubmittingTahfidz(false);
    }
  };

  const handleSubmitBothSetoran = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedSantriDetail) return;
    await handleSubmitTahfidzOnly();
    await handleSubmitSetoran();
  };

  const handleConfirmGantiHafalan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gantiHafalanData || !chosenNextMateri) return;
    const { row } = gantiHafalanData;

    const ok = await switchActiveHafalan(
      row.no_induk,
      row.nama,
      chosenNextMateri,
      chosenNextKategori,
      markCurrentAsDone ? row.active_item.nama : undefined
    );

    if (ok) {
      setGantiHafalanTargetNoInduk(null);
    }
  };

  // Export CSV / Excel
  const handleExportCSV = () => {
    const headers = [
      'No',
      'No. Induk',
      'Nama Santri',
      'Kelas',
      'Kamar',
      'Mustahiq',
      'Materi Hafalan Aktif',
      'Kategori',
      'Status Capaian',
      'Proses',
      'Persentase',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredRows.map((r, i) =>
        [
          i + 1,
          `"${r.no_induk}"`,
          `"${r.nama.replace(/"/g, '""')}"`,
          `"${r.kelas_label}"`,
          `"${r.kamar}"`,
          `"${r.mustahiq}"`,
          `"${r.active_item.nama.replace(/"/g, '""')}"`,
          `"${r.active_kategori}"`,
          `"${r.status_badge_text}"`,
          `"${r.proses_full_text}"`,
          `"${r.progress_pct}%"`,
        ].join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Setor_Mustahiq_${tahun}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  // Table selection helpers
  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((r) => selectedIds.has(r.no_induk));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.no_induk)));
    }
  };

  const toggleSelectOne = (noInduk: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noInduk)) next.delete(noInduk);
      else next.add(noInduk);
      return next;
    });
  };

  const handleBulkDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        `Hapus seluruh riwayat setoran tahun ${tahun} untuk ${selectedIds.size} santri yang dipilih?`
      )
    ) {
      return;
    }
    await deleteSantriLogsBatch(Array.from(selectedIds), tahun);
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
  };

  const handleBulkDeleteAll = async () => {
    if (filteredRows.length === 0) return;
    if (
      !confirm(
        `PERINGATAN: Reset seluruh riwayat setoran tahun ${tahun} untuk ${filteredRows.length} santri yang tampil?`
      )
    ) {
      return;
    }
    await deleteSantriLogsBatch(
      filteredRows.map((r) => r.no_induk),
      tahun
    );
    setSelectedIds(new Set());
    setIsBulkDeleteOpen(false);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Setoran Mingguan Santri (Mustahiq)
            </h1>
            {lockedMustahiqClass && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Kelas Binaan: {lockedMustahiqClass.label}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan dan pemantauan proses setoran hafalan mingguan santri sesuai target kurikulum tingkatan kelas kepada Mustahiq.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <Link
              href="/setor-mustahiq"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Setor Kelas
            </Link>
            <Link
              href="/setor-mustahiq/rekap"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Rekap Setor
            </Link>
            <Link
              href="/kirim-wa"
              data-testid="btn-shortcut-kirim-wa"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Kirim WA Rapor
            </Link>
          </div>

          {canAccessSettings && (
            <button
              type="button"
              data-testid="btn-opsi-target-hafalan"
              onClick={openSettings}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-700" />
              <span className="hidden md:inline">Opsi Target Hafalan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Toolbar (Identik dengan LPTQ Gambar 2 & 3) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* View Mode Switcher: Kartu | Tabel */}
        <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
          <button
            type="button"
            data-testid="btn-mode-kartu"
            onClick={() => setViewMode('card')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'card'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kartu
          </button>
          <button
            type="button"
            data-testid="btn-mode-tabel"
            onClick={() => setViewMode('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              viewMode === 'table'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            Tabel
          </button>
        </div>

        {/* Tahun Selector */}
        <select
          value={tahun}
          onChange={(e) => setTahun(Number(e.target.value))}
          aria-label="Pilih Tahun"
          className="bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer shadow-xs"
        >
          {[2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama atau kode santri..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons Right */}
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Filter Button */}
          <button
            type="button"
            data-testid="btn-filter-mustahiq"
            onClick={() => setIsFilterModalOpen(true)}
            title="Filter Data"
            className={`relative inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeFilterCount > 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Export CSV/Excel Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Unduh Rekap Excel/CSV"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            title="Cetak Rekap Setoran"
            className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
          </button>

          {/* Quick Input Setoran Button (+) */}
          {canCreate && (
            <button
              type="button"
              data-testid="btn-quick-setor"
              onClick={() => {
                setQuickSearchSantri('');
                setIsQuickAddModalOpen(true);
              }}
              title="Input Setoran Santri"
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter Aktif:</span>
          {filterTingkat !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Tingkat: {filterTingkat}
              <button type="button" onClick={() => setFilterTingkat('ALL')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterKelas !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Kelas: {filterKelas.replace(/_/g, ' ')}
              <button type="button" onClick={() => setFilterKelas('ALL')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterKategori !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Kategori: {filterKategori}
              <button type="button" onClick={() => setFilterKategori('ALL')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterStatus !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Status: {filterStatus}
              <button type="button" onClick={() => setFilterStatus('ALL')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterGender !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Gender: {filterGender}
              <button type="button" onClick={() => setFilterGender('ALL')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterKamar !== 'ALL' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              Kamar: {filterKamar}
              <button type="button" onClick={() => setFilterKamar('ALL')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setFilterTingkat('ALL');
              setFilterKelas('ALL');
              setFilterKategori('ALL');
              setFilterStatus('ALL');
              setFilterGender('ALL');
              setFilterKamar('ALL');
            }}
            className="text-xs font-bold text-rose-600 hover:underline ml-1"
          >
            Reset Semua
          </button>
        </div>
      )}

      {/* Loading State */}
      {(isLoadingSantri || isLoadingMustahiq) && allRows.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm">
          Memuat data santri dan target hafalan kelas...
        </div>
      ) : viewMode === 'card' ? (
        /* ==================== MODE KARTU (GAMBAR 2) ==================== */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {paginatedCardGroups.map((group) => (
              <div
                key={group.groupKey}
                data-testid={`card-kelas-${group.shortBadge}`}
                className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/40 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                      {group.shortBadge}
                    </span>
                    <span
                      title={`${group.defaultTargetName} (${group.defaultTargetPreview})`}
                      className="text-xs font-semibold text-emerald-800 bg-emerald-50/70 px-2.5 py-0.5 rounded-md border border-emerald-200/70 truncate max-w-[230px]"
                    >
                      Target: {group.defaultTargetName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400">
                      ({group.kelasLabel})
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">
                      {group.students.length} Santri
                    </span>
                  </div>
                </div>

                {/* Card Student Table */}
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                        <th className="py-2 pl-4 pr-2 w-8">No</th>
                        <th className="py-2 px-2">Nama Santri</th>
                        <th className="py-2 px-2 text-center">Status</th>
                        <th className="py-2 px-2 text-center">Kamar</th>
                        <th className="py-2 pl-2 pr-4 text-right w-32">Proses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {group.students.map((s, idx) => (
                        <tr
                          key={s.no_induk}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          <td className="py-2.5 pl-4 pr-2 text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-2">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(s.no_induk)}
                              className="text-left font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors cursor-pointer block truncate max-w-[175px]"
                              title={`${s.nama} — Materi: ${s.active_item.nama}`}
                            >
                              {s.nama}
                            </button>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            {s.is_tahfidz && s.tahfidz_mode === 'simultan' ? (
                              <div className="flex flex-col items-center">
                                <span className="font-mono text-[10px] font-bold text-cyan-700">
                                  Juz {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}
                                </span>
                                <span
                                  title={s.status_sub_text}
                                  className="font-mono text-[10px] font-semibold text-emerald-700"
                                >
                                  {s.status_badge_text}
                                </span>
                              </div>
                            ) : s.is_tahfidz && s.tahfidz_mode === 'didahulukan' ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="font-mono text-[10px] font-bold text-cyan-800 flex items-center gap-0.5">
                                  <Sparkles className="w-2.5 h-2.5 text-cyan-600 shrink-0" />
                                  Juz {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold uppercase tracking-wider">
                                  Tahfidz Utama
                                </span>
                              </div>
                            ) : (
                              <span
                                title={s.status_sub_text}
                                className="font-mono text-[11px] font-semibold text-emerald-700"
                              >
                                {s.status_badge_text}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono text-[11px] text-slate-600">
                            {s.kamar}
                          </td>
                          <td className="py-2.5 pl-2 pr-4">
                            <div className="flex items-center justify-end gap-2">
                              {s.is_tahfidz && s.tahfidz_mode === 'simultan' ? (
                                <div className="flex flex-col gap-1 items-end">
                                  {/* Bar 1: Tahfidz */}
                                  <div
                                    className="flex items-center gap-1.5"
                                    title={`Tahfidz: Juz ${s.tahfidz_progress_juz}/${s.tahfidz_target_juz} (${s.tahfidz_progress_pct}%)`}
                                  >
                                    <span className="text-[9px] font-bold text-cyan-700 font-mono">T:</span>
                                    <div className="w-12 h-1.5 bg-cyan-100 rounded-full overflow-hidden shrink-0">
                                      <div
                                        className="h-full rounded-full transition-all bg-cyan-500"
                                        style={{ width: `${s.tahfidz_progress_pct}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[9px] text-cyan-700 w-8 text-right shrink-0">
                                      {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}J
                                    </span>
                                  </div>
                                  {/* Bar 2: Wajib */}
                                  <div
                                    className="flex items-center gap-1.5"
                                    title={`Hafalan Wajib: ${s.proses_ratio_text} (${s.progress_pct}%)`}
                                  >
                                    <span className="text-[9px] font-bold text-emerald-700 font-mono">W:</span>
                                    <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                      <div
                                        className="h-full rounded-full transition-all bg-emerald-500"
                                        style={{ width: `${s.progress_pct}%` }}
                                      />
                                    </div>
                                    <span className="font-mono text-[9px] text-slate-400 w-8 text-right shrink-0">
                                      {s.proses_ratio_text}
                                    </span>
                                  </div>
                                </div>
                              ) : s.is_tahfidz && s.tahfidz_mode === 'didahulukan' ? (
                                <div
                                  className="flex items-center justify-end gap-1.5"
                                  title={`Tahfidz Utama: Juz ${s.tahfidz_progress_juz}/${s.tahfidz_target_juz} (${s.tahfidz_progress_pct}%)`}
                                >
                                  <div className="w-14 h-1.5 bg-cyan-100 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className="h-full rounded-full transition-all bg-cyan-500"
                                      style={{ width: `${s.tahfidz_progress_pct}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] text-cyan-800 font-bold w-10 text-right shrink-0">
                                    {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}J
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        s.is_tahfidz ? 'bg-cyan-500' : 'bg-emerald-500'
                                      }`}
                                      style={{ width: `${s.progress_pct}%` }}
                                    />
                                  </div>
                                  <span className="font-mono text-[10px] text-slate-400 w-10 text-right shrink-0">
                                    {s.proses_ratio_text}
                                  </span>
                                </>
                              )}
                              {s.is_target_met && canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenGantiHafalanModal(s.no_induk)}
                                  title="Target Tuntas! Klik untuk Ganti Hafalan Selanjutnya"
                                  className="px-1.5 py-0.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer shrink-0 shadow-2xs"
                                >
                                  <TrendingUp className="w-2.5 h-2.5" />
                                  Ganti
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {classGroups.length === 0 && (
              <div className="col-span-full bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-sm">
                Tidak ada data santri yang cocok dengan filter pencarian.
              </div>
            )}
          </div>

          {/* Card Pagination */}
          {totalCardPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-xs">
              <p className="text-xs text-slate-500">
                Menampilkan halaman{' '}
                <span className="font-bold text-slate-800">{cardPage}</span> dari{' '}
                <span className="font-bold text-slate-800">{totalCardPages}</span> (
                {classGroups.length} Kartu Kelas)
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCardPage((p) => Math.max(1, p - 1))}
                  disabled={cardPage <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setCardPage((p) => Math.min(totalCardPages, p + 1))}
                  disabled={cardPage >= totalCardPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  Selanjutnya
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ==================== MODE TABEL (GAMBAR 3) ==================== */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Top Bar inside Table Card */}
          <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">
              Total <span className="font-bold text-slate-900">{filteredRows.length}</span> baris data
            </span>

            <div className="flex items-center gap-2.5">
              {/* Hapus Bulk Dropdown */}
              {canDelete && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsBulkDeleteOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {isBulkDeleteOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsBulkDeleteOpen(false)}
                      />
                      <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30">
                        <button
                          type="button"
                          disabled={selectedIds.size === 0}
                          onClick={handleBulkDeleteSelected}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 cursor-pointer"
                        >
                          Hapus Riwayat Terpilih ({selectedIds.size})
                        </button>
                        <button
                          type="button"
                          disabled={filteredRows.length === 0}
                          onClick={handleBulkDeleteAll}
                          className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 cursor-pointer"
                        >
                          Reset Semua Riwayat ({filteredRows.length})
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tampilkan / Sembunyikan Kolom */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsColMenuOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Tampilkan / Sembunyikan Kolom
                </button>

                {isColMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setIsColMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-30 space-y-1">
                      {(
                        [
                          { key: 'status', label: 'Kolom Status' },
                          { key: 'kamar', label: 'Kolom Kamar' },
                          { key: 'kelas', label: 'Kolom Kelas' },
                          { key: 'proses', label: 'Kolom Proses' },
                          { key: 'aksi', label: 'Tombol Setor' },
                        ] as const
                      ).map((col) => (
                        <label
                          key={col.key}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={visibleCols[col.key]}
                            onChange={(e) =>
                              setVisibleCols((prev) => ({
                                ...prev,
                                [col.key]: e.target.checked,
                              }))
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-700"
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider bg-white">
                  <th className="py-3.5 pl-5 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-emerald-700 cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-3 w-12">NO</th>
                  <th className="py-3.5 px-3">NAMA</th>
                  {visibleCols.status && <th className="py-3.5 px-3">STATUS</th>}
                  {visibleCols.kamar && <th className="py-3.5 px-3">KAMAR</th>}
                  {visibleCols.kelas && <th className="py-3.5 px-3">KELAS</th>}
                  {visibleCols.proses && <th className="py-3.5 px-3 w-52">PROSES</th>}
                  {visibleCols.aksi && <th className="py-3.5 pl-3 pr-5 text-right w-32" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedTableRows.map((s, idx) => {
                  const rowNum = (tablePage - 1) * TABLE_PAGE_SIZE + idx + 1;
                  return (
                    <tr
                      key={s.no_induk}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.no_induk)}
                          onChange={() => toggleSelectOne(s.no_induk)}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-700 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {rowNum}
                      </td>
                      <td className="py-3.5 px-3">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(s.no_induk)}
                          className="text-left font-bold text-[#134e3a] hover:underline cursor-pointer"
                        >
                          {s.nama}
                        </button>
                      </td>
                      {visibleCols.status && (
                        <td className="py-3.5 px-3">
                          {s.is_tahfidz && s.tahfidz_mode === 'simultan' ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 font-mono text-[11px] font-bold w-fit">
                                Juz {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[10px] font-semibold w-fit">
                                {s.status_badge_text}
                              </span>
                            </div>
                          ) : s.is_tahfidz && s.tahfidz_mode === 'didahulukan' ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 font-mono text-[11px] font-bold w-fit flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-cyan-600 shrink-0" />
                                Juz {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}
                              </span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 font-bold uppercase w-fit tracking-wide">
                                Tahfidz Utama
                              </span>
                            </div>
                          ) : (
                            <div className="inline-flex flex-col">
                              <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-emerald-800 font-mono text-[11px] font-bold w-fit">
                                {s.status_badge_text}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-[220px]">
                                {s.status_sub_text}
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      {visibleCols.kamar && (
                        <td className="py-3.5 px-3 font-mono text-xs font-semibold text-slate-700">
                          {s.kamar}
                        </td>
                      )}
                      {visibleCols.kelas && (
                        <td className="py-3.5 px-3">
                          <span
                            title={s.kelas_label}
                            className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs"
                          >
                            {s.short_kelas_badge}
                          </span>
                        </td>
                      )}
                      {visibleCols.proses && (
                        <td className="py-3.5 px-3">
                          {s.is_tahfidz && s.tahfidz_mode === 'simultan' ? (
                            <div className="space-y-1.5">
                              {/* Progress 1: Tahfidz */}
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-bold text-cyan-800">
                                    Tahfidz: Juz {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}
                                  </span>
                                  <span className="text-cyan-600 font-semibold">{s.tahfidz_progress_pct}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-cyan-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all bg-cyan-500"
                                    style={{ width: `${s.tahfidz_progress_pct}%` }}
                                  />
                                </div>
                              </div>

                              {/* Progress 2: Wajib */}
                              <div className="space-y-0.5">
                                <div className="flex items-center justify-between text-[10px] font-mono">
                                  <span className="font-bold text-slate-700">
                                    {s.active_item.nama}: {s.proses_full_text}
                                  </span>
                                  <span className="text-slate-400">{s.progress_pct}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all bg-emerald-500"
                                    style={{ width: `${s.progress_pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : s.is_tahfidz && s.tahfidz_mode === 'didahulukan' ? (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="font-bold text-cyan-800">
                                  Tahfidz (Prioritas): Juz {s.tahfidz_progress_juz}/{s.tahfidz_target_juz}
                                </span>
                                <span className="text-cyan-600 font-semibold">{s.tahfidz_progress_pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-cyan-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all bg-cyan-500"
                                  style={{ width: `${s.tahfidz_progress_pct}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="font-bold text-slate-700">
                                  {s.proses_full_text}
                                </span>
                                <span className="text-slate-400">{s.progress_pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    s.is_tahfidz ? 'bg-cyan-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${s.progress_pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                      )}
                      {visibleCols.aksi && (
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetailModal(s.no_induk)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Setor
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {paginatedTableRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-10 text-center text-slate-400 text-sm"
                    >
                      Tidak ada data santri yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          {totalTablePages > 1 && (
            <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Halaman <span className="font-bold text-slate-800">{tablePage}</span> dari{' '}
                <span className="font-bold text-slate-800">{totalTablePages}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                  disabled={tablePage <= 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                  disabled={tablePage >= totalTablePages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== MODAL DETAIL SETORAN SANTRI (GAMBAR 4) ==================== */}
      {selectedSantriDetail && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-detail-setor-mustahiq"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Detail Setoran Hafalan Santri
                  </h2>
                  <p className="text-xs text-slate-500">
                    Madrasah Diniyyah Al Amiriyyah Blokagung
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSantriNoInduk(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Kartu Ringkasan Santri & Target Aktif */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedSantriDetail.row.nama}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      NIS: {selectedSantriDetail.row.no_induk} • Kamar:{' '}
                      {selectedSantriDetail.row.kamar} • Mustahiq:{' '}
                      {selectedSantriDetail.row.mustahiq}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {selectedSantriDetail.row.is_tahfidz && (
                      <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 text-xs font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-600" />
                        <span>
                          Tahfidz (
                          {selectedSantriDetail.row.tahfidz_mode === 'simultan'
                            ? '2 Hafalan Sekaligus'
                            : 'Tahfidz Didahulukan'}
                          )
                        </span>
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                      {selectedSantriDetail.row.short_kelas_badge} ({selectedSantriDetail.row.kelas_label})
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                      Hafalan {selectedSantriDetail.row.active_kategori}
                    </span>
                  </div>
                </div>

                {/* Target Kelas Ini */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <span className="text-slate-500">Target Hafalan Saat Ini:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedSantriDetail.row.active_item.nama} (
                    {formatTargetPreview(selectedSantriDetail.row.active_item)})
                  </span>
                </div>

                {/* Capaian Progress Bar Wajib */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      Capaian Setoran Hafalan:
                    </span>
                    <span className="font-bold text-emerald-800 font-mono">
                      {selectedSantriDetail.row.status_badge_text} (
                      {selectedSantriDetail.row.progress_pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${selectedSantriDetail.row.progress_pct}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Capaian Tahfidz Progress Bar jika Santri Tahfidz */}
                {selectedSantriDetail.row.is_tahfidz && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-cyan-800 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                        Capaian Setoran Tahfidz:
                      </span>
                      <span className="font-bold text-cyan-800 font-mono">
                        Juz {selectedSantriDetail.row.tahfidz_progress_juz} / {selectedSantriDetail.row.tahfidz_target_juz} Juz ({selectedSantriDetail.row.tahfidz_progress_pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-cyan-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all"
                        style={{
                          width: `${selectedSantriDetail.row.tahfidz_progress_pct}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Banner Status & Tombol "Ganti Hafalan Selanjutnya" (Gambar 4) */}
                {selectedSantriDetail.row.is_target_met ? (
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">
                          Target Hafalan Ini Telah Tuntas (100%)!
                        </p>
                        <p className="text-[11px] text-emerald-700 font-normal">
                          Santri telah menyelesaikan target {selectedSantriDetail.row.active_item.nama}. Silakan ganti ke hafalan selanjutnya.
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        data-testid="btn-ganti-hafalan-selanjutnya"
                        onClick={() =>
                          handleOpenGantiHafalanModal(selectedSantriDetail.row.no_induk)
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Ganti Hafalan Selanjutnya
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between gap-3">
                    <div className="text-xs text-amber-900">
                      <p className="font-bold">Masih dalam proses setoran hafalan</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        {selectedSantriDetail.row.active_item.targetType === 'numeric'
                          ? `Kurang ${Math.max(
                              0,
                              selectedSantriDetail.row.target_akhir_angka -
                                selectedSantriDetail.row.total_capaian_angka
                            )} ${selectedSantriDetail.row.satuan_label} lagi untuk menuntaskan target ${selectedSantriDetail.row.active_item.nama}.`
                          : `Kurang ${Math.max(
                              0,
                              selectedSantriDetail.row.total_sentences_count -
                                selectedSantriDetail.row.completed_sentences_count
                            )} ${selectedSantriDetail.row.satuan_label} lagi untuk menuntaskan target ini.`}
                      </p>
                    </div>
                    {canEdit && (
                      <button
                        type="button"
                        data-testid="btn-ganti-hafalan-selanjutnya"
                        onClick={() =>
                          handleOpenGantiHafalanModal(selectedSantriDetail.row.no_induk)
                        }
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Ganti Hafalan Selanjutnya
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Form Proses Setoran */}
              {canCreate && (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Proses Setoran</h4>
                    <p className="text-xs text-slate-500">
                      {selectedSantriDetail.row.is_tahfidz && selectedSantriDetail.row.tahfidz_mode === 'simultan'
                        ? 'Santri mengikuti program 2 Hafalan Sekaligus (Tahfidz dan Hafalan Wajib berjalan bersamaan).'
                        : selectedSantriDetail.row.active_item.targetType === 'numeric'
                        ? `Input pertambahan ${selectedSantriDetail.row.satuan_label.toLowerCase()} setoran santri. Sistem otomatis mengakumulasi capaian secara kumulatif.`
                        : `Pilih tahapan ${selectedSantriDetail.row.satuan_label.toLowerCase()} yang telah disetorkan santri kepada Mustahiq.`}
                    </p>
                  </div>

                  {/* Pemilih Hari Minggu pada Bulannya (Berlaku Bersama) */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <SundayDatePicker
                      value={tglSetor}
                      onChange={(dateIso) => setTglSetor(dateIso)}
                      label="Tanggal Setor (Ditetapkan Hari Minggu pada Bulannya)"
                    />
                  </div>

                  {/* KONDISI A: Santri Tahfidz dengan Mode SIMULTAN (2 Hafalan Sekaligus) */}
                  {selectedSantriDetail.row.is_tahfidz && selectedSantriDetail.row.tahfidz_mode === 'simultan' ? (
                    <div className="space-y-3">
                      {/* BLOK 1: Input Tahfidz */}
                      <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-cyan-700" />
                            <h5 className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                              1. Setoran Tahfidz (Standar: {selectedSantriDetail.row.tahfidz_target_juz} Juz)
                            </h5>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-100/80 px-2 py-0.5 rounded border border-cyan-300">
                            Juz {selectedSantriDetail.row.tahfidz_progress_juz} / {selectedSantriDetail.row.tahfidz_target_juz} Tuntas
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                              Pilih Juz *
                            </label>
                            <select
                              data-testid="select-juz-tahfidz"
                              value={selectedJuzTahfidz}
                              onChange={(e) => setSelectedJuzTahfidz(Number(e.target.value))}
                              className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600"
                            >
                              {Array.from(
                                { length: selectedSantriDetail.row.tahfidz_target_juz || 3 },
                                (_, i) => i + 1
                              ).map((j) => {
                                const isDone = Boolean(selectedSantriDetail.row.tahfidz_completed_juz?.includes(j));
                                return (
                                  <option key={j} value={j}>
                                    Juz {j} {isDone ? '(Sudah Disetor ✓)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                              Catatan Tahfidz (Opsional)
                            </label>
                            <input
                              type="text"
                              data-testid="input-catatan-tahfidz"
                              placeholder="Surah / ayat / juz..."
                              value={catatanTahfidz}
                              onChange={(e) => setCatatanTahfidz(e.target.value)}
                              className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmitTahfidzOnly()}
                            disabled={isSubmittingTahfidz}
                            data-testid="btn-simpan-tahfidz-only"
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Simpan Setoran Tahfidz (Juz {selectedJuzTahfidz})
                          </button>
                        </div>
                      </div>

                      {/* BLOK 2: Input Hafalan Wajib */}
                      <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-emerald-700" />
                            <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                              2. Setoran Hafalan Wajib ({selectedSantriDetail.row.active_item.nama})
                            </h5>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                            {selectedSantriDetail.row.status_badge_text} ({selectedSantriDetail.row.progress_pct}%)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {selectedSantriDetail.row.active_item.targetType === 'numeric' ? (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Tambah {selectedSantriDetail.row.satuan_label} *
                              </label>
                              <input
                                type="number"
                                min={1}
                                max={1000}
                                data-testid="input-tambah-angka"
                                placeholder="1, 2, 5, 13..."
                                value={tambahAngka}
                                onChange={(e) => setTambahAngka(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                          ) : (
                            <div className="relative">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                <span>Pilih {selectedSantriDetail.row.satuan_label} *</span>
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  {selectedKalimatList.length > 0 ? `${selectedKalimatList.length} Dipilih` : ''}
                                </span>
                              </label>

                              <button
                                type="button"
                                onClick={() => setIsKalimatDropdownOpen((v) => !v)}
                                className="w-full bg-white border border-slate-200 hover:border-emerald-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 text-left flex items-center justify-between gap-1 transition-colors"
                              >
                                <span className="truncate">
                                  {selectedKalimatList.length === 0
                                    ? (kalimatDipilih ? kalimatDipilih : `Pilih ${selectedSantriDetail.row.satuan_label}...`)
                                    : `${selectedKalimatList.length} ${selectedSantriDetail.row.satuan_label}: ${selectedKalimatList.slice(0, 2).join(', ')}${selectedKalimatList.length > 2 ? '...' : ''}`}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              </button>

                              {isKalimatDropdownOpen && (
                                <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 space-y-2 max-h-80 flex flex-col">
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Cari surah/kalimat..."
                                      value={kalimatSearch}
                                      onChange={(e) => setKalimatSearch(e.target.value)}
                                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                                    />
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1 border-b border-slate-100 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allS = (selectedSantriDetail.row.active_item.sentences && selectedSantriDetail.row.active_item.sentences.length > 0
                                          ? selectedSantriDetail.row.active_item.sentences
                                          : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer']);
                                        const uncompleted = allS.filter((s) => !selectedSantriDetail.prog.completedSentences.some((cs) => norm(cs) === norm(s)));
                                        setSelectedKalimatList(uncompleted.slice(0, 3));
                                      }}
                                      className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer"
                                    >
                                      +3 Berikutnya
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const allS = (selectedSantriDetail.row.active_item.sentences && selectedSantriDetail.row.active_item.sentences.length > 0
                                          ? selectedSantriDetail.row.active_item.sentences
                                          : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer']);
                                        const uncompleted = allS.filter((s) => !selectedSantriDetail.prog.completedSentences.some((cs) => norm(cs) === norm(s)));
                                        setSelectedKalimatList(uncompleted);
                                      }}
                                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                                    >
                                      Semua Belum
                                    </button>
                                    {selectedKalimatList.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setSelectedKalimatList([])}
                                        className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold ml-auto cursor-pointer"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>

                                  <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                                    {(selectedSantriDetail.row.active_item.sentences &&
                                    selectedSantriDetail.row.active_item.sentences.length > 0
                                      ? selectedSantriDetail.row.active_item.sentences
                                      : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer']
                                    )
                                      .filter((k) => (kalimatSearch ? norm(k).includes(norm(kalimatSearch)) : true))
                                      .map((kal, idx) => {
                                        const isDone = selectedSantriDetail.prog.completedSentences.some(
                                          (cs) => norm(cs) === norm(kal)
                                        );
                                        const isSelected = selectedKalimatList.some((s) => norm(s) === norm(kal));
                                        return (
                                          <div
                                            key={`${kal}_${idx}`}
                                            onClick={() => {
                                              setSelectedKalimatList((prev) =>
                                                prev.some((s) => norm(s) === norm(kal))
                                                  ? prev.filter((s) => norm(s) !== norm(kal))
                                                  : [...prev, kal]
                                              );
                                            }}
                                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                                              isSelected
                                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                                                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer pointer-events-none"
                                              />
                                              <span>
                                                {idx + 1}. {kal}
                                              </span>
                                            </div>
                                            {isDone && (
                                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                                Sudah Disetor
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Catatan (Opsional)
                            </label>
                            <input
                              type="text"
                              data-testid="input-catatan-setor"
                              placeholder="Surah / bait / keterangan..."
                              value={catatan}
                              onChange={(e) => setCatatan(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                            />
                          </div>
                        </div>

                        {selectedKalimatList.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Pilihan ({selectedKalimatList.length}):
                            </span>
                            {selectedKalimatList.map((kal) => (
                              <span
                                key={kal}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold"
                              >
                                <span>{kal}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedKalimatList((prev) =>
                                      prev.filter((s) => norm(s) !== norm(kal))
                                    )
                                  }
                                  className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmitSetoran()}
                            disabled={isSubmitting}
                            data-testid="btn-simpan-setoran-mustahiq"
                            className="px-3.5 py-1.5 rounded-lg bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Simpan Setoran Wajib
                            {selectedKalimatList.length > 0 && ` (${selectedKalimatList.length} Kalimat)`}
                          </button>
                        </div>
                      </div>

                      {/* BLOK 3: Tombol Cepat Simpan Keduanya Sekaligus */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-50 to-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-700">
                          <span className="font-bold text-slate-900 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                            Simpan 2 Hafalan Sekaligus?
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Simpan Juz {selectedJuzTahfidz} (Tahfidz) & materi Wajib secara bersamaan dalam satu klik.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSubmitBothSetoran()}
                          disabled={isSubmitting || isSubmittingTahfidz}
                          data-testid="btn-simpan-keduanya"
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-700 hover:from-cyan-700 hover:to-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          ⚡ Simpan Keduanya Sekaligus
                        </button>
                      </div>
                    </div>
                  ) : selectedSantriDetail.row.is_tahfidz && selectedSantriDetail.row.tahfidz_mode === 'didahulukan' ? (
                    /* KONDISI B: Santri Tahfidz dengan Mode DIDAHULUKAN */
                    <div className="space-y-3">
                      {/* BLOK TAHFIDZ (Aktif) */}
                      <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-cyan-700" />
                            <h5 className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                              Setoran Tahfidz (Prioritas Didahulukan)
                            </h5>
                          </div>
                          <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-100/80 px-2 py-0.5 rounded border border-cyan-300">
                            Juz {selectedSantriDetail.row.tahfidz_progress_juz} / {selectedSantriDetail.row.tahfidz_target_juz} Tuntas
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                              Pilih Juz *
                            </label>
                            <select
                              data-testid="select-juz-tahfidz"
                              value={selectedJuzTahfidz}
                              onChange={(e) => setSelectedJuzTahfidz(Number(e.target.value))}
                              className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-cyan-600"
                            >
                              {Array.from(
                                { length: selectedSantriDetail.row.tahfidz_target_juz || 3 },
                                (_, i) => i + 1
                              ).map((j) => {
                                const isDone = Boolean(selectedSantriDetail.row.tahfidz_completed_juz?.includes(j));
                                return (
                                  <option key={j} value={j}>
                                    Juz {j} {isDone ? '(Sudah Disetor ✓)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-cyan-900 mb-1">
                              Catatan Tahfidz (Opsional)
                            </label>
                            <input
                              type="text"
                              data-testid="input-catatan-tahfidz"
                              placeholder="Surah / ayat / juz..."
                              value={catatanTahfidz}
                              onChange={(e) => setCatatanTahfidz(e.target.value)}
                              className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-cyan-600"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmitTahfidzOnly()}
                            disabled={isSubmittingTahfidz}
                            data-testid="btn-simpan-tahfidz-only"
                            className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Simpan Setoran Tahfidz (Juz {selectedJuzTahfidz})
                          </button>
                        </div>
                      </div>

                      {/* BLOK WAJIB: Terkunci jika belum tuntas, atau terbuka jika sudah tuntas */}
                      {!selectedSantriDetail.row.is_tahfidz_completed ? (
                        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900 space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                            <Lock className="w-4 h-4 text-amber-600" />
                            <span>Hafalan Wajib Ditangguhkan (Prioritas Tahfidz)</span>
                          </div>
                          <p className="text-xs text-amber-800">
                            Santri ini berada dalam mode <strong>Tahfidz Didahulukan</strong>. Santri difokuskan menyelesaikan target standar Tahfidz (<strong>{selectedSantriDetail.row.tahfidz_target_juz} Juz</strong>) terlebih dahulu sebelum dapat menyetorkan materi hafalan wajib kurikulum.
                          </p>
                          <p className="text-[11px] font-mono font-semibold text-amber-900">
                            Capaian saat ini: {selectedSantriDetail.row.tahfidz_progress_juz} dari {selectedSantriDetail.row.tahfidz_target_juz} Juz ({selectedSantriDetail.row.tahfidz_progress_pct}%)
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-4 h-4 text-emerald-700" />
                              <h5 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                Setoran Hafalan Wajib ({selectedSantriDetail.row.active_item.nama})
                              </h5>
                            </div>
                            <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                              {selectedSantriDetail.row.status_badge_text}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {selectedSantriDetail.row.active_item.targetType === 'numeric' ? (
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Tambah {selectedSantriDetail.row.satuan_label} *
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  max={1000}
                                  data-testid="input-tambah-angka"
                                  placeholder="1, 2, 5, 13..."
                                  value={tambahAngka}
                                  onChange={(e) => setTambahAngka(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                                />
                              </div>
                            ) : (
                              <div className="relative">
                                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                                  <span>Pilih {selectedSantriDetail.row.satuan_label} *</span>
                                  <span className="text-[10px] text-emerald-700 font-semibold">
                                    {selectedKalimatList.length > 0 ? `${selectedKalimatList.length} Dipilih` : ''}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setIsKalimatDropdownOpen((v) => !v)}
                                  className="w-full bg-white border border-slate-200 hover:border-emerald-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 text-left flex items-center justify-between gap-1 transition-colors"
                                >
                                  <span className="truncate">
                                    {selectedKalimatList.length === 0
                                      ? (kalimatDipilih ? kalimatDipilih : `Pilih ${selectedSantriDetail.row.satuan_label}...`)
                                      : `${selectedKalimatList.length} ${selectedSantriDetail.row.satuan_label}: ${selectedKalimatList.slice(0, 2).join(', ')}${selectedKalimatList.length > 2 ? '...' : ''}`}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                </button>
                              </div>
                            )}

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Catatan (Opsional)
                              </label>
                              <input
                                type="text"
                                data-testid="input-catatan-setor"
                                placeholder="Surah / bait / keterangan..."
                                value={catatan}
                                onChange={(e) => setCatatan(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleSubmitSetoran()}
                              disabled={isSubmitting}
                              data-testid="btn-simpan-setoran-mustahiq"
                              className="px-3.5 py-1.5 rounded-lg bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Simpan Setoran Wajib
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* KONDISI C: Santri Reguler (Bukan Tahfidz) */
                    <form
                      onSubmit={handleSubmitSetoran}
                      className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {selectedSantriDetail.row.active_item.targetType === 'numeric' ? (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Tambah {selectedSantriDetail.row.satuan_label} *
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={1000}
                              data-testid="input-tambah-angka"
                              placeholder="1, 2, 5, 13..."
                              value={tambahAngka}
                              onChange={(e) => setTambahAngka(e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                              required
                            />
                          </div>
                        ) : (
                          <div className="relative">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                              <span>Pilih {selectedSantriDetail.row.satuan_label} *</span>
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                {selectedKalimatList.length > 0 ? `${selectedKalimatList.length} Dipilih` : ''}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => setIsKalimatDropdownOpen((v) => !v)}
                              className="w-full bg-white border border-slate-200 hover:border-emerald-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 text-left flex items-center justify-between gap-1 transition-colors"
                            >
                              <span className="truncate">
                                {selectedKalimatList.length === 0
                                  ? (kalimatDipilih ? kalimatDipilih : `Pilih ${selectedSantriDetail.row.satuan_label}...`)
                                  : `${selectedKalimatList.length} ${selectedSantriDetail.row.satuan_label}: ${selectedKalimatList.slice(0, 2).join(', ')}${selectedKalimatList.length > 2 ? '...' : ''}`}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>

                            {isKalimatDropdownOpen && (
                              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 space-y-2 max-h-80 flex flex-col">
                                <div className="relative">
                                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    placeholder="Cari surah/kalimat..."
                                    value={kalimatSearch}
                                    onChange={(e) => setKalimatSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                                  />
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1 border-b border-slate-100 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allS = (selectedSantriDetail.row.active_item.sentences && selectedSantriDetail.row.active_item.sentences.length > 0
                                        ? selectedSantriDetail.row.active_item.sentences
                                        : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer']);
                                      const uncompleted = allS.filter((s) => !selectedSantriDetail.prog.completedSentences.some((cs) => norm(cs) === norm(s)));
                                      setSelectedKalimatList(uncompleted.slice(0, 3));
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer"
                                  >
                                    +3 Berikutnya
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const allS = (selectedSantriDetail.row.active_item.sentences && selectedSantriDetail.row.active_item.sentences.length > 0
                                        ? selectedSantriDetail.row.active_item.sentences
                                        : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer']);
                                      const uncompleted = allS.filter((s) => !selectedSantriDetail.prog.completedSentences.some((cs) => norm(cs) === norm(s)));
                                      setSelectedKalimatList(uncompleted);
                                    }}
                                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                                  >
                                    Semua Belum
                                  </button>
                                  {selectedKalimatList.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedKalimatList([])}
                                      className="px-2 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold ml-auto cursor-pointer"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>

                                <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                                  {(selectedSantriDetail.row.active_item.sentences &&
                                  selectedSantriDetail.row.active_item.sentences.length > 0
                                    ? selectedSantriDetail.row.active_item.sentences
                                    : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer']
                                  )
                                    .filter((k) => (kalimatSearch ? norm(k).includes(norm(kalimatSearch)) : true))
                                    .map((kal, idx) => {
                                      const isDone = selectedSantriDetail.prog.completedSentences.some(
                                        (cs) => norm(cs) === norm(kal)
                                      );
                                      const isSelected = selectedKalimatList.some((s) => norm(s) === norm(kal));
                                      return (
                                        <div
                                          key={`${kal}_${idx}`}
                                          onClick={() => {
                                            setSelectedKalimatList((prev) =>
                                              prev.some((s) => norm(s) === norm(kal))
                                                ? prev.filter((s) => norm(s) !== norm(kal))
                                                : [...prev, kal]
                                            );
                                          }}
                                          className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-all ${
                                            isSelected
                                              ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                                              : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              checked={isSelected}
                                              onChange={() => {}}
                                              className="w-3.5 h-3.5 rounded text-emerald-600 accent-emerald-600 cursor-pointer pointer-events-none"
                                            />
                                            <span>
                                              {idx + 1}. {kal}
                                            </span>
                                          </div>
                                          {isDone && (
                                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                              Sudah Disetor
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Catatan (Opsional)
                          </label>
                          <input
                            type="text"
                            data-testid="input-catatan-setor"
                            placeholder="Surah / bait / keterangan..."
                            value={catatan}
                            onChange={(e) => setCatatan(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      {/* Selected Kalimat Badges Preview */}
                      {selectedKalimatList.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[11px] text-slate-500 font-semibold">
                            Pilihan ({selectedKalimatList.length}):
                          </span>
                          {selectedKalimatList.map((kal) => (
                            <span
                              key={kal}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold"
                            >
                              <span>{kal}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedKalimatList((prev) =>
                                    prev.filter((s) => norm(s) !== norm(kal))
                                  )
                                }
                                className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 italic">
                          *Target penuh materi ini:{' '}
                          {formatTargetPreview(selectedSantriDetail.row.active_item)}
                        </span>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          data-testid="btn-simpan-setoran-mustahiq"
                          className="px-4 py-2 rounded-lg bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Simpan Setoran
                          {selectedKalimatList.length > 0 && ` (${selectedKalimatList.length} Kalimat)`}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Tabel Riwayat Setor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-500" />
                    Riwayat Setor{' '}
                    {selectedSantriDetail.row.is_tahfidz
                      ? `(Tahfidz & ${selectedSantriDetail.row.active_item.nama})`
                      : `(${selectedSantriDetail.row.active_item.nama})`}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/kirim-wa?santri=${encodeURIComponent(
                        selectedSantriDetail.row.no_induk
                      )}&tahun=${tahun}`}
                      data-testid="btn-modal-kirim-wa-santri"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>Kirim WA Rapor</span>
                    </Link>
                    <span className="text-[11px] text-slate-400">
                      {riwayatLogs.length} Catatan
                    </span>
                  </div>
                </div>

                {riwayatLogs.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                    Belum ada riwayat setoran di tahun {tahun}.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-500">
                          <th className="py-2 px-3 w-10">No</th>
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3">Materi & Kategori</th>
                          <th className="py-2 px-3 text-center">Capaian</th>
                          <th className="py-2 px-3">Rincian Status</th>
                          <th className="py-2 px-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {riwayatLogs.map((l, i) => {
                          const isTahfidzLog =
                            norm(l.kategori) === 'TAHFIDZ' ||
                            norm(l.materi_nama).startsWith('JUZ ');
                          return (
                            <tr key={l.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono text-slate-400">
                                {i + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700">
                                {l.tanggal}
                                {l.catatan && (
                                  <p className="text-[10px] font-sans text-slate-400 italic">
                                    {l.catatan}
                                  </p>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-slate-800">
                                    {l.materi_nama}
                                  </span>
                                  {isTahfidzLog ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                                      Tahfidz
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                      {l.kategori || 'Wajib'}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {l.target_type === 'sentence' ? (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[11px]">
                                    {l.kalimat_dipilih}
                                  </span>
                                ) : isTahfidzLog ? (
                                  <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 font-mono font-bold text-[11px]">
                                    +{l.tambah_angka || 1} Juz
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[11px]">
                                    +{l.tambah_angka} {l.satuan_angka || selectedSantriDetail.row.satuan_label}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[11px] text-emerald-800 font-semibold">
                                {l.status_ringkas}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => deleteLogSetoran(l.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Hapus catatan ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
          </div>
        </div>
      )}

      {/* ==================== MODAL "GANTI HAFALAN SELANJUTNYA" ==================== */}
      {gantiHafalanData && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-ganti-hafalan"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Ganti Hafalan Selanjutnya</h3>
                  <p className="text-xs text-slate-300">
                    Pilih materi hafalan berikutnya sesuai tingkatan kelas santri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGantiHafalanTargetNoInduk(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmGantiHafalan} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Info Santri */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {gantiHafalanData.row.nama}
                  </p>
                  <p className="text-xs text-slate-500">
                    Kelas: {gantiHafalanData.row.kelas_label} • Hafalan Saat Ini:{' '}
                    <span className="font-semibold text-emerald-800">
                      {gantiHafalanData.row.active_item.nama}
                    </span>
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  {gantiHafalanData.row.progress_pct}%
                </span>
              </div>

              {/* Aturan Prioritas Info */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Urutan Kurikulum ({gantiHafalanData.row.din_kls} {gantiHafalanData.row.tingkat}):</span>{' '}
                Menyelesaikan seluruh urutan <strong>Hafalan Wajib</strong> terlebih dahulu mulai dari urutan pertama, baru kemudian melanjutkan ke <strong>Hafalan Sunnah / Kitab</strong>.
              </div>

              {/* Daftar 1: Hafalan Wajib */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    1. Daftar Hafalan Wajib ({gantiHafalanData.wajibOptions.length} Materi)
                  </span>
                </div>

                <div className="space-y-2">
                  {gantiHafalanData.wajibOptions.map((opt, idx) => {
                    const isSelected = norm(chosenNextMateri) === norm(opt.item.nama);
                    return (
                      <label
                        key={`${opt.item.nama}_${idx}`}
                        onClick={() => {
                          setChosenNextMateri(opt.item.nama);
                          setChosenNextKategori(opt.kategori);
                        }}
                        className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="next_materi"
                            checked={isSelected}
                            onChange={() => {
                              setChosenNextMateri(opt.item.nama);
                              setChosenNextKategori(opt.kategori);
                            }}
                            className="mt-1 text-emerald-700"
                          />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">
                                {idx + 1}. {opt.item.nama}
                              </span>
                              {opt.isCurrentActive && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                  Sedang Aktif
                                </span>
                              )}
                              {opt.isRecommendedNext && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold inline-flex items-center gap-1">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Rekomendasi Selanjutnya
                                </span>
                              )}
                              {opt.isCompleted && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Tuntas (100%)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Target: {formatTargetPreview(opt.item)} • Capaian:{' '}
                              <span className="font-mono font-semibold text-slate-700">
                                {opt.currentStatusLabel} ({opt.currentProgressPct}%)
                              </span>
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Daftar 2: Hafalan Sunnah & Kitab (Jika ada) */}
              {gantiHafalanData.sunnahKitabOptions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Hafalan Sunnah &amp; Kitab ({gantiHafalanData.sunnahKitabOptions.length} Materi)
                    </span>
                    {!gantiHafalanData.allWajibDone && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Utamakan Wajib Tuntas Dahulu
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {gantiHafalanData.sunnahKitabOptions.map((opt, idx) => {
                      const isSelected = norm(chosenNextMateri) === norm(opt.item.nama);
                      return (
                        <label
                          key={`${opt.item.nama}_${idx}`}
                          onClick={() => {
                            setChosenNextMateri(opt.item.nama);
                            setChosenNextKategori(opt.kategori);
                          }}
                          className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <input
                              type="radio"
                              name="next_materi"
                              checked={isSelected}
                              onChange={() => {
                                setChosenNextMateri(opt.item.nama);
                                setChosenNextKategori(opt.kategori);
                              }}
                              className="mt-1 text-emerald-700"
                            />
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900">
                                  {opt.item.nama}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {opt.kategori}
                                </span>
                                {opt.isCompleted && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                    Tuntas
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Target: {formatTargetPreview(opt.item)} • Capaian:{' '}
                                <span className="font-mono font-semibold text-slate-700">
                                  {opt.currentStatusLabel} ({opt.currentProgressPct}%)
                                </span>
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Daftar 3: Hafalan Tingkat Lain */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    3. Hafalan Tingkat Lain
                  </span>
                  {gantiHafalanData.allWajibDone ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Aktif (Wajib Tuntas)
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Terkunci (Selesaikan Wajib Dahulu)
                    </span>
                  )}
                </div>

                {!gantiHafalanData.allWajibDone ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 italic">
                    Kategori ini aktif jika seluruh materi Hafalan Wajib kelas santri ({gantiHafalanData.row.din_kls} {gantiHafalanData.row.tingkat}) telah dituntaskan 100%.
                  </div>
                ) : (
                  <div className="space-y-3 p-3.5 bg-slate-50/70 rounded-xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Pilih Kelas &amp; Tingkat Lain:
                        </label>
                        <select
                          value={selectedExternalKey}
                          onChange={(e) => setSelectedExternalKey(e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                          {availableTingkatKelasOptions.map((opt) => (
                            <option key={opt.key} value={opt.key}>
                              Kelas {opt.label} {opt.key === gantiHafalanData.row.config_key ? '(Kelas Saat Ini)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Cari Materi:
                        </label>
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={externalSearchQuery}
                            onChange={(e) => setExternalSearchQuery(e.target.value)}
                            placeholder="Ketik nama kitab / juz..."
                            className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Daftar Materi Tingkat Lain */}
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {externalMateriList.length === 0 ? (
                        <p className="text-xs text-slate-400 italic text-center py-2">
                          Tidak ada materi hafalan ditemukan untuk tingkatan ini.
                        </p>
                      ) : (
                        externalMateriList.map((opt, idx) => {
                          const isSelected = norm(chosenNextMateri) === norm(opt.item.nama);
                          return (
                            <label
                              key={`ext_${opt.item.nama}_${idx}`}
                              onClick={() => {
                                setChosenNextMateri(opt.item.nama);
                                setChosenNextKategori(opt.kategori || 'Sunnah');
                              }}
                              className={`flex items-start justify-between gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20'
                                  : 'bg-white border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="radio"
                                  name="next_materi"
                                  checked={isSelected}
                                  onChange={() => {
                                    setChosenNextMateri(opt.item.nama);
                                    setChosenNextKategori(opt.kategori || 'Sunnah');
                                  }}
                                  className="mt-1 text-emerald-700"
                                />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-900">
                                      {opt.item.nama}
                                    </span>
                                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.2 rounded">
                                      {opt.kategori}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    Target: {formatTargetPreview(opt.item)}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Opsi Tandai Selesai */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={markCurrentAsDone}
                  onChange={(e) => setMarkCurrentAsDone(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-700"
                />
                <span>
                  Tandai materi sebelumnya (<strong>{gantiHafalanData.row.active_item.nama}</strong>) sebagai selesai/tuntas
                </span>
              </label>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGantiHafalanTargetNoInduk(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-konfirmasi-ganti-hafalan"
                  className="px-5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer shadow-sm"
                >
                  Terapkan Hafalan Selanjutnya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL FILTER DATA ==================== */}
      {isFilterModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Filter Data Setoran Mustahiq
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Filter Tingkat */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tingkatan Diniyyah
                </label>
                <select
                  value={filterTingkat}
                  onChange={(e) => {
                    setFilterTingkat(e.target.value);
                    setFilterKelas('ALL');
                  }}
                  disabled={Boolean(lockedMustahiqClass)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white disabled:bg-slate-100"
                >
                  <option value="ALL">Semua Tingkatan (ULA, WUSTHO, ULYA)</option>
                  <option value="ULA">ULA</option>
                  <option value="WUSTHO">WUSTHO</option>
                  <option value="ULYA">ULYA</option>
                </select>
              </div>

              {/* Filter Kelas */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kelas Mustahiq
                </label>
                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  disabled={Boolean(lockedMustahiqClass)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white disabled:bg-slate-100"
                >
                  <option value="ALL">Semua Kelas</option>
                  {uniqueKelasOptions
                    .filter((k) => filterTingkat === 'ALL' || k.tingkat === filterTingkat)
                    .map((k) => (
                      <option key={k.key} value={k.key}>
                        {k.shortBadge} - {k.label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Filter Status Capaian */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Capaian Target
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="TUNTAS">Tuntas (100%)</option>
                  <option value="PROSES">Sedang Proses (1% - 99%)</option>
                  <option value="BELUM">Belum Setor (0%)</option>
                </select>
              </div>

              {/* Filter Kategori & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kategori Hafalan
                  </label>
                  <select
                    value={filterKategori}
                    onChange={(e) => setFilterKategori(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="ALL">Semua</option>
                    <option value="Wajib">Hafalan Wajib</option>
                    <option value="Sunnah">Hafalan Sunnah</option>
                    <option value="Kitab">Hafalan Kitab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Putra / Putri
                  </label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="ALL">Semua</option>
                    <option value="PA">Putra (PA)</option>
                    <option value="PI">Putri (PI)</option>
                  </select>
                </div>
              </div>

              {/* Filter Kamar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kamar Asrama
                </label>
                <select
                  value={filterKamar}
                  onChange={(e) => setFilterKamar(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 bg-white"
                >
                  <option value="ALL">Semua Kamar</option>
                  {uniqueKamarOptions.map((kmr) => (
                    <option key={kmr} value={kmr}>
                      {kmr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setFilterTingkat('ALL');
                  setFilterKelas('ALL');
                  setFilterKategori('ALL');
                  setFilterStatus('ALL');
                  setFilterGender('ALL');
                  setFilterKamar('ALL');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#134e3a] text-white text-xs font-bold cursor-pointer"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL PILIH SANTRI CEPAT (TOMBOL +) ==================== */}
      {isQuickAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pilih Santri untuk Input Setoran
                </h3>
                <p className="text-xs text-slate-500">
                  Klik nama santri untuk membuka form Proses Setoran
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ketik nama atau NIS santri..."
                  value={quickSearchSantri}
                  onChange={(e) => setQuickSearchSantri(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
              {filteredRows
                .filter(
                  (r) =>
                    !quickSearchSantri ||
                    norm(r.nama).includes(norm(quickSearchSantri)) ||
                    norm(r.no_induk).includes(norm(quickSearchSantri))
                )
                .slice(0, 30)
                .map((r) => (
                  <button
                    key={r.no_induk}
                    type="button"
                    onClick={() => {
                      setIsQuickAddModalOpen(false);
                      handleOpenDetailModal(r.no_induk);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-emerald-50/60 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{r.nama}</p>
                      <p className="text-[11px] text-slate-500">
                        {r.kelas_label} • {r.active_item.nama}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold">
                      {r.status_badge_text}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Target Muhafadzoh */}
      <ModalSettingsHafalan />
    </div>
  );
}
