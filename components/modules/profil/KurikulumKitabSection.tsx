'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  BookOpen,
  Clock,
  GraduationCap,
  ScrollText,
  FileCheck2,
} from 'lucide-react';
import { useProfilKontenStore } from '@/stores/useProfilKontenStore';
import { renderProfilIcon } from '@/lib/utils/profilIconHelper';
import { useBerandaScroll } from './BerandaScrollProvider';

gsap.registerPlugin(ScrollTrigger);

export default function KurikulumKitabSection() {
  const berandaScroll = useBerandaScroll();
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const { sectionMeta, jenjangList, waktuKbmList, fetchProfilKonten } =
    useProfilKontenStore();

  const [activeJenjangId, setActiveJenjangId] = useState<string>('jen-ula');
  const [subView, setSubView] = useState<'kitab' | 'jadwal'>('kitab');

  useEffect(() => {
    fetchProfilKonten(false);
  }, [fetchProfilKonten]);

  useEffect(() => {
    const syncHashToSubView = () => {
      if (typeof window === 'undefined') return;
      if (window.location.hash === '#waktu-kbm') {
        setSubView('jadwal');
        requestAnimationFrame(() => {
          setTimeout(() => {
            if (berandaScroll) {
              berandaScroll.scrollToTarget('waktu-kbm', { offset: -64, duration: 0.9 });
            } else {
              document
                .getElementById('waktu-kbm')
                ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 60);
        });
      } else if (window.location.hash === '#kurikulum') {
        setSubView('kitab');
      }
    };

    syncHashToSubView();
    window.addEventListener('hashchange', syncHashToSubView);
    return () => window.removeEventListener('hashchange', syncHashToSubView);
  }, [berandaScroll]);

  useEffect(() => {
    if (typeof window === 'undefined' || hasAnimatedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      const revealEls = section.querySelectorAll('.js-kurikulum-reveal');
      if (revealEls.length === 0) return;

      ScrollTrigger.create({
        trigger: section,
        start: 'top 84%',
        once: true,
        onEnter: () => {
          if (hasAnimatedRef.current) return;
          hasAnimatedRef.current = true;
          gsap.fromTo(
            revealEls,
            { y: 20, opacity: 0.2 },
            {
              y: 0,
              opacity: 1,
              duration: 0.55,
              stagger: 0.08,
              ease: 'power2.out',
              clearProps: 'transform,opacity',
            }
          );
        },
      });
    }, section);

    return () => ctx.revert();
  }, [jenjangList.length, waktuKbmList.length]);

  const activeJenjangs = useMemo(
    () => jenjangList.filter((j) => j.is_active !== false),
    [jenjangList]
  );

  const currentJenjang = useMemo(() => {
    const found = activeJenjangs.find(
      (j) => j.id === activeJenjangId || j.kode_tab === activeJenjangId
    );
    if (found) return found;
    return activeJenjangs.find((j) => j.kode_tab === 'Ula') || activeJenjangs[0] || null;
  }, [activeJenjangs, activeJenjangId]);

  const activeWaktuKbm = useMemo(
    () => waktuKbmList.filter((w) => w.is_active !== false),
    [waktuKbmList]
  );

  const khazanahMeta = sectionMeta.khazanah_turats;

  return (
    <section
      ref={sectionRef}
      id="kurikulum"
      className="py-16 sm:py-24 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section: Khazanah Turats Salafiyah */}
        <div className="js-kurikulum-reveal text-center max-w-3xl mx-auto mb-10 sm:mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40 mb-3">
            {khazanahMeta.badge_label}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
            {khazanahMeta.judul}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {khazanahMeta.deskripsi}
          </p>

          {/* Toggle Switch: Daftar Kitab vs Waktu KBM */}
          <div className="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs">
            <button
              type="button"
              onClick={() => setSubView('kitab')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                subView === 'kitab'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Daftar Kitab Kuning</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('jadwal')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                subView === 'jadwal'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Waktu KBM Pesantren</span>
            </button>
          </div>
        </div>

        {subView === 'kitab' ? (
          <div>
            {/* Tab Selector Jenjang */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
              {activeJenjangs.map((jen) => {
                const isActive = currentJenjang?.id === jen.id;
                return (
                  <button
                    key={jen.id}
                    type="button"
                    onClick={() => setActiveJenjangId(jen.id)}
                    className={`px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border cursor-pointer ${
                      isActive
                        ? 'bg-[#073623] text-amber-300 border-amber-400/50 shadow-md scale-[1.03]'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500/40 hover:bg-emerald-50/30'
                    }`}
                  >
                    <GraduationCap
                      className={`w-4 h-4 ${
                        isActive ? 'text-amber-300' : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    />
                    <span>Jenjang {jen.kode_tab}</span>
                  </button>
                );
              })}
            </div>

            {currentJenjang && (
              <>
                {/* Banner Ringkasan Jenjang */}
                <div className="js-kurikulum-reveal mb-8 rounded-2xl bg-gradient-to-r from-[#073623] via-emerald-900 to-[#06291a] p-6 sm:p-8 text-white shadow-lg border border-emerald-500/20">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-800 pb-5 mb-5">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {currentJenjang.durasi && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            {currentJenjang.durasi}
                          </span>
                        )}
                        <h3 className="text-xl sm:text-2xl font-bold font-serif">
                          {currentJenjang.nama}
                        </h3>
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-100/90 mt-2 max-w-3xl leading-relaxed">
                        {currentJenjang.fokus}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
                      <ScrollText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300 block mb-0.5">
                          Target Muhafadzoh (Hafalan):
                        </span>
                        <span className="text-emerald-100">{currentJenjang.target_hafalan}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
                      <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-emerald-300 block mb-0.5">
                          Evaluasi &amp; Syarat Kenaikan:
                        </span>
                        <span className="text-emerald-100">{currentJenjang.ujian_akhir}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grid Kitab Kuning per Jenjang */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {currentJenjang.kitab_list.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="rounded-xl bg-white dark:bg-slate-800/90 p-5 border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {item.fan}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            {item.kelas}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {item.kitab}
                        </h4>
                        {item.kitabArab && (
                          <p
                            className="text-sm text-amber-700 dark:text-amber-300/90 font-serif font-semibold mt-1 mb-3 text-right"
                            dir="rtl"
                          >
                            {item.kitabArab}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between gap-2">
                        <span className="text-slate-500 dark:text-slate-400">Target Materi:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 text-right">
                          {item.target}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Subview Waktu KBM Pesantren */
          <div id="waktu-kbm" className="max-w-4xl mx-auto space-y-6">
            {activeWaktuKbm.map((sesi) => {
              const isMalam = sesi.tema === 'malam';
              const gridColsClass =
                sesi.slots.length >= 4
                  ? 'sm:grid-cols-4'
                  : sesi.slots.length === 2
                    ? 'sm:grid-cols-2'
                    : 'sm:grid-cols-3';

              if (isMalam) {
                return (
                  <div
                    key={sesi.id}
                    className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 text-white border border-emerald-500/30 shadow-lg"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 rounded-xl bg-emerald-700 text-amber-300 shadow-sm border border-emerald-500/40">
                        {renderProfilIcon(sesi.icon_name || 'Moon', 'w-6 h-6')}
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-white font-serif">
                          {sesi.judul}
                        </h3>
                        <span className="text-xs font-semibold text-emerald-300">
                          {sesi.rentang_waktu}
                        </span>
                      </div>
                    </div>
                    <div className={`grid grid-cols-1 ${gridColsClass} gap-4 text-xs sm:text-sm`}>
                      {sesi.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/80"
                        >
                          <span className="font-bold text-amber-300 block mb-1">
                            {slot.waktu}
                          </span>
                          <p className="text-emerald-100/90">{slot.keterangan}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={sesi.id}
                  className="rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-amber-50 to-orange-50/40 dark:from-slate-800 dark:to-slate-800/60 border border-amber-300/50 dark:border-amber-500/20 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-amber-500 text-white shadow-sm">
                      {renderProfilIcon(sesi.icon_name || 'Sun', 'w-6 h-6')}
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-serif">
                        {sesi.judul}
                      </h3>
                      <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {sesi.rentang_waktu}
                      </span>
                    </div>
                  </div>
                  <div className={`grid grid-cols-1 ${gridColsClass} gap-4 text-xs sm:text-sm`}>
                    {sesi.slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-slate-700"
                      >
                        <span className="font-bold text-amber-700 dark:text-amber-400 block mb-1">
                          {slot.waktu}
                        </span>
                        <p className="text-slate-600 dark:text-slate-300">{slot.keterangan}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
