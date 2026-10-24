'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  RotateCcw,
  FolderOpen,
  Folder,
  Save,
  Info,
  FolderTree,
  Layers,
  GraduationCap,
  Copy,
  Code,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  HierarchyRule,
  DEFAULT_HIERARCHY_RULES,
  loadHierarchyRules,
  saveHierarchyRules,
  Tree2Rule,
  DEFAULT_TREE2_RULES,
  loadTree2Rules,
  saveTree2Rules,
} from '@/lib/services/hierarchy-service';
import { supabase } from '@/lib/supabase/client';
import { useAppStore } from '@/stores/useAppStore';
import { logActivity } from '@/lib/utils/audit';

const NO_BLOK_LABEL = '(Tanpa Blok)';
const NO_UNIT_LABEL = '(Tanpa Unit)';

const ROMAN_CLASSES = ['VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function PathInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="Contoh: Blok 1 > Al Hikmah > E"
      className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
    />
  );
}

function splitPath(path: string): string[] {
  return (path || '').split('>').map((s) => s.trim()).filter(Boolean);
}

interface Tree2PreviewResult {
  kelLabel: string;
  bagLabel: string;
  totalRombel: number;
  sampleList: string[];
}

function getTree2Preview(r: Tree2Rule): Tree2PreviewResult {
  const sampleClasses: string[] = [];
  let kelCount = 0;
  let bagCount = 0;
  let kelLabel = '';
  let bagLabel = '';

  const kelList: string[] = [];
  if (r.kelasType === 'roman') {
    const s = ROMAN_CLASSES.indexOf(r.kelasRomanStart || 'VII');
    const e = ROMAN_CLASSES.indexOf(r.kelasRomanEnd || 'IX');
    const sIdx = s !== -1 ? s : 0;
    const eIdx = e !== -1 ? e : 2;
    const min = Math.min(sIdx, eIdx);
    const max = Math.max(sIdx, eIdx);
    for (let i = min; i <= max; i++) {
      kelList.push(ROMAN_CLASSES[i]);
    }
    kelCount = kelList.length;
    kelLabel = `${ROMAN_CLASSES[min]} - ${ROMAN_CLASSES[max]}`;
  } else if (r.kelasType === 'numeric') {
    const s = Number(r.kelasNumStart) || 1;
    const e = Number(r.kelasNumEnd) || 6;
    const min = Math.min(s, e);
    const max = Math.max(s, e);
    for (let i = min; i <= max; i++) {
      kelList.push(String(i));
    }
    kelCount = kelList.length;
    kelLabel = `${min} - ${max}`;
  } else if (r.kelasManual) {
    const parts = r.kelasManual.split(',').map((x) => x.trim()).filter(Boolean);
    kelList.push(...parts);
    kelCount = parts.length;
    kelLabel = parts.slice(0, 3).join(', ') + (parts.length > 3 ? '...' : '');
  } else {
    kelList.push('VII', 'VIII', 'IX');
    kelCount = 3;
    kelLabel = 'VII - IX';
  }

  const bagList: string[] = [];
  if (r.bagType === 'alpha') {
    const s = (r.bagAlphaStart || 'A').toUpperCase().charCodeAt(0);
    const rawEnd = (r.bagAlphaEnd || 'E').toUpperCase();
    const endChar = rawEnd.length === 1 && rawEnd >= 'A' && rawEnd <= 'Z' ? rawEnd : 'E';
    const e = endChar.charCodeAt(0);
    const min = Math.min(s, e);
    const max = Math.max(s, e);
    for (let i = min; i <= max; i++) {
      bagList.push(String.fromCharCode(i));
    }
    bagCount = bagList.length;
    bagLabel = `${String.fromCharCode(min)} - ${String.fromCharCode(max)}`;
  } else if (r.bagType === 'numeric') {
    const s = Number(r.bagNumStart) || 1;
    const e = Number(r.bagNumEnd) || 10;
    const min = Math.min(s, e);
    const max = Math.max(s, e);
    for (let i = min; i <= max; i++) {
      bagList.push(String(i));
    }
    bagCount = bagList.length;
    bagLabel = `${min} - ${max}`;
  } else if (r.bagManual) {
    const parts = r.bagManual.split(',').map((x) => x.trim()).filter(Boolean);
    bagList.push(...parts);
    bagCount = parts.length;
    bagLabel = parts.slice(0, 3).join(', ') + (parts.length > 3 ? '...' : '');
  } else {
    bagList.push('A', 'B', 'C', 'D', 'E');
    bagCount = 5;
    bagLabel = 'A - E';
  }

  for (const k of kelList) {
    for (const b of bagList) {
      sampleClasses.push(`${k}-${b}`);
    }
  }

  const totalRombel = kelCount * bagCount;
  return { kelLabel, bagLabel, totalRombel, sampleList: sampleClasses };
}

export default function ModalHierarchyBuilder({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings, setSettings } = useAppStore();
  const [activeTab, setActiveTab] = useState<'tree1' | 'tree2'>('tree1');
  const [loading, setLoading] = useState(false);

  // State Tree 1 (Kamar)
  const [rules, setRules] = useState<HierarchyRule[]>(DEFAULT_HIERARCHY_RULES);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlok, setFilterBlok] = useState('');
  const [filterAsrama, setFilterAsrama] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // State Tree 2 (Kelas Formal)
  const [rulesTree2, setRulesTree2] = useState<Tree2Rule[]>(DEFAULT_TREE2_RULES);
  const [tree2RawJson, setTree2RawJson] = useState<string>('');
  const [tree2Mode, setTree2Mode] = useState<'visual' | 'json'>('visual');
  const [expandedTree2Id, setExpandedTree2Id] = useState<string | null>(null);
  const [openTree2Groups, setOpenTree2Groups] = useState<Set<string>>(new Set());
  const [searchTree2Term, setSearchTree2Term] = useState('');
  const [filterTree2Unit, setFilterTree2Unit] = useState('');
  const [showTree2FilterDropdown, setShowTree2FilterDropdown] = useState(false);

  const [saving, setSaving] = useState(false);

  // Muat data hierarki saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const loadedRules = await loadHierarchyRules();
        if (isMounted) {
          setRules(loadedRules.length > 0 ? loadedRules : DEFAULT_HIERARCHY_RULES);
        }

        const loadedTree2 = await loadTree2Rules();
        if (isMounted) {
          const list = loadedTree2 && loadedTree2.length > 0 ? loadedTree2 : DEFAULT_TREE2_RULES;
          const normalized = list.map((r, idx) => ({
            ...r,
            id: r.id || `tree2_${idx}_${Date.now()}`,
          }));
          setRulesTree2(normalized);
          setTree2RawJson(JSON.stringify(normalized, null, 2));
        }
      } catch (err) {
        console.error('Gagal memuat aturan hierarki:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSettings();
    setOpenGroups(new Set());
    setExpandedId(null);
    setSearchTerm('');
    setFilterBlok('');
    setFilterAsrama('');
    setShowFilterDropdown(false);

    setOpenTree2Groups(new Set());
    setExpandedTree2Id(null);
    setSearchTree2Term('');
    setFilterTree2Unit('');
    setShowTree2FilterDropdown(false);

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // Tree 1 (Kamar) Filter & Groups
  // -------------------------------------------------------------
  const blokSet = new Set<string>();
  const asramaSet = new Set<string>();

  rules.forEach((r) => {
    const parts = splitPath(r.parentPath);
    if (parts[0]) blokSet.add(parts[0]);
    if (parts[1] && (!filterBlok || parts[0] === filterBlok)) {
      asramaSet.add(parts[1]);
    }
  });

  const filtersActive = Boolean(filterBlok || filterAsrama || searchTerm.trim());

  const filteredRules = rules.filter((r) => {
    const parts = splitPath(r.parentPath);
    const blok = parts[0] || '';
    const asrama = parts[1] || '';
    const fullText = `${r.parentPath} ${r.type} ${r.numStart || ''} ${r.numEnd || ''} ${r.alphaStart || ''} ${r.alphaEnd || ''} ${r.manualList || ''}`.toLowerCase();

    const matchBlok = !filterBlok || blok === filterBlok;
    const matchAsrama = !filterAsrama || asrama === filterAsrama;
    const matchSearch =
      !searchTerm || fullText.includes(searchTerm.toLowerCase().trim());

    return matchBlok && matchAsrama && matchSearch;
  });

  const groups: { name: string; items: HierarchyRule[] }[] = [];
  const groupIndex = new Map<string, number>();
  filteredRules.forEach((r) => {
    const name = splitPath(r.parentPath)[0] || NO_BLOK_LABEL;
    let idx = groupIndex.get(name);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(name, idx);
      groups.push({ name, items: [] });
    }
    groups[idx].items.push(r);
  });

  const isGroupOpen = (g: { name: string; items: HierarchyRule[] }) =>
    filtersActive ||
    openGroups.has(g.name) ||
    g.items.some((r) => r.id === expandedId);

  const toggleGroup = (g: { name: string; items: HierarchyRule[] }) => {
    if (filtersActive) return;
    const containsExpanded = g.items.some((r) => r.id === expandedId);
    if (containsExpanded) setExpandedId(null);
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g.name)) next.delete(g.name);
      else next.add(g.name);
      return next;
    });
  };

  const openAllGroups = () => setOpenGroups(new Set(groups.map((g) => g.name)));
  const closeAllGroups = () => {
    setOpenGroups(new Set());
    setExpandedId(null);
  };

  const handleAddRule = () => {
    const newId = `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRule: HierarchyRule = {
      id: newId,
      tree: 'tree1',
      parentPath: 'Blok 1 > Al Hikmah > E',
      type: 'numeric',
      numStart: 1,
      numEnd: 10,
    };
    setRules((prev) => [newRule, ...prev]);
    setOpenGroups((prev) => new Set(prev).add('Blok 1'));
    setExpandedId(newId);
  };

  const handleRemoveRule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateRule = (id: string, updates: Partial<HierarchyRule>) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const getRangePreview = (r: HierarchyRule) => {
    if (r.type === 'numeric') {
      return `[ ${r.numStart || 1} - ${r.numEnd || 10} ]`;
    }
    if (r.type === 'alpha') {
      return `[ ${(r.alphaStart || 'A').toUpperCase()} - ${(r.alphaEnd || 'E').toUpperCase()} ]`;
    }
    return `[ ${r.manualList || 'Manual'} ]`;
  };

  // -------------------------------------------------------------
  // Tree 2 (Kelas Formal) Filter & Groups
  // -------------------------------------------------------------
  const tree2UnitSet = new Set<string>();
  rulesTree2.forEach((r) => {
    if (r.unit) tree2UnitSet.add(r.unit.trim());
  });

  const tree2FiltersActive = Boolean(filterTree2Unit || searchTree2Term.trim());

  const filteredTree2Rules = rulesTree2.filter((r) => {
    const unitMatch =
      !filterTree2Unit ||
      r.unit.toLowerCase() === filterTree2Unit.toLowerCase();
    const query = searchTree2Term.toLowerCase().trim();
    if (!query) return unitMatch;

    const fullText = `${r.unit} ${r.jurusan} ${r.kelasRomanStart || ''} ${
      r.kelasRomanEnd || ''
    } ${r.kelasNumStart || ''} ${r.kelasNumEnd || ''} ${r.kelasManual || ''} ${
      r.bagAlphaStart || ''
    } ${r.bagAlphaEnd || ''} ${r.bagManual || ''}`.toLowerCase();
    return unitMatch && fullText.includes(query);
  });

  const tree2Groups: { name: string; items: Tree2Rule[] }[] = [];
  const tree2GroupIndex = new Map<string, number>();

  filteredTree2Rules.forEach((r) => {
    const name = (r.unit || '').trim() || NO_UNIT_LABEL;
    let idx = tree2GroupIndex.get(name);
    if (idx === undefined) {
      idx = tree2Groups.length;
      tree2GroupIndex.set(name, idx);
      tree2Groups.push({ name, items: [] });
    }
    tree2Groups[idx].items.push(r);
  });

  const isTree2GroupOpen = (g: { name: string; items: Tree2Rule[] }) =>
    tree2FiltersActive ||
    openTree2Groups.has(g.name) ||
    g.items.some((r) => r.id === expandedTree2Id);

  const toggleTree2Group = (g: { name: string; items: Tree2Rule[] }) => {
    if (tree2FiltersActive) return;
    const containsExpanded = g.items.some((r) => r.id === expandedTree2Id);
    if (containsExpanded) setExpandedTree2Id(null);
    setOpenTree2Groups((prev) => {
      const next = new Set(prev);
      if (next.has(g.name)) next.delete(g.name);
      else next.add(g.name);
      return next;
    });
  };

  const openAllTree2Groups = () =>
    setOpenTree2Groups(new Set(tree2Groups.map((g) => g.name)));

  const closeAllTree2Groups = () => {
    setOpenTree2Groups(new Set());
    setExpandedTree2Id(null);
  };

  const handleAddTree2Rule = (defaultUnit?: string) => {
    const targetUnit =
      defaultUnit || tree2Groups[0]?.name || 'SMP Plus Darussalam';
    const newId = `tree2_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newRule: Tree2Rule = {
      id: newId,
      tree: 'tree2',
      unit: targetUnit,
      jurusan: 'Jurusan Baru',
      semesterType: 'manual',
      semesterManual: '-',
      kelasType: 'roman',
      kelasRomanStart: 'VII',
      kelasRomanEnd: 'IX',
      bagType: 'alpha',
      bagAlphaStart: 'A',
      bagAlphaEnd: 'E',
    };
    setRulesTree2((prev) => [newRule, ...prev]);
    setOpenTree2Groups((prev) => new Set(prev).add(targetUnit));
    setExpandedTree2Id(newId);
  };

  const handleDuplicateTree2Rule = (rule: Tree2Rule, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = `tree2_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const duplicated: Tree2Rule = {
      ...rule,
      id: newId,
      jurusan: `${rule.jurusan || 'Jurusan'} (Salinan)`,
    };
    setRulesTree2((prev) => [duplicated, ...prev]);
    setOpenTree2Groups((prev) => new Set(prev).add(duplicated.unit));
    setExpandedTree2Id(newId);
  };

  const handleRemoveTree2Rule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRulesTree2((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateTree2Rule = (id: string, updates: Partial<Tree2Rule>) => {
    setRulesTree2((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  // -------------------------------------------------------------
  // Simpan Seluruh Pengaturan (Tree 1 & Tree 2)
  // -------------------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveHierarchyRules(rules);

      let finalTree2 = rulesTree2;
      if (tree2Mode === 'json') {
        try {
          const parsed = JSON.parse(tree2RawJson);
          if (Array.isArray(parsed)) {
            finalTree2 = parsed.map((r: Tree2Rule, idx: number) => ({
              ...r,
              id: r.id || `tree2_${idx}_${Date.now()}`,
            }));
            setRulesTree2(finalTree2);
          } else {
            alert('Format JSON harus berupa daftar array aturan kelas formal.');
            setSaving(false);
            return;
          }
        } catch {
          alert('Format JSON pada Hierarki Kelas Formal tidak valid.');
          setSaving(false);
          return;
        }
      }

      await saveTree2Rules(finalTree2);

      const updatedSettings = {
        ...settings,
        tree1: JSON.stringify(rules),
        tree2: finalTree2,
      };

      await supabase.from('app_settings').upsert(
        [
          {
            key: 'APP_SETTINGS',
            value: updatedSettings,
          },
        ],
        { onConflict: 'key' }
      );

      await logActivity(
        'SIMPAN PENGATURAN',
        'Memperbarui konfigurasi hierarki kamar & kelas formal'
      );
      setSettings(updatedSettings);
      alert('Pengaturan Hierarki Dropdown berhasil disimpan!');
      onClose();
    } catch (err: unknown) {
      alert(
        'Gagal menyimpan pengaturan: ' +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-settings-title"
    >
      <div className="w-full max-w-6xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white dark:bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <FolderOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 id="modal-settings-title" className="text-base font-bold text-white">
                Pengaturan Hierarki Dropdown
              </h2>
              <p className="text-xs text-slate-400">
                Atur relasi Blok &gt; Asrama &gt; Kode &gt; Kamar untuk form santri
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan hierarki"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selector Navigasi */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setActiveTab('tree1')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'tree1'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-4 h-4 text-emerald-600" />
            <span>Hierarki Kamar (Tree 1: Blok &gt; Asrama &gt; Kode &gt; Kamar)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tree2')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
              activeTab === 'tree2'
                ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Hierarki Kelas Formal (Tree 2: Unit &gt; Jurusan &gt; Kelas)</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* Tab 1: Hierarki Kamar (Tree 1)                            */}
        {/* ========================================================= */}
        {activeTab === 'tree1' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60">
              {/* Toolbar Builder */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400">
                    1. Blok &gt; Asrama &gt; Kode &gt; Kamar
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {groups.length} blok · {filteredRules.length} aturan
                  </span>
                  {loading && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Memuat...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                  <button
                    type="button"
                    onClick={openAllGroups}
                    disabled={filtersActive}
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                  >
                    Buka Semua
                  </button>
                  <button
                    type="button"
                    onClick={closeAllGroups}
                    disabled={filtersActive}
                    className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                  >
                    Tutup Semua
                  </button>

                  {/* Tombol Filter Blok/Asrama */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFilterDropdown((prev) => !prev)}
                      className={`inline-flex items-center gap-1 h-8 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition ${
                        filterBlok || filterAsrama
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span>Filter</span>
                    </button>

                    {showFilterDropdown && (
                      <div className="absolute right-0 mt-1 z-30 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Blok
                          </label>
                          <select
                            value={filterBlok}
                            onChange={(e) => {
                              setFilterBlok(e.target.value);
                              setFilterAsrama('');
                            }}
                            className={inputClass}
                          >
                            <option value="">Semua Blok</option>
                            {Array.from(blokSet).map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            Asrama
                          </label>
                          <select
                            value={filterAsrama}
                            onChange={(e) => setFilterAsrama(e.target.value)}
                            className={inputClass}
                          >
                            <option value="">Semua Asrama</option>
                            {Array.from(asramaSet).map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFilterBlok('');
                            setFilterAsrama('');
                            setShowFilterDropdown(false);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800 transition"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Reset Filter</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Kotak Pencarian Aturan */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari aturan..."
                      className="h-8 w-36 sm:w-48 rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-emerald-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>

                  {/* Tombol Tambah Aturan (+) */}
                  <button
                    type="button"
                    onClick={handleAddRule}
                    title="Tambah Aturan Baru"
                    aria-label="Tambah Aturan Baru"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-sm hover:bg-emerald-800 transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Banner Info */}
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-900/60 dark:text-slate-400">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                <p>
                  Pilihan kosong <span className="font-mono font-bold">-</span> otomatis tersedia
                  di dropdown Kode dan Kamar. Nomor kamar angka ditulis tanpa nol di depan
                  (2, bukan 02). Untuk asrama tanpa kode, tulis rute{' '}
                  <span className="font-mono">Blok &gt; Asrama &gt; -</span>.
                </p>
              </div>

              {/* Daftar Kelompok Blok */}
              {groups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Tidak ada aturan hierarki yang cocok. Klik tombol (+) untuk menambah.
                </div>
              ) : (
                <div className="columns-1 md:columns-2 xl:columns-3 gap-3">
                  {groups.map((group) => {
                    const open = isGroupOpen(group);

                    return (
                      <div
                        key={group.name}
                        className="mb-3 break-inside-avoid rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden dark:border-slate-700/80 dark:bg-slate-900/40 shadow-2xs"
                      >
                        {/* Kepala Kelompok Blok */}
                        <button
                          type="button"
                          onClick={() => toggleGroup(group)}
                          aria-expanded={open}
                          className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left hover:bg-slate-100/80 transition dark:hover:bg-slate-800/60"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            {open ? (
                              <FolderOpen className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : (
                              <Folder className="h-4 w-4 shrink-0 text-emerald-600" />
                            )}
                            <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                              {group.name}
                            </span>
                            <span className="shrink-0 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              {group.items.length}
                            </span>
                          </span>
                          {open ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                          )}
                        </button>

                        {/* Isi Kelompok */}
                        {open && (
                          <div className="space-y-2 border-t border-slate-200 p-2.5 dark:border-slate-700/80">
                            {group.items.map((rule) => {
                              const isExpanded = expandedId === rule.id;
                              const parts = splitPath(rule.parentPath);
                              const label =
                                parts.length > 1
                                  ? parts.slice(1).join(' > ')
                                  : rule.parentPath || 'Rute Kosong';

                              return (
                                <div
                                  key={rule.id}
                                  className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700/80 dark:bg-slate-800"
                                >
                                  {/* Baris Ringkasan (Preview) */}
                                  <div
                                    onClick={() =>
                                      setExpandedId(isExpanded ? null : rule.id)
                                    }
                                    className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition dark:hover:bg-slate-700/50"
                                  >
                                    <div className="flex min-w-0 flex-col gap-0.5 text-xs">
                                      <span className="truncate font-semibold text-slate-900 dark:text-white">
                                        {label}
                                      </span>
                                      <span className="w-fit rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                                        {getRangePreview(rule)}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => handleRemoveRule(rule.id, e)}
                                        title="Hapus Aturan"
                                        aria-label="Hapus Aturan"
                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition dark:hover:bg-rose-950/40"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                      {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-slate-400" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 text-slate-400" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Form Pengaturan (Saat kartu diklik buka) */}
                                  {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/70 p-3 dark:border-slate-700/60 dark:bg-slate-900/50 space-y-3">
                                      <div>
                                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                          Rute Induk (Blok &gt; Asrama &gt; Kode)
                                        </label>
                                        <PathInput
                                          value={rule.parentPath}
                                          onCommit={(next) =>
                                            handleUpdateRule(rule.id, {
                                              parentPath: next,
                                            })
                                          }
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2">
                                        <div className="col-span-2">
                                          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                            Tipe Nomor Kamar
                                          </label>
                                          <select
                                            value={rule.type}
                                            onChange={(e) =>
                                              handleUpdateRule(rule.id, {
                                                type: e.target.value as
                                                  | 'numeric'
                                                  | 'alpha'
                                                  | 'manual',
                                              })
                                            }
                                            className={inputClass}
                                          >
                                            <option value="numeric">Rentang Angka</option>
                                            <option value="alpha">Rentang Abjad</option>
                                            <option value="manual">Teks Manual</option>
                                          </select>
                                        </div>

                                        {rule.type === 'numeric' && (
                                          <>
                                            <div>
                                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                Angka Awal
                                              </label>
                                              <input
                                                type="number"
                                                value={rule.numStart || 1}
                                                onChange={(e) =>
                                                  handleUpdateRule(rule.id, {
                                                    numStart: Number(e.target.value),
                                                  })
                                                }
                                                className={inputClass}
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                Angka Akhir
                                              </label>
                                              <input
                                                type="number"
                                                value={rule.numEnd || 10}
                                                onChange={(e) =>
                                                  handleUpdateRule(rule.id, {
                                                    numEnd: Number(e.target.value),
                                                  })
                                                }
                                                className={inputClass}
                                              />
                                            </div>
                                          </>
                                        )}

                                        {rule.type === 'alpha' && (
                                          <>
                                            <div>
                                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                Abjad Awal
                                              </label>
                                              <input
                                                type="text"
                                                maxLength={1}
                                                value={rule.alphaStart || 'A'}
                                                onChange={(e) =>
                                                  handleUpdateRule(rule.id, {
                                                    alphaStart: e.target.value.toUpperCase(),
                                                  })
                                                }
                                                className={`${inputClass} text-center font-bold uppercase`}
                                              />
                                            </div>
                                            <div>
                                              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                                Abjad Akhir
                                              </label>
                                              <input
                                                type="text"
                                                maxLength={1}
                                                value={rule.alphaEnd || 'E'}
                                                onChange={(e) =>
                                                  handleUpdateRule(rule.id, {
                                                    alphaEnd: e.target.value.toUpperCase(),
                                                  })
                                                }
                                                className={`${inputClass} text-center font-bold uppercase`}
                                              />
                                            </div>
                                          </>
                                        )}

                                        {rule.type === 'manual' && (
                                          <div className="col-span-2">
                                            <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                                              Daftar Kamar (Pisahkan dengan koma)
                                            </label>
                                            <input
                                              type="text"
                                              value={rule.manualList || ''}
                                              onChange={(e) =>
                                                handleUpdateRule(rule.id, {
                                                  manualList: e.target.value,
                                                })
                                              }
                                              placeholder="Contoh: A1, A2, A3, Mandi"
                                              className={`${inputClass} font-mono`}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* Tab 2: Hierarki Kelas Formal (Visual Card Builder)         */}
        {/* ========================================================= */}
        {activeTab === 'tree2' && (
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900/50">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800/60">
              {/* Toolbar Builder Tab 2 */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-blue-800 dark:text-blue-400">
                    2. Unit &gt; Jurusan &gt; Semester &gt; Kelas &gt; Bagian
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {tree2Groups.length} unit · {filteredTree2Rules.length} aturan
                  </span>
                  {loading && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Memuat...
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 ms-auto">
                  {/* Mode Switcher (Visual vs JSON) */}
                  <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 mr-1">
                    <button
                      type="button"
                      onClick={() => setTree2Mode('visual')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                        tree2Mode === 'visual'
                          ? 'bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Visual
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTree2RawJson(JSON.stringify(rulesTree2, null, 2));
                        setTree2Mode('json');
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                        tree2Mode === 'json'
                          ? 'bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-300 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Code className="h-3 w-3" />
                      <span>JSON / Cepat</span>
                    </button>
                  </div>

                  {tree2Mode === 'visual' && (
                    <>
                      <button
                        type="button"
                        onClick={openAllTree2Groups}
                        disabled={tree2FiltersActive}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                      >
                        Buka Semua
                      </button>
                      <button
                        type="button"
                        onClick={closeAllTree2Groups}
                        disabled={tree2FiltersActive}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition"
                      >
                        Tutup Semua
                      </button>

                      {/* Tombol Filter Unit */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTree2FilterDropdown((prev) => !prev)}
                          className={`inline-flex items-center gap-1 h-8 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition ${
                            filterTree2Unit
                              ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <Filter className="h-3.5 w-3.5" />
                          <span>Filter</span>
                        </button>

                        {showTree2FilterDropdown && (
                          <div className="absolute right-0 mt-1 z-30 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900 space-y-2.5">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                Unit Sekolah
                              </label>
                              <select
                                value={filterTree2Unit}
                                onChange={(e) => setFilterTree2Unit(e.target.value)}
                                className={inputClass}
                              >
                                <option value="">Semua Unit</option>
                                {Array.from(tree2UnitSet).map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setFilterTree2Unit('');
                                setShowTree2FilterDropdown(false);
                              }}
                              className="w-full inline-flex items-center justify-center gap-1 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800 transition"
                            >
                              <RotateCcw className="h-3 w-3" />
                              <span>Reset Filter</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Kotak Pencarian Aturan Formal */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={searchTree2Term}
                          onChange={(e) => setSearchTree2Term(e.target.value)}
                          placeholder="Cari unit, jurusan, kelas..."
                          className="h-8 w-36 sm:w-48 rounded-lg border border-slate-300 bg-white pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 shadow-sm focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>

                      {/* Tombol Tambah Aturan Formal (+) */}
                      <button
                        type="button"
                        onClick={() => handleAddTree2Rule()}
                        title="Tambah Aturan Kelas Formal Baru"
                        aria-label="Tambah Aturan Kelas Formal Baru"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-white shadow-sm hover:bg-blue-800 transition"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Banner Info */}
              <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50/70 px-3 py-2 text-[11px] text-blue-900 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <p>
                  Aturan pengelompokan tingkatan sekolah formal (SMP, MTs, SMA, MA, SMK, Institut) beserta jurusan, jenjang kelas, dan pembagian rombel untuk cascading dropdown di form pendaftaran santri.
                </p>
              </div>

              {/* Mode JSON */}
              {tree2Mode === 'json' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Editor Mentah JSON Hierarki Formal
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(tree2RawJson);
                          if (Array.isArray(parsed)) {
                            const withIds = parsed.map((r: Tree2Rule, idx: number) => ({
                              ...r,
                              id: r.id || `tree2_${idx}_${Date.now()}`,
                            }));
                            setRulesTree2(withIds);
                            setTree2Mode('visual');
                          } else {
                            alert('Format JSON harus berupa Array aturan');
                          }
                        } catch {
                          alert('Format JSON tidak valid. Periksa sintaks koma atau tanda kutip.');
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Terapkan ke Mode Visual</span>
                    </button>
                  </div>
                  <textarea
                    rows={12}
                    value={tree2RawJson}
                    onChange={(e) => setTree2RawJson(e.target.value)}
                    placeholder="[ { ... } ]"
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 font-mono bg-white text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              )}

              {/* Mode Visual Builder */}
              {tree2Mode === 'visual' && (
                <>
                  {tree2Groups.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      Tidak ada aturan sekolah formal yang cocok. Klik tombol (+) untuk menambah.
                    </div>
                  ) : (
                    <div className="columns-1 md:columns-2 xl:columns-3 gap-3">
                      {tree2Groups.map((group) => {
                        const open = isTree2GroupOpen(group);

                        return (
                          <div
                            key={group.name}
                            className="mb-3 break-inside-avoid rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden dark:border-slate-700/80 dark:bg-slate-900/40 shadow-2xs"
                          >
                            {/* Header Grup Unit Sekolah */}
                            <div className="flex items-center justify-between gap-1 px-3 py-2 bg-white dark:bg-slate-800 border-b border-slate-200/80 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => toggleTree2Group(group)}
                                aria-expanded={open}
                                className="flex flex-1 items-center gap-2 min-w-0 text-left hover:opacity-80 transition py-0.5"
                              >
                                <GraduationCap className="h-4 w-4 shrink-0 text-blue-600" />
                                <span className="truncate text-xs font-bold text-slate-900 dark:text-white">
                                  {group.name}
                                </span>
                                <span className="shrink-0 rounded-md bg-blue-100 px-1.5 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                                  {group.items.length} Jurusan
                                </span>
                              </button>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleAddTree2Rule(group.name)}
                                  title={`Tambah Jurusan Baru di ${group.name}`}
                                  aria-label={`Tambah Jurusan Baru di ${group.name}`}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Jurusan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleTree2Group(group)}
                                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  {open ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Daftar Jurusan di Unit ini */}
                            {open && (
                              <div className="space-y-2.5 p-2.5">
                                {group.items.map((rule) => {
                                  const isExpanded = expandedTree2Id === rule.id;
                                  const preview = getTree2Preview(rule);

                                  return (
                                    <div
                                      key={rule.id}
                                      className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-700/80 dark:bg-slate-800"
                                    >
                                      {/* Baris Ringkasan Jurusan (Preview Bar) */}
                                      <div
                                        onClick={() =>
                                          setExpandedTree2Id(isExpanded ? null : (rule.id || null))
                                        }
                                        className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition dark:hover:bg-slate-700/50"
                                      >
                                        <div className="flex min-w-0 flex-col gap-1 text-xs">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-slate-900 dark:text-white truncate">
                                              Jurusan: {rule.jurusan || '(Umum / -)'}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900">
                                              Kelas: {preview.kelLabel}
                                            </span>
                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                                              Bag: {preview.bagLabel}
                                            </span>
                                            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900">
                                              [ {preview.totalRombel} Rombel ]
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                          <button
                                            type="button"
                                            onClick={(e) => handleDuplicateTree2Rule(rule, e)}
                                            title="Duplikat Konfigurasi Jurusan Ini"
                                            aria-label="Duplikat Aturan"
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition dark:hover:bg-slate-700"
                                          >
                                            <Copy className="h-3.5 w-3.5" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={(e) => handleRemoveTree2Rule(rule.id || '', e)}
                                            title="Hapus Jurusan Ini"
                                            aria-label="Hapus Aturan"
                                            className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition dark:hover:bg-rose-950/40"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                          {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-slate-400" />
                                          ) : (
                                            <ChevronDown className="h-4 w-4 text-slate-400" />
                                          )}
                                        </div>
                                      </div>

                                      {/* Form Pengaturan Lengkap Saat Dibuka */}
                                      {isExpanded && (
                                        <div className="border-t border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-700/60 dark:bg-slate-900/50 space-y-3.5">
                                          {/* Baris 1: Unit & Jurusan */}
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Unit Pendidikan
                                              </label>
                                              <input
                                                type="text"
                                                list="tree2-unit-datalist"
                                                value={rule.unit}
                                                onChange={(e) =>
                                                  handleUpdateTree2Rule(rule.id || '', {
                                                    unit: e.target.value,
                                                  })
                                                }
                                                placeholder="Contoh: SMP Plus Darussalam"
                                                className={inputClass}
                                              />
                                              <datalist id="tree2-unit-datalist">
                                                <option value="SMP Plus Darussalam" />
                                                <option value="MTs Al Amiriyyah" />
                                                <option value="SMA Darussalam" />
                                                <option value="MA Al Amiriyyah" />
                                                <option value="SMK Darussalam" />
                                                <option value="IAIDA Blokagung" />
                                              </datalist>
                                            </div>

                                            <div>
                                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Nama Jurusan (atau &apos;-&apos; jika umum)
                                              </label>
                                              <input
                                                type="text"
                                                value={rule.jurusan}
                                                onChange={(e) =>
                                                  handleUpdateTree2Rule(rule.id || '', {
                                                    jurusan: e.target.value,
                                                  })
                                                }
                                                placeholder="Contoh: Tahfidz, Sains, IPS, -"
                                                className={inputClass}
                                              />
                                            </div>
                                          </div>

                                          {/* Baris 2: Semester */}
                                          <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
                                            <div className="flex items-center justify-between mb-1.5">
                                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                Pengaturan Semester
                                              </label>
                                              <select
                                                value={rule.semesterType || 'manual'}
                                                onChange={(e) =>
                                                  handleUpdateTree2Rule(rule.id || '', {
                                                    semesterType: e.target.value,
                                                  })
                                                }
                                                className="h-7 rounded-md border border-slate-300 bg-white px-2 text-[11px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                              >
                                                <option value="manual">Manual (Bawaan &apos;-&apos;)</option>
                                                <option value="numeric">Rentang Angka (1 - 2)</option>
                                              </select>
                                            </div>

                                            {rule.semesterType === 'numeric' ? (
                                              <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                  <span className="text-[10px] text-slate-500">Mulai</span>
                                                  <input
                                                    type="number"
                                                    value={rule.semesterNumStart || 1}
                                                    onChange={(e) =>
                                                      handleUpdateTree2Rule(rule.id || '', {
                                                        semesterNumStart: Number(e.target.value),
                                                      })
                                                    }
                                                    className={inputClass}
                                                  />
                                                </div>
                                                <div>
                                                  <span className="text-[10px] text-slate-500">Sampai</span>
                                                  <input
                                                    type="number"
                                                    value={rule.semesterNumEnd || 2}
                                                    onChange={(e) =>
                                                      handleUpdateTree2Rule(rule.id || '', {
                                                        semesterNumEnd: Number(e.target.value),
                                                      })
                                                    }
                                                    className={inputClass}
                                                  />
                                                </div>
                                              </div>
                                            ) : (
                                              <input
                                                type="text"
                                                value={rule.semesterManual || '-'}
                                                onChange={(e) =>
                                                  handleUpdateTree2Rule(rule.id || '', {
                                                    semesterManual: e.target.value,
                                                  })
                                                }
                                                placeholder="Contoh: - atau Ganjil, Genap"
                                                className={inputClass}
                                              />
                                            )}
                                          </div>

                                          {/* Baris 3: Jenjang Tingkat Kelas */}
                                          <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800 space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-1">
                                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                Jenjang Tingkat Kelas
                                              </label>

                                              {/* Preset Pintar 1-Klik */}
                                              <div className="flex items-center gap-1">
                                                <span className="text-[10px] text-slate-400 font-medium mr-0.5">
                                                  Preset:
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleUpdateTree2Rule(rule.id || '', {
                                                      kelasType: 'roman',
                                                      kelasRomanStart: 'VII',
                                                      kelasRomanEnd: 'IX',
                                                    })
                                                  }
                                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition dark:bg-blue-950 dark:text-blue-300"
                                                >
                                                  SMP (VII-IX)
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleUpdateTree2Rule(rule.id || '', {
                                                      kelasType: 'roman',
                                                      kelasRomanStart: 'X',
                                                      kelasRomanEnd: 'XII',
                                                    })
                                                  }
                                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition dark:bg-blue-950 dark:text-blue-300"
                                                >
                                                  SMA (X-XII)
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    handleUpdateTree2Rule(rule.id || '', {
                                                      kelasType: 'numeric',
                                                      kelasNumStart: 1,
                                                      kelasNumEnd: 6,
                                                    })
                                                  }
                                                  className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition dark:bg-slate-700 dark:text-slate-300"
                                                >
                                                  SD/MI (1-6)
                                                </button>
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                              <div>
                                                <span className="block text-[10px] text-slate-500 mb-0.5">
                                                  Tipe Kelas
                                                </span>
                                                <select
                                                  value={rule.kelasType || 'roman'}
                                                  onChange={(e) =>
                                                    handleUpdateTree2Rule(rule.id || '', {
                                                      kelasType: e.target.value,
                                                    })
                                                  }
                                                  className={inputClass}
                                                >
                                                  <option value="roman">Romawi (VII - XII)</option>
                                                  <option value="numeric">Angka (1 - 12)</option>
                                                  <option value="manual">Teks Manual</option>
                                                </select>
                                              </div>

                                              {rule.kelasType === 'roman' && (
                                                <>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Mulai
                                                    </span>
                                                    <select
                                                      value={rule.kelasRomanStart || 'VII'}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          kelasRomanStart: e.target.value,
                                                        })
                                                      }
                                                      className={inputClass}
                                                    >
                                                      {ROMAN_CLASSES.map((r) => (
                                                        <option key={r} value={r}>
                                                          {r}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Sampai
                                                    </span>
                                                    <select
                                                      value={rule.kelasRomanEnd || 'IX'}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          kelasRomanEnd: e.target.value,
                                                        })
                                                      }
                                                      className={inputClass}
                                                    >
                                                      {ROMAN_CLASSES.map((r) => (
                                                        <option key={r} value={r}>
                                                          {r}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                </>
                                              )}

                                              {rule.kelasType === 'numeric' && (
                                                <>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Mulai
                                                    </span>
                                                    <input
                                                      type="number"
                                                      value={rule.kelasNumStart || 1}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          kelasNumStart: Number(e.target.value),
                                                        })
                                                      }
                                                      className={inputClass}
                                                    />
                                                  </div>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Sampai
                                                    </span>
                                                    <input
                                                      type="number"
                                                      value={rule.kelasNumEnd || 6}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          kelasNumEnd: Number(e.target.value),
                                                        })
                                                      }
                                                      className={inputClass}
                                                    />
                                                  </div>
                                                </>
                                              )}

                                              {rule.kelasType === 'manual' && (
                                                <div className="sm:col-span-2">
                                                  <span className="block text-[10px] text-slate-500 mb-0.5">
                                                    Daftar Kelas (Pisah Koma)
                                                  </span>
                                                  <input
                                                    type="text"
                                                    value={rule.kelasManual || ''}
                                                    onChange={(e) =>
                                                      handleUpdateTree2Rule(rule.id || '', {
                                                        kelasManual: e.target.value,
                                                      })
                                                    }
                                                    placeholder="Contoh: VII, VIII, IX"
                                                    className={inputClass}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Baris 4: Bagian / Rombel */}
                                          <div className="rounded-xl border border-slate-200/90 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800 space-y-2">
                                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                              Bagian / Rombel
                                            </label>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                              <div>
                                                <span className="block text-[10px] text-slate-500 mb-0.5">
                                                  Tipe Bagian
                                                </span>
                                                <select
                                                  value={rule.bagType || 'alpha'}
                                                  onChange={(e) =>
                                                    handleUpdateTree2Rule(rule.id || '', {
                                                      bagType: e.target.value,
                                                    })
                                                  }
                                                  className={inputClass}
                                                >
                                                  <option value="alpha">Rentang Abjad (A - Z)</option>
                                                  <option value="numeric">Rentang Angka (1 - 10)</option>
                                                  <option value="manual">Teks Manual</option>
                                                </select>
                                              </div>

                                              {rule.bagType === 'alpha' && (
                                                <>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Abjad Awal
                                                    </span>
                                                    <input
                                                      type="text"
                                                      maxLength={1}
                                                      value={rule.bagAlphaStart || 'A'}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          bagAlphaStart: e.target.value.toUpperCase(),
                                                        })
                                                      }
                                                      className={`${inputClass} text-center font-bold uppercase`}
                                                    />
                                                  </div>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Abjad Akhir
                                                    </span>
                                                    <input
                                                      type="text"
                                                      maxLength={1}
                                                      value={rule.bagAlphaEnd || 'E'}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          bagAlphaEnd: e.target.value.toUpperCase(),
                                                        })
                                                      }
                                                      className={`${inputClass} text-center font-bold uppercase`}
                                                    />
                                                  </div>
                                                </>
                                              )}

                                              {rule.bagType === 'numeric' && (
                                                <>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Angka Awal
                                                    </span>
                                                    <input
                                                      type="number"
                                                      value={rule.bagNumStart || 1}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          bagNumStart: Number(e.target.value),
                                                        })
                                                      }
                                                      className={inputClass}
                                                    />
                                                  </div>
                                                  <div>
                                                    <span className="block text-[10px] text-slate-500 mb-0.5">
                                                      Angka Akhir
                                                    </span>
                                                    <input
                                                      type="number"
                                                      value={rule.bagNumEnd || 10}
                                                      onChange={(e) =>
                                                        handleUpdateTree2Rule(rule.id || '', {
                                                          bagNumEnd: Number(e.target.value),
                                                        })
                                                      }
                                                      className={inputClass}
                                                    />
                                                  </div>
                                                </>
                                              )}

                                              {rule.bagType === 'manual' && (
                                                <div className="sm:col-span-2">
                                                  <span className="block text-[10px] text-slate-500 mb-0.5">
                                                    Daftar Bagian (Pisah Koma)
                                                  </span>
                                                  <input
                                                    type="text"
                                                    value={rule.bagManual || ''}
                                                    onChange={(e) =>
                                                      handleUpdateTree2Rule(rule.id || '', {
                                                        bagManual: e.target.value,
                                                      })
                                                    }
                                                    placeholder="Contoh: A, B, C, D"
                                                    className={inputClass}
                                                  />
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Baris 5: Live Pratinjau Rombel */}
                                          <div className="rounded-xl bg-blue-50/80 p-2.5 text-[11px] text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="font-bold flex items-center gap-1">
                                                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                                Pratinjau Rombel yang Terbentuk
                                              </span>
                                              <span className="font-bold rounded-md bg-blue-200/80 px-2 py-0.5 text-[10px] text-blue-900 dark:bg-blue-900 dark:text-blue-200">
                                                Total: {preview.totalRombel} Rombel
                                              </span>
                                            </div>
                                            <p className="font-mono text-[10px] text-blue-800 dark:text-blue-300/90 break-words leading-relaxed">
                                              {preview.sampleList.slice(0, 18).join(', ')}
                                              {preview.sampleList.length > 18 && (
                                                <span> ... (+{preview.sampleList.length - 18} lainnya)</span>
                                              )}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer Simpan */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-200 dark:bg-slate-900 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving || loading}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow hover:bg-black transition disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-800"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
