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

  // Deteksi ukuran layar & preferensi reduced motion
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

  // Fungsi gambar frame ke canvas dengan object-cover + overscan 1.07 (menutup watermark halus)
  const drawFrameToCanvas = (frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cari frame terdekat yang sudah selesai dimuat
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
    // Geser sedikit ke atas agar area bawah (watermark) terpotong keluar viewport
    const dx = (cw - drawW) * 0.5;
    const dy = (ch - drawH) * 0.42;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  };

  // Preload bertahap frame WebP di desktop
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

  // Sinkronisasi ukuran canvas dengan DPR layar
  useEffect(() => {
    if (typeof window === 'undefined' || isMobile || prefersReducedMotion) return;

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      drawFrameToCanvas(currentFrameIdxRef.current);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [isMobile, prefersReducedMotion]);

  // Lenis + GSAP ScrollTrigger choreography
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

    const state = { frame: 0 };
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
          state.frame = nextFrame;
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

  // Fallback statis untuk pengguna dengan prefers-reduced-motion: reduce
  if (prefersReducedMotion) {
    return (
      <section
        id="hero"
        className="relative overflow-hidden bg-[#041d14] text-white pt-24 pb-16 sm:pt-28 sm:pb-24"
      >
        <img
          src="/hero-frames/frame_001.webp"
          alt="Santri Madrasah Diniyyah Al-Amiriyyah Blokagung"
          className="absolute inset-0 w-full h-full object-cover scale-105 opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#041d14]/80 via-[#041d14]/75 to-[#041d14]" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p
            className="text-xl sm:text-2xl text-amber-300 font-serif font-bold"
            dir="rtl"
            lang="ar"
          >
            إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ
          </p>
          <p className="text-xs sm:text-sm text-emerald-100/90 italic">
            &ldquo;Sesungguhnya aku diutus hanya untuk menyempurnakan kemuliaan akhlak.&rdquo; (HR. Imam Al-Baihaqi)
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-serif text-white">
            Madrasah Diniyyah <span className="text-amber-300">Al-Amiriyyah</span> (MADINA) Blokagung
          </h1>
          <p className="text-sm sm:text-lg text-emerald-100/90 max-w-3xl mx-auto">
            Pusat Tafaqquh Fiddin &amp; Kaderisasi Ulama Berakhlak Mulia yang Menjaga Khazanah Turats Salafiyah dengan Disiplin dan Mutu Pembelajaran Terstruktur.
          </p>
          <blockquote className="text-sm sm:text-base text-amber-200 font-serif italic max-w-2xl mx-auto border-y border-amber-400/30 py-3">
            &ldquo;Openono perkoro seng ono, mongko bakal maujud perkoro seng ora ono.&rdquo;
          </blockquote>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href="#kurikulum"
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 transition-colors"
            >
              <Compass className="w-5 h-5" />
              <span>Pelajari Kurikulum &amp; Khazanah Kitab</span>
            </a>
            <a
              href="#berita"
              className="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm sm:text-base font-semibold text-white border border-white/30 hover:bg-white/10 transition-colors"
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
      className="relative w-full h-[230vh] md:h-[320vh] bg-[#041d14] text-white"
    >
      {/* Viewport Pinned Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#041d14]">
        {/* Poster instant frame 001 agar LCP cepat sebelum canvas siap */}
        <img
          src="/hero-frames/frame_001.webp"
          alt="Halaman Madrasah Diniyyah Al-Amiriyyah Blokagung"
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

        {/* Scrim Kontras WCAG AA untuk Keterbacaan Teks di Atas Video */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#041d14]/80 via-[#041d14]/45 to-[#041d14]/95"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(4,29,20,0.45)_0%,rgba(4,29,20,0.82)_100%)]"
          aria-hidden="true"
        />

        {/* Lapisan Konten 3 Babak */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center text-center pt-14 pb-24">
          {/* BABAK 1: Identitas Monumental */}
          <div
            aria-hidden={activeChapter !== 0}
            className={`absolute inset-x-4 sm:inset-x-8 flex flex-col items-center justify-center transition-all duration-700 ${
              activeChapter === 0
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 -translate-y-6 scale-95 pointer-events-none'
            }`}
          >
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-amber-300 mb-3 sm:mb-4">
              Ponpes Darussalam Blokagung • Banyuwangi
            </p>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight font-serif text-white max-w-5xl leading-[1.08] drop-shadow-md">
              Madrasah Diniyyah{' '}
              <span className="text-amber-300">Al-Amiriyyah</span>
            </h1>
            <p className="mt-3 sm:mt-4 text-lg sm:text-2xl md:text-3xl font-semibold tracking-wide text-emerald-100">
              (MADINA) Blokagung
            </p>
            <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-emerald-100/90 leading-relaxed">
              Merawat tradisi keilmuan salafiyah dan kedisiplinan santri dalam satu kesatuan sistem pendidikan diniyyah.
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
            <div className="max-w-3xl w-full px-5 py-6 sm:px-8 sm:py-7 rounded-2xl bg-[#041d14]/80 border border-amber-300/30 backdrop-blur-md shadow-2xl">
              <p
                className="text-xl sm:text-3xl md:text-4xl text-amber-300 font-serif leading-relaxed mb-3 font-bold"
                dir="rtl"
                lang="ar"
              >
                إِنَّمَا بُعِثْتُ لِأُتَمِّمَ مَكَارِمَ الْأَخْلَاقِ
              </p>
              <p className="text-sm sm:text-base text-white italic">
                &ldquo;Sesungguhnya aku diutus hanya untuk menyempurnakan kemuliaan akhlak.&rdquo;
                <span className="text-amber-300 not-italic font-semibold ml-1.5">
                  (HR. Imam Al-Baihaqi)
                </span>
              </p>
            </div>

            <p className="mt-6 sm:mt-8 text-base sm:text-xl md:text-2xl text-white max-w-3xl leading-relaxed font-medium">
              Pusat <span className="text-amber-300 font-bold">Tafaqquh Fiddin</span> &amp; Kaderisasi Ulama Berakhlak Mulia yang Menjaga Khazanah Turats Salafiyah dengan Mutu Pembelajaran Terstruktur.
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
            <div className="max-w-3xl w-full px-5 py-5 sm:px-8 sm:py-6 rounded-2xl bg-[#041d14]/85 border-y border-amber-300/40 shadow-2xl">
              <p className="text-xs sm:text-sm text-amber-300 uppercase tracking-[0.2em] font-bold mb-2">
                Dawuh Pendiri • Almaghfurlah KH. Mukhtar Syafa&apos;at
              </p>
              <blockquote className="text-lg sm:text-2xl md:text-3xl text-amber-200 font-serif italic leading-snug">
                &ldquo;Openono perkoro seng ono, mongko bakal maujud perkoro seng ora ono.&rdquo;
              </blockquote>
              <p className="text-xs sm:text-sm text-emerald-100/90 mt-2">
                (Rawatlah apa yang sudah ada, niscaya akan terwujud apa yang belum ada).
              </p>
            </div>

            <div className="mt-7 sm:mt-9 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <a
                href="#kurikulum"
                className="min-h-[44px] inline-flex items-center justify-center gap-2.5 px-6 sm:px-7 py-3 rounded-xl text-sm sm:text-base font-bold text-emerald-950 bg-amber-300 hover:bg-amber-200 shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                <Compass className="w-5 h-5 text-emerald-950" />
                <span>Pelajari Kurikulum &amp; Khazanah Kitab</span>
              </a>
              <a
                href="#berita"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-xl text-sm sm:text-base font-semibold text-white bg-[#062c1e]/90 hover:bg-emerald-900 border border-amber-300/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
              >
                <Newspaper className="w-4 h-4 text-amber-300" />
                <span>Baca Warta Madina</span>
              </a>
            </div>
          </div>
        </div>

        {/* HUD Bawah: Indikator Babak, Petunjuk Gulir, & Lewati Intro */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-4 sm:px-8 pb-5 sm:pb-6">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Kontrol Lompat Babak */}
            <div className="flex items-center gap-1.5 sm:gap-2" role="group" aria-label="Babak Pengenalan">
              {CHAPTERS.map((ch) => {
                const isActive = activeChapter === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => jumpToChapter(ch.progress)}
                    className={`min-h-[44px] px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
                      isActive
                        ? 'bg-amber-300 text-emerald-950'
                        : 'bg-[#041d14]/75 text-emerald-100 hover:bg-[#062c1e] border border-white/15'
                    }`}
                  >
                    <span className="font-mono mr-1 opacity-80">{ch.code}</span>
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Petunjuk Scroll Tengah (Desktop) */}
            <div className="hidden md:flex items-center gap-2 text-xs text-amber-200/90 font-medium">
              <span>{activeChapter < 2 ? 'Gulir ke bawah untuk melanjutkan' : 'Lanjut ke Warta Madina'}</span>
              <ChevronDown className="w-4 h-4 animate-bounce" />
            </div>

            {/* Tombol Akses Cepat Lewati Intro */}
            <a
              href="#berita"
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#041d14]/80 hover:bg-emerald-900 text-amber-200 border border-amber-300/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <span>Lewati Intro</span>
              <FastForward className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Progress Bar Timeline Scroll */}
          <div className="max-w-7xl mx-auto mt-2.5 h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-amber-300 transition-[width] duration-75"
              style={{ width: `${Math.round(scrollProgress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
