'use client';

import React from 'react';
import { 
  MapPin, 
  ChevronRight
} from 'lucide-react';

export default function FooterProfil() {
  return (
    <footer id="kontak" className="bg-emerald-950 text-white border-t border-emerald-900/60 pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 pb-12 border-b border-emerald-900/80">
          {/* Kolom 1: Profil & Identitas Madrasah (Lebar 2 Kolom) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center p-1 shadow-md border border-slate-200/20">
                <img
                  src="/logo-madin.png"
                  alt="Logo Madin Blokagung"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <h3 className="text-xl font-bold font-serif text-white tracking-tight">
                  MADINA Blokagung
                </h3>
                <p className="text-xs text-emerald-300 font-medium">
                  Madrasah Diniyyah Al-Amiriyyah
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-emerald-200/80 leading-relaxed max-w-md">
              Lembaga pendidikan keagamaan Islam klasikal berskala besar di Pondok Pesantren Darussalam Blokagung yang membina ± 5.400 santri dalam khazanah kitab kuning salafiyah dengan disiplin dan keteladanan akhlak mulia.
            </p>
          </div>

          {/* Kolom 2: Navigasi Informasi Publik */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider font-sans">
              Informasi Publik
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-emerald-200/80">
              <li>
                <a href="#hero" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Beranda</span>
                </a>
              </li>
              <li>
                <a href="#statistik" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Statistik Lembaga</span>
                </a>
              </li>
              <li>
                <a href="#program" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>3 Pilar Program</span>
                </a>
              </li>
              <li>
                <a href="#kurikulum" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Kurikulum Kitab</span>
                </a>
              </li>
              <li>
                <a href="#waktu-kbm" className="hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Waktu Pembelajaran</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Alamat & Kontak Kantor */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider font-sans">
              Kantor Madrasah
            </h4>
            <div className="space-y-2.5 text-xs text-emerald-200/80">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Jl. PP. Darussalam, Blokagung, Karangdoro, Tegalsari, Banyuwangi, Jawa Timur 68485
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-900/50 border border-emerald-800/80 text-[11px] text-emerald-100">
                <span className="font-semibold text-amber-300 block mb-0.5">Kantor Putra:</span>
                Gedung Madrasah Diniyyah Putra Lantai 1
                <span className="font-semibold text-amber-300 block mt-2 mb-0.5">Kantor Putri:</span>
                Gedung Madrasah Diniyyah Putri Lantai 1
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Attribution */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/70 text-center sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} Madrasah Diniyyah Al-Amiriyyah (MADINA) PP. Darussalam Blokagung.
          </p>
          <div className="flex items-center gap-1 text-emerald-400/80">
            <span>Dirawat dengan khidmah untuk pesantren salaf</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
