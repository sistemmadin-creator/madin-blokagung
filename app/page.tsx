import React from 'react';
import type { Metadata } from 'next';
import {
  NavbarProfil,
  HeroSection,
  StatistikCounter,
  KurikulumKitabSection,
  JadwalKbmGatewaySection,
  FooterProfil,
} from '@/components/modules/profil';

export const metadata: Metadata = {
  title: 'Portal Resmi MADINA Blokagung - Madrasah Diniyyah Al-Amiriyyah',
  description: 'Pusat Tafaqquh Fiddin & Kaderisasi Ulama Berakhlak Mulia Pondok Pesantren Darussalam Blokagung Banyuwangi. Mengelola ± 5.400 santri, 161 rombel, dan khazanah kitab kuning salafiyah.',
};

export default function RootPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-300 selection:text-emerald-950">
      {/* Sticky Public Header & Navigation */}
      <NavbarProfil />

      {/* Main Content Sections */}
      <main className="flex-1">
        {/* 1. Hero Section (Visi, Hadits, Identitas, Dawuh Masyayikh, CTAs) */}
        <HeroSection />

        {/* 2. Statistik Lembaga & 3 Pilar Program Pendidikan */}
        <StatistikCounter />

        {/* 3. Khazanah Kitab Kuning Interaktif & Waktu KBM */}
        <KurikulumKitabSection />

        {/* 4. Gateway Menuju Sistem Akademik KBM (Mockup Gambar 1) */}
        <JadwalKbmGatewaySection />
      </main>

      {/* Public Footer & Contacts */}
      <FooterProfil />
    </div>
  );
}
