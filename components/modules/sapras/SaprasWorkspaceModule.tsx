'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Wrench,
  Grid,
  BarChart2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Printer,
  FileSpreadsheet,
  Building2,
  LayoutGrid,
  Table as TableIcon,
  SlidersHorizontal,
  Edit3,
  Trash2,
  ArrowRight,
  Sparkles,
  Scan,
} from 'lucide-react';
import { InventarisMadinModule } from './InventarisMadinModule';
import { ModalBarcodeScanner } from './ModalBarcodeScanner';
import { ModalCetakLabelSapras } from './ModalCetakLabelSapras';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  useSaprasStore,
  buildKelasSaprasRows,
} from '@/stores/useSaprasStore';
import {
  ItemSaprasTambahan,
  KelasSaprasRow,
  KONDISI_SAPRAS_META,
  KondisiSapras,
  SaprasSectionId,
  StatusTiketPerbaikan,
  UrgensiPerbaikan,
} from '@/types/sapras';

interface SaprasWorkspaceModuleProps {
  initialSection?: SaprasSectionId;
}

export function SaprasWorkspaceModule({
  initialSection = 'inventaris-kelas',
}: SaprasWorkspaceModuleProps) {
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { santriList, fetchSantri } = useSantriStore();
  const {
    overrides,
    tiketPerbaikan,
    logistikStok,
    distribusiLogs,
    fetchSaprasData,
    updateKondisiCepatKelas,
    saveDetailSaprasKelas,
    addTiketPerbaikan,
    updateStatusTiket,
    deleteTiketPerbaikan,
    adjustStokLogistik,
    addDistribusiLogistik,
  } = useSaprasStore();

  const {
    currentAccount,
    canCreate,
    canEdit,
    canDelete,
    isClassAllowed,
  } = usePagePermission('sapras-inventaris');

  const [activeSection, setActiveSection] =
    useState<SaprasSectionId>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    void fetchFormasi();
    void fetchSantri();
    void fetchSaprasData();
  }, [fetchFormasi, fetchSantri, fetchSaprasData]);

  // Filter states (Inventaris Kelas)
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [filterTingkat, setFilterTingkat] = useState<
    'ALL' | 'ULA' | 'WUSTHO' | 'ULYA'
  >('ALL');
  const [filterGender, setFilterGender] = useState<'ALL' | 'PA' | 'PI'>('ALL');
  const [filterKelayakan, setFilterKelayakan] = useState<
    'ALL' | 'LAYAK' | 'PERLU_PERBAIKAN'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states (Perbaikan)
  const [filterStatusTiket, setFilterStatusTiket] = useState<
    'ALL' | StatusTiketPerbaikan
  >('ALL');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Detail & Edit Sapras Kelas
  const [editingRow, setEditingRow] = useState<KelasSaprasRow | null>(null);
  const [editPapanKondisi, setEditPapanKondisi] =
    useState<KondisiSapras>('BAIK');
  const [editPapanJumlah, setEditPapanJumlah] = useState(1);
  const [editPapanSpec, setEditPapanSpec] = useState('');
  const [editMejaKondisi, setEditMejaKondisi] =
    useState<KondisiSapras>('BAIK');
  const [editMejaJumlah, setEditMejaJumlah] = useState(1);
  const [editMejaSpec, setEditMejaSpec] = useState('');
  const [editPenghapusKondisi, setEditPenghapusKondisi] =
    useState<KondisiSapras>('BAIK');
  const [editSpidolKondisi, setEditSpidolKondisi] =
    useState<KondisiSapras>('BAIK');
  const [editItemTambahan, setEditItemTambahan] = useState<
    ItemSaprasTambahan[]
  >([]);
  const [editCatatanKelas, setEditCatatanKelas] = useState('');
  const [draftExtraNama, setDraftExtraNama] = useState('');
  const [draftExtraJumlah, setDraftExtraJumlah] = useState(1);

  // Modal Tambah Laporan Kerusakan Manual
  const [isAddTiketOpen, setIsAddTiketOpen] = useState(false);
  const [tiketKelasKey, setTiketKelasKey] = useState('');
  const [tiketItemType, setTiketItemType] = useState<
    'PAPAN_TULIS' | 'MEJA_GURU' | 'LAINNYA'
  >('PAPAN_TULIS');
  const [tiketItemCustomNama, setTiketItemCustomNama] = useState('');
  const [tiketKondisi, setTiketKondisi] =
    useState<KondisiSapras>('RUSAK_RINGAN');
  const [tiketUrgensi, setTiketUrgensi] =
    useState<UrgensiPerbaikan>('SEDANG');
  const [tiketDeskripsi, setTiketDeskripsi] = useState('');

  // Modal Catat Distribusi Logistik KBM
  const [isDistribusiModalOpen, setIsDistribusiModalOpen] = useState(false);
  const [distLogistikId, setDistLogistikId] = useState('log-spidol-hitam');
  const [distKelasKey, setDistKelasKey] = useState('');
  const [distJumlah, setDistJumlah] = useState(2);
  const [distPenerima, setDistPenerima] = useState('');
  const [distCatatan, setDistCatatan] = useState('');
  const [isGlobalScannerOpen, setIsGlobalScannerOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Bangun baris seluruh kelas dengan default Papan Tulis (Baik) & Meja Guru (Baik)
  const allKelasRows = useMemo(() => {
    const rawRows = buildKelasSaprasRows(formasiList, santriList, overrides);
    return rawRows.filter((r) =>
      isClassAllowed({
        pa_pi: r.pa_pi,
        blok_diniyyah: r.blokDiniyyah,
        blok_takror: r.blokTakror,
      })
    );
  }, [formasiList, santriList, overrides, isClassAllowed]);

  // Statistik KPI Keseluruhan Sapras
  const kpiStats = useMemo(() => {
    const totalKelas = allKelasRows.length;
    let papanBaik = 0;
    let papanRusak = 0;
    let mejaBaik = 0;
    let mejaRusak = 0;
    let kelasSiap100 = 0;

    allKelasRows.forEach((r) => {
      if (r.papanTulisKondisi === 'BAIK') papanBaik++;
      else papanRusak++;

      if (r.mejaGuruKondisi === 'BAIK') mejaBaik++;
      else mejaRusak++;

      if (r.isFullyHealthy) kelasSiap100++;
    });

    const tiketAktif = tiketPerbaikan.filter(
      (t) => t.status !== 'SELESAI'
    ).length;
    const tiketSelesai = tiketPerbaikan.filter(
      (t) => t.status === 'SELESAI'
    ).length;

    const pctSiap =
      totalKelas > 0 ? Math.round((kelasSiap100 / totalKelas) * 100) : 100;

    return {
      totalKelas,
      papanBaik,
      papanRusak,
      mejaBaik,
      mejaRusak,
      kelasSiap100,
      pctSiap,
      tiketAktif,
      tiketSelesai,
    };
  }, [allKelasRows, tiketPerbaikan]);

  // Filter baris kelas untuk menu Inventaris Kelas
  const filteredKelasRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allKelasRows.filter((r) => {
      if (filterTingkat !== 'ALL' && r.tingkat !== filterTingkat) return false;
      if (filterGender !== 'ALL' && r.pa_pi !== filterGender) return false;
      if (filterKelayakan === 'LAYAK' && !r.isFullyHealthy) return false;
      if (filterKelayakan === 'PERLU_PERBAIKAN' && r.isFullyHealthy) {
        return false;
      }

      if (q) {
        const matchKelas =
          r.kelasLabel.toLowerCase().includes(q) ||
          r.shortBadge.toLowerCase().includes(q);
        const matchMustahiq = r.mustahiq.toLowerCase().includes(q);
        const matchBlok =
          r.blokDiniyyah.toLowerCase().includes(q) ||
          r.lokasiDiniyyah.toLowerCase().includes(q);
        if (!matchKelas && !matchMustahiq && !matchBlok) return false;
      }

      return true;
    });
  }, [
    allKelasRows,
    filterTingkat,
    filterGender,
    filterKelayakan,
    searchQuery,
  ]);

  // Rekap per Tingkatan untuk menu Rekap & Audit Sapras
  const rekapPerTingkat = useMemo(() => {
    const groups: Array<{
      tingkat: string;
      totalKelas: number;
      papanBaik: number;
      papanRusak: number;
      mejaBaik: number;
      mejaRusak: number;
      layakPenuh: number;
    }> = [
      {
        tingkat: 'ULA',
        totalKelas: 0,
        papanBaik: 0,
        papanRusak: 0,
        mejaBaik: 0,
        mejaRusak: 0,
        layakPenuh: 0,
      },
      {
        tingkat: 'WUSTHO',
        totalKelas: 0,
        papanBaik: 0,
        papanRusak: 0,
        mejaBaik: 0,
        mejaRusak: 0,
        layakPenuh: 0,
      },
      {
        tingkat: 'ULYA',
        totalKelas: 0,
        papanBaik: 0,
        papanRusak: 0,
        mejaBaik: 0,
        mejaRusak: 0,
        layakPenuh: 0,
      },
    ];

    allKelasRows.forEach((r) => {
      const grp = groups.find((g) => g.tingkat === r.tingkat);
      if (!grp) return;
      grp.totalKelas++;
      if (r.papanTulisKondisi === 'BAIK') grp.papanBaik++;
      else grp.papanRusak++;
      if (r.mejaGuruKondisi === 'BAIK') grp.mejaBaik++;
      else grp.mejaRusak++;
      if (r.isFullyHealthy) grp.layakPenuh++;
    });

    return groups;
  }, [allKelasRows]);

  const handleOpenDetailModal = (row: KelasSaprasRow) => {
    setEditingRow(row);
    setEditPapanKondisi(row.papanTulisKondisi);
    setEditPapanJumlah(row.papanTulisJumlah);
    setEditPapanSpec(row.papanTulisSpesifikasi);
    setEditMejaKondisi(row.mejaGuruKondisi);
    setEditMejaJumlah(row.mejaGuruJumlah);
    setEditMejaSpec(row.mejaGuruSpesifikasi);
    setEditPenghapusKondisi(row.penghapusKondisi);
    setEditSpidolKondisi(row.spidolKondisi);
    setEditItemTambahan([...row.itemTambahan]);
    setEditCatatanKelas(row.catatanKelas || '');
    setDraftExtraNama('');
    setDraftExtraJumlah(1);
  };

  const handleSaveDetailModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    await saveDetailSaprasKelas(
      editingRow,
      {
        papanTulisKondisi: editPapanKondisi,
        papanTulisJumlah: Math.max(0, editPapanJumlah),
        papanTulisSpesifikasi: editPapanSpec.trim() || 'Whiteboard Standar',
        mejaGuruKondisi: editMejaKondisi,
        mejaGuruJumlah: Math.max(0, editMejaJumlah),
        mejaGuruSpesifikasi: editMejaSpec.trim() || 'Meja Guru / Dampar',
        penghapusKondisi: editPenghapusKondisi,
        spidolKondisi: editSpidolKondisi,
        itemTambahan: editItemTambahan,
        catatanKelas: editCatatanKelas.trim() || undefined,
      },
      currentAccount?.full_name || 'PKM. Sapras'
    );
    setEditingRow(null);
    showToast(`Data sapras kelas ${editingRow.kelasLabel} berhasil disimpan.`);
  };

  const handleSubmitTiketBaru = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRow =
      allKelasRows.find((r) => r.kelasKey === tiketKelasKey) || allKelasRows[0];
    if (!targetRow) return;

    const itemNama =
      tiketItemType === 'PAPAN_TULIS'
        ? 'Papan Tulis Kelas'
        : tiketItemType === 'MEJA_GURU'
        ? 'Meja Guru / Dampar'
        : tiketItemCustomNama.trim() || 'Fasilitas Kelas';

    await addTiketPerbaikan({
      row: targetRow,
      itemType: tiketItemType,
      itemNama,
      kondisiAwal: tiketKondisi,
      deskripsiKerusakan:
        tiketDeskripsi.trim() ||
        `${itemNama} di kelas ${targetRow.kelasLabel} memerlukan perbaikan.`,
      urgensi: tiketUrgensi,
      pelapor: currentAccount?.full_name || 'PKM. Sapras',
    });

    setIsAddTiketOpen(false);
    setTiketDeskripsi('');
    showToast(
      `Laporan kerusakan untuk kelas ${targetRow.kelasLabel} berhasil ditambahkan.`
    );
  };

  const handleSubmitDistribusi = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRow =
      allKelasRows.find((r) => r.kelasKey === distKelasKey) || allKelasRows[0];
    if (!targetRow) return;

    await addDistribusiLogistik({
      logistikId: distLogistikId,
      jumlah: Math.max(1, distJumlah),
      kelasKey: targetRow.kelasKey,
      kelasLabel: targetRow.kelasLabel,
      penerima: distPenerima.trim() || targetRow.mustahiq || 'Pengurus Kelas',
      tanggal: new Date().toISOString().split('T')[0],
      catatan: distCatatan.trim() || undefined,
    });

    setIsDistribusiModalOpen(false);
    setDistCatatan('');
    showToast(
      `Distribusi logistik ke kelas ${targetRow.kelasLabel} berhasil dicatat.`
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'No',
      'Kelas',
      'Tingkat',
      'PA/PI',
      'Blok KBM',
      'Mustahiq',
      'Papan Tulis (Jumlah)',
      'Kondisi Papan Tulis',
      'Meja Guru (Jumlah)',
      'Kondisi Meja Guru',
      'Kondisi Penghapus',
      'Kondisi Spidol',
    ];
    const rows = allKelasRows.map((r, idx) => [
      idx + 1,
      r.kelasLabel,
      r.tingkat,
      r.pa_pi,
      r.blokDiniyyah,
      r.mustahiq,
      r.papanTulisJumlah,
      KONDISI_SAPRAS_META[r.papanTulisKondisi].shortLabel,
      r.mejaGuruJumlah,
      KONDISI_SAPRAS_META[r.mejaGuruKondisi].shortLabel,
      KONDISI_SAPRAS_META[r.penghapusKondisi].shortLabel,
      KONDISI_SAPRAS_META[r.spidolKondisi].shortLabel,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((line) =>
        line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap-Inventaris-Sapras-Madin-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const navSections: Array<{
    id: SaprasSectionId;
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      id: 'inventaris-madin',
      label: 'Inventaris Madin',
      href: '/sapras/inventaris-madin',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'inventaris-kelas',
      label: 'Inventaris Kelas',
      href: '/sapras/inventaris-kelas',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'perbaikan',
      label: 'Kerusakan & Perbaikan',
      href: '/sapras/perbaikan',
      icon: <Wrench className="w-4 h-4" />,
      badge: kpiStats.tiketAktif,
    },
    {
      id: 'logistik',
      label: 'Logistik & ATK KBM',
      href: '/sapras/logistik',
      icon: <Grid className="w-4 h-4" />,
    },
    {
      id: 'rekap',
      label: 'Rekap & Audit Sapras',
      href: '/sapras/rekap',
      icon: <BarChart2 className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-6 pb-14">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30"
        >
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Utama PKM. Sapras (Tiered Navigation: Full-width Identity + Segmented Tab Subnav) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        {/* Tier 1: Identitas Halaman & Judul Lebar Penuh */}
        <div className="flex items-start gap-3.5 min-w-0 w-full">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Package className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
                PKM. Sapras
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Madrasah Diniyyah Al Amiriyyah Blokagung
              </span>
            </div>
            <h1
              data-testid="heading-pkm-sapras"
              className="mt-1 text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight"
            >
              {activeSection === 'inventaris-madin' &&
                'Inventaris Madin (Universal Asset & Lokasi Kantor)'}
              {activeSection === 'inventaris-kelas' &&
                'Inventaris Sarana Kelas (Papan Tulis & Meja Guru)'}
              {activeSection === 'perbaikan' &&
                'Laporan Kerusakan & Pemeliharaan Sapras'}
              {activeSection === 'logistik' &&
                'Logistik & Distribusi ATK KBM Kelas'}
              {activeSection === 'rekap' &&
                'Rekapitulasi & Audit Kesiapan Sapras'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
              {activeSection === 'inventaris-madin'
                ? 'Pendataan seluruh aset & inventaris madin universal, pemantauan lokasi tempat (Kantor Pusat, GP, Putri, Blok 4, Blok 11, dst.), dan mutasi aset berbasis barcode.'
                : 'Pemantauan terpadu kelengkapan Papan Tulis, Meja Guru, perlengkapan ruang KBM, serta tindak lanjut perbaikan di seluruh kelas Ula, Wustho, dan Ulya.'}
            </p>
          </div>
        </div>

        {/* Tier 2: Bilah Sub-Navigasi Menu PKM. Sapras + Quick Scanner Button */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 max-w-full">
            <button
              type="button"
              onClick={() => setIsGlobalScannerOpen(true)}
              data-testid="btn-global-sapras-scan"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-all cursor-pointer shrink-0"
              title="Pindai QR Pintu Kelas atau Barcode Aset"
            >
              <Scan className="w-4 h-4 text-emerald-400" />
              <span>Scan Barcode</span>
            </button>
            {navSections.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <Link
                  key={sec.id}
                  href={sec.href}
                  data-testid={`nav-sapras-${sec.id}`}
                  onClick={() => setActiveSection(sec.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isActive
                      ? 'bg-[#134e3a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  {sec.icon}
                  <span>{sec.label}</span>
                  {sec.badge !== undefined && sec.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-rose-500 text-white'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sec.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Ringkasan KPI Kesiapan Papan Tulis & Meja Guru (Hanya tampil di tab kelas/perbaikan/logistik/rekap) */}
      {activeSection !== 'inventaris-madin' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Kelas Terdata
            </span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                data-testid="kpi-total-kelas-sapras"
                className="text-2xl font-extrabold font-mono text-slate-900"
              >
                {kpiStats.totalKelas}
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {kpiStats.pctSiap}% Siap KBM
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Otomatis sinkron dari Formasi Kelas
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Papan Tulis Kelas
            </span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                data-testid="kpi-papan-tulis-baik"
                className="text-2xl font-extrabold font-mono text-emerald-800"
              >
                {kpiStats.papanBaik}/{kpiStats.totalKelas}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Kondisi Baik
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {kpiStats.papanRusak > 0
                ? `${kpiStats.papanRusak} kelas perlu perbaikan papan tulis`
                : 'Seluruh papan tulis kelas dalam kondisi baik'}
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Meja Guru / Dampar
            </span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                data-testid="kpi-meja-guru-baik"
                className="text-2xl font-extrabold font-mono text-emerald-800"
              >
                {kpiStats.mejaBaik}/{kpiStats.totalKelas}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                Kondisi Baik
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {kpiStats.mejaRusak > 0
                ? `${kpiStats.mejaRusak} kelas perlu perbaikan meja guru`
                : 'Seluruh meja guru kelas dalam kondisi baik'}
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Antrean Perbaikan
            </span>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span
                data-testid="kpi-antrean-perbaikan"
                className={`text-2xl font-extrabold font-mono ${
                  kpiStats.tiketAktif > 0 ? 'text-amber-700' : 'text-slate-900'
                }`}
              >
                {kpiStats.tiketAktif}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {kpiStats.tiketSelesai} Selesai
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Tiket pemeliharaan sarana kelas
            </p>
          </div>
        </div>
      )}

      {/* ==================== SECTION 0: INVENTARIS MADIN UNIVERSAL ==================== */}
      {activeSection === 'inventaris-madin' && (
        <InventarisMadinModule />
      )}

      {/* ==================== SECTION 1: INVENTARIS KELAS ==================== */}
      {activeSection === 'inventaris-kelas' && (
        <div className="space-y-4">
          {/* Bilah Filter & Pencarian Inventaris Kelas */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Switch Tingkatan: Semua | ULA | WUSTHO | ULYA */}
              <div className="inline-flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                {(['ALL', 'ULA', 'WUSTHO', 'ULYA'] as const).map((tk) => {
                  const active = filterTingkat === tk;
                  return (
                    <button
                      key={tk}
                      type="button"
                      data-testid={`filter-sapras-tingkat-${tk}`}
                      onClick={() => setFilterTingkat(tk)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        active
                          ? 'bg-[#134e3a] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tk === 'ALL' ? 'Semua Tingkat' : tk}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Putra / Putri */}
                <select
                  value={filterGender}
                  onChange={(e) =>
                    setFilterGender(e.target.value as 'ALL' | 'PA' | 'PI')
                  }
                  aria-label="Filter Putra atau Putri"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Semua (PA & PI)</option>
                  <option value="PA">Putra (PA)</option>
                  <option value="PI">Putri (PI)</option>
                </select>

                {/* Filter Kelayakan */}
                <select
                  value={filterKelayakan}
                  onChange={(e) =>
                    setFilterKelayakan(
                      e.target.value as 'ALL' | 'LAYAK' | 'PERLU_PERBAIKAN'
                    )
                  }
                  aria-label="Filter Status Kelayakan"
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">Semua Kondisi Kelas</option>
                  <option value="LAYAK">100% Baik & Lengkap</option>
                  <option value="PERLU_PERBAIKAN">Perlu Perbaikan / Kurang</option>
                </select>

                {/* Mode Tampilan: Kartu | Tabel */}
                <div className="inline-flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('card')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      viewMode === 'card'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Kartu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-emerald-800 shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tabel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Kolom Pencarian */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="input-search-sapras-kelas"
                placeholder="Cari nama kelas (mis. 1 ULA A), nama Mustahiq, atau gedung/blok KBM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Daftar Kelas: Tampilan Kartu atau Tabel */}
          {viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredKelasRows.map((row) => {
                const papanMeta = KONDISI_SAPRAS_META[row.papanTulisKondisi];
                const mejaMeta = KONDISI_SAPRAS_META[row.mejaGuruKondisi];

                return (
                  <div
                    key={row.kelasKey}
                    data-testid={`sapras-card-${row.kelasKey}`}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header Kartu Kelas */}
                    <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold shrink-0">
                          {row.shortBadge}
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            Kelas {row.kelasLabel}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate">
                            {row.blokDiniyyah} • Mustahiq: {row.mustahiq}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          row.isFullyHealthy
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {row.isFullyHealthy ? 'Lengkap & Baik' : 'Perlu Cek'}
                      </span>
                    </div>

                    {/* Isi Kartu: Status Wajib Papan Tulis & Meja Guru */}
                    <div className="p-4 space-y-3">
                      {/* Baris 1: Papan Tulis */}
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900">
                            1. Papan Tulis ({row.papanTulisJumlah} Unit)
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {row.papanTulisSpesifikasi}
                          </div>
                        </div>

                        <select
                          data-testid={`select-papan-${row.kelasKey}`}
                          value={row.papanTulisKondisi}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const next = e.target.value as KondisiSapras;
                            void updateKondisiCepatKelas(
                              row,
                              'papanTulisKondisi',
                              next,
                              currentAccount?.full_name || 'PKM. Sapras'
                            );
                            showToast(
                              `Kondisi Papan Tulis kelas ${row.kelasLabel} diubah ke ${KONDISI_SAPRAS_META[next].shortLabel}.`
                            );
                          }}
                          aria-label={`Kondisi Papan Tulis ${row.kelasLabel}`}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${papanMeta.badgeClass}`}
                        >
                          <option value="BAIK">Baik</option>
                          <option value="RUSAK_RINGAN">Rusak Ringan</option>
                          <option value="RUSAK_BERAT">Rusak Berat</option>
                          <option value="BELUM_ADA">Belum Ada</option>
                        </select>
                      </div>

                      {/* Baris 2: Meja Guru */}
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900">
                            2. Meja Guru ({row.mejaGuruJumlah} Unit)
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {row.mejaGuruSpesifikasi}
                          </div>
                        </div>

                        <select
                          data-testid={`select-meja-${row.kelasKey}`}
                          value={row.mejaGuruKondisi}
                          disabled={!canEdit}
                          onChange={(e) => {
                            const next = e.target.value as KondisiSapras;
                            void updateKondisiCepatKelas(
                              row,
                              'mejaGuruKondisi',
                              next,
                              currentAccount?.full_name || 'PKM. Sapras'
                            );
                            showToast(
                              `Kondisi Meja Guru kelas ${row.kelasLabel} diubah ke ${KONDISI_SAPRAS_META[next].shortLabel}.`
                            );
                          }}
                          aria-label={`Kondisi Meja Guru ${row.kelasLabel}`}
                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${mejaMeta.badgeClass}`}
                        >
                          <option value="BAIK">Baik</option>
                          <option value="RUSAK_RINGAN">Rusak Ringan</option>
                          <option value="RUSAK_BERAT">Rusak Berat</option>
                          <option value="BELUM_ADA">Belum Ada</option>
                        </select>
                      </div>

                      {/* Baris 3: Kelengkapan Pendukung Papan Tulis (Penghapus & Spidol) */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
                        <span>
                          Penghapus:{' '}
                          <strong className="text-slate-800">
                            {KONDISI_SAPRAS_META[row.penghapusKondisi].shortLabel}
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Spidol:{' '}
                          <strong className="text-slate-800">
                            {KONDISI_SAPRAS_META[row.spidolKondisi].shortLabel}
                          </strong>
                        </span>
                        {row.itemTambahan.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              +{row.itemTambahan.length} Aset Lain
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Footer Kartu */}
                    <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 truncate">
                        {row.lokasiDiniyyah}
                      </span>
                      <button
                        type="button"
                        data-testid={`btn-detail-sapras-${row.kelasKey}`}
                        onClick={() => handleOpenDetailModal(row)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Rincian Kelas</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Gedung / Blok KBM</th>
                      <th className="py-3 px-4">Mustahiq</th>
                      <th className="py-3 px-4">Papan Tulis</th>
                      <th className="py-3 px-4">Meja Guru</th>
                      <th className="py-3 px-4">Penghapus & Spidol</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredKelasRows.map((row) => (
                      <tr key={row.kelasKey} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {row.shortBadge} ({row.kelasLabel})
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.blokDiniyyah}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {row.mustahiq}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                              KONDISI_SAPRAS_META[row.papanTulisKondisi]
                                .badgeClass
                            }`}
                          >
                            {row.papanTulisJumlah} Unit •{' '}
                            {
                              KONDISI_SAPRAS_META[row.papanTulisKondisi]
                                .shortLabel
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full border text-[11px] font-bold ${
                              KONDISI_SAPRAS_META[row.mejaGuruKondisi]
                                .badgeClass
                            }`}
                          >
                            {row.mejaGuruJumlah} Unit •{' '}
                            {
                              KONDISI_SAPRAS_META[row.mejaGuruKondisi]
                                .shortLabel
                            }
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {KONDISI_SAPRAS_META[row.penghapusKondisi].shortLabel}{' '}
                          /{' '}
                          {KONDISI_SAPRAS_META[row.spidolKondisi].shortLabel}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(row)}
                            className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-emerald-50 text-emerald-800 font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SECTION 2: KERUSAKAN & PERBAIKAN ==================== */}
      {activeSection === 'perbaikan' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: `Semua Tiket (${tiketPerbaikan.length})` },
                  { id: 'DILAPORKAN', label: 'Dilaporkan' },
                  { id: 'PROSES', label: 'Sedang Diperbaiki' },
                  { id: 'SELESAI', label: 'Selesai Diperbaiki' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatusTiket(st.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                    filterStatusTiket === st.id
                      ? 'bg-[#134e3a] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {canCreate && (
              <button
                type="button"
                data-testid="btn-tambah-tiket-perbaikan"
                onClick={() => {
                  setTiketKelasKey(allKelasRows[0]?.kelasKey || '');
                  setIsAddTiketOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Lapor Kerusakan Baru</span>
              </button>
            )}
          </div>

          {tiketPerbaikan.filter(
            (t) => filterStatusTiket === 'ALL' || t.status === filterStatusTiket
          ).length === 0 ? (
            <div
              data-testid="empty-tiket-perbaikan"
              className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Tidak ada antrean kerusakan pada filter ini
              </p>
              <p className="text-xs text-slate-500">
                Jika Anda mengubah kondisi Papan Tulis atau Meja Guru menjadi Rusak di menu Inventaris Kelas, tiket perbaikan akan otomatis muncul di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tiketPerbaikan
                .filter(
                  (t) =>
                    filterStatusTiket === 'ALL' ||
                    t.status === filterStatusTiket
                )
                .map((tiket) => (
                  <div
                    key={tiket.id}
                    data-testid={`tiket-card-${tiket.kelasKey}-${tiket.itemType}`}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
                          Kelas {tiket.kelasLabel}
                        </span>
                        <span className="text-xs font-extrabold text-slate-900">
                          {tiket.itemNama}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tiket.status === 'SELESAI'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tiket.status === 'PROSES'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {tiket.status === 'SELESAI'
                            ? 'Selesai & Normal'
                            : tiket.status === 'PROSES'
                            ? 'Sedang Diperbaiki'
                            : 'Dilaporkan'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tiket.urgensi === 'DARURAT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Urgensi: {tiket.urgensi}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700">
                        {tiket.deskripsiKerusakan}
                      </p>

                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2">
                        <span>Gedung: {tiket.blokKbm}</span>
                        <span>•</span>
                        <span>Pelapor: {tiket.pelapor}</span>
                        <span>•</span>
                        <span>
                          Tanggal:{' '}
                          {new Date(tiket.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {tiket.status === 'DILAPORKAN' && canEdit && (
                        <button
                          type="button"
                          data-testid={`btn-proses-tiket-${tiket.kelasKey}`}
                          onClick={() => {
                            void updateStatusTiket(tiket.id, 'PROSES');
                            showToast(
                              `Status perbaikan kelas ${tiket.kelasLabel} diubah ke Sedang Diperbaiki.`
                            );
                          }}
                          className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold cursor-pointer"
                        >
                          Proses Perbaikan
                        </button>
                      )}

                      {tiket.status !== 'SELESAI' && canEdit && (
                        <button
                          type="button"
                          data-testid={`btn-selesai-tiket-${tiket.kelasKey}`}
                          onClick={() => {
                            void updateStatusTiket(tiket.id, 'SELESAI', {
                              catatanPenyelesaian:
                                'Perbaikan tuntas dan fasilitas kelas kembali normal.',
                            });
                            showToast(
                              `Perbaikan ${tiket.itemNama} kelas ${tiket.kelasLabel} selesai! Kondisi kelas otomatis kembali Baik.`
                            );
                          }}
                          className="px-3.5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tandai Selesai & Pulihkan Kelas</span>
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void deleteTiketPerbaikan(tiket.id)}
                          className="p-2 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Hapus tiket laporan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== SECTION 3: LOGISTIK & ATK KBM ==================== */}
      {activeSection === 'logistik' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Stok Gudang Logistik & ATK Papan Tulis KBM
              </h2>
              <p className="text-xs text-slate-500">
                Pantau ketersediaan spidol, tinta isi ulang, penghapus papan tulis, dan lampu cadangan kelas
              </p>
            </div>

            {canCreate && (
              <button
                type="button"
                data-testid="btn-open-distribusi-logistik"
                onClick={() => {
                  setDistKelasKey(allKelasRows[0]?.kelasKey || '');
                  setIsDistribusiModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Distribusi ke Kelas</span>
              </button>
            )}
          </div>

          {/* Kartu Stok Barang Logistik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {logistikStok.map((item) => {
              const isLow = item.stokSaatIni <= item.batasMinimum;
              return (
                <div
                  key={item.id}
                  data-testid={`logistik-card-${item.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-400">
                        {item.kode}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isLow ? 'Stok Menipis' : 'Stok Aman'}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-extrabold text-slate-900">
                      {item.namaBarang}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-extrabold font-mono text-slate-900">
                        {item.stokSaatIni}
                      </span>{' '}
                      <span className="text-xs text-slate-500">
                        {item.satuan}
                      </span>
                    </div>

                    {canEdit && (
                      <button
                        type="button"
                        data-testid={`btn-restock-${item.id}`}
                        onClick={() => {
                          void adjustStokLogistik(item.id, 10);
                          showToast(
                            `Stok ${item.namaBarang} ditambah +10 ${item.satuan}.`
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold cursor-pointer"
                      >
                        +10 Stok Masuk
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabel Riwayat Distribusi Logistik ke Kelas */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-800">
                Riwayat Pengambilan / Distribusi ATK per Kelas
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {distribusiLogs.length} Catatan
              </span>
            </div>
            <div className="overflow-x-auto">
              <table
                data-testid="table-distribusi-logistik"
                className="w-full text-left border-collapse text-xs"
              >
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                    <th className="py-2.5 px-4">Tanggal</th>
                    <th className="py-2.5 px-4">Kelas Tujuan</th>
                    <th className="py-2.5 px-4">Nama Barang</th>
                    <th className="py-2.5 px-4">Jumlah</th>
                    <th className="py-2.5 px-4">Penerima / Mustahiq</th>
                    <th className="py-2.5 px-4">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {distribusiLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {log.tanggal}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-emerald-900">
                        Kelas {log.kelasLabel}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-slate-800">
                        {log.namaBarang}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {log.jumlah} {log.satuan}
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">
                        {log.penerima}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {log.catatan || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SECTION 4: REKAP & AUDIT SAPRAS ==================== */}
      {activeSection === 'rekap' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                Rekapitulasi Audit Kesiapan Sarana Kelas per Tingkatan
              </h2>
              <p className="text-xs text-slate-500">
                Ringkasan jumlah Papan Tulis dan Meja Guru layak pakai untuk laporan LPJ PKM. Sapras
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="btn-export-rekap-sapras"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                <span>Unduh Excel / CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak LPJ Sapras</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table
                data-testid="table-rekap-sapras"
                className="w-full text-left border-collapse text-xs"
              >
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Tingkatan Diniyyah</th>
                    <th className="py-3 px-4">Jumlah Kelas</th>
                    <th className="py-3 px-4">Papan Tulis Baik</th>
                    <th className="py-3 px-4">Papan Tulis Rusak/Kurang</th>
                    <th className="py-3 px-4">Meja Guru Baik</th>
                    <th className="py-3 px-4">Meja Guru Rusak/Kurang</th>
                    <th className="py-3 px-4">Kesiapan Penuh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapPerTingkat.map((grp) => {
                    const pct =
                      grp.totalKelas > 0
                        ? Math.round((grp.layakPenuh / grp.totalKelas) * 100)
                        : 100;
                    return (
                      <tr key={grp.tingkat}>
                        <td className="py-3 px-4 font-extrabold text-slate-900">
                          Tingkat {grp.tingkat}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {grp.totalKelas} Kelas
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                          {grp.papanBaik} Unit
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600 font-bold">
                          {grp.papanRusak} Unit
                        </td>
                        <td className="py-3 px-4 font-mono text-emerald-700 font-bold">
                          {grp.mejaBaik} Unit
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600 font-bold">
                          {grp.mejaRusak} Unit
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono font-bold text-[11px]">
                            {grp.layakPenuh}/{grp.totalKelas} ({pct}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL RINCIAN & EDIT SAPRAS KELAS ==================== */}
      {editingRow && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-detail-sapras-kelas"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Inventaris Sarana Kelas {editingRow.kelasLabel}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingRow.blokDiniyyah} • Mustahiq: {editingRow.mustahiq}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRow(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSaveDetailModal}
              className="p-6 overflow-y-auto space-y-4 flex-1"
            >
              {/* Papan Tulis */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-extrabold text-slate-900 uppercase">
                  1. Papan Tulis Kelas
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Kondisi Papan Tulis
                    </label>
                    <select
                      value={editPapanKondisi}
                      onChange={(e) =>
                        setEditPapanKondisi(e.target.value as KondisiSapras)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                    >
                      <option value="BAIK">Baik & Layak</option>
                      <option value="RUSAK_RINGAN">Rusak Ringan</option>
                      <option value="RUSAK_BERAT">Rusak Berat</option>
                      <option value="BELUM_ADA">Belum Ada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Jumlah Unit
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={editPapanJumlah}
                      onChange={(e) =>
                        setEditPapanJumlah(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Ukuran / Spesifikasi Papan Tulis
                  </label>
                  <input
                    type="text"
                    value={editPapanSpec}
                    onChange={(e) => setEditPapanSpec(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Meja Guru */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="text-xs font-extrabold text-slate-900 uppercase">
                  2. Meja Guru / Dampar Asatidz
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Kondisi Meja Guru
                    </label>
                    <select
                      value={editMejaKondisi}
                      onChange={(e) =>
                        setEditMejaKondisi(e.target.value as KondisiSapras)
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                    >
                      <option value="BAIK">Baik & Layak</option>
                      <option value="RUSAK_RINGAN">Rusak Ringan</option>
                      <option value="RUSAK_BERAT">Rusak Berat</option>
                      <option value="BELUM_ADA">Belum Ada</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Jumlah Unit
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={editMejaJumlah}
                      onChange={(e) =>
                        setEditMejaJumlah(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tipe / Spesifikasi Meja Guru
                  </label>
                  <input
                    type="text"
                    value={editMejaSpec}
                    onChange={(e) => setEditMejaSpec(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                  />
                </div>
              </div>

              {/* Penghapus & Spidol */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kondisi Penghapus Papan
                  </label>
                  <select
                    value={editPenghapusKondisi}
                    onChange={(e) =>
                      setEditPenghapusKondisi(e.target.value as KondisiSapras)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="BAIK">Baik</option>
                    <option value="RUSAK_RINGAN">Aus / Perlu Ganti</option>
                    <option value="BELUM_ADA">Belum Ada / Hilang</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ketersediaan Spidol Kelas
                  </label>
                  <select
                    value={editSpidolKondisi}
                    onChange={(e) =>
                      setEditSpidolKondisi(e.target.value as KondisiSapras)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="BAIK">Tersedia & Nyala</option>
                    <option value="RUSAK_RINGAN">Tinta Habis</option>
                    <option value="BELUM_ADA">Belum Ada</option>
                  </select>
                </div>
              </div>

              {/* Fasilitas Tambahan Kelas */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Fasilitas Tambahan di Kelas Ini (Opsional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: Kipas Angin Dinding, Lampu Utama..."
                    value={draftExtraNama}
                    onChange={(e) => setDraftExtraNama(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={draftExtraJumlah}
                    onChange={(e) =>
                      setDraftExtraJumlah(Number(e.target.value))
                    }
                    className="w-16 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!draftExtraNama.trim()) return;
                      setEditItemTambahan((prev) => [
                        ...prev,
                        {
                          id: `ext-${Date.now()}`,
                          nama: draftExtraNama.trim(),
                          jumlah: Math.max(1, draftExtraJumlah),
                          kondisi: 'BAIK',
                        },
                      ]);
                      setDraftExtraNama('');
                      setDraftExtraJumlah(1);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold cursor-pointer"
                  >
                    + Tambah
                  </button>
                </div>

                {editItemTambahan.length > 0 && (
                  <ul className="space-y-1 text-xs">
                    {editItemTambahan.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-slate-200"
                      >
                        <span>
                          {it.nama} ({it.jumlah} Unit)
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditItemTambahan((prev) =>
                              prev.filter((x) => x.id !== it.id)
                            )
                          }
                          className="text-rose-500 font-bold text-[11px] cursor-pointer"
                        >
                          Hapus
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-simpan-detail-sapras"
                  className="px-5 py-2 rounded-xl bg-[#134e3a] hover:bg-[#0f3d2e] text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Inventaris Kelas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL LAPOR KERUSAKAN BARU ==================== */}
      {isAddTiketOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-tambah-tiket-perbaikan"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Buat Laporan Kerusakan Fasilitas Kelas
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTiketOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTiketBaru} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Kelas
                </label>
                <select
                  value={tiketKelasKey}
                  onChange={(e) => setTiketKelasKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                >
                  {allKelasRows.map((r) => (
                    <option key={r.kelasKey} value={r.kelasKey}>
                      {r.shortBadge} ({r.kelasLabel}) - {r.blokDiniyyah}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenis Sarana Kelas
                </label>
                <select
                  value={tiketItemType}
                  onChange={(e) =>
                    setTiketItemType(
                      e.target.value as 'PAPAN_TULIS' | 'MEJA_GURU' | 'LAINNYA'
                    )
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                >
                  <option value="PAPAN_TULIS">Papan Tulis Kelas</option>
                  <option value="MEJA_GURU">Meja Guru / Dampar</option>
                  <option value="LAINNYA">Fasilitas Lainnya (Lampu/Pintu/Kipas)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tingkat Kerusakan
                  </label>
                  <select
                    value={tiketKondisi}
                    onChange={(e) =>
                      setTiketKondisi(e.target.value as KondisiSapras)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="RUSAK_RINGAN">Rusak Ringan</option>
                    <option value="RUSAK_BERAT">Rusak Berat</option>
                    <option value="BELUM_ADA">Hilang / Belum Ada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Prioritas Urgensi
                  </label>
                  <select
                    value={tiketUrgensi}
                    onChange={(e) =>
                      setTiketUrgensi(e.target.value as UrgensiPerbaikan)
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                  >
                    <option value="SEDANG">Sedang</option>
                    <option value="DARURAT">Darurat (Ganggu KBM)</option>
                    <option value="RINGAN">Ringan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Keterangan Kerusakan
                </label>
                <textarea
                  rows={3}
                  data-testid="input-deskripsi-tiket"
                  placeholder="Contoh: Papan tulis berlubang di bagian tengah / kaki meja guru patah..."
                  value={tiketDeskripsi}
                  onChange={(e) => setTiketDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddTiketOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-simpan-tiket-baru"
                  className="px-5 py-2 rounded-xl bg-[#134e3a] text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL CATAT DISTRIBUSI LOGISTIK ==================== */}
      {isDistribusiModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-distribusi-logistik"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Catat Pembagian Logistik / ATK ke Kelas
              </h3>
              <button
                type="button"
                onClick={() => setIsDistribusiModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitDistribusi} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Barang Logistik
                </label>
                <select
                  value={distLogistikId}
                  onChange={(e) => setDistLogistikId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                >
                  {logistikStok.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.namaBarang} (Sisa: {item.stokSaatIni} {item.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kelas Tujuan
                  </label>
                  <select
                    value={distKelasKey}
                    onChange={(e) => setDistKelasKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold"
                  >
                    {allKelasRows.map((r) => (
                      <option key={r.kelasKey} value={r.kelasKey}>
                        {r.shortBadge} ({r.kelasLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Jumlah Diberikan
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    data-testid="input-jumlah-distribusi"
                    value={distJumlah}
                    onChange={(e) => setDistJumlah(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Penerima (Mustahiq / Ketua Kelas)
                </label>
                <input
                  type="text"
                  data-testid="input-penerima-distribusi"
                  placeholder="Kosongkan untuk otomatis nama Mustahiq kelas..."
                  value={distPenerima}
                  onChange={(e) => setDistPenerima(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDistribusiModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-simpan-distribusi"
                  className="px-5 py-2 rounded-xl bg-[#134e3a] text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Distribusi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== GLOBAL BARCODE SCANNER MODAL ==================== */}
      <ModalBarcodeScanner
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onAuditKelas={(code) => {
          setActiveSection('inventaris-kelas');
          const clean = code.replace(/^MBD[-:]KLS[-:]/, '');
          setSearchQuery(clean);
          showToast(`Menampilkan kelas dari QR: ${code}`);
        }}
        onSelectAsset={() => {
          setActiveSection('inventaris-madin');
        }}
        onSelectTempat={() => {
          setActiveSection('inventaris-madin');
        }}
      />
    </div>
  );
}
