'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

interface ScrollToOptions {
  offset?: number;
  duration?: number;
}

interface BerandaScrollContextValue {
  prefersReducedMotion: boolean;
  scrollToTarget: (targetId: string, opts?: ScrollToOptions) => void;
  scrollToY: (y: number, duration?: number) => void;
}

const BerandaScrollContext = createContext<BerandaScrollContextValue | null>(null);

export function useBerandaScroll(): BerandaScrollContextValue | null {
  return useContext(BerandaScrollContext);
}

export default function BerandaScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReducedMotion(mqMotion.matches);
    sync();

    mqMotion.addEventListener('change', sync);
    return () => mqMotion.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion) return;

    ScrollTrigger.config({ ignoreMobileResize: true });

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

    // Pastikan posisi ScrollTrigger akurat setelah layout/font/gambar terpasang
    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 120);

    return () => {
      window.clearTimeout(refreshId);
      gsap.ticker.remove(onTick);
      lenis.off('scroll', onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [prefersReducedMotion]);

  const scrollToY = useCallback(
    (y: number, duration = 0.95) => {
      if (typeof window === 'undefined') return;
      if (lenisRef.current && !prefersReducedMotion) {
        lenisRef.current.scrollTo(y, { duration });
      } else {
        window.scrollTo({
          top: y,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    },
    [prefersReducedMotion]
  );

  const scrollToTarget = useCallback(
    (targetId: string, opts?: ScrollToOptions) => {
      if (typeof window === 'undefined') return;
      const el = document.getElementById(targetId);
      if (!el) return;

      const offset = opts?.offset ?? -64;
      const duration = opts?.duration ?? 0.9;

      if (lenisRef.current && !prefersReducedMotion) {
        lenisRef.current.scrollTo(el, { offset, duration });
      } else {
        const y = el.getBoundingClientRect().top + window.scrollY + offset;
        window.scrollTo({
          top: Math.max(0, y),
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    },
    [prefersReducedMotion]
  );

  const value = useMemo<BerandaScrollContextValue>(
    () => ({
      prefersReducedMotion,
      scrollToTarget,
      scrollToY,
    }),
    [prefersReducedMotion, scrollToTarget, scrollToY]
  );

  return <BerandaScrollContext.Provider value={value}>{children}</BerandaScrollContext.Provider>;
}
