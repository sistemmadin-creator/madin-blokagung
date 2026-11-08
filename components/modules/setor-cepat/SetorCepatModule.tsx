'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Zap,
  Search,
  X,
  Filter,
  CheckCircle2,
  TrendingUp,
  History,
  Trash2,
  MessageSquare,
  BookOpen,
  Calendar,
  Layers,
  ChevronDown,
  RotateCcw,
  User,
  Sparkles,
  Plus,
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
} from '@/stores/useSetorMustahiqStore';
import { SantriSetorMustahiqRow } from '@/types/setor-mustahiq';
import { formatTargetPreview, norm } from '@/lib/utils/setoranHelper';
import SundayDatePicker from '@/components/ui/SundayDatePicker';

export default function SetorCepatModule() {
  const { santriList, fetchSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { config, fetchSetoranData } = useMuhafadzohStore();
  const {
    logs,
    activeStates,
    isLoading: isLoadingMustahiq,
    fetchMustahiqData,
    addLogSetoran,
    addLogSetoranBatch,
    deleteLogSetoran,
    switchActiveHafalan,
  } = useSetorMustahiqStore();

  const {
    currentAccount,
    isMasterAdmin,
    canCreate,
    canEdit,
    canDelete,
    isPersonAllowed,
    isClassAllowed,
  } = usePagePermission('setor-cepat');

  // Filter & Search states
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [filterKelas, setFilterKelas] = useState('ALL');
  const [filterTingkat, setFilterTingkat] = useState('ALL');
  const [filterBagian, setFilterBagian] = useState('ALL');
  const [filterBlok, setFilterBlok] = useState('ALL');
  const [filterGender, setFilterGender] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [filterItemHafalan, setFilterItemHafalan] = useState('ALL');

  // Selected Santri State
  const [selectedSantriNoInduk, setSelectedSantriNoInduk] = useState<string | null>(null);

  // Form Input Setoran States
  const [tglSetor, setTglSetor] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedKalimatList, setSelectedKalimatList] = useState<string[]>([]);
  const [tambahAngka, setTambahAngka] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKalimatDropdownOpen, setIsKalimatDropdownOpen] = useState(false);
  const [kalimatSearch, setKalimatSearch] = useState('');
  const kalimatDropdownRef = useRef<HTMLDivElement>(null);

  // Modal Ganti Hafalan State
  const [gantiHafalanTargetNoInduk, setGantiHafalanTargetNoInduk] = useState<string | null>(null);
  const [chosenNextMateri, setChosenNextMateri] = useState('');
  const [chosenNextKategori, setChosenNextKategori] = useState<'Wajib' | 'Sunnah' | 'Kitab'>('Wajib');
  const [markCurrentAsDone, setMarkCurrentAsDone] = useState(false);

  // Load initial data
  useEffect(() => {
    fetchSantri();
    fetchAsatidz();
    fetchFormasi();
    fetchSetoranData();
    fetchMustahiqData();
  }, [fetchSantri, fetchAsatidz, fetchFormasi, fetchSetoranData, fetchMustahiqData]);

  // Click outside listener for sentence dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        kalimatDropdownRef.current &&
        !kalimatDropdownRef.current.contains(event.target as Node)
      ) {
        setIsKalimatDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Locked class detection for logged in mustahiq
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
      };
    }
    return null;
  }, [isMasterAdmin, asatidzList, currentAccount]);

  // All rows calculation
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

  // Distinct filter options extracted dynamically from data
  const filterOptions = useMemo(() => {
    const kelasSet = new Map<string, { key: string; label: string; shortBadge: string }>();
    const tingkatSet = new Set<string>();
    const bagianSet = new Set<string>();
    const blokSet = new Set<string>();
    const itemSet = new Set<string>();

    allRows.forEach((r) => {
      const kKey = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
      if (!kelasSet.has(kKey)) {
        kelasSet.set(kKey, {
          key: kKey,
          label: r.kelas_label,
          shortBadge: r.short_kelas_badge,
        });
      }
      if (r.tingkat) tingkatSet.add(r.tingkat);
      if (r.din_bag) bagianSet.add(r.din_bag);
      if (r.kamar && r.kamar !== '-') blokSet.add(r.kamar);
      if (r.active_item?.nama) itemSet.add(r.active_item.nama);
    });

    return {
      kelasList: Array.from(kelasSet.values()).sort((a, b) => a.label.localeCompare(b.label, 'id')),
      tingkatList: Array.from(tingkatSet).sort(),
      bagianList: Array.from(bagianSet).sort(),
      blokList: Array.from(blokSet).sort((a, b) => a.localeCompare(b, 'id', { numeric: true })),
      itemList: Array.from(itemSet).sort(),
    };
  }, [allRows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterKelas !== 'ALL') count++;
    if (filterTingkat !== 'ALL') count++;
    if (filterBagian !== 'ALL') count++;
    if (filterBlok !== 'ALL') count++;
    if (filterGender !== 'ALL') count++;
    if (filterItemHafalan !== 'ALL') count++;
    return count;
  }, [filterKelas, filterTingkat, filterBagian, filterBlok, filterGender, filterItemHafalan]);

  const handleResetFilters = () => {
    setSearch('');
    setFilterKelas('ALL');
    setFilterTingkat('ALL');
    setFilterBagian('ALL');
    setFilterBlok('ALL');
    setFilterGender('ALL');
    setFilterItemHafalan('ALL');
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = norm(search);
    return allRows
      .filter((r) => {
        if (q) {
          const matchNama = norm(r.nama).includes(q);
          const matchNoInduk = norm(r.no_induk).includes(q);
          if (!matchNama && !matchNoInduk) return false;
        }

        if (filterKelas !== 'ALL') {
          const kKey = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
          if (kKey !== filterKelas) return false;
        }

        if (filterTingkat !== 'ALL' && norm(r.tingkat) !== norm(filterTingkat)) {
          return false;
        }

        if (filterBagian !== 'ALL' && norm(r.din_bag) !== norm(filterBagian)) {
          return false;
        }

        if (filterBlok !== 'ALL') {
          if (!r.kamar || norm(r.kamar) !== norm(filterBlok)) return false;
        }

        if (filterGender !== 'ALL') {
          if (filterGender === 'L' && norm(r.pa_pi) !== 'l') return false;
          if (filterGender === 'P' && norm(r.pa_pi) !== 'p') return false;
        }

        if (filterItemHafalan !== 'ALL') {
          if (norm(r.active_item?.nama || '') !== norm(filterItemHafalan)) {
            return false;
          }
        }

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
    filterKelas,
    filterTingkat,
    filterBagian,
    filterBlok,
    filterGender,
    filterItemHafalan,
  ]);

  // Auto-select first matching student if current selection is invalid or none
  useEffect(() => {
    if (filteredRows.length > 0) {
      if (!selectedSantriNoInduk || !filteredRows.some((r) => r.no_induk === selectedSantriNoInduk)) {
        setSelectedSantriNoInduk(filteredRows[0].no_induk);
      }
    } else {
      setSelectedSantriNoInduk(null);
    }
  }, [filteredRows, selectedSantriNoInduk]);

  // Selected student full details
  const selectedSantriDetail = useMemo(() => {
    if (!selectedSantriNoInduk) return null;
    const row = allRows.find((r) => norm(r.no_induk) === norm(selectedSantriNoInduk));
    if (!row) return null;

    const prog = computeMateriProgressForSantri(row.no_induk, row.active_item, logs, tahun);
    return { row, prog };
  }, [allRows, selectedSantriNoInduk, logs, tahun]);

  // Reset sentence selection when active student changes
  useEffect(() => {
    setSelectedKalimatList([]);
    setTambahAngka('');
    setCatatan('');
    setKalimatSearch('');
  }, [selectedSantriNoInduk]);

  // Group filtered rows into class cards (Right side)
  const classCards = useMemo(() => {
    const map = new Map<
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
      if (!map.has(gKey)) {
        map.set(gKey, {
          groupKey: gKey,
          shortBadge: row.short_kelas_badge,
          kelasLabel: row.kelas_label,
          tingkat: row.tingkat,
          din_kls: row.din_kls,
          din_bag: row.din_bag,
          mustahiq: row.mustahiq,
          defaultTargetName: row.active_item?.nama || 'Hafalan',
          defaultTargetPreview: formatTargetPreview(row.active_item),
          students: [],
        });
      }
      map.get(gKey)!.students.push(row);
    });

    return Array.from(map.values());
  }, [filteredRows]);

  // Sentences available for current active student
  const availableSentences = useMemo(() => {
    if (!selectedSantriDetail) return [];
    const item = selectedSantriDetail.row.active_item;
    if (item.targetType !== 'sentence') return [];
    return item.sentences && item.sentences.length > 0
      ? item.sentences
      : ['Muqodimah', 'Mubtada', 'Khobar', 'Rofa', 'Jer'];
  }, [selectedSantriDetail]);

  const completedSentencesSet = useMemo(() => {
    if (!selectedSantriDetail) return new Set<string>();
    return new Set(
      selectedSantriDetail.prog.completedSentences.map((s) => norm(s))
    );
  }, [selectedSantriDetail]);

  // Toggle sentence selection
  const handleToggleSentence = (sentence: string) => {
    setSelectedKalimatList((prev) => {
      const isAlreadyChosen = prev.some((s) => norm(s) === norm(sentence));
      if (isAlreadyChosen) {
        return prev.filter((s) => norm(s) !== norm(sentence));
      } else {
        return [...prev, sentence];
      }
    });
  };

  // Quick helper: pick next N uncompleted sentences
  const handlePickNextUncompleted = (count: number) => {
    const uncompleted = availableSentences.filter(
      (s) => !completedSentencesSet.has(norm(s))
    );
    const toPick = uncompleted.slice(0, count);
    setSelectedKalimatList(toPick);
  };

  // Quick helper: pick all uncompleted
  const handlePickAllUncompleted = () => {
    const uncompleted = availableSentences.filter(
      (s) => !completedSentencesSet.has(norm(s))
    );
    setSelectedKalimatList(uncompleted);
  };

  // Handle Form Submit
  const handleSubmitSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const ok = await addLogSetoran(
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
      setIsSubmitting(false);
      if (ok) {
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
        setTambahAngka('');
        setCatatan('');
      }
    } else {
      // Sentence multi-select submit
      if (selectedKalimatList.length === 0) {
        alert(`Pilih minimal satu ${row.satuan_label} yang disetorkan santri.`);
        return;
      }
      const noteVal = catatan.trim() || undefined;
      setIsSubmitting(true);

      const ok = await addLogSetoranBatch(
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
        selectedKalimatList,
        item
      );

      setIsSubmitting(false);
      if (ok) {
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
            capaian: selectedKalimatList.join(', '),
          });
        } catch {}
        setSelectedKalimatList([]);
        setCatatan('');
      }
    }
  };

  // Delete individual log handler
  const handleDeleteLog = async (logId: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus catatan setoran ini?')) {
      await deleteLogSetoran(logId);
    }
  };

  // Modal Ganti Hafalan
  const gantiHafalanData = useMemo(() => {
    if (!gantiHafalanTargetNoInduk) return null;
    const row = allRows.find((r) => norm(r.no_induk) === norm(gantiHafalanTargetNoInduk));
    if (!row) return null;

    const options = getMateriOptionsWithStatusForSantri(
      row.no_induk,
      row.config_key,
      config,
      logs,
      activeStates[row.no_induk],
      tahun
    );

    const wajibOptions = options.filter((o) => o.kategori === 'Wajib');
    const sunnahKitabOptions = options.filter((o) => o.kategori !== 'Wajib');
    const allWajibDone = wajibOptions.length > 0 && wajibOptions.every((o) => o.isCompleted);

    return {
      row,
      wajibOptions,
      sunnahKitabOptions,
      allWajibDone,
    };
  }, [gantiHafalanTargetNoInduk, allRows, config, logs, activeStates, tahun]);

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
      options.find((o) => !o.isCompleted && norm(o.item.nama) !== norm(row.active_item.nama)) ||
      options[0];

    setGantiHafalanTargetNoInduk(noInduk);
    setChosenNextMateri(recommended?.item.nama || row.active_item.nama);
    setChosenNextKategori(recommended?.kategori || row.active_kategori);
    setMarkCurrentAsDone(row.is_target_met);
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

  return (
    <div className="space-y-6 pb-20">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Setor Cepat Hafalan Santri
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan setoran hafalan santri secara cepat dengan pencarian instan, multi-select kalimat, dan kartu kelas interaktif.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Tahun Ajaran:</span>
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="bg-transparent font-bold text-emerald-800 outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            {filteredRows.length} Santri Terdata
          </div>
        </div>
      </div>

      {/* Toolbar Pencarian & Filter Terpadu */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        {/* Search Input Utama */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            data-testid="input-pencarian-setor-cepat"
            placeholder="Cari santri berdasarkan nama lengkap atau nomor induk (NIS)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Baris: Kelas, Tingkat, Bagian, Blok, Pa/Pi, Item Hafalan */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
          {/* Filter Kelas */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Kelas
            </label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {filterOptions.kelasList.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.shortBadge} ({k.label})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tingkat */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Tingkat
            </label>
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Tingkat</option>
              {filterOptions.tingkatList.map((tk) => (
                <option key={tk} value={tk}>
                  {tk}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Bagian */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Bagian
            </label>
            <select
              value={filterBagian}
              onChange={(e) => setFilterBagian(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Bagian</option>
              {filterOptions.bagianList.map((bg) => (
                <option key={bg} value={bg}>
                  Bagian {bg}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Blok / Kamar */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Blok / Kamar
            </label>
            <select
              value={filterBlok}
              onChange={(e) => setFilterBlok(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Blok/Kmr</option>
              {filterOptions.blokList.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pa/Pi */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Pa / Pi
            </label>
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua (Pa/Pi)</option>
              <option value="L">Putra (Pa)</option>
              <option value="P">Putri (Pi)</option>
            </select>
          </div>

          {/* Filter Item Hafalan */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Item Hafalan
            </label>
            <select
              value={filterItemHafalan}
              onChange={(e) => setFilterItemHafalan(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Semua Materi</option>
              {filterOptions.itemList.map((it) => (
                <option key={it} value={it}>
                  {it}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indikator Filter Aktif & Reset */}
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              {activeFilterCount} Filter diterapkan ({filteredRows.length} santri ditemukan)
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-slate-500 hover:text-slate-800 text-[11px] font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Split Layout: Kiri (Detail Setoran) & Kanan (Kartu Kelas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: Detail Setoran Hafalan Santri (Gambar 3) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header Panel Kiri */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs">
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

            {selectedSantriDetail && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold font-mono">
                NIS: {selectedSantriDetail.row.no_induk}
              </span>
            )}
          </div>

          {/* Body Panel Kiri */}
          <div className="p-6 space-y-5">
            {!selectedSantriDetail ? (
              <div className="py-16 px-4 text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                  <User className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">Belum Ada Santri yang Dipilih</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Gunakan pencarian nama/NIS di atas atau klik salah satu santri pada kartu kelas di sebelah kanan untuk memulai input setoran.
                </p>
              </div>
            ) : (
              <>
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
                      {selectedSantriDetail.row.active_item?.nama || '-'} (
                      {formatTargetPreview(selectedSantriDetail.row.active_item)})
                    </span>
                  </div>

                  {/* Capaian Progress Bar */}
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
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{
                          width: `${selectedSantriDetail.row.progress_pct}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Banner Status & Tombol "Ganti Hafalan Selanjutnya" */}
                  {selectedSantriDetail.row.is_target_met ? (
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-bold">
                            Target Hafalan Ini Telah Tuntas (100%)!
                          </p>
                          <p className="text-[11px] text-emerald-700 font-normal">
                            Santri telah menyelesaikan target {selectedSantriDetail.row.active_item?.nama}. Silakan ganti ke hafalan selanjutnya.
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenGantiHafalanModal(selectedSantriDetail.row.no_induk)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs transition-colors"
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
                          {selectedSantriDetail.row.active_item?.targetType === 'numeric'
                            ? `Kurang ${Math.max(
                                0,
                                selectedSantriDetail.row.target_akhir_angka -
                                  selectedSantriDetail.row.total_capaian_angka
                              )} ${selectedSantriDetail.row.satuan_label} lagi untuk menuntaskan target ${selectedSantriDetail.row.active_item?.nama}.`
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
                          onClick={() => handleOpenGantiHafalanModal(selectedSantriDetail.row.no_induk)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                          Ganti Hafalan Selanjutnya
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Form Proses Setoran (Gambar 4 - Multi Select Kalimat) */}
                {canCreate && (
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Proses Setoran</h4>
                      <p className="text-xs text-slate-500">
                        {selectedSantriDetail.row.active_item?.targetType === 'numeric'
                          ? `Input pertambahan ${selectedSantriDetail.row.satuan_label.toLowerCase()} setoran santri. Sistem otomatis mengakumulasi capaian.`
                          : `Pilih tahapan ${selectedSantriDetail.row.satuan_label.toLowerCase()} yang telah disetorkan santri. Anda dapat memilih lebih dari satu sekaligus.`}
                      </p>
                    </div>

                    <form
                      onSubmit={handleSubmitSetoran}
                      className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 space-y-3"
                    >
                      {/* Pemilih Tanggal Setor (Ditetapkan Hari Minggu pada Bulannya) */}
                      <SundayDatePicker
                        value={tglSetor}
                        onChange={(newDate) => setTglSetor(newDate)}
                        label="Tanggal Setor (Ditetapkan Hari Minggu pada Bulannya)"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {/* Input Numerik ATAU Multi-Select Kalimat */}
                        {selectedSantriDetail.row.active_item?.targetType === 'numeric' ? (
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
                          <div className="relative" ref={kalimatDropdownRef}>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                              <span>Pilih {selectedSantriDetail.row.satuan_label} *</span>
                              <span className="text-[10px] text-emerald-700 font-semibold">
                                {selectedKalimatList.length} Dipilih
                              </span>
                            </label>

                            {/* Dropdown Trigger */}
                            <button
                              type="button"
                              onClick={() => setIsKalimatDropdownOpen((v) => !v)}
                              className="w-full bg-white border border-slate-200 hover:border-emerald-500 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 text-left flex items-center justify-between gap-1 transition-colors"
                            >
                              <span className="truncate">
                                {selectedKalimatList.length === 0
                                  ? `Pilih ${selectedSantriDetail.row.satuan_label}...`
                                  : `${selectedKalimatList.length} ${selectedSantriDetail.row.satuan_label}: ${selectedKalimatList.slice(0, 2).join(', ')}${selectedKalimatList.length > 2 ? '...' : ''}`}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            </button>

                            {/* Dropdown Menu Multi-Select (Gambar 4) */}
                            {isKalimatDropdownOpen && (
                              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2.5 space-y-2 max-h-80 flex flex-col">
                                {/* Search Kalimat */}
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

                                {/* Quick Action Helpers */}
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 pb-1 border-b border-slate-100 text-[10px]">
                                  <button
                                    type="button"
                                    onClick={() => handlePickNextUncompleted(3)}
                                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer"
                                  >
                                    +3 Berikutnya
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePickNextUncompleted(1)}
                                    className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer"
                                  >
                                    +1 Berikutnya
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handlePickAllUncompleted}
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

                                {/* List Kalimat */}
                                <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                                  {availableSentences
                                    .filter((k) =>
                                      kalimatSearch
                                        ? norm(k).includes(norm(kalimatSearch))
                                        : true
                                    )
                                    .map((kal, idx) => {
                                      const isDone = completedSentencesSet.has(norm(kal));
                                      const isSelected = selectedKalimatList.some(
                                        (s) => norm(s) === norm(kal)
                                      );
                                      return (
                                        <div
                                          key={`${kal}_${idx}`}
                                          onClick={() => handleToggleSentence(kal)}
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

                        {/* Catatan Opsional */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Catatan (Opsional)
                          </label>
                          <input
                            type="text"
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
                            Pilihan:
                          </span>
                          {selectedKalimatList.map((kal) => (
                            <span
                              key={kal}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-bold"
                            >
                              <span>{kal}</span>
                              <button
                                type="button"
                                onClick={() => handleToggleSentence(kal)}
                                className="text-emerald-700 hover:text-emerald-950 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Submit Row */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-500 italic">
                          *Target materi: {formatTargetPreview(selectedSantriDetail.row.active_item)}
                        </span>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Simpan Setoran
                          {selectedKalimatList.length > 0 && ` (${selectedKalimatList.length} Kalimat)`}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Tabel Riwayat Setor */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Riwayat Setor ({selectedSantriDetail.row.active_item?.nama})
                    </h4>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/kirim-wa?santri=${encodeURIComponent(
                          selectedSantriDetail.row.no_induk
                        )}&tahun=${tahun}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors shadow-xs"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Kirim WA Rapor</span>
                      </Link>
                      <span className="text-[11px] text-slate-400">
                        {selectedSantriDetail.prog.matchingLogs.length} Catatan
                      </span>
                    </div>
                  </div>

                  {selectedSantriDetail.prog.matchingLogs.length === 0 ? (
                    <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-400 bg-slate-50/50">
                      Belum ada riwayat setoran untuk materi{' '}
                      <span className="font-semibold text-slate-600">
                        {selectedSantriDetail.row.active_item?.nama}
                      </span>{' '}
                      di tahun {tahun}.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                          <tr className="text-[11px] text-slate-500">
                            <th className="py-2 px-3 w-10">No</th>
                            <th className="py-2 px-3">Tanggal</th>
                            <th className="py-2 px-3 text-center">
                              Tambah {selectedSantriDetail.row.satuan_label}
                            </th>
                            <th className="py-2 px-3">Rincian Status</th>
                            <th className="py-2 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedSantriDetail.prog.matchingLogs.map((l, i) => (
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
                              <td className="py-2.5 px-3 text-center">
                                {l.target_type === 'sentence' ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                                    {l.kalimat_dipilih || '1 Kalimat'}
                                  </span>
                                ) : (
                                  <span className="font-bold text-emerald-700 font-mono">
                                    +{l.tambah_angka} {l.satuan_angka || 'Item'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                                {l.status_ringkas || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLog(l.id)}
                                    title="Hapus setoran ini"
                                    className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Kartu Kelas Interaktif (Gambar 2) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Kartu Kelas ({classCards.length} Kelas Sesuai Pencarian)
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Klik nama santri untuk langsung input setoran
            </span>
          </div>

          {classCards.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Tidak ada kelas atau santri yang cocok dengan kriteria pencarian/filter.
            </div>
          ) : (
            classCards.map((cg) => (
              <div
                key={cg.groupKey}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Header Kartu Kelas (Persis Gambar 2) */}
                <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold font-mono">
                      {cg.shortBadge}
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">
                      Target: {cg.defaultTargetName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ({cg.kelasLabel}) • <span className="font-bold text-slate-700">{cg.students.length} Santri</span>
                  </div>
                </div>

                {/* Tabel Santri di Kelas (Persis Gambar 2) */}
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10 border-b border-slate-200">
                      <tr className="text-[11px] text-slate-500">
                        <th className="py-2 px-3 w-8">No</th>
                        <th className="py-2 px-3">Nama Santri</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-center">Kamar</th>
                        <th className="py-2 px-3 text-right">Proses</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cg.students.map((st, sIdx) => {
                        const isSelected = selectedSantriNoInduk === st.no_induk;
                        return (
                          <tr
                            key={st.no_induk}
                            onClick={() => setSelectedSantriNoInduk(st.no_induk)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600 font-semibold'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400">
                              {sIdx + 1}
                            </td>
                            <td className="py-2.5 px-3">
                              <p className={`text-xs ${isSelected ? 'text-emerald-950 font-bold' : 'text-slate-800 font-medium'}`}>
                                {st.nama}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                              {st.status_badge_text}
                            </td>
                            <td className="py-2.5 px-3 text-center text-slate-500 text-[11px]">
                              {st.kamar || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${st.progress_pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono text-slate-400 w-7 text-right">
                                  {st.proses_ratio_text}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Dialog Ganti Hafalan Selanjutnya */}
      {gantiHafalanData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Ganti Hafalan Selanjutnya
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGantiHafalanTargetNoInduk(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmGantiHafalan} className="p-6 space-y-4 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <p className="font-bold text-slate-800">{gantiHafalanData.row.nama}</p>
                <p className="text-slate-500 font-mono mt-0.5">
                  NIS: {gantiHafalanData.row.no_induk} • Kelas: {gantiHafalanData.row.short_kelas_badge}
                </p>
              </div>

              {/* Opsi Hafalan Wajib */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Hafalan Wajib ({gantiHafalanData.wajibOptions.length} Materi)
                </span>
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
                                {opt.item.nama}
                              </span>
                              {opt.isCompleted && (
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                                  Tuntas (100%)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Target: {formatTargetPreview(opt.item)}
                            </p>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Opsi Hafalan Sunnah / Kitab */}
              {gantiHafalanData.sunnahKitabOptions.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Hafalan Sunnah &amp; Kitab
                  </span>
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
                              <span className="text-xs font-bold text-slate-900">
                                {opt.item.nama} ({opt.kategori})
                              </span>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Target: {formatTargetPreview(opt.item)}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setGantiHafalanTargetNoInduk(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Terapkan Target Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
