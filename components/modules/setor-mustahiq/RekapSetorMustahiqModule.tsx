'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BarChart2,
  Search,
  Printer,
  FileSpreadsheet,
  GraduationCap,
  CheckCircle2,
  Clock,
  Users,
  X,
  Settings,
  Layers,
  Lock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  useSetorMustahiqStore,
  computeMateriProgressForSantri,
  getMateriOptionsWithStatusForSantri,
} from '@/stores/useSetorMustahiqStore';
import { cariMustahiqSantri, formatTargetPreview, norm } from '@/lib/utils/setoranHelper';
import { ItemHafalanDetail } from '@/types/setoran';
import ModalSettingsHafalan from '@/components/modules/setoran/ModalSettingsHafalan';

type TingkatTab = 'ULA' | 'WUSTHO' | 'ULYA';

interface SantriRekapEntry {
  no_induk: string;
  nama: string;
  kamar: string;
  status_label: string;
  proses_ratio: string;
  progress_pct: number;
  is_completed: boolean;
}

interface HafalanRowInCard {
  item: ItemHafalanDetail;
  kategori: 'Wajib' | 'Sunnah' | 'Kitab' | 'Tahfidz';
  targetPreview: string;
  selesaiList: SantriRekapEntry[];
  prosesList: SantriRekapEntry[];
}

interface ClassRekapCardData {
  cardKey: string; // e.g. '1_A_ULA_PA'
  cardTitle: string; // e.g. '1 A ULA (PA)'
  shortCode: string; // e.g. '1A'
  tingkat: TingkatTab;
  din_kls: string;
  din_bag: string;
  pa_pi: 'PA' | 'PI';
  mustahiq: string;
  totalSantri: number;
  hafalanRows: HafalanRowInCard[];
}

interface KelompokKelasGroup {
  kelompokKey: string; // e.g. '1_ULA'
  kelompokLabel: string; // e.g. 'Kelompok 1 ULA'
  din_kls: string;
  tingkat: TingkatTab;
  cards: ClassRekapCardData[];
}

function resolveTingkatNormalized(raw: any): TingkatTab {
  const clean = norm(raw);
  if (clean.includes('WUSTHO') || clean.includes('WUSTHA')) return 'WUSTHO';
  if (clean.includes('ULYA')) return 'ULYA';
  return 'ULA';
}

export default function RekapSetorMustahiqModule() {
  const { santriList, fetchSantri, isLoading: isLoadingSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { config, fetchSetoranData, openSettings } = useMuhafadzohStore();
  const {
    logs,
    activeStates,
    isLoading: isLoadingMustahiq,
    fetchMustahiqData,
  } = useSetorMustahiqStore();

  const {
    currentAccount,
    isMasterAdmin,
    canAccessSettings,
    isPersonAllowed,
    isClassAllowed,
  } = usePagePermission('setor-mustahiq');

  const [selectedTingkat, setSelectedTingkat] = useState<TingkatTab>('ULA');
  const [hasAutoSelectedTingkat, setHasAutoSelectedTingkat] = useState(false);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [filterGender, setFilterGender] = useState<'ALL' | 'PA' | 'PI'>('ALL');
  const [search, setSearch] = useState('');

  // Modal detail rincian per baris hafalan dalam kartu kelas
  const [detailModalData, setDetailModalData] = useState<{
    cardTitle: string;
    mustahiq: string;
    hafalanRow: HafalanRowInCard;
  } | null>(null);

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
      const tk = resolveTingkatNormalized(matchedAsatidz.tingkat_asatidz) || 'ULA';
      const kls = norm(matchedAsatidz.din_kls_asatidz);
      const bag = norm(matchedAsatidz.din_bag_asatidz);
      return {
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        label: `${kls} ${tk} ${bag}`,
      };
    }

    const matchedFormasi = formasiList.find((f) => {
      const mName = norm(f.id_mustahiq);
      return accName && mName && (mName === accName || mName.includes(accName));
    });

    if (matchedFormasi) {
      const tk = resolveTingkatNormalized(matchedFormasi.tingkat) || 'ULA';
      const kls = norm(matchedFormasi.din_kls);
      const bag = norm(matchedFormasi.din_bag);
      return {
        tingkat: tk,
        din_kls: kls,
        din_bag: bag,
        label: `${kls} ${tk} ${bag}`,
      };
    }

    return null;
  }, [currentAccount, isMasterAdmin, asatidzList, formasiList]);

  // Filter santri yang diizinkan oleh RBAC
  const allowedSantriList = useMemo(() => {
    return santriList.filter((s) => {
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
        const tk = resolveTingkatNormalized(s.tingkat);
        if (
          tk !== lockedMustahiqClass.tingkat ||
          norm(s.din_kls) !== lockedMustahiqClass.din_kls ||
          norm(s.din_bag) !== lockedMustahiqClass.din_bag
        ) {
          return false;
        }
      }

      return true;
    });
  }, [santriList, asatidzList, isPersonAllowed, isClassAllowed, lockedMustahiqClass]);

  // Hitung jumlah santri per tingkat untuk badge pada Switch Ula / Wustho / Ulya
  const tingkatStats = useMemo(() => {
    const counts: Record<TingkatTab, number> = { ULA: 0, WUSTHO: 0, ULYA: 0 };
    allowedSantriList.forEach((s) => {
      const tk = resolveTingkatNormalized(s.tingkat);
      if (tk) counts[tk]++;
    });
    return counts;
  }, [allowedSantriList]);

  // Auto-select tingkat jika ULA kosong atau jika Mustahiq terkunci di tingkat lain
  useEffect(() => {
    if (lockedMustahiqClass) {
      setSelectedTingkat(lockedMustahiqClass.tingkat);
      setHasAutoSelectedTingkat(true);
      return;
    }
    if (!hasAutoSelectedTingkat && allowedSantriList.length > 0) {
      if (tingkatStats.ULA === 0) {
        if (tingkatStats.WUSTHO > 0) setSelectedTingkat('WUSTHO');
        else if (tingkatStats.ULYA > 0) setSelectedTingkat('ULYA');
      }
      setHasAutoSelectedTingkat(true);
    }
  }, [lockedMustahiqClass, allowedSantriList.length, tingkatStats, hasAutoSelectedTingkat]);

  // Bangun struktur Kelompok Kelas -> Kartu Kelas (PA/PI) -> Baris Hafalan (Hafalan, Selesai, Proses)
  const kelompokGroups: KelompokKelasGroup[] = useMemo(() => {
    // 1. Kelompokkan santri pada tingkat terpilih berdasarkan (din_kls, din_bag, pa_pi)
    const classBuckets = new Map<
      string,
      {
        tingkat: TingkatTab;
        din_kls: string;
        din_bag: string;
        pa_pi: 'PA' | 'PI';
        santriInClass: any[];
      }
    >();

    allowedSantriList.forEach((s) => {
      const tk = resolveTingkatNormalized(s.tingkat);
      if (tk !== selectedTingkat) return;

      const rawKls = norm(s.din_kls);
      const kls = !rawKls || rawKls === '-' ? '1' : rawKls;
      const rawBag = norm(s.din_bag);
      const bag = !rawBag || rawBag === '-' ? 'A' : rawBag;
      const papi: 'PA' | 'PI' = norm(s.pa_pi) === 'PI' ? 'PI' : 'PA';

      if (filterGender !== 'ALL' && papi !== filterGender) return;

      const key = `${kls}_${bag}_${tk}_${papi}`;
      if (!classBuckets.has(key)) {
        classBuckets.set(key, {
          tingkat: tk,
          din_kls: kls,
          din_bag: bag,
          pa_pi: papi,
          santriInClass: [],
        });
      }
      classBuckets.get(key)!.santriInClass.push(s);
    });

    // 2. Untuk setiap kelas, hitung rekap per materi hafalan
    const cardsList: ClassRekapCardData[] = [];
    const q = norm(search);

    classBuckets.forEach((bucket, cardKey) => {
      const { tingkat, din_kls, din_bag, pa_pi, santriInClass } = bucket;
      const configKey = `${tingkat}_${din_kls}`;
      const cardTitle = `${din_kls} ${din_bag} ${tingkat} (${pa_pi})`;
      const shortCode = `${din_kls}${din_bag}`;

      const mustahiq = cariMustahiqSantri(
        tingkat,
        din_bag,
        din_kls,
        pa_pi,
        asatidzList,
        formasiList
      );

      // Map pengumpul per materi_nama di kelas ini
      const materiAccumulator = new Map<
        string,
        {
          item: ItemHafalanDetail;
          kategori: 'Wajib' | 'Sunnah' | 'Kitab' | 'Tahfidz';
          orderIndex: number;
          selesaiList: SantriRekapEntry[];
          prosesList: SantriRekapEntry[];
        }
      >();

      santriInClass.forEach((santri) => {
        const noInduk = String(santri.no_induk || '').trim();
        const namaSantri = String(santri.nama || '').trim();
        const kamarStr =
          [santri.asr_kode, santri.no_kmr].filter((v) => v && v !== '-').join('') ||
          santri.kamar ||
          '-';

        const options = getMateriOptionsWithStatusForSantri(
          noInduk,
          configKey,
          config,
          logs,
          activeStates[noInduk],
          tahun
        );

        options.forEach((opt) => {
          const prog = computeMateriProgressForSantri(
            noInduk,
            opt.item,
            logs,
            tahun
          );

          // Apakah santri ini menghafalkan materi ini?
          // 1) Sudah selesai (isCompleted), ATAU
          // 2) Materi ini sedang aktif dihafal oleh santri (isCurrentActive) atau sudah memiliki progres > 0
          const isFinished = opt.isCompleted;
          const isInProgress =
            !isFinished && (opt.isCurrentActive || prog.progressPct > 0);

          if (!isFinished && !isInProgress) return;

          const mKey = norm(opt.item.nama);
          if (!materiAccumulator.has(mKey)) {
            materiAccumulator.set(mKey, {
              item: opt.item,
              kategori: opt.kategori,
              orderIndex: opt.orderIndex,
              selesaiList: [],
              prosesList: [],
            });
          }

          const entry: SantriRekapEntry = {
            no_induk: noInduk,
            nama: namaSantri,
            kamar: kamarStr,
            status_label: prog.statusBadgeText,
            proses_ratio: prog.prosesRatioText,
            progress_pct: isFinished ? 100 : prog.progressPct,
            is_completed: isFinished,
          };

          const groupEntry = materiAccumulator.get(mKey)!;
          if (isFinished) {
            groupEntry.selesaiList.push(entry);
          } else {
            groupEntry.prosesList.push(entry);
          }
        });
      });

      // Urutkan baris hafalan sesuai urutan kurikulum (Wajib -> Sunnah -> Kitab)
      let hafalanRows: HafalanRowInCard[] = Array.from(materiAccumulator.values())
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((m) => ({
          item: m.item,
          kategori: m.kategori,
          targetPreview: formatTargetPreview(m.item),
          selesaiList: m.selesaiList.sort((a, b) => a.nama.localeCompare(b.nama, 'id')),
          prosesList: m.prosesList.sort(
            (a, b) => b.progress_pct - a.progress_pct || a.nama.localeCompare(b.nama, 'id')
          ),
        }));

      // Filter berdasarkan kata kunci pencarian jika ada
      if (q) {
        const matchCard =
          norm(cardTitle).includes(q) ||
          norm(shortCode).includes(q) ||
          norm(mustahiq).includes(q);

        if (!matchCard) {
          hafalanRows = hafalanRows.filter(
            (hr) =>
              norm(hr.item.nama).includes(q) ||
              hr.selesaiList.some((s) => norm(s.nama).includes(q)) ||
              hr.prosesList.some((s) => norm(s.nama).includes(q))
          );
        }
      }

      if (hafalanRows.length > 0) {
        cardsList.push({
          cardKey,
          cardTitle,
          shortCode,
          tingkat,
          din_kls,
          din_bag,
          pa_pi,
          mustahiq,
          totalSantri: santriInClass.length,
          hafalanRows,
        });
      }
    });

    // 3. Kelompokkan Kartu Kelas berdasarkan Nomor Kelas (Kelompok 1 ULA, Kelompok 2 ULA, dst.)
    const kelompokMap = new Map<string, KelompokKelasGroup>();

    cardsList.forEach((card) => {
      const kKey = `${card.din_kls}_${card.tingkat}`;
      if (!kelompokMap.has(kKey)) {
        kelompokMap.set(kKey, {
          kelompokKey: kKey,
          kelompokLabel: `Kelompok ${card.din_kls} ${card.tingkat}`,
          din_kls: card.din_kls,
          tingkat: card.tingkat,
          cards: [],
        });
      }
      kelompokMap.get(kKey)!.cards.push(card);
    });

    // Urutkan Kelompok (1 ULA, 2 ULA, 3 ULA, 4 ULA) dan Kartu di dalamnya (1 A ULA (PA), 1 A ULA (PI), 1 B ULA (PA)...)
    return Array.from(kelompokMap.values())
      .sort((a, b) =>
        a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true })
      )
      .map((kel) => ({
        ...kel,
        cards: kel.cards.sort((a, b) => {
          const bagCmp = a.din_bag.localeCompare(b.din_bag, 'id');
          if (bagCmp !== 0) return bagCmp;
          return a.pa_pi.localeCompare(b.pa_pi, 'id');
        }),
      }));
  }, [
    allowedSantriList,
    selectedTingkat,
    filterGender,
    search,
    asatidzList,
    formasiList,
    config,
    logs,
    activeStates,
    tahun,
  ]);

  // Ekspor Rekap ke Excel (.xlsx)
  const handleExportExcel = () => {
    if (kelompokGroups.length === 0) {
      alert('Belum ada data rekap setor untuk diekspor pada tingkatan ini.');
      return;
    }

    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [
      [`REKAPITULASI SETORAN MUSTAHIQ - TINGKAT ${selectedTingkat} (${tahun})`],
      ['Madrasah Diniyyah Al Amiriyyah Blokagung'],
      [],
      [
        'Kelompok Tingkat',
        'Kartu Kelas',
        'Mustahiq',
        'Hafalan',
        'Kategori',
        'Jumlah Selesai',
        'Daftar Santri Selesai',
        'Jumlah Proses',
        'Daftar Santri Proses (Capaian)',
      ],
    ];

    kelompokGroups.forEach((kel) => {
      kel.cards.forEach((card) => {
        card.hafalanRows.forEach((hr) => {
          aoa.push([
            kel.kelompokLabel,
            card.cardTitle,
            card.mustahiq,
            hr.item.nama,
            hr.kategori,
            hr.selesaiList.length,
            hr.selesaiList
              .map((s) => `${s.nama} (${s.status_label})`)
              .join('; ') || '-',
            hr.prosesList.length,
            hr.prosesList
              .map((s) => `${s.nama} (${s.status_label} - ${s.progress_pct}%)`)
              .join('; ') || '-',
          ]);
        });
      });
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, `Rekap_${selectedTingkat}`);
    XLSX.writeFile(wb, `Rekap_Setor_Mustahiq_${selectedTingkat}_${tahun}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header & Sub-Menu Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Rekap Setor Mustahiq
            </h1>
            {lockedMustahiqClass && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Kelas Binaan: {lockedMustahiqClass.label}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Rekapitulasi hasil setoran mingguan santri yang terkumpul dari Setor Kelas per tingkatan dan rombel kelas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sub-menu Navigation Pill */}
          <div className="inline-flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <Link
              href="/setor-mustahiq"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5" />
              Setor Kelas
            </Link>
            <Link
              href="/setor-mustahiq/rekap"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs transition-all"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Rekap Setor
            </Link>
          </div>

          {canAccessSettings && (
            <button
              type="button"
              onClick={openSettings}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-700" />
              <span className="hidden md:inline">Opsi Target Hafalan</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar: Switch 'Ula, Wustho, Ulya' + Filter & Aksi */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-3.5 shadow-xs">
        {/* Switch Tingkatan: Ula | Wustho | Ulya */}
        <div
          role="tablist"
          aria-label="Switch Tingkatan"
          className="inline-flex items-center bg-slate-100 border border-slate-200/80 rounded-xl p-1 gap-1"
        >
          {(
            [
              { key: 'ULA', label: 'Ula' },
              { key: 'WUSTHO', label: 'Wustho' },
              { key: 'ULYA', label: 'Ulya' },
            ] as const
          ).map((tab) => {
            const isActive = selectedTingkat === tab.key;
            const isDisabled =
              Boolean(lockedMustahiqClass) &&
              lockedMustahiqClass!.tingkat !== tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={isDisabled}
                data-testid={`switch-tingkat-${tab.key.toLowerCase()}`}
                onClick={() => setSelectedTingkat(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 ${
                  isActive
                    ? 'bg-[#134e3a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {tingkatStats[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Kanan: Tahun, Gender, Search, Export, Print */}
        <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
          {/* Tahun */}
          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            aria-label="Pilih Tahun Rekap"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                Tahun {y}
              </option>
            ))}
          </select>

          {/* Gender Filter (PA / PI) */}
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value as 'ALL' | 'PA' | 'PI')}
            aria-label="Filter Putra Putri"
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            <option value="ALL">Semua (PA &amp; PI)</option>
            <option value="PA">Putra (PA)</option>
            <option value="PI">Putri (PI)</option>
          </select>

          {/* Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kelas, hafalan, atau santri..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            title="Unduh Excel Rekap Setor"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Excel</span>
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={() => window.print()}
            title="Cetak Rekap Setor"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Konten Pengelompokan Kelas Sesuai Tingkatan */}
      {(isLoadingSantri || isLoadingMustahiq) && allowedSantriList.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 text-sm">
          Memuat data rekap setoran kelas...
        </div>
      ) : kelompokGroups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-700">
            Belum ada data kartu kelas pada Tingkat {selectedTingkat}
          </p>
          <p className="text-xs text-slate-500">
            Pastikan terdapat data santri pada tingkat ini atau pilih tab tingkatan lainnya.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            {(['ULA', 'WUSTHO', 'ULYA'] as TingkatTab[])
              .filter((t) => t !== selectedTingkat && tingkatStats[t] > 0)
              .map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTingkat(t)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer"
                >
                  Lihat Tingkat {t} ({tingkatStats[t]} Santri)
                </button>
              ))}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {kelompokGroups.map((kelompok) => (
            <section
              key={kelompok.kelompokKey}
              data-testid={`kelompok-${kelompok.kelompokKey.toLowerCase()}`}
              className="space-y-4"
            >
              {/* Header Kelompok (contoh: Kelompok 1 ULA) */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#134e3a] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {kelompok.din_kls}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">
                      {kelompok.kelompokLabel}
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Menampilkan {kelompok.cards.length} kartu kelas ({kelompok.din_kls}{' '}
                      {kelompok.tingkat})
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                  {kelompok.cards.length} Kelas
                </span>
              </div>

              {/* Grid Kartu Kelas (contoh: 1 A ULA (PA), 1 A ULA (PI), dst.) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {kelompok.cards.map((card) => (
                  <div
                    key={card.cardKey}
                    data-testid={`rekap-card-${card.cardKey.toLowerCase()}`}
                    className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col"
                  >
                    {/* Header Kartu Kelas */}
                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${
                            card.pa_pi === 'PA'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-teal-50 text-teal-800 border-teal-200'
                          }`}
                        >
                          {card.cardTitle}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[220px]">
                          Mustahiq:{' '}
                          <strong className="text-slate-700">{card.mustahiq}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shrink-0">
                        {card.totalSantri} Santri
                      </span>
                    </div>

                    {/* Tabel 3 Kolom: Hafalan | Selesai | Proses */}
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/30">
                            <th className="py-2.5 pl-4 pr-2 w-[38%]">Hafalan</th>
                            <th className="py-2.5 px-2 w-[31%]">Selesai</th>
                            <th className="py-2.5 pl-2 pr-4 w-[31%]">Proses</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {card.hafalanRows.map((hr, idx) => (
                            <tr
                              key={`${hr.item.nama}_${idx}`}
                              className="hover:bg-slate-50/70 transition-colors align-top"
                            >
                              {/* Kolom 1: Hafalan */}
                              <td className="py-3 pl-4 pr-2">
                                <div className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDetailModalData({
                                        cardTitle: card.cardTitle,
                                        mustahiq: card.mustahiq,
                                        hafalanRow: hr,
                                      })
                                    }
                                    className="text-left font-bold text-slate-800 hover:text-emerald-700 transition-colors cursor-pointer block leading-snug"
                                  >
                                    {hr.item.nama}
                                  </button>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        hr.kategori === 'Wajib'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : hr.kategori === 'Sunnah'
                                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                                      }`}
                                    >
                                      {hr.kategori}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {hr.targetPreview}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Kolom 2: Selesai (Hasil Rekap Proses per santri yang selesai) */}
                              <td className="py-3 px-2">
                                {hr.selesaiList.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    0 Santri
                                  </span>
                                ) : (
                                  <div className="space-y-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDetailModalData({
                                          cardTitle: card.cardTitle,
                                          mustahiq: card.mustahiq,
                                          hafalanRow: hr,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold cursor-pointer hover:bg-emerald-100"
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      {hr.selesaiList.length} Selesai
                                    </button>
                                    <div className="space-y-1">
                                      {hr.selesaiList.slice(0, 3).map((s) => (
                                        <div
                                          key={s.no_induk}
                                          className="text-[11px] leading-tight bg-emerald-50/50 border border-emerald-100 rounded-md px-2 py-1"
                                        >
                                          <p className="font-semibold text-slate-800 truncate">
                                            {s.nama}
                                          </p>
                                          <p className="text-[10px] font-mono text-emerald-700">
                                            {s.status_label} (100%)
                                          </p>
                                        </div>
                                      ))}
                                      {hr.selesaiList.length > 3 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDetailModalData({
                                              cardTitle: card.cardTitle,
                                              mustahiq: card.mustahiq,
                                              hafalanRow: hr,
                                            })
                                          }
                                          className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                        >
                                          +{hr.selesaiList.length - 3} santri lainnya...
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Kolom 3: Proses (Hasil Rekap Proses per santri yang sedang proses) */}
                              <td className="py-3 pl-2 pr-4">
                                {hr.prosesList.length === 0 ? (
                                  <span className="text-[11px] text-slate-400 font-mono">
                                    0 Santri
                                  </span>
                                ) : (
                                  <div className="space-y-1.5">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDetailModalData({
                                          cardTitle: card.cardTitle,
                                          mustahiq: card.mustahiq,
                                          hafalanRow: hr,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold cursor-pointer hover:bg-amber-100"
                                    >
                                      <Clock className="w-3 h-3 text-amber-600" />
                                      {hr.prosesList.length} Proses
                                    </button>
                                    <div className="space-y-1">
                                      {hr.prosesList.slice(0, 3).map((s) => (
                                        <div
                                          key={s.no_induk}
                                          className="text-[11px] leading-tight bg-slate-50 border border-slate-200/80 rounded-md px-2 py-1"
                                        >
                                          <p className="font-semibold text-slate-800 truncate">
                                            {s.nama}
                                          </p>
                                          <div className="flex items-center justify-between gap-1 mt-0.5">
                                            <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                                              {s.status_label}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                              {s.progress_pct}%
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                      {hr.prosesList.length > 3 && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDetailModalData({
                                              cardTitle: card.cardTitle,
                                              mustahiq: card.mustahiq,
                                              hafalanRow: hr,
                                            })
                                          }
                                          className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                                        >
                                          +{hr.prosesList.length - 3} santri lainnya...
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modal Detail Santri Selesai & Proses per Materi dalam Kartu Kelas */}
      {detailModalData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Rincian Rekap Hafalan Kelas {detailModalData.cardTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Materi: <strong>{detailModalData.hafalanRow.item.nama}</strong> (
                    {detailModalData.hafalanRow.targetPreview}) • Mustahiq:{' '}
                    {detailModalData.mustahiq}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalData(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {/* Daftar Santri Selesai */}
              <div className="border border-emerald-200 rounded-xl overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Santri Selesai
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-emerald-800 text-[11px] font-bold">
                    {detailModalData.hafalanRow.selesaiList.length} Santri
                  </span>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-80 p-2">
                  {detailModalData.hafalanRow.selesaiList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Belum ada santri yang menuntaskan materi ini.
                    </p>
                  ) : (
                    detailModalData.hafalanRow.selesaiList.map((s, idx) => (
                      <div
                        key={s.no_induk}
                        className="p-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            {idx + 1}. {s.nama}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Kamar: {s.kamar}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-bold">
                          {s.status_label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Daftar Santri Sedang Proses */}
              <div className="border border-amber-200 rounded-xl overflow-hidden flex flex-col">
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    Santri Sedang Proses
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-amber-800 text-[11px] font-bold">
                    {detailModalData.hafalanRow.prosesList.length} Santri
                  </span>
                </div>
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-80 p-2">
                  {detailModalData.hafalanRow.prosesList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">
                      Tidak ada santri yang sedang dalam proses pada materi ini.
                    </p>
                  ) : (
                    detailModalData.hafalanRow.prosesList.map((s, idx) => (
                      <div
                        key={s.no_induk}
                        className="p-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            {idx + 1}. {s.nama}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            Kamar: {s.kamar}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-emerald-800 font-mono text-[11px] font-bold">
                            {s.status_label}
                          </span>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Progres: {s.progress_pct}%
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pengaturan Target Muhafadzoh */}
      <ModalSettingsHafalan />
    </div>
  );
}
