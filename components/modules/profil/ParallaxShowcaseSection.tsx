'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, BookOpenCheck, Compass, GraduationCap, ScrollText } from 'lucide-react';
import { useMutakhorijinStore } from '@/stores/useMutakhorijinStore';
import { getPublicNavbarAlbums, sanitizeMutakhorijinPhotoUrl } from '@/types/mutakhorijin';
import { useBerandaScroll } from './BerandaScrollProvider';

gsap.registerPlugin(ScrollTrigger);

interface ParallaxScene {
  id: number;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  ctaLabel: string;
  ctaHref: string;
  isRoute?: boolean;
  icon: 'santri' | 'muhafadzoh' | 'mutakhorijin';
}

const DEFAULT_MUTAKHORIJIN_IMAGE = '/images/parallax/scene-drone-kompleks.webp';

function buildScenes(mutakhorijinImage: string): readonly ParallaxScene[] {
  return [
    {
      id: 0,
      eyebrow: 'DISIPLIN HARIAN SANTRI',
      title: 'Menjaga Tradisi Keilmuan di Setiap Saf Pelataran',
      description:
        'Kegiatan musyawarah, mutholaah, dan pembiasaan adab sebelum masuk kelas membentuk karakter santri yang tekun menjaga sanad bacaan salafiyah.',
      image: '/images/parallax/scene-santri-pelataran.webp',
      imageAlt: 'Santri Madrasah Diniyyah Al-Amiriyyah duduk rapi membaca kitab di pelataran',
      ctaLabel: 'Lihat Model Pembelajaran',
      ctaHref: '#program',
      icon: 'santri',
    },
    {
      id: 1,
      eyebrow: 'MUHAFADZOH',
      title: 'Daftar Target Hafalan Santri Jenjang Ula hingga Ulya',
      description:
        'Telusuri target hafalan wajib, sunnah, kitab, dan wisuda di setiap kelas pada jenjang Ula, Wustho, dan Ulya Madrasah Diniyyah Al-Amiriyyah.',
      image: '/images/parallax/scene-panggung-balkon.webp',
      imageAlt: 'Pembinaan hafalan dan kegiatan santri Madrasah Diniyyah Al-Amiriyyah Blokagung',
      ctaLabel: 'Lihat Daftar Hafalan',
      ctaHref: '/daftar-hafalan/ula',
      isRoute: true,
      icon: 'muhafadzoh',
    },
    {
      id: 2,
      eyebrow: 'MUTAKHORIJIN',
      title: 'Album Kenangan & Jejak Khidmah Mutakhorijin',
      description:
        'Mendokumentasikan perjalanan takror, syawir, hingga tasyakuran kelulusan purna Ulya yang merawat sanad keilmuan dan persaudaraan santri.',
      image: mutakhorijinImage,
      imageAlt: 'Album kenangan Mutakhorijin Madrasah Diniyyah Al-Amiriyyah Blokagung',
      ctaLabel: 'Buka Album Mutakhorijin',
      ctaHref: '/mutakhorijin',
      isRoute: true,
      icon: 'mutakhorijin',
    },
  ];
}

function renderSceneIcon(icon: ParallaxScene['icon']) {
  switch (icon) {
    case 'santri':
      return <BookOpenCheck className="w-4 h-4 text-emerald-700 dark:text-amber-300" />;
    case 'muhafadzoh':
      return <ScrollText className="w-4 h-4 text-emerald-700 dark:text-amber-300" />;
    case 'mutakhorijin':
      return <GraduationCap className="w-4 h-4 text-emerald-700 dark:text-amber-300" />;
  }
}

export default function ParallaxShowcaseSection() {
  const berandaScroll = useBerandaScroll();
  const { albums, hasFetched: hasFetchedMutakhorijin, fetchMutakhorijin } = useMutakhorijinStore();
  const desktopSectionRef = useRef<HTMLElement | null>(null);
  const desktopImageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const mobileBandRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [activeScene, setActiveScene] = useState<number>(0);

  useEffect(() => {
    if (!hasFetchedMutakhorijin) {
      void fetchMutakhorijin(false);
    }
  }, [hasFetchedMutakhorijin, fetchMutakhorijin]);

  const activeMutakhorijinImage = useMemo(() => {
    const activeAlbum = getPublicNavbarAlbums(albums, 1)[0];
    const cleanUrl = sanitizeMutakhorijinPhotoUrl(activeAlbum?.hero_image_url);
    return cleanUrl || DEFAULT_MUTAKHORIJIN_IMAGE;
  }, [albums]);

  const scenes = useMemo(() => buildScenes(activeMutakhorijinImage), [activeMutakhorijinImage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqMobile = window.matchMedia('(max-width: 767px)');

    const syncFlags = () => {
      setPrefersReducedMotion(mqMotion.matches);
      setIsMobile(mqMobile.matches);
    };

    syncFlags();
    mqMotion.addEventListener('change', syncFlags);
    mqMobile.addEventListener('change', syncFlags);
    return () => {
      mqMotion.removeEventListener('change', syncFlags);
      mqMobile.removeEventListener('change', syncFlags);
    };
  }, []);

  // Desktop Opsi 1: Sticky Multi-Layer Depth Parallax
  useEffect(() => {
    if (typeof window === 'undefined' || isMobile || prefersReducedMotion) return;
    const section = desktopSectionRef.current;
    if (!section) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.55,
        onUpdate: (self) => {
          const p = Math.min(1, Math.max(0, self.progress));

          if (p < 0.36) {
            setActiveScene(0);
          } else if (p < 0.7) {
            setActiveScene(1);
          } else {
            setActiveScene(2);
          }

          // Gerak kedalaman berbeda per layer foto latar (multi-speed depth)
          desktopImageRefs.current.forEach((img, idx) => {
            if (!img) return;
            const segStart = idx * 0.33;
            const local = (p - segStart) * 2.1;
            const clamped = Math.max(-0.5, Math.min(1.5, local));
            const yPct = 4 - clamped * 8; // +4% -> -8%
            const scaleVal = 1.12 - Math.max(0, Math.min(1, clamped)) * 0.05; // 1.12 -> 1.07
            gsap.set(img, { yPercent: yPct, scale: scaleVal });
          });
        },
      });
    }, section);

    return () => ctx.revert();
  }, [isMobile, prefersReducedMotion]);

  // Mobile Opsi 2: Vertical Scroll-Band Parallax Ringan pada tiap frame foto
  useEffect(() => {
    if (typeof window === 'undefined' || !isMobile || prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      mobileBandRefs.current.forEach((imgWrap) => {
        if (!imgWrap) return;
        const img = imgWrap.querySelector('img');
        if (!img) return;

        gsap.fromTo(
          img,
          { yPercent: -6, scale: 1.1 },
          {
            yPercent: 6,
            scale: 1.1,
            ease: 'none',
            scrollTrigger: {
              trigger: imgWrap,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.45,
            },
          }
        );
      });
    });

    return () => ctx.revert();
  }, [isMobile, prefersReducedMotion]);

  const scrollToAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith('#')) return;
    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (berandaScroll) {
      berandaScroll.scrollToTarget(id, { offset: -64, duration: 0.9 });
    } else {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.history.replaceState(null, '', href);
  };

  // Jalur Adaptif Mobile (< 768px) & Reduced Motion: Opsi 2 Stacked Parallax Cards
  if (isMobile || prefersReducedMotion) {
    return (
      <section
        id="ekosistem"
        className="relative py-14 sm:py-20 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="max-w-2xl space-y-2.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-amber-300 border border-emerald-300/40">
              <Compass className="w-3.5 h-3.5" />
              <span>Jejak Ekosistem Madina</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-serif tracking-tight text-slate-900 dark:text-white">
              Dari Pelataran Kitab hingga Jejak Mutakhorijin
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Potret kedisiplinan harian, target hafalan muhafadzoh, dan album kenangan mutakhorijin di PP. Darussalam Blokagung.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-7">
            {scenes.map((scene, idx) => (
              <article
                key={scene.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
              >
                <div
                  ref={(el) => {
                    mobileBandRefs.current[idx] = el;
                  }}
                  className="relative aspect-[16/10] w-full overflow-hidden bg-slate-200 dark:bg-slate-800"
                >
                  <img
                    src={scene.image}
                    alt={scene.imageAlt}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-full object-cover object-center will-change-transform"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/60 to-transparent pointer-events-none"
                    aria-hidden="true"
                  />
                </div>

                <div className="p-5 sm:p-6 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-amber-300">
                    {renderSceneIcon(scene.icon)}
                    <span>{scene.eyebrow}</span>
                  </div>
                  <h3 className="text-xl font-bold font-serif text-slate-900 dark:text-white leading-snug">
                    {scene.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {scene.description}
                  </p>
                  <div className="pt-2">
                    {scene.isRoute ? (
                      <Link
                        href={scene.ctaHref}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
                      >
                        <span>{scene.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <a
                        href={scene.ctaHref}
                        onClick={(e) => scrollToAnchor(e, scene.ctaHref)}
                        className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-sm font-semibold transition-colors"
                      >
                        <span>{scene.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const currentScene = scenes[activeScene] || scenes[0];

  // Jalur Desktop (>= 768px): Opsi 1 Sticky Multi-Layer Depth Showcase
  return (
    <section
      ref={desktopSectionRef}
      id="ekosistem"
      className="relative w-full h-[245vh] bg-slate-950 text-white border-b border-slate-200 dark:border-slate-800"
    >
      <div className="sticky top-[65px] h-[calc(100svh-65px)] min-h-[540px] w-full overflow-hidden bg-slate-950">
        {/* Layer 1: 3 Adegan Foto Latar Multi-Kecepatan */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {scenes.map((scene, idx) => (
            <img
              key={scene.id}
              ref={(el) => {
                desktopImageRefs.current[idx] = el;
              }}
              src={scene.image}
              alt=""
              decoding="async"
              className={`absolute inset-0 w-full h-full object-cover object-center will-change-transform transition-opacity duration-700 ${
                activeScene === idx ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transform: 'scale(1.1)' }}
            />
          ))}
        </div>

        {/* Layer 2: Scrim Terarah agar Subjek Foto Jelas di Kanan & Tipografi Tajam di Kiri */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-emerald-950/90 via-emerald-950/50 to-slate-950/20"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/85 via-transparent to-slate-950/25"
          aria-hidden="true"
        />

        {/* Layer 3 (Foreground): Kartu Narasi Editorial Solid Kontras Tinggi */}
        <div className="relative z-20 h-full max-w-7xl mx-auto px-6 lg:px-8 flex items-center">
          <div className="max-w-xl w-full rounded-2xl bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white p-7 lg:p-9 border border-emerald-900/15 dark:border-emerald-500/25 shadow-2xl">
            <div className="flex items-center mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-amber-300 border border-emerald-300/40">
                {renderSceneIcon(currentScene.icon)}
                <span>{currentScene.eyebrow}</span>
              </span>
            </div>

            <h2 className="text-2xl lg:text-3xl font-extrabold font-serif tracking-tight text-emerald-950 dark:text-white leading-snug">
              {currentScene.title}
            </h2>
            <p className="mt-3 text-sm lg:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentScene.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {currentScene.isRoute ? (
                <Link
                  href={currentScene.ctaHref}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <span>{currentScene.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </Link>
              ) : (
                <a
                  href={currentScene.ctaHref}
                  onClick={(e) => scrollToAnchor(e, currentScene.ctaHref)}
                  className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0b5751] hover:bg-emerald-800 text-white text-sm font-bold shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <span>{currentScene.ctaLabel}</span>
                  <ArrowRight className="w-4 h-4 text-amber-300" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
