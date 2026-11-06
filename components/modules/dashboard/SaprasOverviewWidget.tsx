'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Wrench,
  Package,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  ChevronRight,
} from 'lucide-react';
import {
  buildKelasSaprasRows,
  useSaprasStore,
} from '@/stores/useSaprasStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useSantriStore } from '@/stores/useSantriStore';

export default function SaprasOverviewWidget() {
  const { overrides, tiketPerbaikan, logistikStok } = useSaprasStore();
  const { formasiList } = useFormasiStore();
  const { santriList } = useSantriStore();

  const stats = useMemo(() => {
    const rows = buildKelasSaprasRows(formasiList, santriList, overrides);
    const totalKelas = Math.max(1, rows.length);
    const papanBaik = rows.filter((r) => r.papanTulisKondisi === 'BAIK').length;
    const mejaBaik = rows.filter((r) => r.mejaGuruKondisi === 'BAIK').length;
    const kelasSehat = rows.filter((r) => r.isFullyHealthy).length;
    const kelasPerluPerhatian = rows.length - kelasSehat;

    const papanBaikPct = Math.round((papanBaik / totalKelas) * 100);
    const mejaBaikPct = Math.round((mejaBaik / totalKelas) * 100);
    const kesiapanPct = Math.round((kelasSehat / totalKelas) * 100);

    const tiketAktif = tiketPerbaikan.filter((t) => t.status !== 'SELESAI');
    const tiketMendesak = tiketAktif.filter((t) => t.urgensi === 'DARURAT').length;

    const stokKritis = logistikStok.filter(
      (item) => item.stokSaatIni <= item.batasMinimum
    );
    const totalSpidolReady = logistikStok
      .filter((item) => item.kategori === 'ATK_PAPAN')
      .reduce((acc, curr) => acc + curr.stokSaatIni, 0);

    const marhalahList = ['ULA', 'WUSTHO', 'ULYA'].map((tk) => {
      const sub = rows.filter((r) => r.tingkat === tk);
      const subTotal = sub.length;
      const subHealthy = sub.filter((r) => r.isFullyHealthy).length;
      const pct = subTotal > 0 ? Math.round((subHealthy / subTotal) * 100) : 100;
      return {
        tingkat: tk,
        total: subTotal,
        sehat: subHealthy,
        pct,
      };
    });

    return {
      totalKelas: rows.length,
      papanBaik,
      papanBaikPct,
      mejaBaik,
      mejaBaikPct,
      kelasSehat,
      kelasPerluPerhatian,
      kesiapanPct,
      tiketAktifCount: tiketAktif.length,
      tiketMendesak,
      stokKritisCount: stokKritis.length,
      totalSpidolReady,
      marhalahList,
    };
  }, [formasiList, santriList, overrides, tiketPerbaikan, logistikStok]);

  return (
    <div
      data-testid="dashboard-widget-sapras"
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div>
        {/* Header Widget */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60">
                <Wrench className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Kesehatan Sarana Kelas (PKM. Sapras)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kondisi Papan Tulis, Meja Guru, Tiket Perbaikan & Stok ATK KBM
            </p>
          </div>

          <Link
            href="/sapras/inventaris-kelas"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline shrink-0"
          >
            <span>Inventaris</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 2 Kartu Utama: Papan Tulis & Meja Guru */}
        <div className="grid grid-cols-2 gap-3 mb-3.5">
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-950">Papan Tulis</span>
              <span className="font-extrabold text-emerald-700">
                {stats.papanBaikPct}% Baik
              </span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {stats.papanBaik}{' '}
              <span className="text-xs font-medium text-slate-500">
                / {stats.totalKelas} Kelas
              </span>
            </p>
            <div className="w-full bg-emerald-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${stats.papanBaikPct}%` }}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-950">Meja Guru</span>
              <span className="font-extrabold text-amber-700">
                {stats.mejaBaikPct}% Baik
              </span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {stats.mejaBaik}{' '}
              <span className="text-xs font-medium text-slate-500">
                / {stats.totalKelas} Kelas
              </span>
            </p>
            <div className="w-full bg-amber-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all"
                style={{ width: `${stats.mejaBaikPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Progres Kesiapan per Marhalah */}
        <div className="p-3 rounded-xl bg-slate-50/90 border border-slate-200/60 mb-3.5">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-slate-700">
              Kesiapan Penuh Ruang Kelas per Marhalah
            </span>
            <span className="font-extrabold text-emerald-700">
              {stats.kesiapanPct}% Siap KBM
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {stats.marhalahList.map((m) => (
              <div
                key={m.tingkat}
                className="bg-white p-2 rounded-lg border border-slate-200/60 text-center"
              >
                <p className="text-[11px] font-bold text-slate-500">{m.tingkat}</p>
                <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {m.pct}%
                </p>
                <p className="text-[10px] text-slate-400">
                  {m.sehat}/{m.total} Kelas
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Baris Pintasan Operasional Sapras */}
        <div className="space-y-2">
          <Link
            href="/sapras/perbaikan"
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-semibold text-slate-800">
                Antrean Tiket Perbaikan Sarana
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                  stats.tiketAktifCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {stats.tiketAktifCount} Aktif
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </Link>

          <Link
            href="/sapras/logistik"
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-semibold text-slate-800">
                Stok Logistik & ATK Papan Tulis
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {stats.stokKritisCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-rose-100 text-rose-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {stats.stokKritisCount} Stok Menipis
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-800">
                  {stats.totalSpidolReady} Unit ATK Siap
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </Link>
        </div>
      </div>

      {/* Footer Pintasan Rekap */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          {stats.kelasPerluPerhatian > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{stats.kelasPerluPerhatian} kelas perlu pengecekan sapras</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Seluruh papan tulis & meja guru siap pakai</span>
            </>
          )}
        </div>
        <Link
          href="/sapras/rekap"
          className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 hover:underline"
        >
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Rekap Sapras</span>
        </Link>
      </div>
    </div>
  );
}
