'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Save,
  Info,
  X,
  Check,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  BookOpen,
  Layers,
  GraduationCap,
  Sparkles,
  FileText,
  AlertCircle,
  Hash,
  AlignLeft,
} from 'lucide-react';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import {
  getDaftarTingkatKelasDiniyyah,
  norm,
  normalizeToItemDetail,
  formatTargetPreview,
} from '@/lib/utils/setoranHelper';
import {
  ItemHafalanDetail,
  HafalanConfig,
  TargetUnitNumeric,
  SantriTahfidzItem,
  ModeAlurTahfidz,
} from '@/types/setoran';

type ActiveTabType = 'wajib' | 'sunnah' | 'kitab' | 'tahfidz' | 'penjaga';

export default function ModalSettingsHafalan() {
  const { isSettingsOpen, closeSettings, config, saveConfig } = useMuhafadzohStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { santriList } = useSantriStore();

  const [activeTab, setActiveTab] = useState<ActiveTabType>('wajib');

  // Mode editor per kategori: visual vs JSON
  const [editorMode, setEditorMode] = useState<'visual' | 'json'>('visual');
  const [rawJsonText, setRawJsonText] = useState('');

  // Structured local state: Record<tingkatKey, ItemHafalanDetail[]>
  const [localWajib, setLocalWajib] = useState<Record<string, ItemHafalanDetail[]>>({});
  const [localSunnah, setLocalSunnah] = useState<Record<string, ItemHafalanDetail[]>>({});
  const [localKitab, setLocalKitab] = useState<Record<string, ItemHafalanDetail[]>>({});

  // Tahfidz Local State
  const [localStandarMaksimalJuz, setLocalStandarMaksimalJuz] = useState<number>(3);
  const [localSantriTahfidzList, setLocalSantriTahfidzList] = useState<SantriTahfidzItem[]>([]);
  const [santriTahfidzSearch, setSantriTahfidzSearch] = useState('');
  const [isDropdownSantriTahfidzOpen, setIsDropdownSantriTahfidzOpen] = useState(false);

  // Accordion states
  const [openGroupKeys, setOpenGroupKeys] = useState<Record<string, boolean>>({});
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<'all' | 'ula' | 'wustho' | 'ulya'>('all');
  const [filterTargetType, setFilterTargetType] = useState<'all' | 'numeric' | 'sentence'>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Quick paste sentence modal/drawer state
  const [quickPasteTargetId, setQuickPasteTargetId] = useState<string | null>(null);
  const [quickPasteText, setQuickPasteText] = useState('');

  // Penjaga Bebas state
  const [selectedPenjagaBebas, setSelectedPenjagaBebas] = useState<string[]>([]);
  const [penjagaSearch, setPenjagaSearch] = useState('');
  const [isDropdownPenjagaOpen, setIsDropdownPenjagaOpen] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (asatidzList.length === 0) fetchAsatidz();
    if (formasiList.length === 0) fetchFormasi();
  }, [asatidzList.length, formasiList.length, fetchAsatidz, fetchFormasi]);

  // Compute available tingkat & kelas pairs from database
  const pairs = useMemo(() => {
    return getDaftarTingkatKelasDiniyyah(formasiList, santriList);
  }, [formasiList, santriList]);

  // Convert raw config items to ItemHafalanDetail[]
  const parseSourceToDetailedMap = (
    source: Record<string, any> = {}
  ): Record<string, ItemHafalanDetail[]> => {
    const res: Record<string, ItemHafalanDetail[]> = {};
    pairs.forEach(({ key }) => {
      const val = source[key];
      if (Array.isArray(val)) {
        res[key] = val.map((it, idx) => normalizeToItemDetail(it, idx));
      } else if (typeof val === 'string' && val.trim()) {
        const parts = val.split(',').map((s) => s.trim()).filter(Boolean);
        res[key] = parts.map((nama, idx) => normalizeToItemDetail(nama, idx));
      } else {
        res[key] = [];
      }
    });
    return res;
  };

  // Initialize state ONLY when modal opens
  useEffect(() => {
    if (isSettingsOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;

      const parsedWajib = parseSourceToDetailedMap(config.hafWajib);
      const parsedSunnah = parseSourceToDetailedMap(config.hafSunnah);
      const parsedKitab = parseSourceToDetailedMap(config.hafKitab);

      setLocalWajib(parsedWajib);
      setLocalSunnah(parsedSunnah);
      setLocalKitab(parsedKitab);

      setSelectedPenjagaBebas([...(config.penjagaBebas || [])]);
      setPenjagaSearch('');
      setIsDropdownPenjagaOpen(false);

      setLocalStandarMaksimalJuz(config.tahfidz?.standarMaksimalJuz || 3);
      setLocalSantriTahfidzList([...(config.tahfidz?.santriTahfidzList || [])]);
      setSantriTahfidzSearch('');
      setIsDropdownSantriTahfidzOpen(false);
      setSearchQuery('');
      setFilterTingkat('all');
      setFilterTargetType('all');
      setExpandedItemId(null);
      setQuickPasteTargetId(null);
      setQuickPasteText('');
      setEditorMode('visual');

      // Default open all groups
      const initialOpen: Record<string, boolean> = {};
      pairs.forEach(({ key }) => {
        initialOpen[key] = true;
      });
      setOpenGroupKeys(initialOpen);
    } else if (!isSettingsOpen) {
      wasOpenRef.current = false;
    }
  }, [isSettingsOpen, config, pairs]);

  // Get active map based on active tab
  const activeMap = useMemo(() => {
    if (activeTab === 'wajib') return localWajib;
    if (activeTab === 'sunnah') return localSunnah;
    if (activeTab === 'kitab') return localKitab;
    return {};
  }, [activeTab, localWajib, localSunnah, localKitab]);

  // Update active map helper
  const updateActiveMap = (updater: (prev: Record<string, ItemHafalanDetail[]>) => Record<string, ItemHafalanDetail[]>) => {
    if (activeTab === 'wajib') setLocalWajib(updater);
    else if (activeTab === 'sunnah') setLocalSunnah(updater);
    else if (activeTab === 'kitab') setLocalKitab(updater);
  };

  const handleSwitchToMode = (mode: 'visual' | 'json') => {
    if (mode === 'json') {
      try {
        setRawJsonText(JSON.stringify(activeMap, null, 2));
      } catch {
        setRawJsonText('{}');
      }
    }
    setEditorMode(mode);
  };

  // Total items counter
  const totalItemsCount = useMemo(() => {
    return Object.values(activeMap).reduce((acc, items) => acc + (items?.length || 0), 0);
  }, [activeMap]);

  // Filtered pairs based on search and filters
  const filteredPairs = useMemo(() => {
    const q = norm(searchQuery);

    return pairs.filter(({ key, label }) => {
      // Filter tingkat (Ula, Wustho, Ulya)
      if (filterTingkat === 'ula' && !norm(key).includes('ULA')) return false;
      if (filterTingkat === 'wustho' && !norm(key).includes('WUSTHO')) return false;
      if (filterTingkat === 'ulya' && !norm(key).includes('ULYA')) return false;

      const items = activeMap[key] || [];

      // Filter target type
      if (filterTargetType !== 'all') {
        const hasMatchingType = items.some((it) => it.targetType === filterTargetType);
        if (!hasMatchingType) return false;
      }

      // Filter search
      if (!q) return true;
      if (norm(label).includes(q) || norm(key).includes(q)) return true;
      return items.some((it) => {
        if (norm(it.nama).includes(q)) return true;
        if (it.targetType === 'sentence' && it.sentences?.some((s) => norm(s).includes(q))) return true;
        if (it.targetType === 'numeric' && it.numericUnit && norm(it.numericUnit).includes(q)) return true;
        return false;
      });
    });
  }, [pairs, activeMap, searchQuery, filterTingkat, filterTargetType]);

  // Accordion controls
  const toggleGroup = (key: string) => {
    setOpenGroupKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openAllGroups = () => {
    const next: Record<string, boolean> = {};
    pairs.forEach(({ key }) => {
      next[key] = true;
    });
    setOpenGroupKeys(next);
  };

  const closeAllGroups = () => {
    const next: Record<string, boolean> = {};
    pairs.forEach(({ key }) => {
      next[key] = false;
    });
    setOpenGroupKeys(next);
  };

  // Add Item to a Tingkat
  const handleAddItem = (key: string) => {
    const newItem: ItemHafalanDetail = {
      id: `haf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nama: '',
      targetType: 'numeric',
      numericUnit: 'baris',
      customUnit: '',
      numericStart: 1,
      numericEnd: 100,
      numericStep: 1,
      sentences: [],
      sentenceUnitLabel: 'Kalimat',
      keterangan: '',
    };

    updateActiveMap((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), newItem],
    }));

    // Ensure group is open and expand this new item
    setOpenGroupKeys((prev) => ({ ...prev, [key]: true }));
    setExpandedItemId(newItem.id);
  };

  // Duplicate Item
  const handleDuplicateItem = (key: string, item: ItemHafalanDetail, e: React.MouseEvent) => {
    e.stopPropagation();
    const copyItem: ItemHafalanDetail = {
      ...item,
      id: `haf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nama: item.nama ? `${item.nama} (Salinan)` : 'Materi Baru (Salinan)',
      sentences: item.sentences ? [...item.sentences] : [],
    };

    updateActiveMap((prev) => {
      const list = prev[key] || [];
      const idx = list.findIndex((x) => x.id === item.id);
      const nextList = [...list];
      if (idx !== -1) {
        nextList.splice(idx + 1, 0, copyItem);
      } else {
        nextList.push(copyItem);
      }
      return { ...prev, [key]: nextList };
    });

    setExpandedItemId(copyItem.id);
  };

  // Remove Item
  const handleRemoveItem = (key: string, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Apakah Anda yakin ingin menghapus materi hafalan ini?')) return;

    updateActiveMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((x) => x.id !== itemId),
    }));

    if (expandedItemId === itemId) setExpandedItemId(null);
  };

  // Update Item Fields
  const handleUpdateItem = (key: string, itemId: string, patch: Partial<ItemHafalanDetail>) => {
    updateActiveMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((x) => (x.id === itemId ? { ...x, ...patch } : x)),
    }));
  };

  // Sentence manipulation
  const handleAddSentence = (key: string, itemId: string) => {
    updateActiveMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((x) => {
        if (x.id !== itemId) return x;
        const nextSentences = [...(x.sentences || []), ''];
        return { ...x, sentences: nextSentences };
      }),
    }));
  };

  const handleUpdateSentence = (key: string, itemId: string, index: number, val: string) => {
    updateActiveMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((x) => {
        if (x.id !== itemId) return x;
        const nextSentences = [...(x.sentences || [])];
        nextSentences[index] = val;
        return { ...x, sentences: nextSentences };
      }),
    }));
  };

  const handleRemoveSentence = (key: string, itemId: string, index: number) => {
    updateActiveMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((x) => {
        if (x.id !== itemId) return x;
        const nextSentences = (x.sentences || []).filter((_, i) => i !== index);
        return { ...x, sentences: nextSentences };
      }),
    }));
  };

  const handleMoveSentence = (key: string, itemId: string, index: number, direction: 'up' | 'down') => {
    updateActiveMap((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((x) => {
        if (x.id !== itemId) return x;
        const nextSentences = [...(x.sentences || [])];
        const targetIdx = direction === 'up' ? index - 1 : index + 1;
        if (targetIdx < 0 || targetIdx >= nextSentences.length) return x;
        const temp = nextSentences[index];
        nextSentences[index] = nextSentences[targetIdx];
        nextSentences[targetIdx] = temp;
        return { ...x, sentences: nextSentences };
      }),
    }));
  };

  // Apply Quick Paste sentences
  const handleApplyQuickPaste = (key: string, itemId: string) => {
    if (!quickPasteText.trim()) {
      setQuickPasteTargetId(null);
      return;
    }

    const parsed = quickPasteText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parsed.length > 0) {
      updateActiveMap((prev) => ({
        ...prev,
        [key]: (prev[key] || []).map((x) => {
          if (x.id !== itemId) return x;
          return {
            ...x,
            sentences: parsed,
          };
        }),
      }));
    }

    setQuickPasteText('');
    setQuickPasteTargetId(null);
  };

  // Apply JSON raw changes
  const handleApplyRawJson = () => {
    try {
      const parsed = JSON.parse(rawJsonText);
      if (typeof parsed !== 'object' || parsed === null) {
        alert('Format JSON harus berupa Object dengan key tingkat.');
        return;
      }

      const validated: Record<string, ItemHafalanDetail[]> = {};
      Object.entries(parsed).forEach(([key, items]) => {
        if (Array.isArray(items)) {
          validated[key] = items.map((it, idx) => normalizeToItemDetail(it, idx));
        } else {
          validated[key] = [];
        }
      });

      updateActiveMap(() => validated);
      setEditorMode('visual');
      alert('JSON berhasil diterapkan ke Mode Visual!');
    } catch {
      alert('Format JSON tidak valid. Periksa sintaks tanda kutip atau koma.');
    }
  };

  // Penjaga Bebas Autocomplete
  const filteredAsatidz = useMemo(() => {
    if (!penjagaSearch.trim()) return [];
    const q = norm(penjagaSearch);
    return asatidzList
      .filter((a) => norm(a.nama_asatidz).includes(q))
      .slice(0, 10);
  }, [penjagaSearch, asatidzList]);

  const handleAddPenjagaBebas = (nama: string) => {
    if (!selectedPenjagaBebas.includes(nama)) {
      setSelectedPenjagaBebas([...selectedPenjagaBebas, nama]);
    }
    setPenjagaSearch('');
    setIsDropdownPenjagaOpen(false);
  };

  const handleRemovePenjagaBebas = (idx: number) => {
    setSelectedPenjagaBebas(selectedPenjagaBebas.filter((_, i) => i !== idx));
  };

  // Tahfidz Handlers
  const handleAddSantriTahfidz = (santri: any) => {
    const noInduk = String(santri.no_induk || santri[1] || '').trim();
    if (!noInduk) return;
    if (localSantriTahfidzList.some((s) => norm(s.no_induk) === norm(noInduk))) {
      alert('Santri ini sudah terdaftar dalam program tahfidz.');
      return;
    }
    const rawTk = norm(santri.tingkat || santri[26]);
    const tk = rawTk.includes('WUSTHO') ? 'WUSTHO' : rawTk.includes('ULYA') ? 'ULYA' : 'ULA';
    const kls = String(santri.din_kls || santri[24] || '1');
    const bag = String(santri.din_bag || santri[25] || 'A').toUpperCase();
    const papi = norm(santri.pa_pi || santri[4]) === 'PI' ? 'PI' : 'PA';

    const newItem: SantriTahfidzItem = {
      no_induk: noInduk,
      nama: String(santri.nama || santri[5] || '').trim(),
      tingkat: tk,
      din_kls: kls,
      din_bag: bag,
      pa_pi: papi,
      mode: 'simultan',
      tanggalBergabung: new Date().toISOString().split('T')[0],
    };

    setLocalSantriTahfidzList([...localSantriTahfidzList, newItem]);
    setSantriTahfidzSearch('');
    setIsDropdownSantriTahfidzOpen(false);
  };

  const handleRemoveSantriTahfidz = (noInduk: string) => {
    setLocalSantriTahfidzList(
      localSantriTahfidzList.filter((s) => norm(s.no_induk) !== norm(noInduk))
    );
  };

  const handleChangeSantriTahfidzMode = (noInduk: string, mode: ModeAlurTahfidz) => {
    setLocalSantriTahfidzList(
      localSantriTahfidzList.map((s) => (norm(s.no_induk) === norm(noInduk) ? { ...s, mode } : s))
    );
  };

  const handleChangeSantriCustomJuz = (noInduk: string, customJuz?: number) => {
    setLocalSantriTahfidzList(
      localSantriTahfidzList.map((s) =>
        norm(s.no_induk) === norm(noInduk) ? { ...s, customTargetJuz: customJuz } : s
      )
    );
  };

  const filteredSantriForTahfidz = useMemo(() => {
    if (!santriTahfidzSearch.trim()) return [];
    const q = norm(santriTahfidzSearch);
    const registeredIds = new Set(localSantriTahfidzList.map((s) => norm(s.no_induk)));
    return santriList
      .filter((s: any) => {
        const id = norm(s.no_induk || s[1]);
        const nama = norm(s.nama || s[5]);
        if (registeredIds.has(id)) return false;
        return id.includes(q) || nama.includes(q);
      })
      .slice(0, 8);
  }, [santriList, santriTahfidzSearch, localSantriTahfidzList]);

  // Save all configuration
  const handleSave = async () => {
    setIsSaving(true);

    const cleanMap = (source: Record<string, ItemHafalanDetail[]>) => {
      const res: Record<string, ItemHafalanDetail[]> = {};
      Object.entries(source).forEach(([key, items]) => {
        const valid = (items || []).filter((it) => it.nama && it.nama.trim().length > 0);
        if (valid.length > 0) {
          res[key] = valid;
        }
      });
      return res;
    };

    const newConfig: HafalanConfig = {
      hafWajib: cleanMap(localWajib),
      hafSunnah: cleanMap(localSunnah),
      hafKitab: cleanMap(localKitab),
      penjagaBebas: selectedPenjagaBebas,
      tahfidz: {
        standarMaksimalJuz: Number(localStandarMaksimalJuz) || 3,
        santriTahfidzList: localSantriTahfidzList,
      },
    };

    const success = await saveConfig(newConfig);
    setIsSaving(false);

    if (success) {
      alert('Pengaturan Target Muhafadzoh & Item Hafalan berhasil disimpan!');
      closeSettings();
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-settings-hafalan-title"
    >
      <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal - Dark Header ala Gambar 2 */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 id="modal-settings-hafalan-title" className="text-base font-bold text-white">
                Pengaturan Target Muhafadzoh & Item Hafalan
              </h2>
              <p className="text-xs text-slate-400">
                Atur materi hafalan (Wajib, Sunnah, Kitab) & batas capaian target (Angka / Kalimat) per tingkat
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="Tutup pengaturan hafalan"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector Navigasi Utama */}
        <div className="flex border-b border-slate-200 bg-white px-5 sm:px-6 pt-1 dark:border-slate-800 dark:bg-slate-900 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('wajib')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'wajib'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Hafalan Wajib</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sunnah')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'sunnah'
                ? 'border-blue-600 text-blue-800 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Hafalan Sunnah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kitab')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'kitab'
                ? 'border-amber-600 text-amber-800 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-600" />
            <span>Hafalan Kitab</span>
          </button>

          <button
            type="button"
            data-testid="tab-pengaturan-tahfidz"
            onClick={() => setActiveTab('tahfidz')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'tahfidz'
                ? 'border-cyan-600 text-cyan-800 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-600" />
            <span>Pengaturan Tahfidz</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('penjaga')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
              activeTab === 'penjaga'
                ? 'border-purple-600 text-purple-800 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Akses Penjaga</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50 space-y-4">
          {activeTab === 'wajib' || activeTab === 'sunnah' || activeTab === 'kitab' ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 space-y-3">
              {/* Toolbar Builder ala Gambar 2 */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Tingkat &gt; Item Hafalan &gt; Target Capaian
                  </span>
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {filteredPairs.length} Tingkat · {totalItemsCount} Materi
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                  {/* Mode Visual vs JSON */}
                  <div className="flex items-center rounded-lg border border-slate-300 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => handleSwitchToMode('visual')}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                        editorMode === 'visual'
                          ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchToMode('json')}
                      className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                        editorMode === 'json'
                          ? 'bg-white text-slate-800 shadow-xs dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                      }`}
                    >
                      &lt;&gt; JSON / Cepat
                    </button>
                  </div>

                  {editorMode === 'visual' && (
                    <>
                      <button
                        type="button"
                        onClick={openAllGroups}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                      >
                        Buka Semua
                      </button>
                      <button
                        type="button"
                        onClick={closeAllGroups}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                      >
                        Tutup Semua
                      </button>

                      {/* Dropdown Filter */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowFilterDropdown((prev) => !prev)}
                          className={`inline-flex items-center gap-1 h-8 rounded-lg border px-2.5 text-xs font-semibold shadow-xs transition ${
                            filterTingkat !== 'all' || filterTargetType !== 'all'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <Filter className="h-3 w-3" />
                          <span>Filter</span>
                          {(filterTingkat !== 'all' || filterTargetType !== 'all') && (
                            <span className="flex h-2 w-2 rounded-full bg-emerald-600" />
                          )}
                        </button>

                        {showFilterDropdown && (
                          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg dark:border-slate-700 dark:bg-slate-800 z-50 text-xs space-y-2">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Jenjang Tingkat</label>
                              <select
                                value={filterTingkat}
                                onChange={(e) => setFilterTingkat(e.target.value as any)}
                                className="w-full h-7 rounded border border-slate-300 px-2 text-xs bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              >
                                <option value="all">Semua Jenjang</option>
                                <option value="ula">Hanya Jenjang Ula</option>
                                <option value="wustho">Hanya Jenjang Wustho</option>
                                <option value="ulya">Hanya Jenjang Ulya</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Tipe Target Capaian</label>
                              <select
                                value={filterTargetType}
                                onChange={(e) => setFilterTargetType(e.target.value as any)}
                                className="w-full h-7 rounded border border-slate-300 px-2 text-xs bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                              >
                                <option value="all">Semua Tipe Target</option>
                                <option value="numeric">Tipe Angka (Baris / Halaman)</option>
                                <option value="sentence">Tipe Kalimat (Milestones)</option>
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setFilterTingkat('all');
                                setFilterTargetType('all');
                                setShowFilterDropdown(false);
                              }}
                              className="w-full text-center py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded"
                            >
                              Reset Filter
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Pencarian */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Cari tingkat, materi, atau target..."
                          className="h-8 w-44 sm:w-56 rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>

                      {/* Tambah Item Cepat ke tingkat pertama */}
                      {filteredPairs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAddItem(filteredPairs[0].key)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 transition"
                          title="Tambah Materi Hafalan Baru"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Info Helper Banner ala Gambar 2 */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200 flex items-start gap-2.5">
                <Info className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Panduan Konfigurasi:</strong> Atur materi hafalan untuk setiap jenjang kelas. Tentukan batas capaian target berupa <strong>Rentang Angka</strong> (baris 1-100, halaman 1-100, skor 1-100) atau <strong>Kolom Baris Kalimat</strong> (tahapan materi berurutan: muqodimah, mubtada, khobar, rofa, jer).
                </div>
              </div>

              {/* Mode Visual Builder */}
              {editorMode === 'visual' && (
                <>
                  {filteredPairs.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400 italic">
                      Tidak ada tingkatan atau materi yang sesuai dengan pencarian/filter.
                    </div>
                  ) : (
                    <div className="columns-1 md:columns-2 xl:columns-3 gap-3">
                      {filteredPairs.map(({ key, label }) => {
                        const items = activeMap[key] || [];
                        const isOpen = openGroupKeys[key] ?? true;

                        return (
                          <div
                            key={key}
                            className="mb-3 break-inside-avoid rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden dark:border-slate-700/80 dark:bg-slate-900/40 shadow-xs"
                          >
                            {/* Group Header ala Gambar 2 */}
                            <div className="flex items-center justify-between gap-1 px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => toggleGroup(key)}
                                className="flex flex-1 items-center gap-2 min-w-0 text-left hover:opacity-85 transition py-0.5"
                              >
                                <GraduationCap className="h-4 w-4 shrink-0 text-emerald-600" />
                                <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                  {label}
                                </span>
                                <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  {items.length} Materi
                                </span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleAddItem(key)}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition dark:bg-emerald-950/60 dark:text-emerald-300"
                                  title={`Tambah Materi di ${label}`}
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Materi</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(key)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Daftar Item Hafalan di Tingkat Ini */}
                            {isOpen && (
                              <div className="space-y-2.5 p-2.5">
                                {items.length === 0 ? (
                                  <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-[11px] text-slate-400 dark:border-slate-700">
                                    Belum ada materi hafalan. Klik (+ Materi) untuk menambahkan.
                                  </div>
                                ) : (
                                  items.map((item) => {
                                    const isExpanded = expandedItemId === item.id;
                                    const targetPreview = formatTargetPreview(item);

                                    return (
                                      <div
                                        key={item.id}
                                        className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden dark:border-slate-700/80 dark:bg-slate-800"
                                      >
                                        {/* Baris Ringkasan Preview Card ala Gambar 2 */}
                                        <div
                                          onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                          className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition dark:hover:bg-slate-700/50"
                                        >
                                          <div className="flex min-w-0 flex-col gap-1 text-xs">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                                {item.nama || '(Belum Diberi Nama)'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              <span
                                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                                                  item.targetType === 'numeric'
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900'
                                                }`}
                                              >
                                                {item.targetType === 'numeric' ? 'Tipe: Angka' : 'Tipe: Kalimat'}
                                              </span>
                                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600 truncate max-w-[180px]">
                                                {targetPreview}
                                              </span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(e) => handleDuplicateItem(key, item, e)}
                                              title="Duplikat Materi Ini"
                                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition dark:hover:bg-slate-700"
                                            >
                                              <Copy className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => handleRemoveItem(key, item.id, e)}
                                              title="Hapus Materi Ini"
                                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition dark:hover:bg-slate-700"
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                            <div className="text-slate-400 p-1">
                                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Expanded Config Form Detail */}
                                        {isExpanded && (
                                          <div className="border-t border-slate-200 bg-slate-50/70 p-3 space-y-3 dark:border-slate-700 dark:bg-slate-900/60">
                                            {/* Field: Nama Materi */}
                                            <div>
                                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Nama Materi Hafalan
                                              </label>
                                              <input
                                                type="text"
                                                value={item.nama}
                                                onChange={(e) => handleUpdateItem(key, item.id, { nama: e.target.value })}
                                                placeholder="Contoh: Nadhom Al-Imrithi, Juz Amma..."
                                                className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                              />
                                            </div>

                                            {/* Field: Pilihan Tipe Capaian Target */}
                                            <div>
                                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Model Capaian Target
                                              </label>
                                              <div className="grid grid-cols-2 gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateItem(key, item.id, { targetType: 'numeric' })}
                                                  className={`flex items-center gap-1.5 p-2 rounded-lg border text-left text-xs transition ${
                                                    item.targetType === 'numeric'
                                                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-500'
                                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                  }`}
                                                >
                                                  <Hash className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                  <div>
                                                    <div className="text-[11px] font-bold">1. Rentang Angka</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">Baris, Halaman, Skor 1-100</div>
                                                  </div>
                                                </button>

                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateItem(key, item.id, { targetType: 'sentence' })}
                                                  className={`flex items-center gap-1.5 p-2 rounded-lg border text-left text-xs transition ${
                                                    item.targetType === 'sentence'
                                                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-bold dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-500'
                                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                  }`}
                                                >
                                                  <AlignLeft className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                                  <div>
                                                    <div className="text-[11px] font-bold">2. Kolom Kalimat</div>
                                                    <div className="text-[10px] text-slate-500 font-normal">Muqodimah, Mubtada, dll</div>
                                                  </div>
                                                </button>
                                              </div>
                                            </div>

                                            {/* Konfigurasi Tipe 1: Rentang Angka */}
                                            {item.targetType === 'numeric' && (
                                              <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2.5 space-y-2.5 dark:border-blue-900/40 dark:bg-blue-950/20">
                                                {/* Preset Cepat */}
                                                <div>
                                                  <span className="text-[10px] font-bold text-slate-500 block mb-1">
                                                    Preset Cepat:
                                                  </span>
                                                  <div className="flex flex-wrap gap-1">
                                                    {[
                                                      { label: 'Baris 1-100', u: 'baris', s: 1, e: 100 },
                                                      { label: 'Halaman 1-100', u: 'halaman', s: 1, e: 100 },
                                                      { label: 'Halaman 1-50', u: 'halaman', s: 1, e: 50 },
                                                      { label: 'Skor 1-100', u: 'skor', s: 1, e: 100 },
                                                      { label: 'Imrithi 1-254', u: 'bait', s: 1, e: 254 },
                                                      { label: 'Alfiyyah 1-1000', u: 'bait', s: 1, e: 1000 },
                                                    ].map((p, idx) => (
                                                      <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() =>
                                                          handleUpdateItem(key, item.id, {
                                                            numericUnit: p.u as TargetUnitNumeric,
                                                            numericStart: p.s,
                                                            numericEnd: p.e,
                                                          })
                                                        }
                                                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition dark:bg-slate-800 dark:border-blue-800 dark:text-blue-300"
                                                      >
                                                        {p.label}
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2">
                                                  <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                                      Satuan
                                                    </label>
                                                    <select
                                                      value={item.numericUnit || 'baris'}
                                                      onChange={(e) =>
                                                        handleUpdateItem(key, item.id, {
                                                          numericUnit: e.target.value as TargetUnitNumeric,
                                                        })
                                                      }
                                                      className="w-full h-7 rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    >
                                                      <option value="baris">Baris</option>
                                                      <option value="halaman">Halaman</option>
                                                      <option value="bait">Bait / Nadhom</option>
                                                      <option value="skor">Skor (1-100)</option>
                                                      <option value="custom">Kustom</option>
                                                    </select>
                                                  </div>

                                                  <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                                      Mulai Dari
                                                    </label>
                                                    <input
                                                      type="number"
                                                      value={item.numericStart ?? 1}
                                                      onChange={(e) =>
                                                        handleUpdateItem(key, item.id, {
                                                          numericStart: Number(e.target.value) || 1,
                                                        })
                                                      }
                                                      className="w-full h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    />
                                                  </div>

                                                  <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                                      Target Akhir
                                                    </label>
                                                    <input
                                                      type="number"
                                                      value={item.numericEnd ?? 100}
                                                      onChange={(e) =>
                                                        handleUpdateItem(key, item.id, {
                                                          numericEnd: Number(e.target.value) || 100,
                                                        })
                                                      }
                                                      className="w-full h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                                    />
                                                  </div>
                                                </div>

                                                {item.numericUnit === 'custom' && (
                                                  <div>
                                                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                                      Nama Satuan Kustom
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={item.customUnit || ''}
                                                      onChange={(e) =>
                                                        handleUpdateItem(key, item.id, {
                                                          customUnit: e.target.value,
                                                        })
                                                      }
                                                      placeholder="Contoh: Lembar, Makro', Fashal..."
                                                      className="w-full h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800"
                                                    />
                                                  </div>
                                                )}

                                                <div className="text-[11px] font-medium text-blue-800 dark:text-blue-300 pt-1 border-t border-blue-200/60 flex items-center gap-1">
                                                  <Check className="w-3 h-3 text-blue-600" />
                                                  <span>
                                                    Preview Target: {item.numericUnit || 'Baris'} {item.numericStart || 1} s/d {item.numericEnd || 100}
                                                  </span>
                                                </div>
                                              </div>
                                            )}

                                            {/* Konfigurasi Tipe 2: Kolom Baris Kalimat */}
                                            {item.targetType === 'sentence' && (
                                              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-2 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                                <div className="flex items-center justify-between">
                                                  <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                                                    Daftar Baris Kalimat / Tahapan ({item.sentences?.length || 0})
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        setQuickPasteTargetId(quickPasteTargetId === item.id ? null : item.id);
                                                        setQuickPasteText((item.sentences || []).join(', '));
                                                      }}
                                                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition"
                                                      title="Impor atau tempel kalimat sekaligus"
                                                    >
                                                      Impor / Tempel Teks
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleAddSentence(key, item.id)}
                                                      className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition"
                                                    >
                                                      <Plus className="w-3 h-3" />
                                                      <span>Baris</span>
                                                    </button>
                                                  </div>
                                                </div>

                                                {/* Panel Quick Paste */}
                                                {quickPasteTargetId === item.id && (
                                                  <div className="p-2 rounded-lg bg-white border border-emerald-300 space-y-1.5 shadow-xs">
                                                    <label className="block text-[10px] font-bold text-slate-600">
                                                      Tempelkan daftar kalimat dipisahkan tanda koma atau baris baru:
                                                    </label>
                                                    <textarea
                                                      rows={2}
                                                      value={quickPasteText}
                                                      onChange={(e) => setQuickPasteText(e.target.value)}
                                                      placeholder="Contoh: muqodimah, mubtada, khobar, rofa, jer"
                                                      className="w-full text-xs p-1.5 rounded border border-slate-300 font-sans focus:outline-none focus:border-emerald-600"
                                                    />
                                                    <div className="flex justify-end gap-1">
                                                      <button
                                                        type="button"
                                                        onClick={() => setQuickPasteTargetId(null)}
                                                        className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded"
                                                      >
                                                        Batal
                                                      </button>
                                                      <button
                                                        type="button"
                                                        onClick={() => handleApplyQuickPaste(key, item.id)}
                                                        className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-700 text-white hover:bg-emerald-800 rounded"
                                                      >
                                                        Terapkan Kalimat
                                                      </button>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* Daftar Baris Kalimat */}
                                                {(!item.sentences || item.sentences.length === 0) ? (
                                                  <div className="p-3 text-center text-[10px] text-slate-400 italic bg-white rounded border border-slate-200">
                                                    Belum ada baris kalimat. Klik (+ Baris) atau (Impor Teks) untuk menambahkan contoh: muqodimah, mubtada, khobar, rofa, jer.
                                                  </div>
                                                ) : (
                                                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                    {item.sentences.map((sentence, sIdx) => (
                                                      <div
                                                        key={sIdx}
                                                        className="flex items-center gap-1.5 p-1 bg-white rounded border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                                                      >
                                                        <span className="flex h-5 w-5 items-center justify-center rounded bg-slate-100 text-[10px] font-mono font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300 shrink-0">
                                                          {sIdx + 1}
                                                        </span>
                                                        <input
                                                          type="text"
                                                          value={sentence}
                                                          onChange={(e) =>
                                                            handleUpdateSentence(key, item.id, sIdx, e.target.value)
                                                          }
                                                          placeholder="Ketik kalimat/bab (misal: muqodimah)..."
                                                          className="flex-1 h-6 rounded px-2 text-xs border border-transparent hover:border-slate-300 focus:border-emerald-600 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
                                                        />
                                                        <button
                                                          type="button"
                                                          disabled={sIdx === 0}
                                                          onClick={() => handleMoveSentence(key, item.id, sIdx, 'up')}
                                                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                                          title="Pindah ke atas"
                                                        >
                                                          <ChevronUp className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          disabled={sIdx === item.sentences!.length - 1}
                                                          onClick={() => handleMoveSentence(key, item.id, sIdx, 'down')}
                                                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                                          title="Pindah ke bawah"
                                                        >
                                                          <ChevronDown className="w-3 h-3" />
                                                        </button>
                                                        <button
                                                          type="button"
                                                          onClick={() => handleRemoveSentence(key, item.id, sIdx)}
                                                          className="p-1 text-slate-400 hover:text-rose-600"
                                                          title="Hapus baris ini"
                                                        >
                                                          <Trash2 className="w-3 h-3" />
                                                        </button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}

                                                <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 pt-1 border-t border-emerald-200/60 truncate">
                                                  Preview: {item.sentences && item.sentences.length > 0 ? item.sentences.join(' → ') : '-'}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Mode Raw JSON Editor ala Gambar 2 */}
              {editorMode === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Editor Mentah JSON Konfigurasi ({activeTab.toUpperCase()})
                    </label>
                    <button
                      type="button"
                      onClick={handleApplyRawJson}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Terapkan ke Mode Visual</span>
                    </button>
                  </div>
                  <textarea
                    rows={14}
                    value={rawJsonText}
                    onChange={(e) => setRawJsonText(e.target.value)}
                    placeholder="{ ... }"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono bg-white text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}
            </div>
          ) : activeTab === 'tahfidz' ? (
            /* Tab 4: Pengaturan Tahfidz */
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 space-y-6">
              {/* Header Edukatif */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 text-cyan-950 dark:bg-cyan-950/30 dark:border-cyan-900 dark:text-cyan-200 text-xs leading-relaxed">
                <Sparkles className="w-5 h-5 text-cyan-700 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold text-sm text-cyan-900 dark:text-cyan-200 mb-1">
                    Pengaturan Standar &amp; Pemetaan Santri Program Tahfidz
                  </strong>
                  Atur batas standar target juz tahfidz madrasah, daftarkan santri yang mengikuti program tahfidz, serta tentukan mode alurnya: apakah memproses 2 hafalan sekaligus (simultan) atau fokus mendahulukan tahfidz terlebih dahulu sebelum hafalan wajib.
                </div>
              </div>

              {/* 1. Mengatur Standar Hafalan Tahfidz */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-700" />
                    1. Standar Target Hafalan Tahfidz (Maksimal Juz)
                  </label>
                  <span className="text-[11px] font-semibold text-cyan-700 bg-cyan-100/70 px-2.5 py-0.5 rounded-full">
                    Default: 3 Juz
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      data-testid="input-standar-maksimal-juz"
                      min={1}
                      max={30}
                      value={localStandarMaksimalJuz}
                      onChange={(e) =>
                        setLocalStandarMaksimalJuz(
                          Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 1))
                        )
                      }
                      className="w-24 text-center font-bold text-base px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Juz</span>
                  </div>
                  <p className="text-xs text-slate-500 flex-1">
                    Angka ini menjadi batas maksimal saat Mustahiq mengisi setoran santri tahfidz (pilihan Juz 1 s.d. Juz {localStandarMaksimalJuz}).
                  </p>
                </div>
              </div>

              {/* 2. Memilih Santri yang Tahfidz */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-700" />
                      2. Memilih Santri yang Tahfidz
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih santri untuk didaftarkan ke program tahfidz dan tentukan jalur setoran santri tersebut.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                    {localSantriTahfidzList.length} Santri Terdaftar
                  </span>
                </div>

                {/* Search & Add Input Box */}
                <div className="relative">
                  <div className="flex items-center gap-2 p-2 rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                    <Search className="w-4 h-4 text-slate-400 ms-1" />
                    <input
                      type="text"
                      data-testid="search-santri-tahfidz"
                      value={santriTahfidzSearch}
                      onChange={(e) => {
                        setSantriTahfidzSearch(e.target.value);
                        setIsDropdownSantriTahfidzOpen(true);
                      }}
                      onFocus={() => setIsDropdownSantriTahfidzOpen(true)}
                      placeholder="Ketik nama atau NIS santri untuk ditambahkan ke program Tahfidz..."
                      className="w-full text-xs py-1 px-1 border-0 focus:outline-none bg-transparent dark:text-white"
                    />
                    {santriTahfidzSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSantriTahfidzSearch('');
                          setIsDropdownSantriTahfidzOpen(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Dropdown Suggestions */}
                  {isDropdownSantriTahfidzOpen && filteredSantriForTahfidz.length > 0 && (
                    <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredSantriForTahfidz.map((s: any) => {
                        const id = String(s.no_induk || s[1] || '').trim();
                        const nama = String(s.nama || s[5] || '').trim();
                        const kls = String(s.din_kls || s[24] || '1');
                        const bag = String(s.din_bag || s[25] || 'A').toUpperCase();
                        const tk = norm(s.tingkat || s[26]);
                        const papi = norm(s.pa_pi || s[4]) === 'PI' ? 'PI' : 'PA';

                        return (
                          <div
                            key={id}
                            onClick={() => handleAddSantriTahfidz(s)}
                            className="p-2.5 text-xs hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between transition"
                          >
                            <div>
                              <strong className="text-slate-800 dark:text-slate-100">{nama}</strong>
                              <span className="text-slate-400 font-mono text-[11px] ml-2">NIS: {id}</span>
                              <span className="text-slate-500 text-[11px] ml-2">
                                ({kls} {bag} {tk} - {papi})
                              </span>
                            </div>
                            <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-[11px]">
                              + Tambah
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* List Santri Tahfidz Aktif */}
                <div className="space-y-3">
                  {localSantriTahfidzList.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs italic">
                      Belum ada santri yang ditambahkan ke Program Tahfidz. Ketik nama atau NIS santri di kolom pencarian di atas untuk menambahkan.
                    </div>
                  ) : (
                    localSantriTahfidzList.map((st, idx) => (
                      <div
                        key={st.no_induk || idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 shadow-2xs space-y-3"
                      >
                        {/* Header Santri */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-800 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <strong className="text-sm text-slate-900 dark:text-white">
                                {st.nama}
                              </strong>
                              <span className="text-slate-400 font-mono text-xs ml-2">
                                NIS: {st.no_induk}
                              </span>
                              <span className="text-slate-500 text-xs ml-2">
                                • Kelas: {st.din_kls} {st.din_bag} {st.tingkat} ({st.pa_pi})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <span>Target:</span>
                              <input
                                type="number"
                                min={1}
                                max={30}
                                placeholder={String(localStandarMaksimalJuz)}
                                value={st.customTargetJuz || ''}
                                onChange={(e) => {
                                  const val = e.target.value ? parseInt(e.target.value, 10) : undefined;
                                  handleChangeSantriCustomJuz(st.no_induk, val);
                                }}
                                className="w-14 text-center font-bold px-2 py-1 rounded border border-slate-300 text-xs"
                                title="Override target juz khusus santri ini (opsional)"
                              />
                              <span>Juz</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveSantriTahfidz(st.no_induk)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus dari program tahfidz"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Opsi Alur / Jalur Hafalan */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                            Pilih Alur Hafalan Santri Ini:
                          </span>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {/* Opsi 1: Simultan 2 Hafalan Sekaligus */}
                            <label
                              className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                                st.mode === 'simultan'
                                  ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
                                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`mode_${st.no_induk}`}
                                value="simultan"
                                checked={st.mode === 'simultan'}
                                onChange={() => handleChangeSantriTahfidzMode(st.no_induk, 'simultan')}
                                className="mt-0.5 text-emerald-700 cursor-pointer"
                              />
                              <div>
                                <strong className="text-xs text-slate-900 block">
                                  2 Hafalan Sekaligus (Simultan)
                                </strong>
                                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                                  Menampilkan 2 kolom input sekaligus (Tahfidz di atas, Hafalan Wajib di bawah) dan 2 progress bar pada tabel.
                                </p>
                              </div>
                            </label>

                            {/* Opsi 2: Tahfidz Didahulukan */}
                            <label
                              className={`flex items-start gap-2.5 p-3 rounded-xl border transition cursor-pointer select-none ${
                                st.mode === 'didahulukan'
                                  ? 'bg-cyan-50/80 border-cyan-500 ring-2 ring-cyan-500/20'
                                  : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`mode_${st.no_induk}`}
                                value="didahulukan"
                                checked={st.mode === 'didahulukan'}
                                onChange={() => handleChangeSantriTahfidzMode(st.no_induk, 'didahulukan')}
                                className="mt-0.5 text-cyan-700 cursor-pointer"
                              />
                              <div>
                                <strong className="text-xs text-slate-900 block">
                                  Tahfidz Didahulukan (Prioritas)
                                </strong>
                                <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                                  Santri fokus menyelesaikan target Tahfidz ({st.customTargetJuz || localStandarMaksimalJuz} Juz) terlebih dahulu sebelum hafalan wajib terbuka.
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Tab 4: Akses Penjaga Bebas */
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-800/60 space-y-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-950 leading-relaxed dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200">
                <strong>Info Akses Khusus:</strong> Secara default, Penjaga hanya bisa menyimak Santri dengan{' '}
                <strong>Tingkat dan Gender (PA/PI) yang sama</strong>. Masukkan nama Asatidz di bawah ini jika Anda ingin memberikan hak spesial agar Asatidz tersebut bisa menyimak{' '}
                <strong>semua tingkat dan gender santri</strong>.
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-1.5">
                  Nama Asatidz (Akses Bebas Menyimak Semua Tingkat)
                </label>

                {/* Chips Box */}
                <div className="p-2 rounded-lg border-2 border-emerald-600 bg-white dark:bg-slate-800 min-h-[48px] flex flex-wrap gap-1.5 items-center relative">
                  {selectedPenjagaBebas.map((nama, idx) => (
                    <span
                      key={`${nama}_${idx}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-700 text-white shadow-xs"
                    >
                      <span>{nama}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePenjagaBebas(idx)}
                        className="hover:text-rose-200 text-white transition p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    value={penjagaSearch}
                    onChange={(e) => {
                      setPenjagaSearch(e.target.value);
                      setIsDropdownPenjagaOpen(true);
                    }}
                    onFocus={() => setIsDropdownPenjagaOpen(true)}
                    placeholder="Ketik nama Asatidz untuk menambahkan..."
                    className="flex-1 min-w-[200px] text-xs py-1 px-2 border-0 focus:outline-none bg-transparent dark:text-white"
                  />

                  {/* Dropdown Suggestions */}
                  {isDropdownPenjagaOpen && filteredAsatidz.length > 0 && (
                    <div className="absolute left-0 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-lg z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredAsatidz.map((a) => {
                        const nama = a.nama_asatidz || '';
                        const isSelected = selectedPenjagaBebas.includes(nama);
                        const kelas = `${a.din_kls_asatidz || ''} ${a.din_bag_asatidz || ''} ${a.tingkat_asatidz || ''}`.trim();

                        return (
                          <div
                            key={a.id || a.nia || nama}
                            onClick={() => handleAddPenjagaBebas(nama)}
                            className="p-2 text-xs hover:bg-emerald-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <strong className="text-slate-800 dark:text-slate-100">{nama}</strong>
                              <span className="text-slate-400 text-[11px] ml-2">Kelas: {kelas || '-'}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={closeSettings}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          >
            Batal
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              {activeTab === 'tahfidz' ? (
                <>
                  Total <strong className="text-cyan-700 dark:text-cyan-400">{localSantriTahfidzList.length}</strong> santri terdaftar program Tahfidz
                </>
              ) : activeTab === 'penjaga' ? (
                <>
                  Total <strong className="text-purple-700 dark:text-purple-400">{selectedPenjagaBebas.length}</strong> Asatidz akses bebas
                </>
              ) : (
                <>
                  Total <strong className="text-emerald-700 dark:text-emerald-400">{totalItemsCount}</strong> materi hafalan aktif
                </>
              )}
            </span>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
