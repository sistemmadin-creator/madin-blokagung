'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Moon,
  Sun,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  CalendarOff,
} from 'lucide-react';
import { useKalenderStore } from '@/stores/useKalenderStore';
import { KATALOG_ATURAN_KEGIATAN, AgendaKalenderItem } from '@/types/kalender';
import {
  diffDaysYMD,
  getPasaranJawa,
  masehiToHijri,
  NAMA_BULAN_MASEHI,
  parseYMDToUTC,
} from '@/lib/utils/kalenderHijriyahHelper';

const HARI_INDO = [
  'Ahad',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
] as const;

function formatMasehiShort(ymd: string): string {
  const dt = parseYMDToUTC(ymd);
  const d = dt.getUTCDate();
  const mName = NAMA_BULAN_MASEHI[dt.getUTCMonth()] || '';
  const y = dt.getUTCFullYear();
  return `${d} ${mName.slice(0, 3)} ${y}`;
}

export default function KalenderAgendaWidget() {
  const {
    modeKalender,
    setModeKalender,
    activeTahunAjaran,
    hijriOffsetByTA,
    getCurrentAgendaMap,
  } = useKalenderStore();

  const hijriOffset = hijriOffsetByTA[activeTahunAjaran] ?? 0;
  const agendaMap = getCurrentAgendaMap();

  const todaySummary = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const ymd = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const hari = HARI_INDO[now.getDay()] || 'Hari';
    const pasaran = getPasaranJawa(ymd);
    const hijri = masehiToHijri(ymd, hijriOffset);
    const bulanMasehi = NAMA_BULAN_MASEHI[m - 1] || '';
    const isJumat = now.getDay() === 5;
    const agendaToday: AgendaKalenderItem | undefined = agendaMap[ymd];

    return {
      ymd,
      hariPasaran: `${hari} ${pasaran}`,
      masehiFull: `${d} ${bulanMasehi} ${y}`,
      hijriFull: `${hijri.dayH} ${hijri.monthName} ${hijri.yearH} H`,
      isJumat,
      agendaToday,
      isLiburHariIni: isJumat || Boolean(agendaToday?.isLiburKbm),
    };
  }, [agendaMap, hijriOffset]);

  // Ambil 4 blok agenda terdekat mulai hari ini (atau dari awal TA jika semua di masa lalu)
  const upcomingAgendas = useMemo(() => {
    const sorted = Object.values(agendaMap).sort((a, b) =>
      a.tanggalMasehi.localeCompare(b.tanggalMasehi)
    );

    // Kelompokkan tanggal berurutan dengan kode kegiatan yang sama agar ringkas
    const grouped: Array<{
      startYMD: string;
      endYMD: string;
      item: AgendaKalenderItem;
      durationDays: number;
    }> = [];

    for (const ag of sorted) {
      const last = grouped[grouped.length - 1];
      if (
        last &&
        last.item.kode === ag.kode &&
        diffDaysYMD(ag.tanggalMasehi, last.endYMD) === 1
      ) {
        last.endYMD = ag.tanggalMasehi;
        last.durationDays += 1;
      } else {
        grouped.push({
          startYMD: ag.tanggalMasehi,
          endYMD: ag.tanggalMasehi,
          item: ag,
          durationDays: 1,
        });
      }
    }

    const futureOrToday = grouped.filter(
      (g) => g.endYMD >= todaySummary.ymd
    );

    const sourceList =
      futureOrToday.length >= 4 ? futureOrToday : grouped;

    return sourceList.slice(0, 4).map((g) => {
      const diff = diffDaysYMD(g.startYMD, todaySummary.ymd);
      const hijriStart = masehiToHijri(g.startYMD, hijriOffset);
      let countdownLabel = '';
      if (g.startYMD <= todaySummary.ymd && g.endYMD >= todaySummary.ymd) {
        countdownLabel = 'Berlangsung';
      } else if (diff === 1) {
        countdownLabel = 'Besok';
      } else if (diff > 1) {
        countdownLabel = `H-${diff}`;
      } else {
        countdownLabel = formatMasehiShort(g.startYMD);
      }

      return {
        ...g,
        diffDays: diff,
        countdownLabel,
        masehiRangeLabel:
          g.startYMD === g.endYMD
            ? formatMasehiShort(g.startYMD)
            : `${formatMasehiShort(g.startYMD)} - ${formatMasehiShort(g.endYMD)}`,
        hijriLabel: `${hijriStart.dayH} ${hijriStart.monthName} ${hijriStart.yearH} H`,
      };
    });
  }, [agendaMap, todaySummary.ymd, hijriOffset]);

  return (
    <div
      data-testid="dashboard-widget-kalender"
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
    >
      <div>
        {/* Header Widget + Switch Masehi/Hijriyah */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <Calendar className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Kalender Kegiatan & Agenda
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Penanggalan Masehi, Pasaran Jawa & Hijriyah ({activeTahunAjaran})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-100 p-0.5 rounded-lg flex items-center border border-slate-200/80 text-[11px] font-bold">
              <button
                type="button"
                data-testid="dashboard-kalender-switch-hijriyah"
                onClick={() => setModeKalender('HIJRIYAH')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  modeKalender === 'HIJRIYAH'
                    ? 'bg-emerald-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3 h-3" />
                <span>Hijriyah</span>
              </button>
              <button
                type="button"
                data-testid="dashboard-kalender-switch-masehi"
                onClick={() => setModeKalender('MASEHI')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  modeKalender === 'MASEHI'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3 h-3" />
                <span>Masehi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Kartu Penanggalan Hari Ini */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950 to-emerald-900 text-white mb-4 border border-emerald-800/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                {todaySummary.hariPasaran}
              </span>
              <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                {modeKalender === 'HIJRIYAH'
                  ? todaySummary.hijriFull
                  : todaySummary.masehiFull}
              </p>
              <p className="text-[11px] text-emerald-200">
                {modeKalender === 'HIJRIYAH'
                  ? `Bertepatan: ${todaySummary.masehiFull}`
                  : `Bertepatan: ${todaySummary.hijriFull}`}
              </p>
            </div>

            <div className="text-right">
              {todaySummary.isLiburHariIni ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-200 border border-rose-400/30">
                  <CalendarOff className="w-3.5 h-3.5" />
                  {todaySummary.agendaToday
                    ? `[${todaySummary.agendaToday.kode}] Libur KBM`
                    : 'Libur Rutin Jumat'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Hari Efektif KBM
                </span>
              )}
              {todaySummary.agendaToday && (
                <p className="text-[11px] text-amber-200 font-semibold mt-1">
                  {todaySummary.agendaToday.namaKegiatan}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Daftar 4 Agenda Madrasah Terdekat */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-0.5">
            <span>Agenda Madrasah Terdekat</span>
            <span className="text-[11px] font-normal text-slate-400">
              Sinkron Otomatis Absensi
            </span>
          </div>

          {upcomingAgendas.map((ag) => {
            const rule = KATALOG_ATURAN_KEGIATAN[ag.item.kode];
            return (
              <div
                key={`${ag.startYMD}-${ag.item.kode}`}
                className="p-2.5 rounded-xl bg-slate-50/90 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="px-2 py-1 rounded-lg text-[11px] font-extrabold shrink-0 border"
                    style={{
                      backgroundColor: rule?.bgHex || '#334155',
                      color: rule?.textHex || '#ffffff',
                      borderColor: rule?.borderHex || '#1e293b',
                    }}
                  >
                    {ag.item.kode}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {ag.item.namaKegiatan}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {modeKalender === 'HIJRIYAH'
                        ? `${ag.hijriLabel} (${ag.masehiRangeLabel})`
                        : `${ag.masehiRangeLabel} • ${ag.hijriLabel}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                    <Clock className="w-3 h-3 text-amber-600" />
                    {ag.countdownLabel}
                  </span>
                  <span
                    className={`text-[10px] font-semibold mt-0.5 ${
                      ag.item.isLiburKbm ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {ag.item.isLiburKbm ? 'Libur KBM' : 'KBM Aktif'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Pintasan */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500">
          Terhubung dengan Pengaturan Hari Libur Absensi
        </span>
        <Link
          href="/kalender-kegiatan"
          className="font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
        >
          <span>Buka Kalender</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
