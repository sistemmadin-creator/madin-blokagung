'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CheckCircle2 } from 'lucide-react';
import { useProfilKontenStore } from '@/stores/useProfilKontenStore';
import { MODEL_THEME_META } from '@/types/profil-konten';
import { renderProfilIcon } from '@/lib/utils/profilIconHelper';

gsap.registerPlugin(ScrollTrigger);

function animateCountUpElement(el: HTMLElement, rawValue: string) {
  const match = rawValue.trim().match(/^([^0-9]*)([0-9][0-9.]*)(.*)$/);
  if (!match) return;
  const [, prefix, numText, suffix] = match;
  const usesDotSeparator = numText.includes('.');
  const target = Number(numText.replace(/\./g, ''));
  if (!Number.isFinite(target) || target <= 0) return;

  const counter = { val: 0 };
  gsap.to(counter, {
    val: target,
    duration: 1.05,
    ease: 'power2.out',
    onUpdate: () => {
      const rounded = Math.round(counter.val);
      const formatted = usesDotSeparator ? rounded.toLocaleString('id-ID') : String(rounded);
      el.textContent = `${prefix}${formatted}${suffix}`;
    },
    onComplete: () => {
      el.textContent = rawValue;
    },
  });
}

export default function StatistikCounter() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const { sectionMeta, metrikList, modelList, fetchProfilKonten } = useProfilKontenStore();

  useEffect(() => {
    fetchProfilKonten(false);
  }, [fetchProfilKonten]);

  const metrikMeta = sectionMeta.metrik_lembaga;
  const modelMeta = sectionMeta.model_pembelajaran;
  const activeMetriks = metrikList.filter((m) => m.is_active !== false);
  const activeModels = modelList.filter((m) => m.is_active !== false);

  useEffect(() => {
    if (typeof window === 'undefined' || hasAnimatedRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = sectionRef.current;
    if (!section || (activeMetriks.length === 0 && activeModels.length === 0)) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 84%',
        once: true,
        onEnter: () => {
          if (hasAnimatedRef.current) return;
          hasAnimatedRef.current = true;

          const statCards = section.querySelectorAll('.js-stat-card');
          if (statCards.length > 0) {
            gsap.fromTo(
              statCards,
              { y: 22, opacity: 0.2 },
              {
                y: 0,
                opacity: 1,
                duration: 0.5,
                stagger: 0.07,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
              }
            );
          }

          section.querySelectorAll<HTMLElement>('.js-stat-value').forEach((el) => {
            const raw = el.dataset.rawValue;
            if (raw) animateCountUpElement(el, raw);
          });

          const pilarCards = section.querySelectorAll('.js-pilar-card');
          if (pilarCards.length > 0) {
            gsap.fromTo(
              pilarCards,
              { y: 24, opacity: 0.2 },
              {
                y: 0,
                opacity: 1,
                duration: 0.55,
                stagger: 0.09,
                ease: 'power2.out',
                clearProps: 'transform,opacity',
                scrollTrigger: {
                  trigger: '#program',
                  start: 'top 86%',
                  once: true,
                },
              }
            );
          }
        },
      });
    }, section);

    return () => ctx.revert();
  }, [activeMetriks.length, activeModels.length]);

  return (
    <section
      ref={sectionRef}
      id="statistik"
      className="py-16 sm:py-24 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section: Skala & Metrik Lembaga */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40 mb-3">
            {metrikMeta.badge_label}
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-serif tracking-tight">
            {metrikMeta.judul}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300">
            {metrikMeta.deskripsi}
          </p>
        </div>

        {/* Kartu Metrik Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeMetriks.map((item) => (
            <div
              key={item.id}
              className="js-stat-card relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm hover:shadow-md border border-slate-200/80 dark:border-slate-700/80 transition-all hover:-translate-y-1 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.accent} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}
                >
                  {renderProfilIcon(item.icon_name, 'w-6 h-6')}
                </div>
                {item.badge && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {item.badge}
                  </span>
                )}
              </div>
              <h3
                data-raw-value={item.value}
                className="js-stat-value text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight font-serif mb-1"
              >
                {item.value}
              </h3>
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                {item.label}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{item.sublabel}</p>
            </div>
          ))}
        </div>

        {/* 3 Pilar Program Pendidikan / Model Pembelajaran */}
        <div id="program" className="mt-16 sm:mt-20">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300/40 mb-2">
              {modelMeta.badge_label}
            </span>
            <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white font-serif">
              {modelMeta.judul}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              {modelMeta.deskripsi}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {activeModels.map((pilar) => {
              const themeClass =
                MODEL_THEME_META[pilar.color_theme]?.cardClass ||
                MODEL_THEME_META.emerald.cardClass;
              return (
                <div
                  key={pilar.id}
                  className={`js-pilar-card rounded-2xl p-6 sm:p-7 border backdrop-blur-sm transition-all hover:shadow-md ${themeClass} flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/50 dark:border-slate-700/50">
                        {renderProfilIcon(
                          pilar.icon_name,
                          'w-6 h-6 text-emerald-700 dark:text-amber-400'
                        )}
                      </div>
                      {pilar.badge && (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-800/80 shadow-2xs border border-current/20">
                          {pilar.badge}
                        </span>
                      )}
                    </div>
                    <h4 className="text-lg sm:text-xl font-bold mb-2 font-serif text-slate-900 dark:text-white">
                      {pilar.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      {pilar.deskripsi}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    {pilar.features.map((feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
