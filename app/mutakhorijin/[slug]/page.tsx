import React from 'react';
import { NavbarProfil, FooterProfil } from '@/components/modules/profil';
import MutakhorijinAlbumView from '@/components/modules/mutakhorijin/MutakhorijinAlbumView';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function MutakhorijinAngkatanPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-[#061816] text-slate-100 flex flex-col">
      <NavbarProfil />
      <main className="flex-1">
        <MutakhorijinAlbumView albumSlug={slug} />
      </main>
      <FooterProfil />
    </div>
  );
}
