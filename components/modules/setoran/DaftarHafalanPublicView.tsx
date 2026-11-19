'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BookMarked,
  Sparkles,
  Search,
  X,
  ChevronDown,
  CalendarClock,
  GraduationCap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { formatTargetPreview } from '@/lib/utils/setoranHelper';
import {
  buildDaftarHafalanGroups,
  FALLBACK_PUBLIC_HAFALAN_PAYLOAD,
  JENJANG_HAFALAN_META,
  JENJANG_HAFALAN_ORDER,
  JenjangHafalanSlug,
  KategoriHafalanPublic,
  PublicHafalanPayload,
} from '@/lib/utils/daftarHafalanPublicHelper';

interface DaftarHafalanPublicViewProps {
  jenjang: JenjangHafalanSlug;
}

const KATEGORI_BADGE_CLASS: Record<KategoriHafalanPublic, string> = {
  Wajib:
    'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800',
  Sunnah:
    'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800',
  Kitab:
    'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800',
  Wisuda:
    'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800',
};

export default function DaftarHafalanPublicView({ jenjang }: DaftarHafalanPublicViewProps) {
  const [payload, setPayload] = useState<PublicHafalanPayload>(FALLBACK_PUBLIC_HAFALAN_PAYLOAD);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKategori, setSelectedKategori] = useState<'all' | KategoriHafalanPublic>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSentences, setExpandedSentences] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    async function loadPublicHafalan() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_public_daftar_hafalan' as any);
        if (!active) return;

        if (!error && data && typeof data === 'object') {
          const obj = data as Partial<PublicHafalanPayload>;
          const hasWajib = obj.hafWajib && Object.keys(obj.hafWajib).length > 0;
          setPayload({
            hafWajib: hasWajib ? obj.hafWajib! : FALLBACK_PUBLIC_HAFALAN_PAYLOAD.hafWajib,
            hafSunnah: obj.hafSunnah || {},
            hafKitab: obj.hafKitab || {},
            hafWisuda: obj.hafWisuda || {},
            silabus: obj.silabus || {},
          });
        }
      } catch {
        // Fallback ke DEFAULT_HAFALAN_WAJIB
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadPublicHafalan();
    return () => {
      active = false;
    };
  }, []);

  const meta = JENJANG_HAFALAN_META[jenjang];

  const allGroups = useMemo(() => {
    return buildDaftarHafalanGroups(payload, jenjang);
  }, [payload, jenjang]);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allGroups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (selectedKategori !== 'all' && item.kategori !== selectedKategori) return false;
          if (q) {
            const matchName = item.nama.toLowerCase().includes(q);
            const matchSentences = item.detail.sentences?.some((s) =>
              s.toLowerCase().includes(q)
            );
            return matchName || Boolean(matchSentences);
          }
          return true;
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [allGroups, selectedKategori, searchQuery]);

  const totalMateri = useMemo(
    () => filteredGroups.reduce((sum, g) => sum + g.items.length, 0),
    [filteredGroups]
  );

  const toggleSentenceExpand = (id: string) => {
    setExpandedSentences((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-8">
      {/* Banner Header & Switcher Jenjang */}
      <section className="rounded-3xl bg-gradient-to-br from-emerald-950 via-[#0a443c] to-emerald-900 text-white p-6 sm:p-9 shadow-xl border border-emerald-800/60">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-300/30 text-amber-200 text-xs font-bold tracking-wide">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Kurikulum Muhafadzoh • Jenjang {meta.label}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight">
              {meta.judul}
            </h1>
            <p className="text-sm sm:text-base text-emerald-100/85 leading-relaxed">
              {meta.ringkasan}
            </p>
          </div>

          {/* Tab Link ULA / WUSTHO / ULYA */}
          <nav
            aria-label="Pilih Jenjang Hafalan"
            className="inline-flex p-1.5 rounded-2xl bg-emerald-950/70 border border-emerald-700/60 shrink-0 self-start lg:self-center"
          >
            {JENJANG_HAFALAN_ORDER.map((slug) => {
              const active = slug === jenjang;
              return (
                <Link
                  key={slug}
                  href={`/daftar-hafalan/${slug}`}
                  className={`min-h-[42px] inline-flex items-center px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
                    active
                      ? 'bg-amber-400 text-emerald-950 shadow-md'
                      : 'text-emerald-100 hover:text-white'
                  }`}
                >
                  {JENJANG_HAFALAN_META[slug].label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Toolbar Filter Kategori & Pencarian */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'Wajib', 'Sunnah', 'Kitab', 'Wisuda'] as const).map((kat) => (
            <button
              key={kat}
              type="button"
              onClick={() => setSelectedKategori(kat)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                selectedKategori === kat
                  ? 'bg-[#0b5751] text-white border-[#0b5751] shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {kat === 'all' ? 'Semua Kategori' : `Hafalan ${kat}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama kitab atau nadhom..."
              className="w-full min-h-[42px] pl-10 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-900 dark:text-emerald-300">
            <BookMarked className="w-3.5 h-3.5" />
            <span>{totalMateri} Materi</span>
          </span>
        </div>
      </div>

      {/* Konten Daftar Hafalan per Tingkat Kelas */}
      {isLoading && filteredGroups.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-44 rounded-2xl bg-slate-200/70 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
          <Sparkles className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            Belum ada materi hafalan pada filter yang dipilih.
          </p>
          <p className="text-xs text-slate-500">
            Pilih &ldquo;Semua Kategori&rdquo; atau bersihkan kata kunci pencarian.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGroups.map((group) => (
            <section
              key={group.tingkatKey}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-amber-50/50 dark:from-slate-800 dark:to-slate-800 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#0b5751] text-amber-300 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 dark:text-white font-serif">
                      {group.labelKelas}
                    </h2>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {group.items.length} Materi Target Hafalan
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
                {group.items.map((item) => {
                  const hasSentences =
                    item.detail.targetType === 'sentence' &&
                    Array.isArray(item.detail.sentences) &&
                    item.detail.sentences.length > 0;
                  const isExpanded = Boolean(expandedSentences[item.id]);

                  return (
                    <div key={item.id} className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                            {item.nama}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                KATEGORI_BADGE_CLASS[item.kategori]
                              }`}
                            >
                              {item.kategori}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {formatTargetPreview(item.detail)}
                            </span>
                            {item.silabusBulan && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300">
                                <CalendarClock className="w-3 h-3" />
                                <span>{item.silabusBulan}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {item.detail.keterangan && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.detail.keterangan}
                        </p>
                      )}

                      {hasSentences && (
                        <div>
                          <button
                            type="button"
                            onClick={() => toggleSentenceExpand(item.id)}
                            aria-expanded={isExpanded}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:underline cursor-pointer"
                          >
                            <span>
                              {isExpanded
                                ? 'Sembunyikan Rincian Butir'
                                : `Lihat Rincian ${item.detail.sentences!.length} Butir`}
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>

                          {isExpanded && (
                            <ol className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/70 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
                              {item.detail.sentences!.map((kalimat, kIdx) => (
                                <li key={`${item.id}-s-${kIdx}`} className="flex items-start gap-2">
                                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 w-5 shrink-0">
                                    {kIdx + 1}.
                                  </span>
                                  <span>{kalimat}</span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
