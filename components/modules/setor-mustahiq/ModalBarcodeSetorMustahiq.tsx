'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { QrCode, Search, X } from 'lucide-react';
import { SantriSetorMustahiqRow } from '@/types/setor-mustahiq';
import { norm } from '@/lib/utils/setoranHelper';
import {
  buildSantriSetorMustahiqUrl,
  generateQrSvgPath,
} from '@/lib/utils/qrSvgGenerator';

interface ModalBarcodeSetorMustahiqProps {
  isOpen: boolean;
  onClose: () => void;
  allRows: SantriSetorMustahiqRow[];
  tahun: number;
  lockedMustahiqClass?: {
    tingkat: string;
    din_kls: string;
    din_bag: string;
    kelasKey: string;
    label: string;
    mustahiqName?: string;
  } | null;
}

type TingkatTab = 'ALL' | 'ULA' | 'WUSTHO' | 'ULYA';

function isMatchingTingkat(rowTingkat: string, tab: TingkatTab): boolean {
  if (tab === 'ALL') return true;
  const t = norm(rowTingkat);
  if (tab === 'WUSTHO') {
    return t === 'WUSTHO' || t === 'WUSTHA';
  }
  return t === tab;
}

const BarcodeCardItem = React.memo(function BarcodeCardItem({
  student,
  origin,
  tahun,
}: {
  student: SantriSetorMustahiqRow;
  origin: string;
  tahun: number;
}) {
  const qrUrl = useMemo(
    () => buildSantriSetorMustahiqUrl(origin, student.no_induk, tahun),
    [origin, student.no_induk, tahun]
  );

  const qrMatrix = useMemo(() => generateQrSvgPath(qrUrl), [qrUrl]);

  return (
    <div
      data-testid={`barcode-card-${student.no_induk}`}
      data-qr-url={qrUrl}
      className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col items-center justify-between text-center shadow-2xs select-none"
    >
      <div className="w-full max-w-[148px] aspect-square bg-white p-1.5 rounded-lg border border-slate-100 flex items-center justify-center">
        <svg
          viewBox={`0 0 ${qrMatrix.size} ${qrMatrix.size}`}
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Barcode setoran ${student.nama}`}
          className="w-full h-full"
        >
          <rect width={qrMatrix.size} height={qrMatrix.size} fill="#ffffff" />
          <path d={qrMatrix.path} fill="#0f172a" />
        </svg>
      </div>

      <p
        data-testid={`barcode-card-name-${student.no_induk}`}
        className="mt-2.5 text-xs font-bold text-slate-900 uppercase tracking-tight leading-snug line-clamp-2 break-words w-full"
      >
        {student.nama}
      </p>
    </div>
  );
});

export default function ModalBarcodeSetorMustahiq({
  isOpen,
  onClose,
  allRows,
  tahun,
  lockedMustahiqClass,
}: ModalBarcodeSetorMustahiqProps) {
  const [activeTingkat, setActiveTingkat] = useState<TingkatTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [origin, setOrigin] = useState('https://madinablokagung.vercel.app');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.origin) {
      setOrigin(window.location.origin);
    }
  }, []);

  // Kunci ke tingkatan Mustahiq apabila akun Mustahiq terkunci kelas
  useEffect(() => {
    if (isOpen && lockedMustahiqClass) {
      const tk = norm(lockedMustahiqClass.tingkat);
      if (tk === 'ULA') setActiveTingkat('ULA');
      else if (tk === 'WUSTHO' || tk === 'WUSTHA') setActiveTingkat('WUSTHO');
      else if (tk === 'ULYA') setActiveTingkat('ULYA');
    }
  }, [isOpen, lockedMustahiqClass]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Hitung jumlah santri per tingkatan untuk lencana pada tombol switch
  const countsByTingkat = useMemo(() => {
    const counts = {
      ALL: allRows.length,
      ULA: 0,
      WUSTHO: 0,
      ULYA: 0,
    };
    allRows.forEach((r) => {
      const tk = norm(r.tingkat);
      if (tk === 'ULA') counts.ULA++;
      else if (tk === 'WUSTHO' || tk === 'WUSTHA') counts.WUSTHO++;
      else if (tk === 'ULYA') counts.ULYA++;
    });
    return counts;
  }, [allRows]);

  // Saring dan kelompokkan kartu berdasarkan kelas masing-masing
  const groupedClasses = useMemo(() => {
    const q = norm(searchQuery);

    const filtered = allRows
      .filter((r) => {
        if (!isMatchingTingkat(r.tingkat, activeTingkat)) return false;
        if (q) {
          const matchNama = norm(r.nama).includes(q);
          const matchNis = norm(r.no_induk).includes(q);
          const matchKelas =
            norm(r.kelas_label).includes(q) || norm(r.short_kelas_badge).includes(q);
          if (!matchNama && !matchNis && !matchKelas) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const orderTk: Record<string, number> = { ULA: 1, WUSTHO: 2, WUSTHA: 2, ULYA: 3 };
        const tA = orderTk[norm(a.tingkat)] || 99;
        const tB = orderTk[norm(b.tingkat)] || 99;
        if (tA !== tB) return tA - tB;
        const kCmp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
        if (kCmp !== 0) return kCmp;
        const bCmp = a.din_bag.localeCompare(b.din_bag, 'id');
        if (bCmp !== 0) return bCmp;
        return a.nama.localeCompare(b.nama, 'id');
      });

    const map = new Map<
      string,
      {
        groupKey: string;
        shortBadge: string;
        kelasLabel: string;
        tingkat: string;
        students: SantriSetorMustahiqRow[];
      }
    >();

    filtered.forEach((row) => {
      const gKey = `${row.din_kls}_${row.tingkat}_${row.din_bag}`;
      if (!map.has(gKey)) {
        map.set(gKey, {
          groupKey: gKey,
          shortBadge: row.short_kelas_badge,
          kelasLabel: row.kelas_label,
          tingkat: row.tingkat,
          students: [],
        });
      }
      map.get(gKey)!.students.push(row);
    });

    return Array.from(map.values());
  }, [allRows, activeTingkat, searchQuery]);

  const totalFilteredStudents = useMemo(
    () => groupedClasses.reduce((acc, g) => acc + g.students.length, 0),
    [groupedClasses]
  );

  if (!isOpen) return null;

  const tabs: { id: TingkatTab; label: string; count: number }[] = [
    { id: 'ALL', label: 'Semua', count: countsByTingkat.ALL },
    { id: 'ULA', label: 'ULA', count: countsByTingkat.ULA },
    { id: 'WUSTHO', label: 'WUSTHO', count: countsByTingkat.WUSTHO },
    { id: 'ULYA', label: 'ULYA', count: countsByTingkat.ULYA },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-barcode-mustahiq-title"
      data-testid="modal-barcode-mustahiq"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header Pop-up */}
        <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="modal-barcode-mustahiq-title"
                className="text-base sm:text-lg font-bold text-slate-900 truncate"
              >
                Input Lewat Barcode Santri
              </h2>
              <p className="text-xs text-slate-500 truncate">
                Pindai barcode santri menggunakan kamera HP untuk langsung menuju input setoran hafalan
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="btn-close-barcode-modal"
            onClick={onClose}
            aria-label="Tutup pop-up barcode"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bilah Kontrol: Switch Tingkatan (Semua, ULA, WUSTHO, ULYA) & Pencarian */}
        <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Switch Tingkatan */}
          <div
            role="tablist"
            aria-label="Filter Tingkatan Kelas"
            className="inline-flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80"
          >
            {tabs.map((tab) => {
              const isActive = activeTingkat === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-testid={`switch-barcode-tingkat-${tab.id}`}
                  disabled={Boolean(lockedMustahiqClass && tab.id !== activeTingkat && tab.id !== 'ALL')}
                  onClick={() => setActiveTingkat(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isActive
                      ? 'bg-[#134e3a] text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive
                        ? 'bg-emerald-800/80 text-emerald-100'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Input Pencarian di dalam Pop-up */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="input-search-barcode-modal"
              placeholder="Cari nama santri atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
            />
            {searchQuery && (
              <button
                type="button"
                data-testid="btn-clear-search-barcode-modal"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Isi Pop-up: Kartu Barcode yang Dikelompokkan Sesuai Kelas Masing-Masing */}
        <div
          data-testid="barcode-modal-scroll-body"
          className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5"
        >
          {groupedClasses.length === 0 ? (
            <div
              data-testid="barcode-modal-empty"
              className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2"
            >
              <QrCode className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                Tidak ada kartu barcode santri yang ditemukan
              </p>
              <p className="text-xs text-slate-500">
                Coba ubah pilihan tingkatan (Semua / ULA / WUSTHO / ULYA) atau kata kunci pencarian.
              </p>
            </div>
          ) : (
            groupedClasses.map((group) => (
              <section
                key={group.groupKey}
                data-testid={`barcode-class-group-${group.groupKey}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden"
              >
                {/* Header Kelompok Kelas */}
                <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold">
                      {group.shortBadge}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                      Kelas {group.kelasLabel}
                    </h3>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600">
                    {group.students.length} Santri
                  </span>
                </div>

                {/* Grid Kartu Santri (Hanya Nama + Barcode) */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {group.students.map((student) => (
                    <BarcodeCardItem
                      key={student.no_induk}
                      student={student}
                      origin={origin}
                      tahun={tahun}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer Info Ringkas */}
        <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>
            Menampilkan <strong className="text-slate-800">{totalFilteredStudents}</strong> kartu santri dalam{' '}
            <strong className="text-slate-800">{groupedClasses.length}</strong> kelas
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
