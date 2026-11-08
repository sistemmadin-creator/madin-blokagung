'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  getSundaysInMonth,
  MONTH_NAMES_INDONESIA,
  SundayOption,
  getClosestSunday,
} from '@/lib/utils/sundayHelper';

interface SundayDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (dateIso: string) => void;
  className?: string;
  label?: string;
  disabled?: boolean;
}

export const SundayDatePicker: React.FC<SundayDatePickerProps> = ({
  value,
  onChange,
  className = '',
  label = 'Tanggal Setor (Hari Minggu)',
  disabled = false,
}) => {
  // Parsing tahun dan bulan dari nilai yang dipilih, atau fallback hari ini
  const parsedDate = useMemo(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0], 10),
          monthIndex: parseInt(parts[1], 10) - 1,
        };
      }
    }
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
    };
  }, [value]);

  const [activeYear, setActiveYear] = useState<number>(parsedDate.year);
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(parsedDate.monthIndex);

  // Sync state internal jika value dari luar berubah drastis
  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setActiveYear(y);
          setActiveMonthIndex(m);
        }
      }
    }
  }, [value]);

  // Dapatkan seluruh hari Minggu pada bulan & tahun yang aktif
  const sundays = useMemo(() => {
    return getSundaysInMonth(activeYear, activeMonthIndex);
  }, [activeYear, activeMonthIndex]);

  // Jika nilai saat ini bukan hari Minggu pada bulan aktif, berikan opsi terdekat
  useEffect(() => {
    if (!value || sundays.length === 0) return;
    const isValInSundays = sundays.some((s) => s.tanggal === value);
    // Jika value belum diatur atau bukan salah satu hari Minggu di bulan ini, kita pilihkan otomatis
    if (!isValInSundays) {
      const closest = getClosestSunday(sundays);
      if (closest) {
        onChange(closest.tanggal);
      }
    }
  }, [sundays, value, onChange]);

  // Navigasi Bulan
  const handlePrevMonth = () => {
    if (activeMonthIndex === 0) {
      setActiveMonthIndex(11);
      setActiveYear((y) => y - 1);
    } else {
      setActiveMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (activeMonthIndex === 11) {
      setActiveMonthIndex(0);
      setActiveYear((y) => y + 1);
    } else {
      setActiveMonthIndex((m) => m + 1);
    }
  };

  const selectedSundayObj = sundays.find((s) => s.tanggal === value);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-700 tracking-tight">
            {label}
          </label>
          {selectedSundayObj && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
              {selectedSundayObj.labelSingkat}
            </span>
          )}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xs space-y-2.5">
        {/* Header Navigasi Bulan & Tahun */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={disabled}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-700" />
            <select
              value={activeMonthIndex}
              onChange={(e) => setActiveMonthIndex(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-none focus:text-emerald-800"
            >
              {MONTH_NAMES_INDONESIA.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={activeYear}
              onChange={(e) => setActiveYear(parseInt(e.target.value, 10))}
              disabled={disabled}
              className="bg-transparent font-bold text-slate-800 cursor-pointer focus:outline-none focus:text-emerald-800"
            >
              {[2024, 2025, 2026, 2027, 2028].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={disabled}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-40"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Pill Tombol Hari Minggu (Otomatis 4 atau 5 Minggu) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
          {sundays.map((s) => {
            const isSelected = s.tanggal === value;
            return (
              <button
                key={s.tanggal}
                type="button"
                onClick={() => onChange(s.tanggal)}
                disabled={disabled}
                className={`relative px-2 py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs border border-emerald-800'
                    : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[11px]">Minggu {s.mingguKe}</span>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span
                  className={`text-[10px] ${
                    isSelected ? 'text-emerald-100' : 'text-slate-500 font-mono'
                  }`}
                >
                  {s.dayNumber} {MONTH_NAMES_INDONESIA[activeMonthIndex].slice(0, 3)}
                </span>
                {s.isCurrentWeek && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* Dropdown ringkas untuk perangkat layar sentuh kecil / alternatif */}
        <div className="pt-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
          >
            {sundays.map((s) => (
              <option key={s.tanggal} value={s.tanggal}>
                {s.labelLengkap} {s.tanggal === value ? '✓ (Terpilih)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default SundayDatePicker;
