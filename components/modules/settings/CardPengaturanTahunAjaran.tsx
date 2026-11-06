'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarRange,
  CheckCircle2,
  Plus,
  RefreshCw,
  Save,
  ArrowUpRight,
  Moon,
  Sun,
  Layers,
} from 'lucide-react';
import {
  SemesterMadin,
  useTahunAjaranStore,
} from '@/stores/useTahunAjaranStore';
import { useKalenderStore } from '@/stores/useKalenderStore';

export default function CardPengaturanTahunAjaran() {
  const {
    activeTahunAjaran,
    semesterAktif,
    hijriOffsetDays,
    daftarTahunAjaran,
    fetchGlobalTahunAjaran,
    setGlobalTahunAjaran,
    addTahunAjaranBaru,
    getFormattedHeaderBanner,
  } = useTahunAjaranStore();

  const {
    setActiveTahunAjaran: setKalenderTA,
    regenerateTahunAjaranOtomatis,
    syncKalenderToAbsensiLibur,
  } = useKalenderStore();

  const [selectedTA, setSelectedTA] = useState(activeTahunAjaran);
  const [selectedSemester, setSelectedSemester] =
    useState<SemesterMadin>(semesterAktif);
  const [selectedOffset, setSelectedOffset] = useState<number>(hijriOffsetDays);
  const [newStartYear, setNewStartYear] = useState<number>(2030);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void fetchGlobalTahunAjaran();
  }, [fetchGlobalTahunAjaran]);

  useEffect(() => {
    setSelectedTA(activeTahunAjaran);
    setSelectedSemester(semesterAktif);
    setSelectedOffset(hijriOffsetDays);
  }, [activeTahunAjaran, semesterAktif, hijriOffsetDays]);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApplyGlobalTA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await setGlobalTahunAjaran({
      activeTahunAjaran: selectedTA,
      semesterAktif: selectedSemester,
      hijriOffsetDays: selectedOffset,
      actorName: 'Master Administrator',
    });

    setKalenderTA(selectedTA);
    if (selectedOffset !== hijriOffsetDays) {
      await regenerateTahunAjaranOtomatis(
        selectedTA,
        selectedOffset,
        'Pengaturan Tahun Ajaran Global'
      );
    } else {
      await syncKalenderToAbsensiLibur('Pengaturan Tahun Ajaran Global');
    }

    setIsSaving(false);
    showNotice(
      `Tahun Ajaran ${selectedTA} (${selectedSemester}) berhasil diterapkan dan disinkronkan ke seluruh halaman aplikasi!`
    );
  };

  const handleAddFutureTA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartYear || newStartYear < 2026 || newStartYear > 2050) return;
    const created = await addTahunAjaranBaru(
      newStartYear,
      true,
      'Master Administrator'
    );
    setSelectedTA(created.tahunAjaranMasehi);
    setKalenderTA(created.tahunAjaranMasehi);
    setNewStartYear(newStartYear + 1);
    showNotice(
      `Tahun Ajaran baru ${created.tahunAjaranMasehi} (${created.tahunAjaranHijriyah} H) berhasil ditambahkan dan diaktifkan!`
    );
  };

  const syncedPages = [
    {
      title: 'Kalender Kegiatan (13 Bulan)',
      desc: 'Penanggalan Masehi & Hijriyah otomatis menyesuaikan Tahun Ajaran aktif',
      href: '/kalender-kegiatan',
    },
    {
      title: 'Dashboard MADINA Blokagung',
      desc: 'Widget Kalender & Agenda terdekat mengikuti Tahun Ajaran aktif',
      href: '/dashboard',
    },
    {
      title: 'Jadwal KBM Per Kelas',
      desc: 'Kop dokumen jadwal KBM menampilkan Tahun Ajaran aktif',
      href: '/jadwal-kbm',
    },
    {
      title: 'Formasi Ruang Diniyyah & Takror (PA/PI)',
      desc: 'Kop resmi Formasi Putra & Putri tersinkron dengan Tahun Ajaran aktif',
      href: '/formasi/pa',
    },
    {
      title: 'Absen Konsorsium (Matriks 12 Bulan)',
      desc: 'Periode Juli s/d Juni otomatis mengikuti tahun awal & akhir Tahun Ajaran',
      href: '/absen-konsorsium',
    },
    {
      title: 'Absensi Asatidz & Hari Libur KBM',
      desc: 'Daftar hari libur kalender otomatis terhubung dengan Tahun Ajaran berjalan',
      href: '/absensi',
    },
  ];

  return (
    <div data-testid="card-pengaturan-tahun-ajaran" className="space-y-6">
      {notification && (
        <div
          role="status"
          data-testid="toast-pengaturan-tahun-ajaran"
          className="p-4 bg-emerald-800 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-md"
        >
          <CheckCircle2 className="w-5 h-5 text-amber-300 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Banner Status Tahun Ajaran Aktif Saat Ini */}
      <div className="bg-gradient-to-r from-emerald-950 to-[#0f5146] rounded-2xl p-6 text-white shadow-sm border border-emerald-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Siklus Akademik Aktif Seluruh Halaman</span>
          </div>
          <h2
            data-testid="active-global-ta-banner"
            className="text-xl sm:text-2xl font-extrabold tracking-tight pt-1"
          >
            {getFormattedHeaderBanner()}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90">
            Periode Aktif: <strong>{semesterAktif}</strong> • Rentang Kalender: Juni{' '}
            {selectedTA.split('/')[0]} s/d Juni {selectedTA.split('/')[1]}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/kalender-kegiatan"
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition"
          >
            <span>Lihat Kalender {activeTahunAjaran}</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Form Utama Pengaturan Tahun Ajaran */}
      <form
        onSubmit={handleApplyGlobalTA}
        className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6"
      >
        <div>
          <h3 className="text-lg font-extrabold text-slate-900">
            Pilih Tahun Ajaran Aktif Madrasah
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Saat Anda mengubah Tahun Ajaran di bawah ini (misalnya dari{' '}
            <strong>2026/2027</strong> ke <strong>2027/2028</strong> di tahun
            depan), seluruh halaman aplikasi dan Kalender Kegiatan 13 bulan akan
            otomatis menyesuaikan diri.
          </p>
        </div>

        {/* Pilihan Kartu Tahun Ajaran */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {daftarTahunAjaran.map((cfg) => {
            const isSelected = selectedTA === cfg.tahunAjaranMasehi;
            const isCurrentlySaved = activeTahunAjaran === cfg.tahunAjaranMasehi;
            return (
              <button
                key={cfg.tahunAjaranMasehi}
                type="button"
                data-testid={`option-global-ta-${cfg.tahunAjaranMasehi.replace(
                  '/',
                  '-'
                )}`}
                onClick={() => setSelectedTA(cfg.tahunAjaranMasehi)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-emerald-50/80 border-emerald-700 ring-2 ring-emerald-600/25 shadow-xs'
                    : 'bg-slate-50/60 hover:bg-slate-100/70 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">
                    <Sun className="w-3 h-3 text-amber-700" />
                    Masehi
                  </span>
                  {isCurrentlySaved && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-700 text-white">
                      Aktif Saat Ini
                    </span>
                  )}
                </div>

                <div className="text-lg font-extrabold text-slate-900">
                  TA {cfg.tahunAjaranMasehi}
                </div>
                <div className="text-xs font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                  <Moon className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{cfg.tahunAjaranHijriyah} Hijriyah</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-200/70">
                  Juni {cfg.startYearMasehi} s/d Juni {cfg.startYearMasehi + 1}
                </div>
              </button>
            );
          })}
        </div>

        {/* Pengaturan Semester Berjalan & Koreksi Hilal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-700" />
              <span>Semester / Daur Berjalan</span>
            </label>
            <select
              data-testid="select-global-semester"
              value={selectedSemester}
              onChange={(e) =>
                setSelectedSemester(e.target.value as SemesterMadin)
              }
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
            >
              <option value="Semester Ganjil (Daur Awwal)">
                Semester Ganjil (Daur Awwal)
              </option>
              <option value="Semester Genap (Daur Tsani)">
                Semester Genap (Daur Tsani)
              </option>
            </select>
            <p className="text-[11px] text-slate-500">
              Digunakan sebagai penanda periode semester berjalan pada laporan
              dan rekapitulasi.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <Moon className="w-4 h-4 text-amber-600" />
              <span>Koreksi Rukyatul Hilal Global (Hijriyah)</span>
            </label>
            <select
              data-testid="select-global-hijri-offset"
              value={selectedOffset}
              onChange={(e) => setSelectedOffset(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800"
            >
              <option value={-2}>-2 Hari</option>
              <option value={-1}>-1 Hari</option>
              <option value={0}>0 Hari (Sesuai Kalender Standar Pondok)</option>
              <option value={1}>+1 Hari</option>
              <option value={2}>+2 Hari</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Menyesuaikan pergeseran tanggal Hijriyah apabila terdapat
              keputusan rukyatul hilal pondok.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Pilihan yang akan diterapkan:{' '}
            <strong className="text-slate-900">
              Tahun Ajaran {selectedTA.replace('/', ' s/d ')}
            </strong>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            data-testid="btn-save-global-tahun-ajaran"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-extrabold cursor-pointer shadow-sm transition"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Terapkan &amp; Sinkronkan ke Seluruh Halaman</span>
          </button>
        </div>
      </form>

      {/* Tambah Tahun Ajaran Masa Depan & Daftar Halaman Tersinkron */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Tambah Tahun Ajaran Baru */}
        <form
          onSubmit={handleAddFutureTA}
          className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
        >
          <div className="space-y-2">
            <h4 className="text-sm font-extrabold text-slate-900">
              Tambah Tahun Ajaran Masa Depan
            </h4>
            <p className="text-xs text-slate-500">
              Siapkan Tahun Ajaran baru untuk masa mendatang. Sistem akan
              otomatis menghitung pasangan tahun Hijriyah dan men-generate
              Kalender Kegiatan 13 bulan.
            </p>

            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Tahun Awal Masehi (contoh: 2030 untuk TA 2030/2031)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2026}
                  max={2050}
                  data-testid="input-new-ta-start-year"
                  value={newStartYear}
                  onChange={(e) => setNewStartYear(Number(e.target.value))}
                  className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-900"
                />
                <span className="text-xs font-bold text-slate-600">
                  s/d {newStartYear + 1} ({newStartYear - 579}/
                  {newStartYear - 578} H)
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            data-testid="btn-add-new-tahun-ajaran"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-extrabold cursor-pointer transition"
          >
            <Plus className="w-4 h-4" />
            <span>
              Tambah &amp; Aktifkan TA {newStartYear}/{newStartYear + 1}
            </span>
          </button>
        </form>

        {/* Daftar Halaman yang Tersinkronisasi Otomatis */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-extrabold text-slate-900">
              Halaman yang Tersinkronisasi Otomatis
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold">
              6 Modul Terhubung
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {syncedPages.map((pg) => (
              <Link
                key={pg.href}
                href={pg.href}
                className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 transition flex items-start justify-between gap-2 group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                    {pg.title}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {pg.desc}
                  </p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
