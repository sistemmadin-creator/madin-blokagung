'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Settings,
  Sliders,
  LayoutList,
  ShieldCheck,
  CalendarDays,
  BookOpen,
  Award,
  ChevronRight,
  FolderTree,
} from 'lucide-react';
import SidebarConfigEditor from '@/components/modules/settings/SidebarConfigEditor';
import ModalHierarchyBuilder from '@/components/modules/settings/ModalHierarchyBuilder';
import ModalAuditLogs from '@/components/modules/settings/ModalAuditLogs';
import ModalHierarkiBlokKBM from '@/components/modules/formasi/ModalHierarkiBlokKBM';
import CardAturanAkademik from '@/components/modules/settings/CardAturanAkademik';
import CardAturanMuhafadzoh from '@/components/modules/settings/CardAturanMuhafadzoh';
import CardAturanPiagam from '@/components/modules/settings/CardAturanPiagam';

type TabKey = 'overview' | 'sidebar' | 'hierarki' | 'audit' | 'akademik' | 'muhafadzoh' | 'piagam';

function PengaturanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = (searchParams.get('tab') as TabKey) || 'overview';

  const [activeTab, setActiveTab] = useState<TabKey>(tabParam);
  const [showHierarchyModal, setShowHierarchyModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showHierarkiKbmModal, setShowHierarkiKbmModal] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    router.push(`/pengaturan?tab=${tab}`);
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; testId: string }[] = [
    { key: 'overview', label: 'Tinjauan Pengaturan', icon: <Settings className="w-4 h-4" />, testId: 'tab-overview' },
    { key: 'sidebar', label: 'Ubah Sidebar & Menu', icon: <LayoutList className="w-4 h-4 text-amber-500" />, testId: 'tab-sidebar' },
    { key: 'hierarki', label: 'Pusat Kendali Admin', icon: <Sliders className="w-4 h-4 text-emerald-500" />, testId: 'tab-hierarki' },
    { key: 'audit', label: 'Log Aktivitas Sistem', icon: <ShieldCheck className="w-4 h-4 text-teal-500" />, testId: 'tab-audit' },
    { key: 'akademik', label: 'Aturan KBM & Libur', icon: <CalendarDays className="w-4 h-4 text-cyan-500" />, testId: 'tab-akademik' },
    { key: 'muhafadzoh', label: 'Aturan Muhafadzoh', icon: <BookOpen className="w-4 h-4 text-rose-500" />, testId: 'tab-muhafadzoh' },
    { key: 'piagam', label: 'Aturan Piagam', icon: <Award className="w-4 h-4 text-indigo-500" />, testId: 'tab-piagam' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
            <Settings className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pusat Konfigurasi Lembaga</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Pengaturan Sistem Madina Blokagung
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola hierarki kelas &amp; asrama, kustomisasi susunan sidebar navigasi, aturan akademik, target nadzom, dan rekam audit log.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            data-testid="btn-open-hierarki-kbm-modal"
            onClick={() => setShowHierarkiKbmModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <FolderTree className="w-4 h-4 text-emerald-700" />
            <span>Hierarki Blok KBM</span>
          </button>
          <button
            type="button"
            data-testid="btn-open-hierarchy-modal"
            onClick={() => setShowHierarchyModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition active:scale-95"
          >
            <Sliders className="w-4 h-4 text-emerald-200" />
            <span>Pusat Kendali Modal</span>
          </button>
          <button
            type="button"
            data-testid="btn-open-audit-modal"
            onClick={() => setShowAuditModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition active:scale-95"
          >
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <span>Audit Log Modal</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              data-testid={tab.testId}
              onClick={() => handleSelectTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* Grid 6 Pilar Pengaturan */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Pilar 1: Pusat Kendali Admin */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <Sliders className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Pusat Kendali Admin</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Kelola struktur pohon lembaga (Tingkat, Kelas, Bagian/Rombel), domisili santri (Blok, Asrama, Kamar), dan jabatan tenaga kependidikan.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700">Tabel app_settings</span>
                <button
                  type="button"
                  onClick={() => setShowHierarchyModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900"
                >
                  <span>Buka Kontrol</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Pilar 2: Ubah Sidebar & Navigasi */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
                  <LayoutList className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Ubah Sidebar &amp; Menu</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Ganti nama grup navigasi, sesuaikan label menu sesuai istilah pesantren, dan pindahkan urutan peletakan posisi menu (Naik/Turun).
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700">Live Customizer</span>
                <button
                  type="button"
                  onClick={() => handleSelectTab('sidebar')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 hover:text-amber-900"
                >
                  <span>Kelola Sidebar</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Pilar 3: Log Aktivitas Sistem */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-teal-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Log Aktivitas Sistem</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Pantau rekam jejak audit trail 100 aktivitas perubahan data terbaru yang dilakukan oleh admin atau operator madrasah.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-700">Tabel activity_logs</span>
                <button
                  type="button"
                  onClick={() => setShowAuditModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-900"
                >
                  <span>Lihat Log Audit</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Pilar 4: Aturan KBM & Libur */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-3">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Aturan KBM &amp; Hari Libur</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Konfigurasi hari aktif sekolah (Sabtu s/d Kamis), jam sesi KBM (malam ba&apos;da Isya / sore ba&apos;da Ashar), dan toleransi telat asatidz.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-cyan-700">Jadwal Operasional</span>
                <button
                  type="button"
                  onClick={() => handleSelectTab('akademik')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-700 hover:text-cyan-900"
                >
                  <span>Kelola KBM &amp; Libur</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Pilar 5: Aturan Muhafadzoh */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-rose-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Aturan Target Muhafadzoh</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Pengaturan nadzom hafalan wajib per kelas (Aqidatul Awam, Imrithi, Alfiyyah 1-1000) dan penugasan Mustahiq penjaga bebas.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-700">Target Kurikulum</span>
                <button
                  type="button"
                  onClick={() => handleSelectTab('muhafadzoh')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900"
                >
                  <span>Kelola Muhafadzoh</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Pilar 6: Piagam & Sertifikat */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Format &amp; Template Piagam</h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Pengaturan layout desain piagam kelulusan nadzom, pemilihan jenis tipografi kaligrafi, dan penempatan nama penandatangan.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-indigo-700">Sertifikasi</span>
                <button
                  type="button"
                  onClick={() => handleSelectTab('piagam')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900"
                >
                  <span>Kelola Piagam</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Ubah Sidebar */}
      {activeTab === 'sidebar' && (
        <div className="animate-fade-in">
          <SidebarConfigEditor />
        </div>
      )}

      {/* Tab Pusat Kendali Admin */}
      {activeTab === 'hierarki' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pusat Kendali Hierarki Lembaga</h2>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan pembangun hierarki untuk mengatur struktur cabang pohon tingkat, rombel, dan kamar pondok.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHierarchyModal(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Buka Editor Hierarki Penuh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-emerald-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FolderTree className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Hierarki Blok KBM (Diniyyah &amp; Takror)</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Kelola struktur zona wilayah KBM Diniyyah (Blok Diniyyah &gt; Lokasi) dan Belajar Takror (Blok Takror &gt; Lokasi).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700">app_settings (HIERARKI_LOKASI_KBM)</span>
                <button
                  type="button"
                  data-testid="btn-open-hierarki-kbm-control"
                  onClick={() => setShowHierarkiKbmModal(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>Atur Hierarki KBM</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs hover:border-emerald-300 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Pohon Tingkat, Unit &amp; Kamar</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Pembangun hierarki Tree 1 (Kamar Pondok) dan Tree 2 (Sekolah Formal &amp; Unit Madrasah).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700">app_settings (APP_SETTINGS)</span>
                <button
                  type="button"
                  onClick={() => setShowHierarchyModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Editor Tree 1 &amp; 2</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Log Aktivitas Sistem */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Log Aktivitas Sistem (Audit Trail)</h2>
              <p className="text-xs text-slate-500 mt-1">
                Catatan mutasi data, presensi asatidz, dan rekap perubahan sistem madrasah.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Buka Dialog Audit Log
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0" />
            <span>
              Rekap audit log memuat riwayat 100 entri terbaru dari tabel activity_logs Supabase dengan fitur pencarian real-time.
            </span>
          </div>
        </div>
      )}

      {/* Tab Aturan KBM & Libur */}
      {activeTab === 'akademik' && (
        <div className="animate-fade-in">
          <CardAturanAkademik />
        </div>
      )}

      {/* Tab Aturan Muhafadzoh */}
      {activeTab === 'muhafadzoh' && (
        <div className="animate-fade-in">
          <CardAturanMuhafadzoh />
        </div>
      )}

      {/* Tab Aturan Piagam */}
      {activeTab === 'piagam' && (
        <div className="animate-fade-in">
          <CardAturanPiagam />
        </div>
      )}

      {/* Modals */}
      <ModalHierarkiBlokKBM
        isOpen={showHierarkiKbmModal}
        onClose={() => setShowHierarkiKbmModal(false)}
      />

      <ModalHierarchyBuilder
        isOpen={showHierarchyModal}
        onClose={() => setShowHierarchyModal(false)}
      />

      <ModalAuditLogs
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </div>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-400 text-sm">
          Memuat Pusat Pengaturan Madina Blokagung...
        </div>
      }
    >
      <PengaturanContent />
    </Suspense>
  );
}
