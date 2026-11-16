import React from 'react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import MutakhorijinAlbumView from '@/components/modules/mutakhorijin/MutakhorijinAlbumView';

export default function MutakhorijinRootPage() {
  return (
    <div className="min-h-screen bg-[#061816] text-slate-100 flex flex-col">
      <NavbarProfil />
      <main className="flex-1">
        <MutakhorijinAlbumView />
      </main>
      <FooterProfil />
    </div>
  );
}
