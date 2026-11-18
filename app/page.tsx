import React from 'react';
import type { Metadata } from 'next';
import {
  BerandaScrollProvider,
  NavbarProfil,
  HeroSection,
  ParallaxShowcaseSection,
  BeritaShowcaseSection,
  StatistikCounter,
  KurikulumKitabSection,
  FooterProfil,
} from '@/components/modules/profil';

export const metadata: Metadata = {
  title: 'Madin Blokagung',
  description: 'Pusat Tafaqquh Fiddin & Kaderisasi Ulama Berakhlak Mulia Ponpes Darussalam Blokagung Banyuwangi. Mengelola ribuan santri, rombel, dan khazanah kitab kuning salafiyah.',
  icons: {
    icon: '/logo-madin.png',
    shortcut: '/logo-madin.png',
    apple: '/logo-madin.png',
  },
};

export default function RootPage() {
  return (
    <BerandaScrollProvider>
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col overflow-x-clip selection:bg-amber-300 selection:text-emerald-950">
        {/* Sticky Public Header & Navigation */}
        <NavbarProfil />

        {/* Main Content Sections */}
        <main className="flex-1">
          {/* 1. Hero Section (Visi, Hadits, Identitas, Dawuh Masyayikh, CTAs) */}
          <HeroSection />

          {/* 2. Parallax Web Jejak Ekosistem Pesantren (Hibrida Adaptif Desktop & Mobile) */}
          <ParallaxShowcaseSection />

          {/* 3. Berita Warta Madina Editorial & Galeri Sosmed Masonry */}
          <BeritaShowcaseSection />

          {/* 4. Statistik Lembaga & 3 Pilar Program Pendidikan (Selayang Pandang) */}
          <StatistikCounter />

          {/* 5. Khazanah Kitab Kuning Interaktif & Waktu KBM */}
          <KurikulumKitabSection />
        </main>

        {/* Public Footer & Contacts */}
        <FooterProfil />
      </div>
    </BerandaScrollProvider>
  );
}
