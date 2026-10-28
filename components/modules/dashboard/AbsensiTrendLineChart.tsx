'use client';

import React, { useState } from 'react';
import { BarChart2, Info, CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';
import { TimeRangeFilter } from './DashboardHeader';

interface ChartPoint {
  label: string;
  hadir: number;
  izin: number;
  alfa: number;
  total: number;
}

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

  // Data dinamis berdasarkan filter rentang waktu
  const getChartData = (): ChartPoint[] => {
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
        return [
          { label: 'Sabtu', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Ahad', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Senin', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Selasa', hadir: 95, izin: 3, alfa: 2, total: 100 },
          { label: 'Rabu', hadir: 97, izin: 2, alfa: 1, total: 100 },
          { label: 'Kamis', hadir: 94, izin: 4, alfa: 2, total: 100 },
        ];
      case 'sebulan':
        return [
          { label: 'Pekan 1', hadir: 96, izin: 3, alfa: 1, total: 100 },
          { label: 'Pekan 2', hadir: 98, izin: 2, alfa: 0, total: 100 },
          { label: 'Pekan 3', hadir: 95, izin: 4, alfa: 1, total: 100 },
          { label: 'Pekan 4', hadir: 97, izin: 2, alfa: 1, total: 100 },
        ];
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
  };

  const data = getChartData();

  // Koordinat SVG
  const chartWidth = 600;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 30;
  const availableWidth = chartWidth - paddingX * 2;
  const availableHeight = chartHeight - paddingY * 2;

  // Skala sumbu Y: 80% s/d 100% agar fluktuasi terlihat jelas dan bermakna
  const minY = 80;
  const maxY = 100;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingX + availableWidth / 2;
    return paddingX + (index / (data.length - 1)) * availableWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    const normalized = (clamped - minY) / (maxY - minY);
    return chartHeight - paddingY - normalized * availableHeight;
  };

  // Bangun path garis Hadir
  const hadirPoints = data.map((d, i) => `${getX(i)},${getY(d.hadir)}`);
  const hadirPath = `M${hadirPoints.join(' L')}`;

  // Bangun area fill hadir
  const hadirAreaPath = `${hadirPath} L${getX(data.length - 1)},${chartHeight - paddingY} L${getX(0)},${chartHeight - paddingY} Z`;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
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
              Tingkat kehadiran guru per sesi mengajar pada rentang {timeRange.replace('_', ' ')}
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
        <div className="relative w-full h-[220px] select-none">
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

            {/* Area Transparan Bawah Hadir */}
            <path d={hadirAreaPath} fill="url(#hadirGradient)" />

            {/* Garis Linechart Utama (Hadir) */}
            <path
              d={hadirPath}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Titik Data Poin & Interaktivitas */}
            {data.map((d, i) => {
              const cx = getX(i);
              const cy = getY(d.hadir);
              const isHovered = hoveredIndex === i;

              return (
                <g key={d.label}>
                  {/* Invisible larger hit area for reliable hover and mobile tap */}
                  <circle
                    data-testid={`chart-point-${i}`}
                    cx={cx}
                    cy={cy}
                    r={16}
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
                    r={isHovered ? 6 : 4}
                    className="pointer-events-none transition-all fill-white stroke-teal-700 stroke-2 hover:stroke-[3]"
                  />

                  {/* Label Sumbu X */}
                  <text
                    x={cx}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className={`text-[10px] font-semibold transition-colors ${
                      isHovered ? 'fill-teal-800 font-bold' : 'fill-slate-500'
                    }`}
                  >
                    {d.label}
                  </text>
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
              <div className="font-bold border-b border-slate-700 pb-1 mb-1 text-amber-300">
                {data[hoveredIndex].label}
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-300">Tingkat Hadir:</span>
                <span className="font-bold text-emerald-400">{data[hoveredIndex].hadir}%</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-300">Izin / Sakit:</span>
                <span className="font-bold text-amber-300">{data[hoveredIndex].izin}%</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-slate-300">Alfa:</span>
                <span className="font-bold text-rose-400">{data[hoveredIndex].alfa}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Kesimpulan Cepat */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Rata-rata kehadiran berada di level <strong>{avgHadir}%</strong> (di atas target 90%)</span>
        </div>
        <span className="text-slate-400 text-[11px]">Sumber: Presensi Harian Asatidz</span>
      </div>
    </div>
  );
}
