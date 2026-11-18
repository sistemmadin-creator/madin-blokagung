'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Compass, ChevronDown, Newspaper } from 'lucide-react';
import { useBerandaScroll } from './BerandaScrollProvider';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 60;
// 20 frame merata (~2 MB total) agar swipe di HP tetap halus tanpa membebani memori/kuota
const MOBILE_FRAME_INDICES = Array.from({ length: 20 }, (_, i) =>
  Math.min(TOTAL_FRAMES - 1, Math.round((i * (TOTAL_FRAMES - 1)) / 19))
);

function getFramePath(indexZeroBased: number): string {
  const num = Math.min(TOTAL_FRAMES, Math.max(1, indexZeroBased + 1));
  return `/hero-frames/frame_${String(num).padStart(3, '0')}.webp`;
}

export default function HeroSection() {
  const berandaScroll = useBerandaScroll();
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<(HTMLImageElement | null)[]>(
    Array.from({ length: TOTAL_FRAMES }, () => null)
  );
  const currentFrameIdxRef = useRef<number>(0);

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [activeChapter, setActiveChapter] = useState<number>(0);
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
    if (typeof window === 'undefined' || prefersReducedMotion) return;

    let cancelled = false;
    const targetIndices = isMobile
      ? MOBILE_FRAME_INDICES
      : Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
    const priorityIndices = isMobile ? [0, 18, 37, 59] : [0, 25, 50, 12, 37];

    const loadSingle = (idx: number): Promise<void> =>
      new Promise((resolve) => {
        if (cancelled || framesRef.current[idx]) {
          if (idx === 0 && framesRef.current[0]) {
            setFirstFrameReady(true);
            drawFrameToCanvas(0);
          }
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
            drawFrameToCanvas(currentFrameIdxRef.current);
          } else if (Math.abs(currentFrameIdxRef.current - idx) <= 3) {
            drawFrameToCanvas(currentFrameIdxRef.current);
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = getFramePath(idx);
      });

    (async () => {
      await Promise.all(priorityIndices.map((idx) => loadSingle(idx)));
      const remaining = targetIndices.filter((idx) => !priorityIndices.includes(idx));
      const batchSize = isMobile ? 4 : 6;
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
    if (typeof window === 'undefined' || prefersReducedMotion) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
      const rectW = canvas.clientWidth || window.innerWidth;
      const rectH = canvas.clientHeight || Math.max(520, window.innerHeight - 65);
      canvas.width = Math.floor(rectW * dpr);
      canvas.height = Math.floor(rectH * dpr);
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

    ScrollTrigger.config({ ignoreMobileResize: true });

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      scrub: isMobile ? 0.25 : 0.5,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = Math.min(1, Math.max(0, self.progress));

        if (p < 0.34) {
          setActiveChapter(0);
        } else if (p < 0.68) {
          setActiveChapter(1);
        } else {
          setActiveChapter(2);
        }

        const nextFrame = isMobile
          ? MOBILE_FRAME_INDICES[
              Math.min(
                MOBILE_FRAME_INDICES.length - 1,
                Math.round(p * (MOBILE_FRAME_INDICES.length - 1))
              )
            ]
          : Math.min(TOTAL_FRAMES - 1, Math.round(p * (TOTAL_FRAMES - 1)));

        if (currentFrameIdxRef.current !== nextFrame) {
          currentFrameIdxRef.current = nextFrame;
          drawFrameToCanvas(nextFrame);
        }
      },
    });

    return () => {
      st.kill();
    };
  }, [isMobile, prefersReducedMotion]);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const el = document.getElementById(targetId);
    if (!el) return;
    e.preventDefault();
    if (berandaScroll) {
      berandaScroll.scrollToTarget(targetId, { offset: -64, duration: 0.9 });
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
              Madin Blokagung
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
      className="relative w-full h-[195vh] md:h-[235vh] bg-white dark:bg-slate-950 text-slate-900 dark:text-white"
    >
      {/* Viewport Pinned Stage tepat di bawah Navbar Putih Sticky (~65px) */}
      <div className="sticky top-[65px] h-[calc(100svh-65px)] min-h-[520px] w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
        {/* Poster instant frame 001 (langsung scene kerumunan santri) */}
        <img
          src="/hero-frames/frame_001.webp"
          alt="Kerumunan santri Madrasah Diniyyah Al-Amiriyyah Blokagung"
          className={`absolute inset-0 w-full h-full object-cover object-[center_35%] scale-[1.07] transition-opacity duration-500 ${
            firstFrameReady ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Canvas Frame Scrubbing Aktif untuk Desktop (60 Frame) & Mobile (20 Frame Halus) */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Scrim Putih Lembut (+30% lebih transparan) agar foto santri lebih cerah tanpa mengurangi keterbacaan teks */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/45 via-white/15 to-white/60 dark:from-slate-950/75 dark:via-slate-950/40 dark:to-slate-950/90"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.50)_0%,rgba(255,255,255,0.18)_58%,rgba(255,255,255,0.38)_100%)] dark:bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.45)_0%,rgba(2,6,23,0.75)_100%)]"
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
            <p className="text-[11px] sm:text-sm font-bold uppercase tracking-[0.2em] text-emerald-900 dark:text-amber-300 mb-3 sm:mb-4 drop-shadow-[0_1px_8px_rgba(255,255,255,0.95)] dark:drop-shadow-none">
              Ponpes Darussalam Blokagung • Banyuwangi
            </p>
            <h1 className="text-[28px] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight font-serif text-emerald-950 dark:text-white max-w-6xl leading-[1.12] drop-shadow-[0_2px_12px_rgba(255,255,255,0.92)] dark:drop-shadow-none">
              Madrasah Diniyyah{' '}
              <span className="text-amber-800 dark:text-amber-300 whitespace-nowrap">
                Al&#8209;Amiriyyah
              </span>
            </h1>
            <p className="mt-3 sm:mt-4 text-lg sm:text-2xl md:text-3xl font-bold tracking-wide text-slate-900 dark:text-emerald-100 drop-shadow-[0_1px_10px_rgba(255,255,255,0.95)] dark:drop-shadow-none">
              Madin Blokagung
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

        {/* Petunjuk Gulir Terpusat di Bawah Hero (Tanpa Tombol Babak & Tanpa Garis Progress) */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 sm:px-8 pb-5 sm:pb-7 pointer-events-none">
          <div className="max-w-7xl mx-auto flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-slate-900/85 border border-slate-200/90 dark:border-slate-700 text-xs text-slate-800 dark:text-amber-200 font-semibold shadow-sm backdrop-blur-xs">
              <span>{activeChapter < 2 ? 'Gulir ke bawah untuk melanjutkan' : 'Lanjut ke Jejak Madina'}</span>
              <ChevronDown className="w-4 h-4 animate-bounce text-emerald-700 dark:text-amber-300" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
