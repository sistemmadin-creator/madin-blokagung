'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Compass, ChevronDown, Newspaper, FastForward } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 60;
const MOBILE_KEYFRAMES = [
  '/hero-frames/frame_001.webp',
  '/hero-frames/frame_026.webp',
  '/hero-frames/frame_051.webp',
] as const;

const CHAPTERS = [
  { id: 0, code: '01', label: 'Tradisi', progress: 0.04 },
  { id: 1, code: '02', label: 'Risalah', progress: 0.46 },
  { id: 2, code: '03', label: 'Khazanah', progress: 0.86 },
] as const;

function getFramePath(indexZeroBased: number): string {
  const num = Math.min(TOTAL_FRAMES, Math.max(1, indexZeroBased + 1));
  return `/hero-frames/frame_${String(num).padStart(3, '0')}.webp`;
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(
    Array.from({ length: TOTAL_FRAMES }, () => null)
  );
  const currentFrameIdxRef = useRef<number>(0);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [firstFrameReady, setFirstFrameReady] = useState<boolean>(false);

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

  const drawFrameToCanvas = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let img = framesRef.current[frameIndex];
    if (!img || !img.complete || img.naturalWidth === 0) {
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = framesRef.current[frameIndex - offset];
        if (prev && prev.complete && prev.naturalWidth > 0) {
          img = prev;
          break;
        }
        const next = framesRef.current[frameIndex + offset];
        if (next && next.complete && next.naturalWidth > 0) {
          img = next;
          break;
        }
      }
    }
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    if (cw === 0 || ch === 0) return;

    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const overscan = 1.07;
    const scale = Math.max(cw / iw, ch / ih) * overscan;
    const drawW = iw * scale;
    const drawH = ih * scale;
    const dx = (cw - drawW) * 0.5;
    const dy = (ch - drawH) * 0.42;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || isMobile || prefersReducedMotion) return;

    let cancelled = false;
    const priorityIndices = [0, 25, 50, 12, 37];

    const loadSingle = (idx: number): Promise<void> =>
      new Promise((resolve) => {
        if (cancelled || framesRef.current[idx]) {
          resolve();
          return;
        }
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (cancelled) return;
          framesRef.current[idx] = img;
          if (idx === 0) {
            setFirstFrameReady(true);
            drawFrameToCanvas(0);
          } else if (Math.abs(currentFrameIdxRef.current - idx) <= 2) {
            drawFrameToCanvas(currentFrameIdxRef.current);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = getFramePath(idx);
      });

    (async () => {
      await Promise.all(priorityIndices.map((idx) => loadSingle(idx)));
      const remaining: number[] = [];
      for (let i = 0; i < TOTAL_FRAMES; i++) {
        if (!priorityIndices.includes(i)) remaining.push(i);
      }
      const batchSize = 6;
      for (let i = 0; i < remaining.length && !cancelled; i += batchSize) {
        const chunk = remaining.slice(i, i + batchSize);
        await Promise.all(chunk.map((idx) => loadSingle(idx)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMobile, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || isMobile || prefersReducedMotion) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(Math.max(520, window.innerHeight - 65) * dpr);
      drawFrameToCanvas(currentFrameIdxRef.current);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isMobile, prefersReducedMotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) return;
    const section = sectionRef.current;
    if (!section) return;

    const lenis = new Lenis({
      lerp: 0.085,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onLenisScroll);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        const p = Math.min(1, Math.max(0, self.progress));
        setScrollProgress(p);

        if (p < 0.34) {
          setActiveChapter(0);
        } else if (p < 0.68) {
          setActiveChapter(1);
        } else {
          setActiveChapter(2);
        }

        if (!isMobile) {
          const nextFrame = Math.min(TOTAL_FRAMES - 1, Math.round(p * (TOTAL_FRAMES - 1)));
          if (currentFrameIdxRef.current !== nextFrame) {
            currentFrameIdxRef.current = nextFrame;
            drawFrameToCanvas(nextFrame);
          }
        }
      },
    });

    return () => {
      st.kill();
      gsap.ticker.remove(onTick);
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isMobile, prefersReducedMotion]);

  const jumpToChapter = (chapterProgress: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const maxScroll = section.offsetHeight - window.innerHeight;
    const targetY = section.offsetTop + Math.max(0, maxScroll) * chapterProgress;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetY, { duration: 1.0 });
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    e.preventDefault();
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, { offset: -64, duration: 0.9 });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.history.replaceState(null, '', `#${targetId}`);
  };

  if (prefersReducedMotion) {
    return (
      <section
        id="hero"
        className="relative overflow-hidden bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-16 sm:py-24"
      >
        <img
          src="/hero-frames/frame_001.webp"
          alt="Santri Madrasah Diniyyah Al-Amiriyyah Blokagung"
          className="absolute inset-0 w-full h-full object-cover scale-105 opacity-25 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/85 via-white/75 to-white dark:from-slate-950/85 dark:via-slate-950/75 dark:to-slate-950" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif text-emerald-950 dark:text-white">
            Madrasah Diniyyah{' '}
            <span className="text-amber-700 dark:text-amber-300 whitespace-nowrap">
              Al&#8209;Amiriyyah
            </span>{' '}
            <span className="block text-lg sm:text-2xl font-sans font-semibold text-slate-700 dark:text-emerald-200 mt-2">
              (MADINA) Blokagung
            </span>
          </h1>
          <div className="max-w-3xl mx-auto px-5 py-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-900/15 dark:border-amber-400/25 shadow-lg">
            <p
              className="text-xl sm:text-2xl text-emerald-900 dark:text-amber-300 font-serif font-bold"
              dir="rtl"
              lang="ar"
            >
              إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ
            </p>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 italic mt-1">
              &ldquo;Sesungguhnya aku diutus hanya untuk menyempurnakan kemuliaan akhlak.&rdquo; (HR. Imam Al-Baihaqi)
            </p>
          </div>
          <blockquote className="text-sm sm:text-base text-emerald-950 dark:text-amber-200 font-serif italic max-w-2xl mx-auto border-y border-amber-500/40 py-3 bg-white/85 dark:bg-slate-900/80 rounded-xl px-4">
            &ldquo;Openono perkoro seng ono, mongko bakal maujud perkoro seng ora ono.&rdquo;
          </blockquote>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#kurikulum"
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-bold text-white bg-[#0b5751] hover:bg-emerald-800 transition-colors"
            >
              <Compass className="w-5 h-5" />
              <span>Pelajari Kurikulum &amp; Khazanah Kitab</span>
            </a>
            <a
              href="#berita"
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold text-emerald-950 dark:text-white bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Newspaper className="w-5 h-5" />
              <span>Baca Warta Madina</span>
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative w-full h-[230vh] md:h-[310vh] bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
    >
      {/* Viewport Pinned Stage tepat di bawah Navbar Putih Sticky (~65px) */}
      <div className="sticky top-[65px] h-[calc(100svh-65px)] min-h-[520px] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Poster instant frame 001 (langsung scene kerumunan santri) */}
        <img
          src="/hero-frames/frame_001.webp"
          alt="Kerumunan santri Madrasah Diniyyah Al-Amiriyyah Blokagung"
          className={`absolute inset-0 w-full h-full object-cover object-[center_35%] scale-[1.07] transition-opacity duration-500 ${
            !isMobile && firstFrameReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Desktop Canvas Scrubbing (60 Frame WebP) */}
        {!isMobile && (
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            className="absolute inset-0 w-full h-full pointer-events-none"
          />
        )}

        {/* Mobile Keyframe Crossfade (3 Frame Ringan) */}
        {isMobile && (
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            {MOBILE_KEYFRAMES.map((src, idx) => (
              <img
                key={src}
                src={src}
                alt=""
                className={`absolute inset-0 w-full h-full object-cover object-[center_35%] scale-[1.07] transition-opacity duration-700 ${
                  activeChapter === idx ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        )}

        {/* Scrim Putih Lembut Transparan agar foto cerah & teks gelap tetap kontras WCAG AA */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/75 via-white/35 to-white/90 dark:from-slate-950/75 dark:via-slate-950/40 dark:to-slate-950/90"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.78)_0%,rgba(255,255,255,0.34)_60%,rgba(255,255,255,0.68)_100%)] dark:bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.45)_0%,rgba(2,6,23,0.75)_100%)]"
          aria-hidden="true"
        />

        {/* Lapisan Konten 3 Babak */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center pb-20">
          {/* BABAK 1: Identitas Monumental di atas Scrim Putih Transparan */}
          <div
            aria-hidden={activeChapter !== 0}
            className={`absolute inset-x-4 sm:inset-x-8 flex flex-col items-center justify-center transition-all duration-700 ${
              activeChapter === 0
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 -translate-y-6 scale-95 pointer-events-none'
            }`}
          >
            <p className="text-[11px] sm:text-sm font-bold uppercase tracking-[0.2em] text-emerald-800 dark:text-amber-300 mb-3 sm:mb-4">
              Ponpes Darussalam Blokagung • Banyuwangi
            </p>
            <h1 className="text-[28px] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight font-serif text-emerald-950 dark:text-white max-w-6xl leading-[1.12] drop-shadow-xs">
              Madrasah Diniyyah{' '}
              <span className="text-amber-700 dark:text-amber-300 whitespace-nowrap">
                Al&#8209;Amiriyyah
              </span>
            </h1>
            <p className="mt-3 sm:mt-4 text-lg sm:text-2xl md:text-3xl font-bold tracking-wide text-slate-800 dark:text-emerald-100">
              (MADINA) Blokagung
            </p>
          </div>

          {/* BABAK 2: Hadits Nabi SAW & Visi Tafaqquh Fiddin */}
          <div
            aria-hidden={activeChapter !== 1}
            className={`absolute inset-x-4 sm:inset-x-8 flex flex-col items-center justify-center transition-all duration-700 ${
              activeChapter === 1
                ? 'opacity-100 translate-y-0 scale-100'
                : activeChapter < 1
                  ? 'opacity-0 translate-y-8 scale-95 pointer-events-none'
                  : 'opacity-0 -translate-y-8 scale-95 pointer-events-none'
            }`}
          >
            <div className="max-w-3xl w-full px-5 py-6 sm:px-8 sm:py-7 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-900/15 dark:border-amber-300/30 backdrop-blur-md shadow-2xl">
              <p
                className="text-xl sm:text-3xl md:text-4xl text-emerald-900 dark:text-amber-300 font-serif leading-relaxed mb-3 font-bold"
                dir="rtl"
                lang="ar"
              >
                إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ
              </p>
              <p className="text-sm sm:text-base text-slate-700 dark:text-white italic">
                &ldquo;Sesungguhnya aku diutus hanya untuk menyempurnakan kemuliaan akhlak.&rdquo;
                <span className="text-amber-700 dark:text-amber-300 not-italic font-semibold ml-1.5">
                  (HR. Imam Al-Baihaqi)
                </span>
              </p>
            </div>

            <p className="mt-5 sm:mt-7 px-5 py-3 rounded-2xl bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 text-sm sm:text-lg md:text-xl text-slate-800 dark:text-white max-w-3xl leading-relaxed font-semibold shadow-sm">
              Pusat <span className="text-emerald-800 dark:text-amber-300 font-bold">Tafaqquh Fiddin</span> &amp; Kaderisasi Ulama Berakhlak Mulia yang Menjaga Khazanah Turats Salafiyah dengan Mutu Pembelajaran Terstruktur.
            </p>
          </div>

          {/* BABAK 3: Dawuh Pendiri & Aksi CTA */}
          <div
            aria-hidden={activeChapter !== 2}
            className={`absolute inset-x-4 sm:inset-x-8 flex flex-col items-center justify-center transition-all duration-700 ${
              activeChapter === 2
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
            }`}
          >
            <div className="max-w-3xl w-full px-5 py-5 sm:px-8 sm:py-6 rounded-2xl bg-white/92 dark:bg-slate-900/90 border-y border-amber-500/45 shadow-2xl">
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 uppercase tracking-[0.2em] font-bold mb-2">
                Dawuh Pendiri • Almaghfurlah KH. Mukhtar Syafa&apos;at
              </p>
              <blockquote className="text-lg sm:text-2xl md:text-3xl text-emerald-950 dark:text-amber-200 font-serif italic leading-snug">
                &ldquo;Openono perkoro seng ono, mongko bakal maujud perkoro seng ora ono.&rdquo;
              </blockquote>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-emerald-100/90 mt-2 font-medium">
                (Rawatlah apa yang sudah ada, niscaya akan terwujud apa yang belum ada).
              </p>
            </div>

            <div className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="#kurikulum"
                onClick={(e) => scrollToSection(e, 'kurikulum')}
                className="min-h-[44px] inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 rounded-xl text-sm sm:text-base font-bold text-white bg-[#0b5751] hover:bg-emerald-800 shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Compass className="w-5 h-5 text-amber-300" />
                <span>Pelajari Kurikulum &amp; Khazanah Kitab</span>
              </a>
              <a
                href="#berita"
                onClick={(e) => scrollToSection(e, 'berita')}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm sm:text-base font-semibold text-emerald-950 dark:text-white bg-white/95 dark:bg-slate-900 hover:bg-slate-100 border border-slate-300 dark:border-slate-700 shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Newspaper className="w-4 h-4 text-emerald-700 dark:text-amber-300" />
                <span>Baca Warta Madina</span>
              </a>
            </div>
          </div>
        </div>

        {/* HUD Bawah Cerah Terstruktur */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 sm:px-8 pb-5 sm:pb-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2" role="group" aria-label="Babak Pengenalan">
              {CHAPTERS.map((ch) => {
                const isActive = activeChapter === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => jumpToChapter(ch.progress)}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
                      isActive
                        ? 'bg-[#0b5751] text-white'
                        : 'bg-white/90 dark:bg-slate-900/85 text-slate-800 dark:text-slate-100 hover:bg-white border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span className="font-mono mr-1 opacity-80">{ch.code}</span>
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-amber-200 font-semibold shadow-xs">
              <span>{activeChapter < 2 ? 'Gulir ke bawah untuk melanjutkan' : 'Lanjut ke Warta Madina'}</span>
              <ChevronDown className="w-4 h-4 animate-bounce text-emerald-700 dark:text-amber-300" />
            </div>

            <a
              href="#berita"
              onClick={(e) => scrollToSection(e, 'berita')}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white/90 dark:bg-slate-900/85 hover:bg-white text-emerald-950 dark:text-amber-200 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <span>Lewati Intro</span>
              <FastForward className="w-3.5 h-3.5 text-emerald-700 dark:text-amber-300" />
            </a>
          </div>

          <div className="max-w-7xl mx-auto mt-2.5 h-1 rounded-full bg-slate-300/80 dark:bg-white/15 overflow-hidden">
            <div
              className="h-full bg-[#0b5751] dark:bg-amber-300 transition-[width] duration-75"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
