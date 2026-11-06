'use client';

import React, { useMemo, useState } from 'react';
import { BarChart2, CheckCircle2 } from 'lucide-react';
import { TimeRangeFilter } from './DashboardHeader';
import {
  buildMonthlyDailyChartPoints,
  buildWeeklyChartPoints,
  ChartPoint,
} from '@/stores/useDashboardStore';

interface AbsensiTrendLineChartProps {
  timeRange: TimeRangeFilter;
  points?: ChartPoint[];
  avgHadir?: number;
}

export default function AbsensiTrendLineChart({
  timeRange,
  points: externalPoints,
  avgHadir = 96.4,
}: AbsensiTrendLineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const data: ChartPoint[] = useMemo(() => {
    if (externalPoints && externalPoints.length > 0) {
      return externalPoints;
    }
    switch (timeRange) {
      case 'hari_ini':
        return [
          { label: 'Jam 1', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Jam 2', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Jam 3', hadir: 95, izin: 4, alfa: 1, total: 100 },
          { label: 'Jam 4', hadir: 96, izin: 3, alfa: 1, total: 100 },
        ];
      case 'seminggu':
        return buildWeeklyChartPoints();
      case 'sebulan':
        return buildMonthlyDailyChartPoints();
      case 'setahun':
        return [
          { label: 'Jul', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Agu', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Sep', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Okt', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Nov', hadir: 95, izin: 3, alfa: 2, total: 100 },
          { label: 'Des', hadir: 94, izin: 4, alfa: 2, total: 100 },
          { label: 'Jan', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Feb', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Mar', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Apr', hadir: 93, izin: 5, alfa: 2, total: 100 },
          { label: 'Mei', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Jun', hadir: 98, izin: 2, alfa: 0, total: 100 },
        ];
      default:
        return [];
    }
  }, [externalPoints, timeRange]);

  // Koordinat SVG
  const chartWidth = 640;
  const chartHeight = timeRange === 'sebulan' ? 245 : 230;
  const paddingX = 42;
  const paddingTop = 24;
  const paddingBottom = timeRange === 'sebulan' ? 54 : 42;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingTop - paddingBottom;

  const minY = 80;
  const maxY = 100;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingX + availableWidth / 2;
    return paddingX + (index / (data.length - 1)) * availableWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    const normalized = (clamped - minY) / (maxY - minY);
    return chartHeight - paddingBottom - normalized * availableHeight;
  };

  const hadirPoints = data.map((d, i) => `${getX(i)},${getY(d.hadir)}`);
  const hadirPath = hadirPoints.length > 0 ? `M${hadirPoints.join(' L')}` : '';
  const hadirAreaPath =
    hadirPoints.length > 0
      ? `${hadirPath} L${getX(data.length - 1)},${
          chartHeight - paddingBottom
        } L${getX(0)},${chartHeight - paddingBottom} Z`
      : '';

  // Kelompok Pekan 1 s/d Pekan 4 khusus mode 30 Hari (sebulan)
  const pekanSegments = useMemo(() => {
    if (timeRange !== 'sebulan' || data.length === 0) return [];
    const groups: Array<{
      pekan: 'Pekan 1' | 'Pekan 2' | 'Pekan 3' | 'Pekan 4';
      startIndex: number;
      endIndex: number;
      startDateLabel: string;
      endDateLabel: string;
      avgHadir: number;
    }> = [];

    const pekanNames: Array<'Pekan 1' | 'Pekan 2' | 'Pekan 3' | 'Pekan 4'> = [
      'Pekan 1',
      'Pekan 2',
      'Pekan 3',
      'Pekan 4',
    ];

    pekanNames.forEach((pk) => {
      const indices: number[] = [];
      data.forEach((pt, idx) => {
        if (pt.pekanLabel === pk) indices.push(idx);
      });
      if (indices.length > 0) {
        const firstIdx = indices[0];
        const lastIdx = indices[indices.length - 1];
        const sumHadir = indices.reduce((acc, i) => acc + data[i].hadir, 0);
        const avg = Math.round((sumHadir / indices.length) * 10) / 10;
        groups.push({
          pekan: pk,
          startIndex: firstIdx,
          endIndex: lastIdx,
          startDateLabel: data[firstIdx].label,
          endDateLabel: data[lastIdx].label,
          avgHadir: avg,
        });
      }
    });

    return groups;
  }, [data, timeRange]);

  return (
    <div
      data-testid="dashboard-attendance-chart"
      className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between h-full"
    >
      <div>
        {/* Header Widget */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-teal-50 text-teal-700">
                <BarChart2 className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Tren Kehadiran & Kedisiplinan Asatidz
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tingkat kehadiran guru per sesi mengajar pada rentang{' '}
              {timeRange.replace('_', ' ')}
            </p>
          </div>

          {/* Legenda Indikator */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3 h-1 bg-teal-700 rounded-full" />
              <span>Hadir (Target ≥90%)</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3 h-1 bg-amber-500 rounded-full" />
              <span>Izin/Sakit</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-3 h-1 bg-rose-500 rounded-full" />
              <span>Alfa</span>
            </div>
          </div>
        </div>

        {/* Canvas SVG Linechart */}
        <div className="relative w-full h-[240px] select-none">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="hadirGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Garis Grid Horizontal & Label Sumbu Y */}
            {[80, 85, 90, 95, 100].map((tick) => {
              const yPos = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={paddingX}
                    y1={yPos}
                    x2={chartWidth - paddingX}
                    y2={yPos}
                    stroke={tick === 90 ? '#f59e0b' : '#e2e8f0'}
                    strokeDasharray={tick === 90 ? '4 3' : '2 2'}
                    strokeWidth={tick === 90 ? '1.5' : '1'}
                  />
                  <text
                    x={paddingX - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    className="text-[10px] fill-slate-400 font-medium"
                  >
                    {tick}%
                  </text>
                  {tick === 90 && (
                    <text
                      x={chartWidth - paddingX + 5}
                      y={yPos + 3}
                      className="text-[9px] fill-amber-600 font-semibold"
                    >
                      Batas Aman
                    </text>
                  )}
                </g>
              );
            })}

            {/* Pembatas Vertikal & Label Pekan 1 s/d Pekan 4 pada Sumbu Horizontal (Mode 30 Hari) */}
            {timeRange === 'sebulan' &&
              pekanSegments.map((seg, idx) => {
                const startX = getX(seg.startIndex);
                const endX = getX(seg.endIndex);
                const centerX = (startX + endX) / 2;
                const dividerX =
                  idx > 0
                    ? (getX(seg.startIndex - 1) + startX) / 2
                    : null;

                return (
                  <g
                    key={seg.pekan}
                    data-testid={`chart-pekan-group-${idx + 1}`}
                  >
                    {dividerX !== null && (
                      <line
                        x1={dividerX}
                        y1={paddingTop}
                        x2={dividerX}
                        y2={chartHeight - 10}
                        stroke="#cbd5e1"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                    )}
                    {/* Garis Rentang Pekan di Bawah Indikator Tanggal */}
                    <line
                      x1={startX}
                      y1={chartHeight - 22}
                      x2={endX}
                      y2={chartHeight - 22}
                      stroke="#0f766e"
                      strokeOpacity="0.35"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Label Pekan 1 s/d Pekan 4 beserta rentang tanggal */}
                    <text
                      x={centerX}
                      y={chartHeight - 7}
                      textAnchor="middle"
                      className="text-[10px] fill-teal-900 font-extrabold"
                    >
                      {seg.pekan} ({seg.startDateLabel} - {seg.endDateLabel})
                    </text>
                  </g>
                );
              })}

            {/* Area Transparan Bawah Hadir */}
            {hadirAreaPath && (
              <path d={hadirAreaPath} fill="url(#hadirGradient)" />
            )}

            {/* Garis Linechart Utama (Hadir) */}
            {hadirPath && (
              <path
                d={hadirPath}
                fill="none"
                stroke="#0f766e"
                strokeWidth={timeRange === 'sebulan' ? '2' : '2.5'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Titik Data Poin & Label Sumbu Horizontal (X) */}
            {data.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.hadir);
              const isHovered = hoveredIndex === i;
              const isMonthly = timeRange === 'sebulan';
              const isWeekly = timeRange === 'seminggu';

              return (
                <g key={`${d.label}-${i}`}>
                  {/* Area sentuh hover / klik */}
                  <circle
                    data-testid={`chart-point-${i}`}
                    cx={cx}
                    cy={cy}
                    r={isMonthly ? 9 : 16}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onClick={() => setHoveredIndex(isHovered ? null : i)}
                  />

                  {/* Titik Hadir Visual */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered ? 5.5 : isMonthly ? 2.8 : 4}
                    className="pointer-events-none transition-all fill-white stroke-teal-700 stroke-2"
                  />

                  {/* Sumbu Horizontal Mode 7 Hari: Nama Hari + Tanggal di Bawahnya */}
                  {isWeekly && (
                    <g data-testid={`chart-xaxis-weekly-${i}`}>
                      <text
                        x={cx}
                        y={chartHeight - 22}
                        textAnchor="middle"
                        className={`text-[10px] font-bold transition-colors ${
                          isHovered ? 'fill-teal-800' : 'fill-slate-700'
                        }`}
                      >
                        {d.label}
                      </text>
                      <text
                        x={cx}
                        y={chartHeight - 8}
                        textAnchor="middle"
                        className={`text-[9.5px] font-semibold transition-colors ${
                          isHovered ? 'fill-teal-700 font-bold' : 'fill-slate-400'
                        }`}
                      >
                        {d.subLabel}
                      </text>
                    </g>
                  )}

                  {/* Sumbu Horizontal Mode 30 Hari: Indikator Tiap Tanggal (01..31) di Atas Baris Pekan 1-4 */}
                  {isMonthly && (
                    <g data-testid={`chart-xaxis-monthly-date-${i}`}>
                      <line
                        x1={cx}
                        y1={chartHeight - paddingBottom}
                        x2={cx}
                        y2={chartHeight - paddingBottom + 4}
                        stroke={isHovered ? '#0f766e' : '#cbd5e1'}
                        strokeWidth={isHovered ? '1.5' : '1'}
                      />
                      <text
                        x={cx}
                        y={chartHeight - 31}
                        textAnchor="middle"
                        className={`text-[8px] transition-colors ${
                          isHovered
                            ? 'fill-teal-800 font-extrabold'
                            : 'fill-slate-500 font-semibold'
                        }`}
                      >
                        {d.dayNumber || d.label}
                      </text>
                    </g>
                  )}

                  {/* Sumbu Horizontal Mode Hari Ini & 1 Tahun */}
                  {!isWeekly && !isMonthly && (
                    <text
                      x={cx}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className={`text-[10px] font-semibold transition-colors ${
                        isHovered ? 'fill-teal-800 font-bold' : 'fill-slate-500'
                      }`}
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip Info saat Hover */}
          {hoveredIndex !== null && data[hoveredIndex] && (
            <div
              className="absolute z-20 bg-slate-900 text-white text-xs rounded-xl py-2 px-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full"
              style={{
                left: `${(getX(hoveredIndex) / chartWidth) * 100}%`,
                top: `${getY(data[hoveredIndex].hadir) - 10}px`,
              }}
            >
              <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-amber-300 whitespace-nowrap">
                {data[hoveredIndex].fullDateLabel ||
                  (data[hoveredIndex].subLabel
                    ? `${data[hoveredIndex].label} (${data[hoveredIndex].subLabel})`
                    : data[hoveredIndex].label)}
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-300">Tingkat Hadir:</span>
                <span className="font-bold text-emerald-400">
                  {data[hoveredIndex].hadir}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-300">Izin / Sakit:</span>
                <span className="font-bold text-amber-300">
                  {data[hoveredIndex].izin}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-300">Alfa:</span>
                <span className="font-bold text-rose-400">
                  {data[hoveredIndex].alfa}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Strip Indikator Hari & Tanggal saat Filter 7 Hari Aktif */}
        {timeRange === 'seminggu' && data.length > 0 && (
          <div
            data-testid="chart-weekly-date-strip"
            className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2 pt-2 border-t border-slate-100"
          >
            {data.map((pt, idx) => (
              <div
                key={`${pt.label}-${idx}`}
                data-testid={`chart-weekly-badge-${idx}`}
                className="px-2 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 flex flex-col items-center text-center"
              >
                <span className="text-[11px] font-extrabold text-slate-800">
                  {pt.label}
                </span>
                <span className="text-[10px] font-semibold text-teal-700">
                  {pt.subLabel}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Strip Ringkasan Pekan 1 s/d Pekan 4 saat Filter 30 Hari Aktif */}
        {timeRange === 'sebulan' && pekanSegments.length > 0 && (
          <div
            data-testid="chart-pekan-summary-strip"
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-100"
          >
            {pekanSegments.map((seg, idx) => (
              <div
                key={seg.pekan}
                data-testid={`chart-pekan-badge-${idx + 1}`}
                className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-between text-[11px]"
              >
                <div>
                  <span className="font-extrabold text-slate-800 block">
                    {seg.pekan}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {seg.startDateLabel} - {seg.endDateLabel}
                  </span>
                </div>
                <span className="font-extrabold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/60">
                  {seg.avgHadir}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ringkasan Kesimpulan Cepat */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>
            Rata-rata kehadiran berada di level <strong>{avgHadir}%</strong> (di
            atas target 90%)
          </span>
        </div>
        <span className="text-slate-400 text-[11px]">
          Sumber: Presensi Harian Asatidz
        </span>
      </div>
    </div>
  );
}
