'use client';

import React, { useMemo } from 'react';
import { BookOpen, CalendarOff, SlidersHorizontal } from 'lucide-react';
import {
  HafalanConfig,
  SilabusConfigMap,
  SilabusHolidayEntry,
} from '@/types/setoran';
import {
  buildClassSilabusRows,
  computeDisplayOffsetsForRules,
  computeNumericRuleSchedule,
  SilabusTableWeekRow,
  syncSilabusRulesWithConfig,
} from '@/lib/utils/silabusHelper';
import { getAcademicYearMonths } from '@/lib/utils/sundayHelper';
import { exportAoaToExcel, ExcelMergeRange } from '@/lib/utils/excel';

export interface SilabusClassPair {
  key: string;
  tk: string;
  kls: string;
  label: string;
}

interface SilabusScheduleViewProps {
  pairs: SilabusClassPair[];
  config: HafalanConfig;
  silabusConfig: SilabusConfigMap;
  holidaysMap: Record<string, SilabusHolidayEntry>;
  startYear: number;
  visibleMonthKeys: Set<string>;
  onOpenAturSilabus: () => void;
}

interface MateriSpanMeta {
  renderCell: boolean;
  rowSpan: number;
}

/**
 * Menghitung rowSpan kolom Materi Hafalan pada baris-baris yang berurutan
 * dengan materi aktif yang sama (dan tidak terpotong baris LIBURAN).
 */
function computeMateriRowSpans(rows: SilabusTableWeekRow[]): MateriSpanMeta[] {
  const metas: MateriSpanMeta[] = rows.map(() => ({ renderCell: true, rowSpan: 1 }));
  let i = 0;
  while (i < rows.length) {
    const key = rows[i].primaryMateriKey;
    let span = 1;
    while (i + span < rows.length && rows[i + span].primaryMateriKey === key) {
      metas[i + span] = { renderCell: false, rowSpan: 0 };
      span++;
    }
    metas[i] = { renderCell: true, rowSpan: span };
    i += span;
  }
  return metas;
}

/**
 * Mengekspor seluruh jadwal silabus per kelas ke Excel (.xlsx) dengan format
 * kolom per kelas (Bulan, Minggu, Pencapaian, Materi) dan merge cell rapi.
 */
export async function exportSilabusToExcel(params: {
  pairs: SilabusClassPair[];
  config: HafalanConfig;
  silabusConfig: SilabusConfigMap;
  holidaysMap: Record<string, SilabusHolidayEntry>;
  startYear: number;
  visibleMonthKeys: Set<string>;
  activeTingkat: string;
}) {
  const {
    pairs,
    config,
    silabusConfig,
    holidaysMap,
    startYear,
    visibleMonthKeys,
    activeTingkat,
  } = params;

  const sheets = pairs.map((pair) => {
    const existing = silabusConfig[pair.key] || [];
    const rules = syncSilabusRulesWithConfig(existing, config, pair.key);
    const rowsData = buildClassSilabusRows(
      startYear,
      rules,
      holidaysMap,
      visibleMonthKeys
    );
    const materiSpans = computeMateriRowSpans(rowsData);

    const aoa: any[][] = [
      [`SILABUS MUHAFADZOH KELAS ${pair.label} (TA ${startYear}/${startYear + 1})`, '', '', ''],
      ['BULAN', 'MINGGU (KALENDER)', 'PENCAPAIAN SISWA', 'MATERI HAFALAN'],
    ];
    const merges: ExcelMergeRange[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

    rowsData.forEach((row, idx) => {
      const excelRowIdx = idx + 2;
      const mingguText = `Minggu ${row.sunday.mingguKe} (${String(row.sunday.dayNumber).padStart(2, '0')}/${String(row.sunday.tanggal.split('-')[1] || '').padStart(2, '0')})`;
      const pencapaianText = row.isHoliday
        ? row.holidayLabel || 'LIBURAN'
        : row.activeEntries.length > 0
        ? row.activeEntries
            .map((e) =>
              e.targetType === 'numeric'
                ? `${e.numericDisplayValue ?? '-'}`
                : e.targetText
            )
            .join(' | ')
        : '-';
      const materiText = row.isHoliday
        ? row.holidayLabel || 'LIBURAN'
        : row.primaryMateriLabel;

      aoa.push([
        `${row.monthName.toUpperCase()} ${row.year}`,
        mingguText,
        pencapaianText,
        materiText,
      ]);

      if (row.isFirstWeekOfMonth && row.monthWeekCount > 1) {
        merges.push({
          s: { r: excelRowIdx, c: 0 },
          e: { r: excelRowIdx + row.monthWeekCount - 1, c: 0 },
        });
      }

      const mSpan = materiSpans[idx];
      if (mSpan.renderCell && mSpan.rowSpan > 1) {
        merges.push({
          s: { r: excelRowIdx, c: 3 },
          e: { r: excelRowIdx + mSpan.rowSpan - 1, c: 3 },
        });
      }
    });

    return {
      name: pair.label,
      rows: aoa,
      merges,
      colWidths: [18, 22, 22, 34],
    };
  });

  if (sheets.length === 0) return;

  await exportAoaToExcel({
    filename: `Silabus_Muhafadzoh_${activeTingkat}_${startYear}-${startYear + 1}.xlsx`,
    sheets,
  });
}

export default function SilabusScheduleView({
  pairs,
  config,
  silabusConfig,
  holidaysMap,
  startYear,
  visibleMonthKeys,
  onOpenAturSilabus,
}: SilabusScheduleViewProps) {
  const academicMonths = useMemo(() => getAcademicYearMonths(startYear), [startYear]);
  const holidayCount = useMemo(
    () => Object.keys(holidaysMap || {}).length,
    [holidaysMap]
  );

  if (pairs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
        <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
        <div className="text-sm font-bold text-slate-700">
          Tidak ada kelas yang cocok dengan filter tingkat saat ini
        </div>
        <p className="text-xs text-slate-500">
          Ubah tab filter tingkat di atas atau periksa Pengaturan Target Muhafadzoh.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Strip Info Ringkas Silabus */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5 flex-wrap text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Jadwal Silabus Aktif ({pairs.length} Kelas)</span>
          </span>
          <span className="text-slate-600">
            Minggu per bulan otomatis menyesuaikan kalender riil (4 atau 5 minggu).
          </span>
          {holidayCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 font-bold text-[11px]">
              <CalendarOff className="w-3 h-3" />
              <span>{holidayCount} Minggu Liburan</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAturSilabus}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Sesuaikan Target &amp; Liburan</span>
        </button>
      </div>

      {/* Grid Tabel Silabus Per Kelas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4 items-start">
        {pairs.map((pair) => {
          const existing = silabusConfig[pair.key] || [];
          const rules = syncSilabusRulesWithConfig(existing, config, pair.key);
          const rows = buildClassSilabusRows(
            startYear,
            rules,
            holidaysMap,
            visibleMonthKeys
          );
          const materiSpans = computeMateriRowSpans(rows);
          const offsets = computeDisplayOffsetsForRules(rules, academicMonths, holidaysMap);

          // Ringkasan singkat materi di header kartu
          const summaryBadges = rules.map((r, rIdx) => {
            if (r.target_type === 'numeric') {
              const sched = computeNumericRuleSchedule(
                r,
                academicMonths,
                holidaysMap,
                offsets[rIdx]
              );
              const startNum = offsets[rIdx] + (r.target_mulai || 1);
              return {
                nama: r.materi_nama,
                kategori: r.kategori,
                detail: `${startNum}-${sched.plannedEndDisplay}`,
                hasShortfall: !sched.isSufficient,
              };
            }
            return {
              nama: r.materi_nama,
              kategori: r.kategori,
              detail: `${r.dari_bulan_nama || 'Jul'}-${r.sampai_bulan_nama || 'Jun'}`,
              hasShortfall: false,
            };
          });

          return (
            <div
              key={pair.key}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col"
            >
              {/* Header Kartu Kelas */}
              <div className="px-4 py-3 bg-emerald-800 text-white space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                    Silabus Muhafadzoh Kelas {pair.label}
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-emerald-50 font-semibold shrink-0">
                    TA {startYear}/{startYear + 1}
                  </span>
                </div>
                {summaryBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {summaryBadges.map((b, i) => (
                      <span
                        key={`${pair.key}_sum_${i}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          b.hasShortfall
                            ? 'bg-amber-100 text-amber-950 border-amber-300'
                            : 'bg-emerald-900/60 text-emerald-50 border-emerald-700'
                        }`}
                        title={
                          b.hasShortfall
                            ? 'Total minggu aktif x target/minggu belum mencapai target akhir'
                            : `${b.nama} (${b.kategori})`
                        }
                      >
                        <span className="truncate max-w-[140px]">{b.nama}</span>
                        <span className="font-mono opacity-90">({b.detail})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-100 italic">
                    Belum ada materi Wajib/Sunnah pada kelas ini.
                  </div>
                )}
              </div>

              {/* Tabel Silabus Mingguan */}
              {rules.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada materi hafalan di Pengaturan Target Muhafadzoh untuk kelas {pair.label}.
                </div>
              ) : rows.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tidak ada bulan yang dipilih pada filter bulan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-bold">
                        <th className="py-2 px-2.5 border-r border-slate-200 w-24">
                          BULAN
                        </th>
                        <th className="py-2 px-2 border-r border-slate-200 w-24 text-center">
                          MINGGU
                        </th>
                        <th className="py-2 px-2 border-r border-slate-200 w-24 text-center">
                          CAPAIAN
                        </th>
                        <th className="py-2 px-2.5">MATERI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rows.map((row, idx) => {
                        const mSpan = materiSpans[idx];
                        const isCurrWeek = row.sunday.isCurrentWeek;
                        const mm = row.sunday.tanggal.split('-')[1] || '';
                        const dd = String(row.sunday.dayNumber).padStart(2, '0');

                        return (
                          <tr
                            key={`${pair.key}_${row.sunday.tanggal}`}
                            className={
                              row.isHoliday
                                ? 'bg-rose-50/70'
                                : isCurrWeek
                                ? 'bg-amber-50/80'
                                : 'bg-white hover:bg-slate-50/80'
                            }
                          >
                            {/* Kolom Bulan (Row-span 4 atau 5 minggu otomatis) */}
                            {row.isFirstWeekOfMonth && (
                              <td
                                rowSpan={row.monthWeekCount}
                                className={`py-2 px-2.5 border-r border-slate-200 align-middle font-bold text-center ${
                                  row.isCurrentMonth
                                    ? 'bg-amber-100/70 text-amber-950'
                                    : 'bg-slate-50/70 text-slate-800'
                                }`}
                              >
                                <div className="uppercase tracking-tight text-[11px]">
                                  {row.monthName}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 font-normal">
                                  {row.monthWeekCount} Mg · {row.year}
                                </div>
                                {row.isCurrentMonth && (
                                  <span className="inline-block mt-1 px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-bold">
                                    Bulan Ini
                                  </span>
                                )}
                              </td>
                            )}

                            {/* Kolom Minggu Kalender Real */}
                            <td
                              className={`py-1.5 px-2 border-r border-slate-200 text-center whitespace-nowrap ${
                                isCurrWeek ? 'font-bold text-amber-900' : 'text-slate-700'
                              }`}
                            >
                              <div className="font-semibold">
                                Minggu {row.sunday.mingguKe}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                {dd}/{mm}
                              </div>
                            </td>

                            {/* Kolom Target Capaian atau LIBURAN */}
                            <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                              {row.isHoliday ? (
                                <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[10px] uppercase tracking-wider">
                                  {row.holidayLabel || 'LIBURAN'}
                                </span>
                              ) : row.activeEntries.length === 0 ? (
                                <span className="text-slate-300">-</span>
                              ) : (
                                <div className="space-y-0.5">
                                  {row.activeEntries.map((entry, eIdx) => (
                                    <div key={eIdx}>
                                      {entry.targetType === 'numeric' ? (
                                        <span className="inline-block font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 text-[11px]">
                                          {entry.numericDisplayValue ?? '-'}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-medium text-slate-600">
                                          Aktif
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Kolom Materi Hafalan (Row-span) */}
                            {mSpan.renderCell && (
                              <td
                                rowSpan={mSpan.rowSpan}
                                className={`py-2 px-2.5 align-middle text-center ${
                                  row.isHoliday ? 'bg-rose-50/40' : 'bg-white'
                                }`}
                              >
                                {row.isHoliday ? (
                                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                                    {row.holidayLabel || 'LIBURAN'}
                                  </span>
                                ) : row.activeEntries.length === 0 ? (
                                  <span className="text-[10px] text-slate-400 italic">
                                    Belum dijadwalkan
                                  </span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {row.activeEntries.map((entry, eIdx) => (
                                      <div
                                        key={eIdx}
                                        className="flex flex-col items-center gap-0.5"
                                      >
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                            entry.kategori === 'Wajib'
                                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                                          }`}
                                        >
                                          {entry.kategori}
                                        </span>
                                        <span className="font-bold text-slate-900 text-[11px] leading-snug">
                                          {entry.materiNama}
                                        </span>
                                        {entry.targetPreview && (
                                          <span className="text-[10px] text-slate-500 leading-tight">
                                            {entry.targetPreview}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
